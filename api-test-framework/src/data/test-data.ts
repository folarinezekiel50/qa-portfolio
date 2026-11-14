import { randomUUID } from 'node:crypto';

/** Known seeded test users. Keep in sync with mock-server/src/data.ts. */
export const users = {
  alice: { email: 'alice@example.com', password: 'Password123!' },
  bob: { email: 'bob@example.com', password: 'Password123!' },
  locked: { email: 'locked@example.com', password: 'Password123!' },
} as const;

export const accounts = {
  aliceCurrent: 'ACC-1001', // £2,500.00
  aliceSavings: 'ACC-1002', // £10,000.00
  bobCurrent: 'ACC-2001', // £150.00
} as const;

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  reference?: string;
}

/**
 * Fluent builder so each test only states the fields it cares about:
 *   aTransfer().toPayee().amount(50_00).build()
 */
export class TransferBuilder {
  private data: TransferRequest = {
    fromAccountId: accounts.aliceCurrent,
    toAccountId: accounts.aliceSavings,
    amountMinor: 10_00,
    reference: 'Test transfer',
  };

  from(id: string) { this.data.fromAccountId = id; return this; }
  to(id: string) { this.data.toAccountId = id; return this; }
  toPayee() { return this.to(accounts.bobCurrent); }
  amount(minor: number) { this.data.amountMinor = minor; return this; }
  reference(ref: string) { this.data.reference = ref; return this; }
  /** Allows deliberately invalid payloads for negative tests. */
  with(overrides: Record<string, unknown>) { Object.assign(this.data, overrides); return this; }
  build(): TransferRequest { return { ...this.data }; }
}

export const aTransfer = () => new TransferBuilder();
export const idempotencyKey = () => `test-${randomUUID()}`;
