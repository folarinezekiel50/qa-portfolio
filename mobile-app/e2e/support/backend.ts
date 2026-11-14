/**
 * Talks to the mock server directly from the test runner (on your computer, not the device)
 * so each test starts from a known state.
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export async function resetBackend(): Promise<void> {
  const res = await fetch(`${API_URL}/__test/reset`, { method: 'POST' });
  if (res.status !== 204) {
    throw new Error(`Could not reset mock server at ${API_URL} (HTTP ${res.status}). Start it with: npm run mock-server`);
  }
}

export const users = {
  alice: { email: 'alice@example.com', password: 'Password123!', firstName: 'Alice' },
  bob: { email: 'bob@example.com', password: 'Password123!', firstName: 'Bob' },
  locked: { email: 'locked@example.com', password: 'Password123!', firstName: 'Lou' },
} as const;
