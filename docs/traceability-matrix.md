# Requirements Traceability Matrix

Shows which tests cover each acceptance criterion, at which level. Gaps are listed honestly at the bottom.

| Req | Manual | Unit / Component (Jest) | API (`api-test-framework`) | E2E (Detox) |
|-----|--------|-------------------------|----------------------------|-------------|
| AC-01.1 Login success | TC-LOGIN-01 | LoginScreen.test – trims email | auth – logs in with valid credentials | login – logs in with valid credentials |
| AC-01.2 Empty fields | TC-LOGIN-02 | validation – requires both fields; LoginScreen – empty form | auth – returns 400 for … (5 cases) | login – field errors on empty form |
| AC-01.3 Email format | TC-LOGIN-03 | validation – rejects malformed email | – | login – rejects invalid email format |
| AC-01.4 No user enumeration | TC-LOGIN-04, 05 | – | auth – same error for unknown email | login – wrong credentials |
| AC-01.5 Password cleared | TC-LOGIN-04 | LoginScreen – clears password on 401 | – | login – clears the password |
| AC-01.6 Locked account | TC-LOGIN-06 | friendlyMessage – ACCOUNT_LOCKED | auth – locked account 423 | login – locked customer |
| AC-01.7 Email case/spaces | TC-LOGIN-07 | LoginScreen – trims email | auth – case-insensitive | – |
| AC-01.8 Logout | TC-LOGIN-09 | – | auth – invalidates token after logout | login – returns to login after logout |
| AC-02.1–02.3 Accounts list, format, total | TC-ACC-01 | money – formatMinor | accounts – returns only user's accounts, balances | accounts – formatted balances + total |
| AC-02.4 Data isolation | TC-ACC-02 | – | accounts – 404 for other customer's account / transactions | accounts – no other customer's accounts |
| AC-02.5 Load error + retry | TC-ACC-04 | – | resilience – timeout, 5xx | – |
| AC-03.1 Newest first | TC-TXN-01 | – | accounts – newest first | accounts – opens account details |
| AC-03.3 Pagination | – | – | accounts – paginates; limit boundaries | – |
| AC-04.1 From/to selection | TC-PAY-01, 02, 10 | validation – requires source/destination | transfers – payee / not a payee / unknown | transfer – requires a destination |
| AC-04.2 Amount formats | TC-PAY-03 | money – parseAmountToMinor (8 cases) | – | – |
| AC-04.3 Invalid amounts | TC-PAY-04 | money – rejects (10 cases) | transfers – rejects zero/negative/decimal/string/null | transfer – validation (5 cases) |
| AC-04.4 Balance boundary | TC-PAY-05, 06 | validation – balance boundaries | transfers – exact balance; 1p more | transfer – more than the balance |
| AC-04.5 Daily limit | TC-PAY-07, 08 | validation – £5,000 boundary | transfers – daily limit across transfers | transfer – daily limit error |
| AC-04.6 Reference length | TC-PAY-09 | validation – 18 vs 19 | transfers – 18 accepted, 19 rejected | transfer – reference > 18 |
| AC-04.7 Same account | TC-PAY-14 | validation – same account | transfers – same account | – |
| AC-04.8 Review + edit | TC-PAY-11 | – | – | transfer – keeps values when editing |
| AC-04.9 / 04.10 Success + balances | TC-PAY-01, 02 | – | transfers – balances, history, conservation check | transfer – own accounts, payee |
| AC-04.11 No double payment | TC-PAY-12, 13 | – | transfers – idempotency key replay; resilience – POST never retried | – (manual) |
| AC-04.12 Friendly errors | TC-LOGIN-10, TC-PAY-08 | friendlyMessage (7 cases) | resilience – structured errors | transfer – daily limit message |

## Known gaps

- **AC-03.2** (green "+" for money in) and **AC-03.4** (empty state) are only covered manually; no seeded account has zero transactions.
- **AC-04.11** double-tap is hard to automate reliably in Detox – covered manually and at API level.
- No automated accessibility checks yet.
