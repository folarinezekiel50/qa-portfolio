import { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from './api-client.ts';
import { users } from '../data/test-data.ts';

export const api = new ApiClient();

/** Resets mock server state before every test in the file so tests never depend on each other. */
export function useFreshState(): void {
  beforeEach(async () => {
    const res = await api.post('/__test/reset');
    assert.equal(res.status, 204, `Could not reset mock server. Is it running?\n${res.trace}`);
  });
}

/** Logs in and returns a client that is already authenticated. */
export async function loginAs(user: keyof typeof users = 'alice'): Promise<ApiClient> {
  const res = await api.post('/auth/login', users[user]);
  assert.equal(res.status, 200, `Login as ${user} failed\n${res.trace}`);
  return api.withToken(res.body.token);
}
