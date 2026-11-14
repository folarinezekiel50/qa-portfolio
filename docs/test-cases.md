# Manual Test Cases – QA Bank

**How to use:** reset data and faults before each case (`curl -X POST http://localhost:4000/__test/reset`), run each case on **iOS** and **Android**, and fill in the result columns (Pass / Fail + bug ID). Password for all test users is `Password123!`.

Priority: **P1** must pass for release · **P2** should pass · **P3** nice to have.

## Login

| ID | Title | Pri | Preconditions | Steps | Expected result | Req | iOS | Android |
|----|-------|-----|---------------|-------|-----------------|-----|-----|---------|
| TC-LOGIN-01 | Successful login | P1 | App on login screen | 1. Enter `alice@example.com` 2. Enter valid password 3. Tap **Log in** | Accounts screen opens; header shows "Hello, Alice" | AC-01.1 | | |
| TC-LOGIN-02 | Empty form | P1 | Login screen | 1. Tap **Log in** with both fields empty | "Enter your email address" and "Enter your password" shown under the fields; no loading spinner | AC-01.2 | | |
| TC-LOGIN-03 | Invalid email format | P2 | Login screen | 1. Enter `alice@` 2. Enter any password 3. Tap **Log in** | "Enter a valid email address" shown | AC-01.3 | | |
| TC-LOGIN-04 | Wrong password | P1 | Login screen | 1. Enter `alice@example.com` 2. Enter `Wrong123` 3. Tap **Log in** | Red banner "Email or password is incorrect."; password field is empty; email kept | AC-01.4, AC-01.5 | | |
| TC-LOGIN-05 | Unknown email gives same message | P1 | Login screen | 1. Enter `nobody@example.com` + any password 2. Tap **Log in** | Exactly the same message as TC-LOGIN-04 | AC-01.4 | | |
| TC-LOGIN-06 | Locked account | P1 | Login screen | 1. Log in as `locked@example.com` | "Your account is locked. Please contact support." | AC-01.6 | | |
| TC-LOGIN-07 | Email case and spaces | P3 | Login screen | 1. Enter `  ALICE@Example.COM  ` 2. Valid password 3. Log in | Login succeeds | AC-01.7 | | |
| TC-LOGIN-08 | Password is masked | P2 | Login screen | 1. Type a password | Characters are hidden | – | | |
| TC-LOGIN-09 | Logout | P1 | Logged in as Alice | 1. Tap **Log out** | Login screen shown with empty fields; Android back button does not return to accounts | AC-01.8 | | |
| TC-LOGIN-10 | Backend down | P2 | Stop the mock server | 1. Try to log in | "Cannot reach the bank. Check your connection and try again." App does not crash | AC-04.12 | | |

## Accounts and transactions

| ID | Title | Pri | Preconditions | Steps | Expected result | Req | iOS | Android |
|----|-------|-----|---------------|-------|-----------------|-----|-----|---------|
| TC-ACC-01 | Accounts list | P1 | Logged in as Alice | 1. View Accounts screen | Two cards: Everyday Current £2,500.00 and Rainy Day Saver £10,000.00; total £12,500.00 | AC-02.1–02.3 | | |
| TC-ACC-02 | Data isolation | P1 | Logged in as Bob | 1. View Accounts screen | Only "Bob Current £150.00"; none of Alice's accounts | AC-02.4 | | |
| TC-ACC-03 | Pull to refresh | P3 | Logged in as Alice | 1. Pull the list down | Spinner shows, list reloads, no duplicates | – | | |
| TC-ACC-04 | Load error + retry | P2 | Logged in as Alice | 1. Make the API slower than the app's 10 s timeout: `curl -X POST localhost:4000/__test/config -H 'content-type: application/json' -d '{"delayMs":15000}'` 2. Tap Everyday Current 3. Turn delay off with `-d '{"delayMs":0}'` 4. Tap **Retry** | Step 2: "The bank is taking too long to respond. Please try again." with **Retry**. Step 4: account loads | AC-02.5 | | |
| TC-TXN-01 | Transaction list | P1 | Logged in as Alice | 1. Tap Everyday Current | Balance £2,500.00; transactions newest first: Gym Membership (6 Nov) at top, Salary (28 Oct) at bottom | AC-03.1 | | |
| TC-TXN-02 | Money in vs out | P2 | As TC-TXN-01 | 1. Look at Salary and Rent rows | Salary "+£2,800.00" in green; Rent "-£950.00" in normal colour | AC-03.2 | | |
| TC-TXN-03 | Back navigation | P2 | On account details | 1. Tap **‹ Back** 2. Repeat using Android hardware back | Returns to Accounts each time | – | | |

