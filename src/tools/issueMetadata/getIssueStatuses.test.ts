import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueStatusesTool } from './getIssueStatuses.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockStatuses = {
  issue_statuses: [
    { id: 1, name: 'New', is_closed: false },
    { id: 2, name: 'In Progress', is_closed: false },
    { id: 3, name: 'Resolved', is_closed: false },
    { id: 5, name: 'Closed', is_closed: true },
  ],
};

describe('getIssueStatusesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockStatuses),
  } as unknown as RedmineClient;

  const tool = getIssueStatusesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockStatuses
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue_statuses');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of issue statuses from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockStatuses);
  });

  it('calls client.get with the correct URL and no params', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/issue_statuses.json');
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });
});
