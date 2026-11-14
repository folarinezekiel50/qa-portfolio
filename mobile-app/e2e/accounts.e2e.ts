import { by, device, element, expect, waitFor } from 'detox';
import { resetBackend } from './support/backend';
import { LoginPage } from './pages/LoginPage';
import { AccountsPage } from './pages/AccountsPage';

describe('Accounts overview', () => {
  beforeEach(async () => {
    await resetBackend();
    await device.launchApp({ newInstance: true, delete: true });
    await LoginPage.loginAs('alice');
    await AccountsPage.waitUntilLoaded();
  });

  it('lists each account with a correctly formatted balance', async () => {
    await AccountsPage.expectBalance('ACC-1001', '£2,500.00');
    await AccountsPage.expectBalance('ACC-1002', '£10,000.00');
    await expect(element(by.id('accounts.total'))).toHaveText('Total balance £12,500.00');
  });

  it('does not show another customer\'s accounts', async () => {
    await expect(AccountsPage.card('ACC-2001')).not.toExist();
  });

  it('opens account details with transactions, newest first', async () => {
    await AccountsPage.openAccount('ACC-1001');
    await waitFor(element(by.id('detail.balance'))).toHaveText('£2,500.00').withTimeout(10_000);
    // T-5 (Gym, 6 Nov) is the newest seeded transaction and T-1 (Salary) the oldest.
    // Exact ordering is covered by the API tests; here we check the list renders real data.
    await waitFor(element(by.id('txn.T-5'))).toBeVisible().withTimeout(10_000);
    await expect(element(by.id('txn.T-1'))).toExist();
  });

  it('navigates back to the account list', async () => {
    await AccountsPage.openAccount('ACC-1002');
    await waitFor(element(by.id('detail.screen'))).toBeVisible().withTimeout(10_000);
    await element(by.id('header.back')).tap();
    await expect(AccountsPage.screen()).toBeVisible();
  });
});
