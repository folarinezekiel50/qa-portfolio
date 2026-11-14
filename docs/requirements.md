# QA Bank – Requirements (User Stories)

These user stories are the test basis for the manual test cases, the API tests and the Detox tests.
Each acceptance criterion has an ID so it can be traced (see [traceability-matrix.md](traceability-matrix.md)).

## US-01 Log in

> As a customer, I want to log in with my email and password so that only I can see my money.

| ID | Acceptance criterion |
|----|----------------------|
| AC-01.1 | Valid email + password opens the Accounts screen and greets me by first name. |
| AC-01.2 | Empty email or password shows a field error and no request is sent. |
| AC-01.3 | A badly formatted email shows "Enter a valid email address". |
| AC-01.4 | Wrong password **or** unknown email shows the same message: "Email or password is incorrect." (no user enumeration). |
| AC-01.5 | After a failed login, the password field is cleared. |
| AC-01.6 | A locked account sees "Your account is locked. Please contact support." |
| AC-01.7 | Email is case-insensitive and surrounding spaces are ignored. |
| AC-01.8 | Logging out returns to the login screen and the old token stops working. |

## US-02 View accounts

> As a customer, I want to see all my accounts and balances in one place.

| ID | Acceptance criterion |
|----|----------------------|
| AC-02.1 | All of my accounts are listed with name, type, account number and balance. |
| AC-02.2 | Balances are shown in GBP with two decimal places and thousands separators (e.g. £2,500.00). |
| AC-02.3 | A total balance across accounts is shown. |
| AC-02.4 | I never see another customer's accounts, even by guessing an account ID. |
| AC-02.5 | If loading fails, I see an error with a Retry option. |

## US-03 View transactions

> As a customer, I want to see my recent transactions for an account.

| ID | Acceptance criterion |
|----|----------------------|
| AC-03.1 | Transactions are shown newest first, with description, date and amount. |
| AC-03.2 | Money in is shown with a "+" and in green; money out without. |
| AC-03.3 | Transactions load in pages of 10 as I scroll, with no duplicates or gaps. |
| AC-03.4 | An account with no transactions shows "No transactions yet." |

## US-04 Make a payment

> As a customer, I want to move money between my accounts or pay a saved payee.

| ID | Acceptance criterion |
|----|----------------------|
| AC-04.1 | I can choose a "from" account and a destination (my other accounts or saved payees). |
| AC-04.2 | Amount accepts formats like 10, 10.5, 10.50, .50 and 1,000.00. |
| AC-04.3 | Amount must be more than £0.00 and have at most 2 decimal places. |
| AC-04.4 | I cannot send more than the available balance. Sending the exact balance is allowed. |
| AC-04.5 | A single payment cannot exceed £5,000, and the total sent from an account per day cannot exceed £5,000. |
| AC-04.6 | Reference is optional and at most 18 characters. |
| AC-04.7 | I cannot pay into the same account I am paying from. |
| AC-04.8 | Before paying, I see a review screen and can go back and edit without losing what I typed. |
| AC-04.9 | After confirming, I see a success screen with the amount, payee and a payment ID. |
| AC-04.10 | Balances on both accounts update correctly after the payment. |
| AC-04.11 | Tapping "Confirm" twice, or retrying after a timeout, never sends the payment twice. |
| AC-04.12 | Server errors are shown as clear, customer-friendly messages, never raw technical text. |
