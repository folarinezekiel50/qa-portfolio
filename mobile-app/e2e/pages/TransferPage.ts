import { by, element, expect, waitFor } from 'detox';

export const TransferPage = {
  form: () => element(by.id('transfer.screen')),
  review: () => element(by.id('transfer.review')),
  from: (id: string) => element(by.id(`transfer.from.${id}`)),
  to: (id: string) => element(by.id(`transfer.to.${id}`)),
  amount: () => element(by.id('transfer.amount')),
  amountError: () => element(by.id('transfer.amount.error')),
  reference: () => element(by.id('transfer.reference')),
  referenceError: () => element(by.id('transfer.reference.error')),
  toError: () => element(by.id('transfer.to.error')),
  continueButton: () => element(by.id('transfer.continue')),
  confirm: () => element(by.id('transfer.confirm')),
  edit: () => element(by.id('transfer.edit')),
  serverError: () => element(by.id('transfer.error')),
  successMessage: () => element(by.id('success.message')),
  done: () => element(by.id('success.done')),

  async waitUntilLoaded() {
    await waitFor(this.amount()).toBeVisible().withTimeout(15_000);
  },

  async fill({ from, to, amount, reference }: { from?: string; to?: string; amount?: string; reference?: string }) {
    if (from) await this.from(from).tap();
    if (to) await this.to(to).tap();
    if (amount !== undefined) await this.amount().replaceText(amount);
    if (reference !== undefined) await this.reference().replaceText(reference);
  },

  async tapContinue() {
    await waitFor(this.continueButton()).toBeVisible().whileElement(by.id('transfer.scroll')).scroll(150, 'down');
    await this.continueButton().tap();
  },

  async confirmPayment() {
    await waitFor(this.confirm()).toBeVisible().withTimeout(5_000);
    await this.confirm().tap();
  },

  async expectSuccess(text: string) {
    await waitFor(this.successMessage()).toBeVisible().withTimeout(15_000);
    await expect(this.successMessage()).toHaveText(text);
  },
};
