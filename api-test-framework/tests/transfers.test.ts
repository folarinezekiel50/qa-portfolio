import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, useFreshState } from '../src/core/fixtures.ts';
import { expectError, expectSchema, expectStatus } from '../src/core/expect.ts';
import { transferSchema } from '../src/schemas/bank.ts';
import { accounts, aTransfer, idempotencyKey } from '../src/data/test-data.ts';
import type { ApiClient } from '../src/core/api-client.ts';

async function balance(client: ApiClient, id: string): Promise<number> {
  return (await client.get(`/accounts/${id}`)).body.balanceMinor;
}

describe('POST /transfers – happy paths', () => {
  useFreshState();

  it('moves money between the user\'s own accounts', async () => {
    const alice = await loginAs('alice');
    const res = await alice.post('/transfers', aTransfer().amount(100_00).build());
    expectStatus(res, 201);
    expectSchema(res.body, transferSchema);
    assert.equal(await balance(alice, accounts.aliceCurrent), 250_000 - 100_00);
    assert.equal(await balance(alice, accounts.aliceSavings), 1_000_000 + 100_00);
  });

  it('pays a saved payee and credits their account', async () => {
    const alice = await loginAs('alice');
    expectStatus(await alice.post('/transfers', aTransfer().toPayee().amount(25_50).build()), 201);
    const bob = await loginAs('bob');
    assert.equal(await balance(bob, accounts.bobCurrent), 15_000 + 25_50);
  });

  it('records a debit and a credit in transaction history', async () => {
    const alice = await loginAs('alice');
    await alice.post('/transfers', aTransfer().amount(1_00).reference('Pocket money').build());
    const from = await alice.get(`/accounts/${accounts.aliceCurrent}/transactions`, { query: { limit: 1 } });
    const to = await alice.get(`/accounts/${accounts.aliceSavings}/transactions`, { query: { limit: 1 } });
    assert.equal(from.body.items[0].amountMinor, -1_00);
    assert.equal(to.body.items[0].amountMinor, 1_00);
    assert.match(from.body.items[0].description, /Pocket money/);
  });

  it('allows transferring the exact full balance (boundary)', async () => {
    const bob = await loginAs('bob');
    // Bob has £150.00 and Alice is his payee.
    expectStatus(await bob.post('/transfers', aTransfer().from(accounts.bobCurrent).to(accounts.aliceCurrent).amount(15_000).build()), 201);
    assert.equal(await balance(bob, accounts.bobCurrent), 0);
  });

  it('allows the minimum amount of 1p (boundary)', async () => {
    const alice = await loginAs('alice');
    expectStatus(await alice.post('/transfers', aTransfer().amount(1).build()), 201);
  });

  it('accepts a reference of exactly 18 characters (boundary)', async () => {
    const alice = await loginAs('alice');
    expectStatus(await alice.post('/transfers', aTransfer().reference('x'.repeat(18)).build()), 201);
  });
});

describe('POST /transfers – validation', () => {
  useFreshState();

  const invalidAmounts: Array<[string, unknown]> = [
    ['zero', 0],
    ['negative', -500],
    ['decimal pence', 10.5],
    ['string', '1000'],
    ['null', null],
  ];
  for (const [label, amount] of invalidAmounts) {
    it(`rejects ${label} amount`, async () => {
      const alice = await loginAs('alice');
      expectError(await alice.post('/transfers', aTransfer().with({ amountMinor: amount }).build()), 422, 'INVALID_AMOUNT');
    });
  }

  it('rejects a reference of 19 characters (boundary)', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.post('/transfers', aTransfer().reference('x'.repeat(19)).build()), 422, 'REFERENCE_TOO_LONG');
  });

  it('rejects a missing destination account', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.post('/transfers', aTransfer().with({ toAccountId: undefined }).build()), 400, 'VALIDATION_ERROR');
  });

  it('rejects transferring to the same account', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.post('/transfers', aTransfer().to(accounts.aliceCurrent).build()), 422, 'SAME_ACCOUNT');
  });

  it('rejects a destination that is not a saved payee', async () => {
    const bob = await loginAs('bob');
    // Alice's savings account exists but is not one of Bob's payees.
    expectError(await bob.post('/transfers', aTransfer().from(accounts.bobCurrent).to(accounts.aliceSavings).build()), 422, 'PAYEE_NOT_FOUND');
  });

  it('rejects an unknown destination account', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.post('/transfers', aTransfer().to('ACC-0000').build()), 404, 'ACCOUNT_NOT_FOUND');
  });

  it('does not let a user spend from someone else\'s account', async () => {
    const alice = await loginAs('alice');
    expectError(await alice.post('/transfers', aTransfer().from(accounts.bobCurrent).to(accounts.aliceCurrent).build()), 404, 'ACCOUNT_NOT_FOUND');
  });

  it('rejects 1p more than the balance and leaves balances unchanged', async () => {
    const bob = await loginAs('bob');
    const res = await bob.post('/transfers', aTransfer().from(accounts.bobCurrent).to(accounts.aliceCurrent).amount(15_001).build());
    expectError(res, 422, 'INSUFFICIENT_FUNDS');
    assert.equal(await balance(bob, accounts.bobCurrent), 15_000);
  });
});

describe('POST /transfers – business rules', () => {
  useFreshState();

  it('enforces the £5,000 daily limit across multiple transfers', async () => {
    const alice = await loginAs('alice');
    const fromSavings = () => aTransfer().from(accounts.aliceSavings).to(accounts.aliceCurrent);
    expectStatus(await alice.post('/transfers', fromSavings().amount(300_000).build()), 201);
    expectStatus(await alice.post('/transfers', fromSavings().amount(200_000).build()), 201); // exactly £5,000 total
    expectError(await alice.post('/transfers', fromSavings().amount(1).build()), 422, 'DAILY_LIMIT_EXCEEDED');
  });

  it('replays the original result when the same Idempotency-Key is reused', async () => {
    const alice = await loginAs('alice');
    const key = idempotencyKey();
    const body = aTransfer().amount(50_00).build();
    const first = await alice.post('/transfers', body, { headers: { 'idempotency-key': key } });
    const retry = await alice.post('/transfers', body, { headers: { 'idempotency-key': key } });
    expectStatus(first, 201);
    expectStatus(retry, 201);
    assert.equal(retry.body.id, first.body.id);
    // The money must only move once.
    assert.equal(await balance(alice, accounts.aliceCurrent), 250_000 - 50_00);
  });

  it('treats different Idempotency-Keys as separate transfers', async () => {
    const alice = await loginAs('alice');
    const body = aTransfer().amount(10_00).build();
    await alice.post('/transfers', body, { headers: { 'idempotency-key': idempotencyKey() } });
    await alice.post('/transfers', body, { headers: { 'idempotency-key': idempotencyKey() } });
    assert.equal(await balance(alice, accounts.aliceCurrent), 250_000 - 20_00);
  });

  it('keeps total money in the system constant (conservation check)', async () => {
    const alice = await loginAs('alice');
    const bob = await loginAs('bob');
    const total = async () =>
      (await balance(alice, accounts.aliceCurrent)) + (await balance(alice, accounts.aliceSavings)) + (await balance(bob, accounts.bobCurrent));
    const before = await total();
    await alice.post('/transfers', aTransfer().amount(123_45).build());
    await alice.post('/transfers', aTransfer().toPayee().amount(9_99).build());
    await bob.post('/transfers', aTransfer().from(accounts.bobCurrent).to(accounts.aliceCurrent).amount(1_00).build());
    assert.equal(await total(), before);
  });
});
