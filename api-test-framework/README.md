# Bank API Test Framework

A lightweight API test automation framework in TypeScript, built on Node's built-in test runner (`node:test`). It tests the [mock bank API](../mock-server) and produces an HTML report and JUnit XML for CI.

I built the reusable parts myself instead of pulling in large libraries, so every piece is small enough to explain line by line.

## Run it

```bash
npm install
npm run test:local      # starts the mock server, runs all tests, stops the server
# or, with the server already running:
npm test
API_BASE_URL=http://staging.example.com npm test   # point at another environment
```

Reports: `reports/api-report.html` (open in a browser) and `reports/junit.xml` (for CI).

## Structure

```
src/
  config.ts                 env-driven settings (base URL, timeout, retries, slow threshold)
  core/
    api-client.ts           fetch wrapper: auth, JSON, timeouts, retries (GET only), timing, trace
    expect.ts               domain assertions – every failure prints the HTTP trace
    schema.ts               small JSON-schema-style contract validator
    fixtures.ts             useFreshState() resets data before each test; loginAs() helper
  data/test-data.ts         seeded users/accounts + TransferBuilder (fluent test data builder)
  schemas/bank.ts           response contracts (login, account, transaction, transfer, error)
  reporters/html-reporter.ts  custom node:test reporter → self-contained HTML report
tests/
  auth.test.ts              login, validation, enumeration, logout, sessions
  accounts.test.ts          ownership, balances, ordering, pagination boundaries
  transfers.test.ts         happy paths, validation, boundaries, daily limit, idempotency, conservation
  resilience.test.ts        404/405, injected 5xx, timeouts, retry policy, fault config
scripts/run-with-server.ts  one-command local run
```

## Design decisions

| Decision | Why |
|----------|-----|
| `node:test` instead of Jest/Mocha | Built into Node 22, fast, no config, supports custom reporters |
| Tests run serially (`--test-concurrency=1`) | All tests share one stateful server; parallel runs would reset each other's data |
| `useFreshState()` before every test | Tests are independent and can run in any order |
| Retries only for `GET` | Retrying a `POST /transfers` could move money twice |
| HTTP trace in every assertion message | A red test in CI says exactly what was sent and received – no re-running locally to debug |
| Builder for request bodies | Each test states only the field it cares about: `aTransfer().amount(1).build()` |
| Data-driven tests (`for … of` tables) | One readable table covers many negative/boundary cases |

## Example

```ts
it('rejects 1p more than the balance and leaves balances unchanged', async () => {
  const bob = await loginAs('bob');
  const res = await bob.post('/transfers',
    aTransfer().from(accounts.bobCurrent).to(accounts.aliceCurrent).amount(15_001).build());
  expectError(res, 422, 'INSUFFICIENT_FUNDS');
  assert.equal(await balance(bob, accounts.bobCurrent), 15_000);
});
```
