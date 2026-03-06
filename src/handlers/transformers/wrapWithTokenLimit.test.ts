import { describe, it, expect, vi } from 'vitest';
import { wrapWithTokenLimit } from './wrapWithTokenLimit.js';
import type { SafeResult } from '../../types/result.js';

const MAX_TOKENS = 10; // very low limit for testing

describe('wrapWithTokenLimit', () => {
  it('passes through an error result unchanged', async () => {
    const errorResult: SafeResult<unknown> = {
      kind: 'error',
      message: 'something went wrong',
    };
    const fn = vi.fn().mockResolvedValue(errorResult);
    const wrapped = wrapWithTokenLimit(fn, MAX_TOKENS);

    const result = await wrapped({} as never);

    expect(result).toBe(errorResult);
  });

  it('returns a string ok result unchanged (no truncation check needed)', async () => {
    // A tiny data payload: serialises to fewer tokens than MAX_TOKENS.
    const tinyPayload = { id: 1 };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: tinyPayload });
    const wrapped = wrapWithTokenLimit(fn, 10000);

    const result = await wrapped({} as never);

    expect(result).toEqual({
      kind: 'ok',
      data: JSON.stringify(tinyPayload, null, 2),
    });
  });

  it('truncates large data and appends the truncation notice', async () => {
    // Build a payload whose JSON is guaranteed to exceed MAX_TOKENS=10 tokens.
    const largeData = { items: new Array(50).fill('word') };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: largeData });
    const wrapped = wrapWithTokenLimit(fn, MAX_TOKENS);

    const result = await wrapped({} as never);

    expect(result.kind).toBe('ok');
    const data = (result as { kind: 'ok'; data: string }).data;
    expect(data).toContain('...(output truncated due to token limit)');
  });

  it('does not truncate data that fits within the token limit', async () => {
    const smallData = { id: 1 };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: smallData });
    // Use a very large limit so nothing gets truncated.
    const wrapped = wrapWithTokenLimit(fn, 100_000);

    const result = await wrapped({} as never);

    expect(result.kind).toBe('ok');
    const data = (result as { kind: 'ok'; data: string }).data;
    expect(data).not.toContain('truncated');
    expect(data).toBe(JSON.stringify(smallData, null, 2));
  });

  it('passes the input through to the underlying function', async () => {
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: {} });
    const wrapped = wrapWithTokenLimit(fn, 100_000);
    const input = { id: 99 };

    await wrapped(input as never);

    expect(fn).toHaveBeenCalledWith(input);
  });
});
