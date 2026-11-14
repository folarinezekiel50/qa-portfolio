import { API_URL, REQUEST_TIMEOUT_MS } from '../config';

export interface User { id: string; name: string; email: string }
export interface Account { id: string; name: string; type: 'current' | 'savings'; balanceMinor: number; currency: 'GBP' }
export interface Transaction { id: string; accountId: string; description: string; amountMinor: number; date: string }
export interface TransactionPage { items: Transaction[]; total: number; limit: number; offset: number }
export interface Payee { id: string; name: string; accountId: string }
export interface Transfer {
  id: string; fromAccountId: string; toAccountId: string; amountMinor: number; reference: string; status: 'completed'; createdAt: string;
}

/** Error with the API's machine-readable code, so screens can show the right message. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Maps API error codes to text a customer would understand. */
export function friendlyMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  switch (err.code) {
    case 'INVALID_CREDENTIALS': return 'Email or password is incorrect.';
    case 'ACCOUNT_LOCKED': return 'Your account is locked. Please contact support.';
    case 'INSUFFICIENT_FUNDS': return 'You do not have enough money in this account.';
    case 'DAILY_LIMIT_EXCEEDED': return 'This payment would take you over your £5,000 daily limit.';
    case 'UNAUTHORIZED': return 'Your session has expired. Please log in again.';
    case 'NETWORK_ERROR': return 'Cannot reach the bank. Check your connection and try again.';
    case 'TIMEOUT': return 'The bank is taking too long to respond. Please try again.';
    default: return err.status >= 500 ? 'The bank is having problems right now. Please try again later.' : err.message;
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(0, aborted ? 'TIMEOUT' : 'NETWORK_ERROR', (e as Error)?.message ?? 'Network error');
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (__DEV__) console.log(`[api] ${method} ${path} -> ${res.status}`);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; expiresAt: string; user: User }>('POST', '/auth/login', { body: { email, password } }),
  logout: (token: string) => request<void>('POST', '/auth/logout', { token }),
  getAccounts: (token: string) => request<Account[]>('GET', '/accounts', { token }),
  getAccount: (token: string, id: string) => request<Account>('GET', `/accounts/${encodeURIComponent(id)}`, { token }),
  getTransactions: (token: string, id: string, limit = 20, offset = 0) =>
    request<TransactionPage>('GET', `/accounts/${encodeURIComponent(id)}/transactions?limit=${limit}&offset=${offset}`, { token }),
  getPayees: (token: string) => request<Payee[]>('GET', '/payees', { token }),
  createTransfer: (
    token: string,
    body: { fromAccountId: string; toAccountId: string; amountMinor: number; reference: string },
    idempotencyKey: string,
  ) => request<Transfer>('POST', '/transfers', { token, body, headers: { 'idempotency-key': idempotencyKey } }),
};
