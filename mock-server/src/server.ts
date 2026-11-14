import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Store, DAILY_TRANSFER_LIMIT_MINOR, MAX_REFERENCE_LENGTH } from './store.ts';

type Json = Record<string, unknown> | unknown[];

interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  store: Store;
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
  userId?: string;
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function send(res: ServerResponse, status: number, body?: Json): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type, idempotency-key, x-mock-delay-ms, x-mock-status',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
}

function requireAuth(ctx: Ctx): string {
  const header = ctx.req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  const userId = ctx.store.userIdForToken(token);
  if (!userId) throw new HttpError(401, 'UNAUTHORIZED', 'Missing, invalid or expired token');
  return userId;
}

function ownAccount(ctx: Ctx, userId: string, accountId: string) {
  const account = ctx.store.data.accounts.find((a) => a.id === accountId && a.userId === userId);
  // 404 rather than 403 so we don't reveal that someone else's account exists.
  if (!account) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', `Account ${accountId} not found`);
  return account;
}

function parseIntParam(value: string | null, name: string, def: number, min: number, max: number): number {
  if (value === null) return def;
  if (!/^\d+$/.test(value)) throw new HttpError(400, 'VALIDATION_ERROR', `${name} must be a non-negative integer`);
  const n = Number(value);
  if (n < min || n > max) throw new HttpError(400, 'VALIDATION_ERROR', `${name} must be between ${min} and ${max}`);
  return n;
}

type Handler = (ctx: Ctx) => Promise<[number, Json?]> | [number, Json?];
interface Route { method: string; pattern: RegExp; keys: string[]; handler: Handler }
const routes: Route[] = [];

function route(method: string, path: string, handler: Handler): void {
  const keys: string[] = [];
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, pattern, keys, handler });
}

// ---------- Routes ----------

route('GET', '/health', () => [200, { status: 'ok' }]);

route('POST', '/__test/reset', ({ store }) => {
  store.reset();
  return [204];
});

route('POST', '/__test/config', ({ body, store }) => {
  const delayMs = body?.delayMs ?? 0;
  const failStatus = body?.failStatus ?? null;
  if (typeof delayMs !== 'number' || delayMs < 0 || delayMs > 30_000) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'delayMs must be a number between 0 and 30000');
  }
  if (failStatus !== null && (typeof failStatus !== 'number' || failStatus < 400 || failStatus > 599)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'failStatus must be null or a number between 400 and 599');
  }
  store.faults = { delayMs, failStatus };
  return [200, store.faults];
});

route('POST', '/__test/expire-sessions', ({ store }) => {
  store.expireAllSessions();
  return [204];
});

route('POST', '/auth/login', ({ body, store }) => {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) throw new HttpError(400, 'VALIDATION_ERROR', 'email and password are required');
  const user = store.data.users.find((u) => u.email === email);
  // Same message for unknown email and wrong password to prevent user enumeration.
  if (!user || user.password !== password) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  if (user.locked) throw new HttpError(423, 'ACCOUNT_LOCKED', 'This account is locked. Please contact support.');
  const session = store.createSession(user.id);
  return [200, { ...session, user: { id: user.id, name: user.name, email: user.email } }];
});

route('POST', '/auth/logout', (ctx) => {
  requireAuth(ctx);
  ctx.store.revoke(ctx.req.headers.authorization!.slice(7));
  return [204];
});

route('GET', '/accounts', (ctx) => {
  const userId = requireAuth(ctx);
  const accounts = ctx.store.data.accounts.filter((a) => a.userId === userId).map(({ userId: _u, ...a }) => a);
  return [200, accounts];
});

route('GET', '/accounts/:id', (ctx) => {
  const userId = requireAuth(ctx);
  const { userId: _u, ...account } = ownAccount(ctx, userId, ctx.params.id);
  return [200, account];
});

