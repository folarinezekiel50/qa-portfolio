import { ApiError, friendlyMessage } from '../src/api/client';

describe('friendlyMessage', () => {
  it.each([
    ['INVALID_CREDENTIALS', 401, 'Email or password is incorrect.'],
    ['ACCOUNT_LOCKED', 423, 'Your account is locked. Please contact support.'],
    ['INSUFFICIENT_FUNDS', 422, 'You do not have enough money in this account.'],
    ['DAILY_LIMIT_EXCEEDED', 422, 'This payment would take you over your £5,000 daily limit.'],
    ['TIMEOUT', 0, 'The bank is taking too long to respond. Please try again.'],
  ])('maps %s to a customer-friendly message', (code, status, expected) => {
    expect(friendlyMessage(new ApiError(status, code, 'raw'))).toBe(expected);
  });

  it('never shows raw server text for 5xx errors', () => {
    expect(friendlyMessage(new ApiError(503, 'SOMETHING_INTERNAL', 'db pool exhausted'))).toBe(
      'The bank is having problems right now. Please try again later.',
    );
  });

  it('handles non-API errors', () => {
    expect(friendlyMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
