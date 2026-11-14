import { randomBytes, randomUUID } from 'node:crypto';
import { createSeed, type Seed, type Transaction } from './data.ts';

export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const DAILY_TRANSFER_LIMIT_MINOR = 500_000; // £5,000
export const MAX_REFERENCE_LENGTH = 18;

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  reference: string;
  status: 'completed';
  createdAt: string;
}

interface Session {
  userId: string;
  expiresAt: number;
}

/** In-memory state. Reset it between tests with POST /__test/reset. */
export class Store {
  data!: Seed;
  sessions = new Map<string, Session>();
  transfers: Transfer[] = [];
  idempotency = new Map<string, { status: number; body: unknown }>();
  /** Runtime fault injection, set via POST /__test/config. Applies to every non-/__test request. */
  faults: { delayMs: number; failStatus: number | null } = { delayMs: 0, failStatus: null };

  constructor(private now: () => number = Date.now) {
    this.reset();
  }

  reset(): void {
    this.data = createSeed();
    this.sessions.clear();
    this.transfers = [];
    this.idempotency.clear();
    this.faults = { delayMs: 0, failStatus: null };
  }

  expireAllSessions(): void {
    this.sessions.clear();
  }

  createSession(userId: string): { token: string; expiresAt: string } {
    const token = randomBytes(24).toString('hex');
    const expiresAt = this.now() + TOKEN_TTL_MS;
    this.sessions.set(token, { userId, expiresAt });
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  }

  userIdForToken(token: string | undefined): string | undefined {
    if (!token) return undefined;
    const session = this.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return session.userId;
  }

  revoke(token: string): void {
    this.sessions.delete(token);
  }

  transferredTodayMinor(accountId: string): number {
    const today = new Date(this.now()).toISOString().slice(0, 10);
    return this.transfers
      .filter((t) => t.fromAccountId === accountId && t.createdAt.slice(0, 10) === today)
      .reduce((sum, t) => sum + t.amountMinor, 0);
  }

  applyTransfer(fromAccountId: string, toAccountId: string, amountMinor: number, reference: string): Transfer {
    const from = this.data.accounts.find((a) => a.id === fromAccountId)!;
    const to = this.data.accounts.find((a) => a.id === toAccountId)!;
    const createdAt = new Date(this.now()).toISOString();
    const transfer: Transfer = {
      id: `TR-${randomUUID()}`,
      fromAccountId,
      toAccountId,
      amountMinor,
      reference,
      status: 'completed',
      createdAt,
    };
    from.balanceMinor -= amountMinor;
    to.balanceMinor += amountMinor;
    const label = reference || 'Transfer';
    const debit: Transaction = { id: `T-${randomUUID()}`, accountId: from.id, description: `${label} to ${to.id}`, amountMinor: -amountMinor, date: createdAt };
    const credit: Transaction = { id: `T-${randomUUID()}`, accountId: to.id, description: `${label} from ${from.id}`, amountMinor, date: createdAt };
    this.data.transactions.push(debit, credit);
    this.transfers.push(transfer);
    return transfer;
  }
}
