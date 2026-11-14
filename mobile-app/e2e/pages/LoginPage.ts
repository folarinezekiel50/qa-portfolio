import { by, element, expect, waitFor } from 'detox';
import { users } from '../support/backend';

/** Page Object: every selector and action for the login screen lives here, not in the tests. */
export const LoginPage = {
  screen: () => element(by.id('login.screen')),
  email: () => element(by.id('login.email')),
  password: () => element(by.id('login.password')),
  submit: () => element(by.id('login.submit')),
  error: () => element(by.id('login.error')),
  emailError: () => element(by.id('login.email.error')),
  passwordError: () => element(by.id('login.password.error')),

  async waitUntilVisible() {
    await waitFor(this.screen()).toBeVisible().withTimeout(10_000);
  },

  async loginWith(email: string, password: string) {
    await this.email().replaceText(email);
    await this.password().replaceText(password);
    await this.submit().tap();
  },

  async loginAs(user: keyof typeof users = 'alice') {
    await this.waitUntilVisible();
    await this.loginWith(users[user].email, users[user].password);
  },

  async expectError(text: string) {
    await waitFor(this.error()).toBeVisible().withTimeout(10_000);
    await expect(this.error()).toHaveText(text);
  },
};
