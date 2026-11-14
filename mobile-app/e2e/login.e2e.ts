import { device, expect } from 'detox';
import { resetBackend } from './support/backend';
import { LoginPage } from './pages/LoginPage';
import { AccountsPage } from './pages/AccountsPage';

describe('Login', () => {
  beforeEach(async () => {
    await resetBackend();
    await device.launchApp({ newInstance: true, delete: true });
    await LoginPage.waitUntilVisible();
  });

  it('logs in with valid credentials and greets the user', async () => {
    await LoginPage.loginAs('alice');
    await AccountsPage.waitUntilLoaded();
    await expect(AccountsPage.greeting()).toHaveText('Hello, Alice');
  });

  it('shows field errors when submitting an empty form', async () => {
    await LoginPage.submit().tap();
    await expect(LoginPage.emailError()).toHaveText('Enter your email address');
    await expect(LoginPage.passwordError()).toHaveText('Enter your password');
  });

  it('rejects an invalid email format without calling the API', async () => {
    await LoginPage.loginWith('not-an-email', 'whatever');
    await expect(LoginPage.emailError()).toHaveText('Enter a valid email address');
    await expect(LoginPage.error()).not.toExist();
  });

  it('shows a clear error and clears the password after wrong credentials', async () => {
    await LoginPage.loginWith('alice@example.com', 'WrongPassword!');
    await LoginPage.expectError('Email or password is incorrect.');
    await expect(LoginPage.password()).toHaveText('');
  });

  it('tells a locked customer to contact support', async () => {
    await LoginPage.loginAs('locked');
    await LoginPage.expectError('Your account is locked. Please contact support.');
  });

  it('returns to the login screen after logging out', async () => {
    await LoginPage.loginAs('alice');
    await AccountsPage.waitUntilLoaded();
    await AccountsPage.logout().tap();
    await LoginPage.waitUntilVisible();
    await expect(LoginPage.email()).toHaveText('');
  });
});
