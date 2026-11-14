import { validateLogin, validateTransfer } from '../src/utils/validation';

describe('validateLogin', () => {
  it('passes for a valid email and password', () => {
    expect(validateLogin('alice@example.com', 'secret')).toEqual({});
  });

  it('requires both fields', () => {
    expect(validateLogin('', '')).toEqual({ email: 'Enter your email address', password: 'Enter your password' });
  });

  it.each(['alice', 'alice@', '@example.com', 'alice@example', 'ali ce@example.com'])('rejects malformed email %p', (email) => {
    expect(validateLogin(email, 'x').email).toBe('Enter a valid email address');
  });
});

describe('validateTransfer', () => {
  const valid = { fromAccountId: 'ACC-1001', toAccountId: 'ACC-1002', amountText: '10.00', reference: '', availableMinor: 250_000 };

  it('accepts a valid transfer and returns pence', () => {
    expect(validateTransfer(valid)).toEqual({ errors: {}, amountMinor: 1000 });
  });

  it('requires source and destination', () => {
    const { errors } = validateTransfer({ ...valid, fromAccountId: undefined, toAccountId: undefined });
    expect(errors.from).toBeDefined();
    expect(errors.to).toBe('Choose who to pay');
  });

  it('rejects paying into the same account', () => {
    expect(validateTransfer({ ...valid, toAccountId: 'ACC-1001' }).errors.to).toBe('You cannot pay into the same account');
  });

  // Boundary value analysis around the available balance (£2,500.00).
  it.each([
    ['2499.99', undefined],
    ['2500.00', undefined],
    ['2500.01', 'You only have £2,500.00 available'],
  ])('amount %p -> error %p', (amountText, expected) => {
    expect(validateTransfer({ ...valid, amountText }).errors.amount).toBe(expected);
  });

  // Boundary value analysis around the £5,000 daily limit.
  it.each([
    ['5000.00', undefined],
    ['5000.01', 'The most you can send in a day is £5,000.00'],
  ])('with a large balance, amount %p -> error %p', (amountText, expected) => {
    expect(validateTransfer({ ...valid, amountText, availableMinor: 10_000_000 }).errors.amount).toBe(expected);
  });

  it.each([
    ['', 'Enter an amount'],
    ['0', 'Amount must be more than £0.00'],
    ['abc', 'Enter a valid amount, like 10.50'],
  ])('amount %p -> %p', (amountText, expected) => {
    expect(validateTransfer({ ...valid, amountText }).errors.amount).toBe(expected);
  });

  it('allows an 18 character reference but not 19', () => {
    expect(validateTransfer({ ...valid, reference: 'x'.repeat(18) }).errors.reference).toBeUndefined();
    expect(validateTransfer({ ...valid, reference: 'x'.repeat(19) }).errors.reference).toBeDefined();
  });
});
