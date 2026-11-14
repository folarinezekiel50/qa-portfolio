# Mock Bank API

A zero-dependency Node.js + TypeScript API that behaves like a simple bank backend. Used by the mobile app and by the API test framework.

```bash
npm install
npm start            # http://localhost:4000
PORT=5000 npm start  # different port
```

All money is in **integer pence** (`balanceMinor: 250000` = £2,500.00). State is in memory.

## Test users

Password for all: `Password123!`

| Email | Accounts |
|-------|----------|
| alice@example.com | ACC-1001 current £2,500.00 · ACC-1002 savings £10,000.00 · payee: Bob (ACC-2001) |
| bob@example.com | ACC-2001 current £150.00 · payee: Alice (ACC-1001) |
| locked@example.com | Locked – login returns 423 |

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | – | `{ "status": "ok" }` |
| POST | `/auth/login` | – | `{ email, password }` → `{ token, expiresAt, user }`. 400 / 401 / 423 |
| POST | `/auth/logout` | ✓ | Revokes the token |
| GET | `/accounts` | ✓ | Your accounts only |
| GET | `/accounts/:id` | ✓ | 404 if not yours |
| GET | `/accounts/:id/transactions?limit=&offset=` | ✓ | Newest first. `limit` 1–100 (default 20) |
| GET | `/payees` | ✓ | Your saved payees |
| POST | `/transfers` | ✓ | `{ fromAccountId, toAccountId, amountMinor, reference? }`. Optional `Idempotency-Key` header |

### Transfer rules and error codes

| Rule | Status | Code |
|------|--------|------|
| Missing/invalid account IDs | 400 | `VALIDATION_ERROR` |
| Amount not a positive whole number of pence | 422 | `INVALID_AMOUNT` |
| Reference longer than 18 characters | 422 | `REFERENCE_TOO_LONG` |
| Source account not yours / destination doesn't exist | 404 | `ACCOUNT_NOT_FOUND` |
| Same source and destination | 422 | `SAME_ACCOUNT` |
| Destination not your account and not a saved payee | 422 | `PAYEE_NOT_FOUND` |
| Amount greater than balance | 422 | `INSUFFICIENT_FUNDS` |
| More than £5,000 sent from one account today | 422 | `DAILY_LIMIT_EXCEEDED` |

Every error has the shape `{ "error": { "code": "...", "message": "..." } }`.

## Test helpers and fault injection

| How | Effect |
|-----|--------|
| `POST /__test/reset` | Restore seed data, clear sessions, transfers and faults |
| `POST /__test/expire-sessions` | Every token becomes invalid (simulates session timeout) |
| `POST /__test/config` `{ "delayMs": 3000, "failStatus": 503 }` | Slow down / fail **all** normal requests until reset. Ideal for manual testing of the app |
| Header `x-mock-delay-ms: 2000` | Delay this request only |
| Header `x-mock-status: 500` | Make this request fail with that status |
| Env `MOCK_DELAY_MS=1000` | Delay every request from start-up |
| Env `MOCK_LOG=off` | Turn off the request log |

```bash
curl -X POST localhost:4000/__test/config -H 'content-type: application/json' -d '{"delayMs":3000}'
```
