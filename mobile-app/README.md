# QA Bank – React Native app

A small banking app built with React Native (Expo) and TypeScript to practise mobile QA: manual testing on iOS and Android, unit/component tests with Jest, and end-to-end UI tests with Detox.

**Features**: login/logout · accounts overview · transaction history with paging · payments to own accounts and saved payees with validation, review step and success screen.

## 1. Set up

```bash
npm install
npx expo install --fix     # aligns Expo/React Native package versions with the installed SDK
```

Start the mock API in another terminal (the app needs it):

```bash
npm run mock-server        # http://localhost:4000
```

## 2. Run the app

```bash
npx expo prebuild          # generates the native ios/ and android/ folders (needed for Detox)
npm run ios                # iOS Simulator (macOS + Xcode)
npm run android            # Android Emulator (Android Studio)
```

The app calls `http://localhost:4000` on iOS and `http://10.0.2.2:4000` on the Android emulator (that address is how the emulator reaches your computer). On a real phone set `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:4000`.

Log in with `alice@example.com` / `Password123!`.

## 3. Unit and component tests (Jest)

```bash
npm test
npm run test:coverage
```

| File | Covers |
|------|--------|
| `__tests__/money.test.ts` | Formatting pence as £, parsing typed amounts (incl. float trap 19.99 and BUG-003 regression) |
| `__tests__/validation.test.ts` | Login and payment validation, boundary values for balance, daily limit and reference |
| `__tests__/friendlyMessage.test.ts` | API error codes → customer-friendly text, no raw 5xx messages |
| `__tests__/LoginScreen.test.tsx` | Screen behaviour with a mocked API: validation, trimming, 401, network error |

## 4. End-to-end tests (Detox)

Detox installs a real build of the app on a simulator/emulator and drives it like a user.

**One-off setup**

- iOS: `brew tap wix/brew && brew install applesimutils`, and an "iPhone 16" simulator in Xcode.
- Android: create an emulator in Android Studio and set its name: `export DETOX_AVD=Pixel_7_API_35` (or edit `.detoxrc.js`).

**Run** (with the mock server running):

```bash
npm run e2e:build:android && npm run e2e:test:android
npm run e2e:build:ios     && npm run e2e:test:ios
```

Screenshots and logs of failing tests are saved in `e2e/artifacts/`.

```
e2e/
  pages/            Page Objects – all selectors and actions per screen
  support/backend.ts  resets the mock server before every test
  login.e2e.ts      6 tests – success, field errors, wrong password, locked, logout
  accounts.e2e.ts   4 tests – balances, data isolation, details, back navigation
  transfer.e2e.ts   11 tests – own account, payee, edit, 7 validation cases, server daily limit
```

**Testability choices in the app code**

- Every interactive element has a stable `testID` (e.g. `transfer.amount`, `account.balance.ACC-1001`), so tests never depend on text or layout.
- Field errors use `<field testID>.error`, so a Page Object can find the error for any field.
- Release builds are used for E2E so tests don't depend on the Metro dev server.

## Notes on the code

- Money is stored and sent as integer pence (`src/utils/money.ts`).
- Payments use an idempotency key and a double-tap guard (`src/screens/TransferScreen.tsx`).
- Client validation mirrors server rules for fast feedback; the server still validates everything.
- Navigation is a tiny custom stack (`src/navigation/Navigator.tsx`) to keep native dependencies to a minimum.