## Payments

| ID | Title | Pri | Preconditions | Steps | Expected result | Req | iOS | Android |
|----|-------|-----|---------------|-------|-----------------|-----|-----|---------|
| TC-PAY-01 | Pay own account | P1 | Alice logged in | 1. **Make a payment** 2. From Everyday Current, to Rainy Day Saver 3. Amount `100.50`, reference `Savings` 4. **Continue** 5. Check review 6. **Confirm and pay** 7. **Back to accounts** | Review shows £100.50, both accounts, reference. Success: "You sent £100.50 to Rainy Day Saver" + payment ID. Balances: £2,399.50 and £10,100.50 | AC-04.1, 04.8–04.10 | | |
| TC-PAY-02 | Pay a payee | P1 | Alice logged in | 1. Pay `25` to Bob Smith (payee) | Success message; log in as Bob: balance £175.00 and a "from ACC-1001" transaction | AC-04.1, 04.10 | | |
| TC-PAY-03 | Amount formats | P2 | Payment form | Try `10`, `10.5`, `.50`, `1,000.00`, `£12` | All accepted; review shows £10.00, £10.50, £0.50, £1,000.00, £12.00 | AC-04.2 | | |
| TC-PAY-04 | Invalid amounts | P1 | Payment form | Try empty, `0`, `abc`, `-5`, `1.005` | Each shows an amount error and stays on the form | AC-04.3 | | |
| TC-PAY-05 | Exact balance (boundary) | P1 | Log in as Bob | 1. Pay `150.00` to Alice | Allowed; Bob's balance becomes £0.00 | AC-04.4 | | |
| TC-PAY-06 | Balance + 1p (boundary) | P1 | Log in as Bob | 1. Enter `150.01` 2. Continue | "You only have £150.00 available" | AC-04.4 | | |
| TC-PAY-07 | Single payment limit | P1 | Alice, from Rainy Day Saver | 1. Enter `5000.01` | "The most you can send in a day is £5,000.00" | AC-04.5 | | |
| TC-PAY-08 | Daily limit across payments | P1 | Alice | 1. Pay £3,000 from Saver to Current 2. Pay another £3,000 from Saver | Second payment fails on review: "This payment would take you over your £5,000 daily limit."; Saver balance only reduced once | AC-04.5, 04.12 | | |
| TC-PAY-09 | Reference length | P2 | Payment form | 1. Reference of 18 chars → Continue 2. Reference of 19 chars → Continue | 18 accepted; 19 shows "Reference must be 18 characters or fewer" | AC-04.6 | | |
| TC-PAY-10 | No destination | P2 | Payment form | 1. Enter amount only 2. Continue | "Choose who to pay" | AC-04.1 | | |
| TC-PAY-11 | Edit keeps values | P2 | On review screen | 1. Tap **Edit payment** | Form shows the same from, to, amount and reference | AC-04.8 | | |
| TC-PAY-12 | Double tap confirm | P1 | On review screen | 1. Tap **Confirm and pay** twice very quickly | Only one payment; only one debit in transaction history | AC-04.11 | | |
| TC-PAY-13 | Slow network on confirm | P1 | On review screen, then set a 3 s delay: `curl -X POST localhost:4000/__test/config -H 'content-type: application/json' -d '{"delayMs":3000}'` | 1. Confirm a payment | Spinner on button, buttons disabled, then success. Exactly one payment made | AC-04.11 | | |
| TC-PAY-14 | Source not in destinations | P3 | Payment form | 1. Select each "from" account | The selected "from" account never appears in the "To" list | AC-04.7 | | |

## Non-functional spot checks

| ID | Title | Pri | Steps | Expected result | iOS | Android |
|----|-------|-----|-------|-----------------|-----|---------|
| TC-NF-01 | App backgrounded mid-payment | P2 | Fill payment form → background app 30 s → return | Form values still there; app does not crash | | |
| TC-NF-02 | Large text | P3 | Set device font size to largest → use all screens | Text readable, nothing important cut off | | |
| TC-NF-03 | Screen reader labels | P3 | Turn on VoiceOver/TalkBack → navigate login | Fields and buttons are announced with meaningful names | | |
| TC-NF-04 | Keyboard | P2 | On small device, focus password field | Log in button is reachable while keyboard is open | | |
