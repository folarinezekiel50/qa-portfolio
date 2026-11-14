import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, loginAs, useFreshState } from '../src/core/fixtures.ts';
import { expectError, expectHeader, expectStatus } from '../src/core/expect.ts';
import { aTransfer } from '../src/data/test-data.ts';

/**
 * These tests use the mock server's fault-injection headers
 * (x-mock-status, x-mock-delay-ms) to simulate a misbehaving backend.
 */
describe('Resilience and API hygiene', () => {
  useFreshState();

  it('health endpoint is up', async () => {
    const res = await api.get('/health');
    expectStatus(res, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('returns JSON content-type on success and on error', async () => {
    expectHeader(await api.get('/health'), 'content-type', 'application/json');
    expectHeader(await api.get('/does-not-exist'), 'content-type', 'application/json');
  });

  it('returns 404 with an error body for unknown routes', async () => {
    expectError(await api.get('/does-not-exist'), 404, 'NOT_FOUND');
  });

  it('returns 405 for the wrong HTTP method on a known route', async () => {
    expectError(await api.get('/transfers'), 405, 'METHOD_NOT_ALLOWED');
  });

  it('surfaces a 500 from the server as a structured error', async () => {
    const res = await api.get('/health', { headers: { 'x-mock-status': '500' } });
    expectError(res, 500, 'INJECTED_FAULT');
  });

  it('client times out on a slow response instead of hanging', async () => {
    await assert.rejects(
      api.get('/health', { headers: { 'x-mock-delay-ms': '1500' }, timeoutMs: 300, retries: 0 }),
      /failed/,
    );
  });

  it('client retries GET requests on 503 (and still reports the final status)', async () => {
    const res = await api.get('/health', { headers: { 'x-mock-status': '503' }, retries: 2 });
    expectStatus(res, 503);
    assert.match(res.trace, /after 2 retries/);
  });

  it('global fault config makes every request fail until reset', async () => {
    expectStatus(await api.post('/__test/config', { failStatus: 503 }), 200);
    expectError(await api.get('/health', { retries: 0 }), 503, 'INJECTED_FAULT');
    expectStatus(await api.post('/__test/reset'), 204);
    expectStatus(await api.get('/health'), 200);
  });

  it('rejects invalid fault config values', async () => {
    expectError(await api.post('/__test/config', { delayMs: -1 }), 400, 'VALIDATION_ERROR');
    expectError(await api.post('/__test/config', { failStatus: 200 }), 400, 'VALIDATION_ERROR');
  });

  it('expiring all sessions makes existing tokens return 401', async () => {
    const alice = await loginAs('alice');
    expectStatus(await alice.get('/accounts'), 200);
    expectStatus(await api.post('/__test/expire-sessions'), 204);
    expectError(await alice.get('/accounts'), 401, 'UNAUTHORIZED');
  });

  it('client never retries POST /transfers (would risk a double payment)', async () => {
    const alice = await loginAs('alice');
    const res = await alice.post('/transfers', aTransfer().build(), { headers: { 'x-mock-status': '503' } });
    expectStatus(res, 503);
    assert.doesNotMatch(res.trace, /retries/);
  });
});