route('GET', '/accounts/:id/transactions', (ctx) => {
  const userId = requireAuth(ctx);
  ownAccount(ctx, userId, ctx.params.id);
  const limit = parseIntParam(ctx.query.get('limit'), 'limit', 20, 1, 100);
  const offset = parseIntParam(ctx.query.get('offset'), 'offset', 0, 0, 1_000_000);
  const all = ctx.store.data.transactions
    .filter((t) => t.accountId === ctx.params.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return [200, { items: all.slice(offset, offset + limit), total: all.length, limit, offset }];
});

route('GET', '/payees', (ctx) => {
  const userId = requireAuth(ctx);
  return [200, ctx.store.data.payees.filter((p) => p.userId === userId).map(({ userId: _u, ...p }) => p)];
});

route('POST', '/transfers', (ctx) => {
  const userId = requireAuth(ctx);
  const { store, body } = ctx;

  const idemKey = ctx.req.headers['idempotency-key'];
  const cacheKey = typeof idemKey === 'string' && idemKey ? `${userId}:${idemKey}` : undefined;
  if (cacheKey && store.idempotency.has(cacheKey)) {
    const cached = store.idempotency.get(cacheKey)!;
    return [cached.status, cached.body as Json];
  }

  if (!body || typeof body !== 'object') throw new HttpError(400, 'VALIDATION_ERROR', 'Request body is required');
  const { fromAccountId, toAccountId, amountMinor } = body;
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (typeof fromAccountId !== 'string' || typeof toAccountId !== 'string') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'fromAccountId and toAccountId are required strings');
  }
  if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new HttpError(422, 'INVALID_AMOUNT', 'amountMinor must be a positive whole number of pence');
  }
  if (reference.length > MAX_REFERENCE_LENGTH) {
    throw new HttpError(422, 'REFERENCE_TOO_LONG', `reference must be ${MAX_REFERENCE_LENGTH} characters or fewer`);
  }

  const from = ownAccount(ctx, userId, fromAccountId);
  const to = store.data.accounts.find((a) => a.id === toAccountId);
  if (!to) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', `Account ${toAccountId} not found`);
  if (from.id === to.id) throw new HttpError(422, 'SAME_ACCOUNT', 'Cannot transfer to the same account');

  const isOwn = to.userId === userId;
  const isPayee = store.data.payees.some((p) => p.userId === userId && p.accountId === to.id);
  if (!isOwn && !isPayee) throw new HttpError(422, 'PAYEE_NOT_FOUND', 'Destination must be your own account or a saved payee');

  if (amountMinor > from.balanceMinor) throw new HttpError(422, 'INSUFFICIENT_FUNDS', 'Insufficient funds');
  if (store.transferredTodayMinor(from.id) + amountMinor > DAILY_TRANSFER_LIMIT_MINOR) {
    throw new HttpError(422, 'DAILY_LIMIT_EXCEEDED', 'Daily transfer limit of £5,000.00 exceeded');
  }

  const transfer = store.applyTransfer(from.id, to.id, amountMinor, reference);
  if (cacheKey) store.idempotency.set(cacheKey, { status: 201, body: transfer });
  return [201, transfer as unknown as Json];
});

// ---------- Server ----------

export interface MockServerOptions {
  port?: number;
  host?: string;
  /** Delay every response by this many ms (useful to test loading states). */
  delayMs?: number;
  store?: Store;
}

export function createMockServer(options: MockServerOptions = {}): { server: Server; store: Store } {
  const store = options.store ?? new Store();

  const server = createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'OPTIONS') return send(res, 204);

      // Fault injection: lets tests simulate slow or failing backends without changing code.
      // Per request via headers (automated tests) or globally via POST /__test/config (manual testing of the app).
      const isTestRoute = url.pathname.startsWith('/__test/');
      const delay = Number(req.headers['x-mock-delay-ms'] ?? (isTestRoute ? 0 : store.faults.delayMs || options.delayMs || 0));
      if (delay > 0) await new Promise((r) => setTimeout(r, Math.min(delay, 30_000)));
      const forced = Number(req.headers['x-mock-status'] ?? (isTestRoute ? NaN : store.faults.failStatus));
      if (forced >= 400 && forced <= 599) {
        throw new HttpError(forced, 'INJECTED_FAULT', `Injected fault with status ${forced}`);
      }

      const match = routes
        .map((r) => ({ r, m: r.method === req.method ? url.pathname.match(r.pattern) : null }))
        .find((x) => x.m);
      if (!match) {
        const pathExists = routes.some((r) => r.pattern.test(url.pathname));
        throw pathExists
          ? new HttpError(405, 'METHOD_NOT_ALLOWED', `${req.method} not allowed on ${url.pathname}`)
          : new HttpError(404, 'NOT_FOUND', `No route for ${url.pathname}`);
      }

      const params = Object.fromEntries(match.r.keys.map((k, i) => [k, decodeURIComponent(match.m![i + 1])]));
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      const [status, payload] = await match.r.handler({ req, res, store, params, query: url.searchParams, body });
      send(res, status, payload);
    } catch (err) {
      if (err instanceof HttpError) {
        send(res, err.status, { error: { code: err.code, message: err.message } });
      } else {
        console.error(err);
        send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
      }
    } finally {
      if (process.env.MOCK_LOG !== 'off') {
        console.log(`${req.method} ${url.pathname} -> ${res.statusCode} (${Date.now() - started}ms)`);
      }
    }
  });

  return { server, store };
}

// Run directly: `npm start`
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';
  const { server } = createMockServer({ delayMs: Number(process.env.MOCK_DELAY_MS ?? 0) });
  server.listen(port, host, () => console.log(`Mock bank API listening on http://${host}:${port}`));
}
