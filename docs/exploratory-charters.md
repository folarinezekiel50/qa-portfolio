# Exploratory Testing Charters

Exploratory testing = learning, designing and executing tests at the same time, guided by a **charter** (a mission) and a **time box**. Write notes as you go; anything odd becomes a question or a bug.

Charter format: *Explore* **target** *with* **resources** *to discover* **information**.

> Fill in the session notes yourself. Real notes from real sessions are far more convincing in an interview than a template.

---

## Charter 1 – Money input

**Explore** the amount field on Make a payment **with** unusual inputs (spaces, symbols, pasted text, very long numbers, emoji, locale formats) **to discover** amounts that are accepted but wrong, or rejected with an unhelpful message.

- Time box: 30 min · Platform: ______ · Date: ______
- Ideas: `0.001`, `1 000`, `1,000,000`, `12,34`, `£ 5`, `5£`, paste `10\n`, `٣` (Arabic digit), max length, switch keyboard type
- **Notes:**
- **Bugs raised:** (BUG-002 and BUG-004 came from this area)
- **Questions for the team:**

## Charter 2 – Interruptions during a payment

**Explore** the payment review and confirm step **with** interruptions (backgrounding, rotating, incoming call simulation, killing the app, airplane mode, slow API via `MOCK_DELAY_MS`) **to discover** whether a payment can be lost, duplicated or left in an unclear state.

- Time box: 45 min
- **Notes:**
- **Bugs raised:**
- **Questions:**

## Charter 3 – Session and security

**Explore** login, logout and expired sessions **with** server restarts, the Android back button and app restarts **to discover** ways to see data you should not, or to get stuck.

- Time box: 30 min
- **Notes:** (BUG-001 came from this area)
- **Bugs raised:**

## Charter 4 – API traffic inspection

**Explore** the network traffic between app and API **with** the mock server's request log (or a proxy like Proxyman/Charles) **to discover** unnecessary calls, missing headers, leaked data and inconsistent error handling.

- Time box: 30 min
- Things to check: is the idempotency key different for each new payment but the same on retry? Are accounts reloaded after a payment? Is the password ever logged?
- **Notes:**

---

## Session report (copy for each session)

| Field | Value |
|-------|-------|
| Charter | |
| Tester | |
| Date / duration | |
| Build / platform | |
| % time on testing vs bug investigation vs setup | |
| What I covered | |
| What I did not cover | |
| Bugs | |
| Issues / questions | |
