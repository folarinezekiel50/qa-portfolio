import type { Schema } from '../core/schema.ts';

const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export const errorSchema: Schema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: { code: { type: 'string', pattern: /^[A-Z_]+$/ }, message: { type: 'string' } },
    },
  },
};

export const loginSchema: Schema = {
  type: 'object',
  required: ['token', 'expiresAt', 'user'],
  properties: {
    token: { type: 'string', pattern: /^[a-f0-9]{48}$/ },
    expiresAt: { type: 'string', pattern: isoDate },
    user: {
      type: 'object',
      required: ['id', 'name', 'email'],
      additionalProperties: false, // the password must never leak
      properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } },
    },
  },
};

export const accountSchema: Schema = {
  type: 'object',
  required: ['id', 'name', 'type', 'balanceMinor', 'currency'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: /^ACC-\d{4}$/ },
    name: { type: 'string' },
    type: { type: 'string', enum: ['current', 'savings'] },
    balanceMinor: { type: 'integer' },
    currency: { type: 'string', enum: ['GBP'] },
  },
};

export const accountListSchema: Schema = { type: 'array', items: accountSchema };

export const transactionSchema: Schema = {
  type: 'object',
  required: ['id', 'accountId', 'description', 'amountMinor', 'date'],
  properties: {
    id: { type: 'string' },
    accountId: { type: 'string' },
    description: { type: 'string' },
    amountMinor: { type: 'integer' },
    date: { type: 'string', pattern: isoDate },
  },
};

export const transactionPageSchema: Schema = {
  type: 'object',
  required: ['items', 'total', 'limit', 'offset'],
  properties: {
    items: { type: 'array', items: transactionSchema },
    total: { type: 'integer', minimum: 0 },
    limit: { type: 'integer', minimum: 1 },
    offset: { type: 'integer', minimum: 0 },
  },
};

export const transferSchema: Schema = {
  type: 'object',
  required: ['id', 'fromAccountId', 'toAccountId', 'amountMinor', 'reference', 'status', 'createdAt'],
  properties: {
    id: { type: 'string', pattern: /^TR-/ },
    fromAccountId: { type: 'string' },
    toAccountId: { type: 'string' },
    amountMinor: { type: 'integer', minimum: 1 },
    reference: { type: 'string' },
    status: { type: 'string', enum: ['completed'] },
    createdAt: { type: 'string', pattern: isoDate },
  },
};
