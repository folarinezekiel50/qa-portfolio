# Bug Log – QA Bank

These are real defects in this codebase, found by reviewing the code against the requirements and by unit/API testing. **Before an interview, reproduce each one yourself on a simulator and attach your own screenshots** – you should be able to talk through every report in detail.

| ID | Title | Severity | Priority | Status |
|----|-------|----------|----------|--------|
| BUG-001 | Expired session leaves user stuck on screen with no route back to login | S2 Major | P2 | Open |
| BUG-002 | Very large amount shows misleading "Enter a valid amount" error | S3 Minor | P3 | Open |
| BUG-003 | Amount ".50" rejected as invalid | S3 Minor | P2 | Fixed + regression test |
| BUG-004 | Decimal comma "12,34" read as £1,234.00 | S2 Major | P2 | Open – needs product decision |

---

## Template

```
ID / Title:   [Area] – what is wrong, where
Environment:  App build, platform + OS version, device/simulator, API version/URL
Severity / Priority:
Preconditions:
Steps to reproduce:
  1.
  2.
Expected result:
Actual result:
Evidence:     screenshot / video / device log / API trace
Notes:        frequency (always / intermittent), workaround, suspected cause
```

---

## BUG-001 – Expired session leaves user stuck on screen with no route back to login

| | |
|---|---|
| **Environment** | QA Bank 1.0.0, iOS Simulator + Android Emulator, mock API localhost:4000 |
| **Severity / Priority** | S2 Major / P2 |
| **Preconditions** | Logged in as alice@example.com |

**Steps to reproduce**

1. Log in as Alice and stay on the Accounts screen.
2. Simulate token expiry: `curl -X POST http://localhost:4000/__test/expire-sessions`
3. Tap **Everyday Current**.

**Expected result** – The app recognises the session has ended, returns to the login screen and explains why ("Your session has expired. Please log in again.").

**Actual result** – Account details screen shows a red banner "Your session has expired. Please log in again." with a **Retry** button. Retry fails again. The user must find **Back** and then **Log out** themselves.

**Evidence** – API trace: `GET /accounts/ACC-1001 -> 401 {"error":{"code":"UNAUTHORIZED",...}}`

**Notes** – Always reproducible. Suggested fix: handle `401 UNAUTHORIZED` centrally in the API client and call `logout()` from `AuthContext`.

---

## BUG-002 – Very large amount shows misleading "Enter a valid amount" error

| | |
|---|---|
| **Severity / Priority** | S3 Minor / P3 |
| **Preconditions** | On Make a payment screen |

**Steps to reproduce**

1. Enter amount `99999999999999` (14 digits).
2. Tap **Continue**.

**Expected result** – "The most you can send in a day is £5,000.00" (the amount is a valid number, just too large).

**Actual result** – "Enter a valid amount, like 10.50".

**Notes** – Cause: `parseAmountToMinor` returns `null` when pounds × 100 exceeds `Number.MAX_SAFE_INTEGER`, and `null` is treated as "invalid format". Low impact but confusing. Also consider a `maxLength` on the amount field.

---

## BUG-003 – Amount ".50" rejected as invalid ✅ Fixed

| | |
|---|---|
| **Severity / Priority** | S3 Minor / P2 |

**Steps to reproduce**

1. On Make a payment, enter `.50` as the amount.
2. Tap **Continue**.

**Expected result** – Accepted as £0.50 (AC-04.2).

**Actual result (before fix)** – "Enter a valid amount, like 10.50".

**Fix** – Amount regex in `mobile-app/src/utils/money.ts` now accepts a leading decimal point.
**Regression test** – `mobile-app/__tests__/money.test.ts` → "parses ".50" as 50 pence".

---

## BUG-004 – Decimal comma "12,34" read as £1,234.00

| | |
|---|---|
| **Severity / Priority** | S2 Major / P2 – money amount silently 100× larger than intended |

**Steps to reproduce**

1. On Make a payment, from Rainy Day Saver, enter amount `12,34` (how many European users write £12.34).
2. Tap **Continue**.

**Expected result** – Either £12.34, or a clear validation error.

**Actual result** – Review screen shows **£1,234.00**.

**Notes** – The review screen is the only safeguard. Commas are stripped as thousands separators. Needs a product decision: reject commas that are not followed by exactly 3 digits, or use the device locale. Current behaviour is pinned by a unit test so any change is deliberate.
