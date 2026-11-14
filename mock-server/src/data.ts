// Seed data for the mock banking API.
// All money values are integers in minor units (pence) to avoid floating point rounding bugs.

export type AccountType = 'current' | 'savings';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  locked: boolean;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balanceMinor: number;
  currency: 'GBP';
}

export interface Transaction {
  id: string;
  accountId: string;
  description: string;
  amountMinor: number; // negative = money out, positive = money in
  date: string; // ISO 8601
}

export interface Payee {
  id: string;
  userId: string;
  name: string;
  accountId: string;
}

export interface Seed {
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
  payees: Payee[];
}

export const DEFAULT_PASSWORD = 'Password123!';

export function createSeed(): Seed {
  return {
    users: [
      { id: 'u-alice', name: 'Alice Johnson', email: 'alice@example.com', password: DEFAULT_PASSWORD, locked: false },
      { id: 'u-bob', name: 'Bob Smith', email: 'bob@example.com', password: DEFAULT_PASSWORD, locked: false },
      { id: 'u-locked', name: 'Lou Locked', email: 'locked@example.com', password: DEFAULT_PASSWORD, locked: true },
    ],
    accounts: [
      { id: 'ACC-1001', userId: 'u-alice', name: 'Everyday Current', type: 'current', balanceMinor: 250_000, currency: 'GBP' },
      { id: 'ACC-1002', userId: 'u-alice', name: 'Rainy Day Saver', type: 'savings', balanceMinor: 1_000_000, currency: 'GBP' },
      { id: 'ACC-2001', userId: 'u-bob', name: 'Bob Current', type: 'current', balanceMinor: 15_000, currency: 'GBP' },
    ],
    transactions: [
      { id: 'T-1', accountId: 'ACC-1001', description: 'Salary', amountMinor: 280_000, date: '2026-10-28T09:00:00.000Z' },
      { id: 'T-2', accountId: 'ACC-1001', description: 'Rent', amountMinor: -95_000, date: '2026-11-01T08:30:00.000Z' },
      { id: 'T-3', accountId: 'ACC-1001', description: 'Coffee Shop', amountMinor: -420, date: '2026-11-03T07:45:00.000Z' },
      { id: 'T-4', accountId: 'ACC-1001', description: 'Supermarket', amountMinor: -6_380, date: '2026-11-05T18:12:00.000Z' },
      { id: 'T-5', accountId: 'ACC-1001', description: 'Gym Membership', amountMinor: -3_500, date: '2026-11-06T06:00:00.000Z' },
      { id: 'T-6', accountId: 'ACC-1002', description: 'Interest', amountMinor: 1_250, date: '2026-10-31T00:00:00.000Z' },
      { id: 'T-7', accountId: 'ACC-2001', description: 'Bookshop', amountMinor: -1_299, date: '2026-11-02T13:20:00.000Z' },
    ],
    payees: [
      { id: 'P-1', userId: 'u-alice', name: 'Bob Smith', accountId: 'ACC-2001' },
      { id: 'P-2', userId: 'u-bob', name: 'Alice Johnson', accountId: 'ACC-1001' },
    ],
  };
}
