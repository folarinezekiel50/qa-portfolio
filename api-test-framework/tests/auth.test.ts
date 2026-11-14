import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, useFreshState } from '../src/core/fixtures.ts';
import { expectError, expectFasterThan, expectSchema, expectStatus } from '../src/core/expect.ts';
import { errorSchema, loginSchema } from '../src/schemas/bank.ts';
import { users } from '../src/data/test-data.ts';

describe('POST /auth/login', () => {
  useFreshState();

  it('logs in with valid credentials and returns a token', async () => {
    const res = await api.post('/auth/login', users.alice);
    expectStatus(res, 200);
    expectSchema(res.body, loginSchema);
    assert.equal(res.body.user.email, users.alice.email);
    expectFasterThan(res);
  });

  it('treats email as case-insensitive and ignores surrounding spaces', async () => {
    const res = await api.post('/auth/login', { ...users.alice, email: '  ALICE@Example.com ' });
    expectStatus(res, 200);
  });

  it('never returns the password in the response', async () => {
    const res = await api.post('/auth/login', users.alice);
    assert.ok(!JSON.stringify(res.body).includes(users.alice.password));
  });

  it('issues a different token on each login', async () => {
    const a = await api.post('/auth/login', users.alice);
    const b = await api.post('/auth/login', users.alice);
    assert.notEqual(a.body.token, b.body.token);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await api.post('/auth/login', { ...users.alice, password: 'wrong' });
    expectError(res, 401, 'INVALID_CREDENTIALS');
    expectSchema(res.body, errorSchema);
  });

  it('gives the same error for unknown email as for wrong password (no user enumeration)', async () => {
    const unknown = await api.post('/auth/login', { email: 'nobody@example.com', password: 'x' });
    const wrongPw = await api.post('/auth/login', { ...users.alice, password: 'x' });
    assert.equal(unknown.status, wrongPw.status);
    assert.deepEqual(unknown.body, wrongPw.body);
  });

  it('rejects a locked account with 423', async () => {
    const res = await api.post('/auth/login', users.locked);
    expectError(res, 423, 'ACCOUNT_LOCKED');
  });

  // Data-driven negative tests: one table, many cases.
  const invalidBodies: Array<[string, unknown]> = [
    ['missing email', { password: 'Password123!' }],
    ['missing password', { email: 'alice@example.com' }],
    ['empty strings', { email: '', password: '' }],
    ['email is a number', { email: 123, password: 'Password123!' }],
    ['empty body', {}],
  ];
  for (const [label, body] of invalidBodies) {
    it(`returns 400 for ${label}`, async () => {
      const res = await api.post('/auth/login', body);
      expectError(res, 400, 'VALIDATION_ERROR');
    });
  }

  it('returns 400 for malformed JSON', async () => {
    const res = await api.post('/auth/login', '{"email": ');
    expectError(res, 400, 'INVALID_JSON');
  });
});

describe('Session handling', () => {
  useFreshState();

  it('rejects requests without a token', async () => {
    expectError(await api.get('/accounts'), 401, 'UNAUTHORIZED');
  });

  it('rejects a made-up token', async () => {
    expectError(await api.get('/accounts', { token: 'a'.repeat(48) }), 401, 'UNAUTHORIZED');
  });

  it('invalidates the token after logout', async () => {
    const login = await api.post('/auth/login', users.alice);
    const client = api.withToken(login.body.token);
    expectStatus(await client.get('/accounts'), 200);
    expectStatus(await client.post('/auth/logout'), 204);
    expectError(await client.get('/accounts'), 401, 'UNAUTHORIZED');
  });
});
