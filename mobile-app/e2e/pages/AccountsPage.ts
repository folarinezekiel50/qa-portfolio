import { by, element, expect, waitFor } from 'detox';

export const AccountsPage = {
  screen: () => element(by.id('accounts.screen')),
  greeting: () => element(by.id('accounts.greeting')),
  card: (id: string) => element(by.id(`account.card.${id}`)),
  balance: (id: string) => element(by.id(`account.balance.${id}`)),
  makePayment: () => element(by.id('accounts.transfer')),
  logout: () => element(by.id('accounts.logout')),

  async waitUntilLoaded() {
    await waitFor(this.greeting()).toBeVisible().withTimeout(15_000);
    await waitFor(element(by.id('accounts.list'))).toBeVisible().withTimeout(15_000);
  },

  async expectBalance(accountId: string, text: string) {
    await waitFor(this.balance(accountId)).toHaveText(text).withTimeout(10_000);
    await expect(this.balance(accountId)).toHaveText(text);
  },

  async openAccount(accountId: string) {
    await this.card(accountId).tap();
  },

  async startPayment() {
    await waitFor(this.makePayment()).toBeVisible().whileElement(by.id('accounts.list')).scroll(200, 'down');
    await this.makePayment().tap();
  },
};
