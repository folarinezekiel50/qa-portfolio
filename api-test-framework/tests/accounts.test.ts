import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, useFreshState } from '../src/core/fixtures.ts';
import { expectError, expectSchema, expectStatus } from '../src/core/expect.ts';
import { accountListSchema, accountSchema, transactionPageSchema } from '../src/schemas/bank.ts';
import { accounts } from '../src/data/test-data.ts';

describe('GET /accounts', () => {
  useFreshState();

  it('returns only the logged-in user\'s accounts', async () => {
    const alice = await loginAs('alice');
    const res = await alice.get('/accounts');
    expectStatus(res, 200);
    expectSchema(res.body, accountListSchema);
    assert.deepEqual(res.body.map((a: any) => a.id).sort(), [accounts.aliceCurrent, accounts.aliceSavings]);
  });

  it('returns seeded balances in pence', async () => {
    const alice = await loginAs('alice');
    const res = await alice.get(`/accounts/${accounts.aliceCurrent}`);
    expectSchema(res.body, accountSchema);
    assert.equal(res.body.balanceMinor, 250_000);
  });

  it('returns 404 (not 403) for another customer\'s account', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.get(`/accounts/${accounts.bobCurrent}`), 404, 'ACCOUNT_NOT_FOUND');
  });

  it('returns 404 for an account that does not exist', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.get('/accounts/ACC-9999'), 404, 'ACCOUNT_NOT_FOUND');
  });
});

describe('GET /accounts/:id/transactions', () => {
  useFreshState();

  it('returns transactions newest first', async () => {
    const alice = await loginAs('alice');
    const res = await alice.get(`/accounts/${accounts.aliceCurrent}/transactions`);
    expectStatus(res, 200);
    expectSchema(res.body, transactionPageSchema);
    const dates = res.body.items.map((t: any) => t.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  it('paginates with limit and offset without overlap', async () => {
    const alice = await loginAs('alice');
    const path = `/accounts/${accounts.aliceCurrent}/transactions`;
    const page1 = await alice.get(path, { query: { limit: 2, offset: 0 } });
    const page2 = await alice.get(path, { query: { limit: 2, offset: 2 } });
    assert.equal(page1.body.items.length, 2);
    assert.equal(page2.body.items.length, 2);
    const ids1 = page1.body.items.map((t: any) => t.id);
    assert.ok(page2.body.items.every((t: any) => !ids1.includes(t.id)), 'pages overlap');
    assert.equal(page1.body.total, 5);
  });

  it('returns an empty page when offset is past the end', async () => {
    const alice = await loginAs('alice');
    const res = await alice.get(`/accounts/${accounts.aliceCurrent}/transactions`, { query: { offset: 500 } });
    expectStatus(res, 200);
    assert.deepEqual(res.body.items, []);
  });

  // Boundary value analysis on `limit` (valid range 1..100).
  for (const [limit, expected] of [['0', 400], ['1', 200], ['100', 200], ['101', 400], ['-1', 400], ['abc', 400]] as const) {
    it(`limit=${limit} returns ${expected}`, async () => {
      const alice = await loginAs('alice');
      const res = await alice.get(`/accounts/${accounts.aliceCurrent}/transactions`, { query: { limit } });
      expectStatus(res, expected);
    });
  }

  it('does not let a user read someone else\'s transactions', async () => {
    const bob = await loginAs('bob');
    expectError(await bob.get(`/accounts/${accounts.aliceCurrent}/transactions`), 404, 'ACCOUNT_NOT_FOUND');
  });
});
