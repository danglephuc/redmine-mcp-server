import { describe, it, expect, vi } from 'vitest';
import { wrapWithErrorHandling } from './wrapWithErrorHandling.js';
import { RedmineApiError } from '../../redmine/client.js';

describe('wrapWithErrorHandling', () => {
  it('wraps a successful result in { kind: "ok", data }', async () => {
    const fn = vi.fn().mockResolvedValue({ issues: [] });
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toEqual({ kind: 'ok', data: { issues: [] } });
  });

  it('returns an error result for a RedmineApiError', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new RedmineApiError(422, { errors: ['invalid'] }));
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toMatchObject({
      kind: 'error',
      message: 'Redmine API error: 422',
      status: 422,
      details: { errors: ['invalid'] },
    });
  });

  it('returns an error result for a generic Error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('timeout'));
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toEqual({ kind: 'error', message: 'timeout' });
  });

  it('returns a generic error result for unknown thrown values', async () => {
    const fn = vi.fn().mockRejectedValue(42);
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toEqual({ kind: 'error', message: 'Unknown error' });
  });
});
