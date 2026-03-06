import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssuePrioritiesTool } from './getIssuePriorities.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockPriorities = {
  issue_priorities: [
    { id: 1, name: 'Low', is_default: false, active: true },
    { id: 2, name: 'Normal', is_default: true, active: true },
    { id: 3, name: 'High', is_default: false, active: true },
    { id: 4, name: 'Urgent', is_default: false, active: true },
    { id: 5, name: 'Immediate', is_default: false, active: true },
  ],
};

describe('getIssuePrioritiesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockPriorities),
  } as unknown as RedmineClient;

  const tool = getIssuePrioritiesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPriorities
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue_priorities');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of issue priorities from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockPriorities);
  });

  it('calls client.get with the correct URL and no params', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith(
      '/enumerations/issue_priorities.json'
    );
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });
});
