import { by, device, element, expect, waitFor } from 'detox';
import { resetBackend } from './support/backend';
import { LoginPage } from './pages/LoginPage';
import { AccountsPage } from './pages/AccountsPage';
import { TransferPage } from './pages/TransferPage';

describe('Make a payment', () => {
  beforeEach(async () => {
    await resetBackend();
    await device.launchApp({ newInstance: true, delete: true });
    await LoginPage.loginAs('alice');
    await AccountsPage.waitUntilLoaded();
    await AccountsPage.startPayment();
    await TransferPage.waitUntilLoaded();
  });

  it('moves money between own accounts and updates both balances', async () => {
    await TransferPage.fill({ from: 'ACC-1001', to: 'ACC-1002', amount: '100.50', reference: 'Savings' });
    await TransferPage.tapContinue();
    await expect(element(by.id('review.amount'))).toHaveText('£100.50');
    await TransferPage.confirmPayment();
    await TransferPage.expectSuccess('You sent £100.50 to Rainy Day Saver');

    await TransferPage.done().tap();
    await AccountsPage.waitUntilLoaded();
    await AccountsPage.expectBalance('ACC-1001', '£2,399.50');
    await AccountsPage.expectBalance('ACC-1002', '£10,100.50');
  });

  it('pays a saved payee', async () => {
    await TransferPage.fill({ from: 'ACC-1001', to: 'ACC-2001', amount: '25' });
    await TransferPage.tapContinue();
    await TransferPage.confirmPayment();
    await TransferPage.expectSuccess('You sent £25.00 to Bob Smith');
  });

  it('keeps entered values when going back from review to edit', async () => {
    await TransferPage.fill({ to: 'ACC-1002', amount: '12.34', reference: 'Keep me' });
    await TransferPage.tapContinue();
    await TransferPage.edit().tap();
    await expect(TransferPage.amount()).toHaveText('12.34');
    await expect(TransferPage.reference()).toHaveText('Keep me');
  });

  describe('validation', () => {
    const cases: Array<[string, string, string]> = [
      ['empty amount', '', 'Enter an amount'],
      ['letters', 'abc', 'Enter a valid amount, like 10.50'],
      ['three decimal places', '1.005', 'Enter a valid amount, like 10.50'],
      ['zero', '0.00', 'Amount must be more than £0.00'],
      ['more than the balance', '2500.01', 'You only have £2,500.00 available'],
    ];
    for (const [label, amount, message] of cases) {
      it(`shows "${message}" for ${label}`, async () => {
        await TransferPage.fill({ from: 'ACC-1001', to: 'ACC-1002', amount });
        await TransferPage.tapContinue();
        await expect(TransferPage.amountError()).toHaveText(message);
        await expect(TransferPage.review()).not.toExist();
      });
    }

    it('requires a destination', async () => {
      await TransferPage.fill({ amount: '10' });
      await TransferPage.tapContinue();
      await expect(TransferPage.toError()).toHaveText('Choose who to pay');
    });

    it('rejects a reference longer than 18 characters', async () => {
      await TransferPage.fill({ to: 'ACC-1002', amount: '10', reference: 'x'.repeat(19) });
      await TransferPage.tapContinue();
      await expect(TransferPage.referenceError()).toHaveText('Reference must be 18 characters or fewer');
    });
  });

  it('shows the server\'s daily limit error on the review screen', async () => {
    // First payment of £3,000 from savings succeeds…
    await TransferPage.fill({ from: 'ACC-1002', to: 'ACC-1001', amount: '3000' });
    await TransferPage.tapContinue();
    await TransferPage.confirmPayment();
    await TransferPage.expectSuccess('You sent £3,000.00 to Everyday Current');
    await TransferPage.done().tap();

    // …a second £3,000 takes the day's total over £5,000. Only the server knows the running total.
    await AccountsPage.waitUntilLoaded();
    await AccountsPage.startPayment();
    await TransferPage.waitUntilLoaded();
    await TransferPage.fill({ from: 'ACC-1002', to: 'ACC-1001', amount: '3000' });
    await TransferPage.tapContinue();
    await TransferPage.confirmPayment();
    await waitFor(TransferPage.serverError()).toBeVisible().withTimeout(10_000);
    await expect(TransferPage.serverError()).toHaveText('This payment would take you over your £5,000 daily limit.');
  });
});
