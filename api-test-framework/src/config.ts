/**
 * Central configuration. Everything can be overridden with environment variables
 * so the same tests run locally, in CI, or against another environment.
 */
export const config = {
  baseUrl: (process.env.API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, ''),
  /** Per-request timeout. */
  timeoutMs: Number(process.env.API_TIMEOUT_MS ?? 5_000),
  /** Retries for network errors and 502/503/504 on safe (GET) requests only. */
  retries: Number(process.env.API_RETRIES ?? 2),
  /** Soft performance budget used by response-time assertions. */
  slowThresholdMs: Number(process.env.API_SLOW_MS ?? 800),
  /** Log every request/response to the console. */
  verbose: process.env.API_VERBOSE === 'true',
} as const;
