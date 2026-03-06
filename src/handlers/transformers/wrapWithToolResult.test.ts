import { describe, it, expect, vi } from 'vitest';
import { wrapWithToolResult } from './wrapWithToolResult.js';
import type { SafeResult } from '../../types/result.js';

describe('wrapWithToolResult', () => {
  it('returns isError=true content when the result is an error', async () => {
    const errorResult: SafeResult<unknown> = {
      kind: 'error',
      message: 'something went wrong',
    };
    const fn = vi.fn().mockResolvedValue(errorResult);
    const wrapped = wrapWithToolResult(fn);

    const toolResult = await wrapped({} as never, {} as never);

    expect(toolResult.isError).toBe(true);
    expect(toolResult.content).toEqual([
      { type: 'text', text: 'something went wrong' },
    ]);
  });

  it('returns a text content item when the data is a string', async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ kind: 'ok', data: 'plain string result' });
    const wrapped = wrapWithToolResult(fn);

    const toolResult = await wrapped({} as never, {} as never);

    expect(toolResult.isError).toBeUndefined();
    expect(toolResult.content).toEqual([
      { type: 'text', text: 'plain string result' },
    ]);
  });

  it('JSON-stringifies non-string data into a text content item', async () => {
    const data = { issues: [{ id: 1, subject: 'Test' }] };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data });
    const wrapped = wrapWithToolResult(fn);

    const toolResult = await wrapped({} as never, {} as never);

    expect(toolResult.isError).toBeUndefined();
    expect(toolResult.content).toEqual([
      { type: 'text', text: JSON.stringify(data, null, 2) },
    ]);
  });

  it('passes the input through to the underlying function', async () => {
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: 'ok' });
    const wrapped = wrapWithToolResult(fn);
    const input = { id: 42 };

    await wrapped(input as never, {} as never);

    expect(fn).toHaveBeenCalledWith(input);
  });

  it('handles null data by JSON-stringifying it', async () => {
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: null });
    const wrapped = wrapWithToolResult(fn);

    const toolResult = await wrapped({} as never, {} as never);

    expect(toolResult.content).toEqual([{ type: 'text', text: 'null' }]);
  });
});
