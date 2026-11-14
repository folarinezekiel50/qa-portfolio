import { config } from '../config.ts';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number>;
  token?: string;
  timeoutMs?: number;
  /** Override retry count for this call. */
  retries?: number;
}

export interface ApiResponse<T = any> {
  status: number;
  headers: Headers;
  body: T;
  durationMs: number;
  /** Human-readable summary of the exchange, used in assertion messages and reports. */
  trace: string;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin wrapper around fetch that adds: base URL, auth, JSON handling,
 * timeouts, retries with backoff for safe requests, timing and a trace for debugging.
 */
export class ApiClient {
  constructor(private baseUrl: string = config.baseUrl, private defaultToken?: string) {}

  /** Returns a new client that sends this bearer token on every request. */
  withToken(token: string): ApiClient {
    return new ApiClient(this.baseUrl, token);
  }

  get<T = any>(path: string, opts: RequestOptions = {}) { return this.request<T>('GET', path, opts); }
  post<T = any>(path: string, body?: unknown, opts: RequestOptions = {}) { return this.request<T>('POST', path, { ...opts, body }); }

  async request<T = any>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, String(v));

    const headers: Record<string, string> = { accept: 'application/json', ...opts.headers };
    const token = opts.token ?? this.defaultToken;
    if (token) headers.authorization = `Bearer ${token}`;
    let payload: string | undefined;
    if (opts.body !== undefined) {
      headers['content-type'] = 'application/json';
      payload = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }

    // Only retry idempotent requests: retrying a POST /transfers could move money twice.
    const maxRetries = method === 'GET' ? (opts.retries ?? config.retries) : 0;
    let attempt = 0;

    while (true) {
      const started = performance.now();
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: payload,
          signal: AbortSignal.timeout(opts.timeoutMs ?? config.timeoutMs),
        });
        const text = await res.text();
        const durationMs = Math.round(performance.now() - started);
        let body: any = text;
        if (text && res.headers.get('content-type')?.includes('application/json')) body = JSON.parse(text);
        if (text === '') body = undefined;

        if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) {
          attempt++;
          await sleep(100 * 2 ** attempt);
          continue;
        }

        const trace = [
          `${method} ${url.pathname}${url.search} -> ${res.status} in ${durationMs}ms` + (attempt ? ` (after ${attempt} retries)` : ''),
          payload ? `request:  ${truncate(payload)}` : '',
          text ? `response: ${truncate(text)}` : '',
        ].filter(Boolean).join('\n');
        if (config.verbose) console.log(trace);

        return { status: res.status, headers: res.headers, body, durationMs, trace };
      } catch (err) {
        if (attempt < maxRetries && isNetworkError(err)) {
          attempt++;
          await sleep(100 * 2 ** attempt);
          continue;
        }
        throw new Error(`${method} ${url.pathname} failed: ${(err as Error).message}`, { cause: err });
      }
    }
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err as Error)?.name === 'TimeoutError';
}

function truncate(s: string, max = 500): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
