import { describe, it, expect, vi } from 'vitest';
import {
  buildToolsetGroup,
  enableToolset,
  getToolset,
} from './toolsetUtils.js';
import type { ToolsetGroup } from '../types/toolsets.js';

function makeGroup(): ToolsetGroup {
  return {
    toolsets: [
      { name: 'issue', description: 'Issue tools', enabled: false, tools: [] },
      {
        name: 'issue_metadata',
        description: 'Metadata tools',
        enabled: false,
        tools: [],
      },
    ],
  };
}

describe('getToolset', () => {
  it('returns the toolset with the matching name', () => {
    const group = makeGroup();
    const ts = getToolset(group, 'issue');
    expect(ts).toBeDefined();
    expect(ts!.name).toBe('issue');
  });

  it('returns undefined when the name does not exist', () => {
    const group = makeGroup();
    expect(getToolset(group, 'nonexistent')).toBeUndefined();
  });
});

describe('enableToolset', () => {
  it('enables a disabled toolset and returns a success message', () => {
    const group = makeGroup();
    const msg = enableToolset(group, 'issue');
    expect(msg).toBe('Toolset issue enabled');
    expect(getToolset(group, 'issue')!.enabled).toBe(true);
  });

  it('returns an "already enabled" message when the toolset is already on', () => {
    const group = makeGroup();
    enableToolset(group, 'issue');
    const msg = enableToolset(group, 'issue');
    expect(msg).toBe('Toolset issue is already enabled');
  });

  it('returns a "not found" message for an unknown toolset name', () => {
    const group = makeGroup();
    const msg = enableToolset(group, 'bogus');
    expect(msg).toBe('Toolset bogus not found');
  });
});

describe('buildToolsetGroup', () => {
  it('enables all toolsets when "all" is in the list', () => {
    const group = buildToolsetGroup(makeGroup(), ['all']);
    expect(group.toolsets.every((ts) => ts.enabled)).toBe(true);
  });

  it('enables only the specified toolsets', () => {
    const group = buildToolsetGroup(makeGroup(), ['issue']);
    const issue = group.toolsets.find((ts) => ts.name === 'issue');
    const meta = group.toolsets.find((ts) => ts.name === 'issue_metadata');
    expect(issue!.enabled).toBe(true);
    expect(meta!.enabled).toBe(false);
  });

  it('enables multiple specified toolsets', () => {
    const group = buildToolsetGroup(makeGroup(), ['issue', 'issue_metadata']);
    expect(group.toolsets.every((ts) => ts.enabled)).toBe(true);
  });

  it('does not mutate the original group', () => {
    const original = makeGroup();
    buildToolsetGroup(original, ['all']);
    // Original toolsets should still be disabled
    expect(original.toolsets.every((ts) => !ts.enabled)).toBe(true);
  });

  it('warns about unknown toolset names', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildToolsetGroup(makeGroup(), ['unknown_toolset']);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown_toolset')
    );
    warnSpy.mockRestore();
  });

  it('does not warn when all toolsets are known', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildToolsetGroup(makeGroup(), ['issue']);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('"all" keyword does not trigger an unknown-toolset warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildToolsetGroup(makeGroup(), ['all']);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
