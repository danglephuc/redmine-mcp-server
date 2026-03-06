import { describe, it, expect } from 'vitest';
import { countTokens } from './tokenCounter.js';

describe('countTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('returns 0 for a whitespace-only string', () => {
    expect(countTokens('   \n\t  ')).toBe(0);
  });

  it('counts individual words', () => {
    expect(countTokens('hello world foo')).toBe(3);
  });

  it('counts punctuation characters as separate tokens', () => {
    // "Hello" "," "world" "!" = 4 tokens
    expect(countTokens('Hello, world!')).toBe(4);
  });

  it('collapses multiple whitespace/newlines between words', () => {
    expect(countTokens('foo   bar\n\tbaz')).toBe(3);
  });

  it('counts JSON-like text correctly', () => {
    const json = '{"key": "value"}';
    // { " key " : " value " } — 9 non-whitespace tokens
    const count = countTokens(json);
    expect(count).toBeGreaterThan(0);
  });

  it('handles a long repetitive string', () => {
    const text = 'word '.repeat(1000).trim();
    expect(countTokens(text)).toBe(1000);
  });
});
