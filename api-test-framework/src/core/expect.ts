import assert from 'node:assert/strict';
import { config } from '../config.ts';
import type { ApiResponse } from './api-client.ts';
import { validate, type Schema } from './schema.ts';

/**
 * Domain-specific assertions. Every failure message includes the HTTP trace,
 * so a red test in CI tells you exactly what was sent and what came back.
 */
export function expectStatus(res: ApiResponse, expected: number): void {
  assert.equal(res.status, expected, `Expected HTTP ${expected} but got ${res.status}\n${res.trace}`);
}

export function expectError(res: ApiResponse, status: number, code: string): void {
  expectStatus(res, status);
  assert.equal(res.body?.error?.code, code, `Expected error code ${code} but got ${res.body?.error?.code}\n${res.trace}`);
  assert.equal(typeof res.body.error.message, 'string', `Error message should be a string\n${res.trace}`);
}

export function expectSchema(value: unknown, schema: Schema, label = 'response'): void {
  const errors = validate(value, schema);
  assert.deepEqual(errors, [], `${label} does not match schema:\n  - ${errors.join('\n  - ')}`);
}

export function expectFasterThan(res: ApiResponse, ms: number = config.slowThresholdMs): void {
  assert.ok(res.durationMs < ms, `Response took ${res.durationMs}ms, budget is ${ms}ms\n${res.trace}`);
}

export function expectHeader(res: ApiResponse, name: string, contains: string): void {
  const value = res.headers.get(name) ?? '';
  assert.ok(value.includes(contains), `Header ${name} was "${value}", expected it to contain "${contains}"`);
}
