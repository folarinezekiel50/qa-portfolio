# Test Plan – QA Bank (Mobile App + API)

| | |
|---|---|
| **Version** | 1.0 |
| **Author** | [Your Name] |
| **Product** | QA Bank demo app (React Native / Expo) and Mock Bank API (Node.js) |
| **Test basis** | [requirements.md](requirements.md) |

## 1. Purpose

Describe how QA Bank is tested: what is in scope, the approach for each test level, the environments, and when testing is "done". The plan is written for a small team where QA is being set up from scratch, so it also sets out the basic processes (bug reporting, regression, CI).

## 2. Scope

**In scope**

- Login, logout and session handling
- Accounts overview and account details / transaction history
- Payments between own accounts and to saved payees, including all validation and business rules
- API contract, security basics (authorisation, user enumeration, data leakage) and resilience (timeouts, 5xx, retries)
- iOS Simulator and Android Emulator

**Out of scope**

- Real payment rails, real money, real authentication providers
- Performance/load testing beyond simple response-time budgets
- Accessibility audit (only basic labels and roles are checked) – recommended as a follow-up
- Physical devices (recommended before any real release)

## 3. Test levels and approach

| Level | What | Tool | Where it runs |
|-------|------|------|---------------|
| Unit | Money parsing/formatting, form validation, error-message mapping | Jest | Every push (CI) |
| Component | Screens rendered with mocked API (e.g. Login) | Jest + React Native Testing Library | Every push (CI) |
| API | Every endpoint: positive, negative, boundary, security, resilience | Custom TypeScript framework on `node:test` | Every push (CI) |
| End-to-end UI | Critical user journeys on a real app build | Detox | Nightly + manual trigger (CI), locally before release |
| Manual – scripted | Test cases in [test-cases.md](test-cases.md) | Simulator/emulator | Each release candidate |
| Manual – exploratory | Time-boxed charters in [exploratory-charters.md](exploratory-charters.md) | Simulator/emulator | Each new feature + before release |

**Why this split?** Most rules (for example the 1p boundaries and the daily limit) are cheap and fast to check at API and unit level. UI tests are slower and more fragile, so Detox covers only the journeys a customer must be able to complete, plus a sample of validation messages. Manual exploratory testing covers what automation is bad at: look and feel, odd sequences of actions, interruptions (backgrounding the app, rotating, losing network).

### Test design techniques used

- **Equivalence partitioning** – e.g. amount: valid, zero, negative, non-numeric, too many decimals
- **Boundary value analysis** – balance (£2,500.00 / £2,500.01), daily limit (£5,000.00 / £5,000.01), reference length (18 / 19), page size (`limit` 0 / 1 / 100 / 101)
- **Decision tables** – transfer destination: own account vs payee vs unknown vs same account
- **State transitions** – logged out → logged in → token revoked/expired
- **Error guessing** – double taps, float rounding (19.99), decimal comma, huge numbers

## 4. Environments

| Component | Setup |
|-----------|-------|
| Mock API | `cd mock-server && npm start` → `http://localhost:4000` (Android emulator reaches it at `10.0.2.2:4000`) |
| iOS | Xcode iOS Simulator (iPhone 16) |
| Android | Android Emulator (Pixel 7, API 35) |
| Test data | Seeded users and accounts; reset any time with `POST /__test/reset` |

**Test users** (password for all: `Password123!`)

| User | Purpose |
|------|---------|
| alice@example.com | Main user: 2 accounts (£2,500.00 current, £10,000.00 savings), payee Bob |
| bob@example.com | Low balance (£150.00), payee Alice – good for insufficient-funds tests |
| locked@example.com | Locked account |

The mock API can simulate a slow or broken backend: per request with headers `x-mock-delay-ms` / `x-mock-status` (used by automated tests), or for everything at once with `POST /__test/config {"delayMs": 3000, "failStatus": 503}` (used for manual testing of the app). `POST /__test/expire-sessions` simulates every user's session timing out.

## 5. Entry and exit criteria

**Entry**: build installs and launches on both platforms; mock API health check passes; unit and API tests are green.

**Exit (release candidate)**:

- 100 % of P1 manual test cases executed and passed on iOS **and** Android
- All automated suites green in CI
- No open P1/P2 defects; P3/P4 defects reviewed and accepted by the product owner
- Exploratory charters for any new features completed with notes

## 6. Defect management

Bugs are logged using the template in [bug-reports.md](bug-reports.md). Each bug has: ID, title (what + where), environment, severity, priority, preconditions, numbered steps, expected vs actual result, evidence (screenshot/video/logs/API trace) and status.

| Severity | Meaning | Example |
|----------|---------|---------|
| S1 Critical | Money or data is wrong/lost, security hole, crash on a core flow | Payment sent twice |
| S2 Major | Core feature blocked or badly wrong, no workaround | Cannot log in |
| S3 Minor | Feature works but with a workaround or wrong message | Misleading validation text |
| S4 Trivial | Cosmetic | Misaligned label |

## 7. Regression strategy

- Every fixed bug gets an automated test at the lowest sensible level (see BUG-003 → `money.test.ts`).
- CI runs unit + API suites on every push and pull request; Detox nightly.
- Before each release: run the P1 manual set and a 30-minute exploratory session on the areas that changed.

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Mock API behaves differently from a real backend | Keep API contract tests; when a real backend exists, point the API suite at it via `API_BASE_URL` |
| UI tests are slow/flaky | Keep Detox suite small; use test IDs not text; reset data before each test; screenshots/video on failure |
| Simulator ≠ real device | Add a physical-device pass before real releases |
| Shared test data between parallel tests | API and Detox suites run serially and reset state before each test |
