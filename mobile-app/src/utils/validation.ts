import { formatMinor, parseAmountToMinor } from './money';

export const MAX_REFERENCE_LENGTH = 18;
export const DAILY_LIMIT_MINOR = 500_000;

export function validateLogin(email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export interface TransferFormInput {
  fromAccountId?: string;
  toAccountId?: string;
  amountText: string;
  reference: string;
  availableMinor?: number;
}

export interface TransferFormErrors {
  from?: string;
  to?: string;
  amount?: string;
  reference?: string;
}

/**
 * Client-side validation mirrors the server rules so users get instant feedback.
 * The server still validates everything – client checks are a convenience, not security.
 */
export function validateTransfer(input: TransferFormInput): { errors: TransferFormErrors; amountMinor: number | null } {
  const errors: TransferFormErrors = {};
  if (!input.fromAccountId) errors.from = 'Choose an account to pay from';
  if (!input.toAccountId) errors.to = 'Choose who to pay';
  else if (input.toAccountId === input.fromAccountId) errors.to = 'You cannot pay into the same account';

  const amountMinor = parseAmountToMinor(input.amountText);
  if (!input.amountText.trim()) errors.amount = 'Enter an amount';
  else if (amountMinor === null) errors.amount = 'Enter a valid amount, like 10.50';
  else if (amountMinor === 0) errors.amount = 'Amount must be more than £0.00';
  else if (amountMinor > DAILY_LIMIT_MINOR) errors.amount = `The most you can send in a day is ${formatMinor(DAILY_LIMIT_MINOR)}`;
  else if (input.availableMinor !== undefined && amountMinor > input.availableMinor) {
    errors.amount = `You only have ${formatMinor(input.availableMinor)} available`;
  }

  if (input.reference.trim().length > MAX_REFERENCE_LENGTH) {
    errors.reference = `Reference must be ${MAX_REFERENCE_LENGTH} characters or fewer`;
  }
  return { errors, amountMinor };
}
