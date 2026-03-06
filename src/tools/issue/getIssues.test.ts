import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssuesTool } from './getIssues.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockIssueList = {
  issues: [
    {
      id: 1,
      project: { id: 100, name: 'Project Alpha' },
      tracker: { id: 1, name: 'Bug' },
      status: { id: 1, name: 'New', is_closed: false },
      priority: { id: 2, name: 'Normal' },
      author: { id: 1, name: 'Alice' },
      subject: 'Issue One',
      done_ratio: 0,
      created_on: '2025-01-01T00:00:00Z',
      updated_on: '2025-01-01T00:00:00Z',
    },
    {
      id: 2,
      project: { id: 100, name: 'Project Alpha' },
      tracker: { id: 2, name: 'Feature' },
      status: { id: 2, name: 'In Progress', is_closed: false },
      priority: { id: 3, name: 'High' },
      author: { id: 2, name: 'Bob' },
      subject: 'Issue Two',
      done_ratio: 50,
      created_on: '2025-01-02T00:00:00Z',
      updated_on: '2025-01-03T00:00:00Z',
    },
  ],
  total_count: 2,
  offset: 0,
  limit: 25,
};

describe('getIssuesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssueList),
  } as unknown as RedmineClient;

  const tool = getIssuesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueList
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issues');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of issues from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockIssueList);
  });

  it('calls client.get with no params when called with empty input', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {});
  });

  it('maps projectId to project_id query param', async () => {
    await tool.handler({ projectId: 100 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      project_id: 100,
    });
  });

  it('maps trackerId to tracker_id query param', async () => {
    await tool.handler({ trackerId: 2 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      tracker_id: 2,
    });
  });

  it('maps statusId to status_id query param (numeric)', async () => {
    await tool.handler({ statusId: 1 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      status_id: 1,
    });
  });

  it('maps statusId to status_id query param (special string values)', async () => {
    for (const special of ['open', 'closed', '*']) {
      vi.clearAllMocks();
      await tool.handler({ statusId: special });
      expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
        status_id: special,
      });
    }
  });

  it('maps assignedToId to assigned_to_id query param (numeric)', async () => {
    await tool.handler({ assignedToId: 5 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      assigned_to_id: 5,
    });
  });

  it('maps assignedToId to assigned_to_id query param ("me")', async () => {
    await tool.handler({ assignedToId: 'me' });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      assigned_to_id: 'me',
    });
  });

  it('maps offset and limit to query params', async () => {
    await tool.handler({ offset: 25, limit: 50 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      offset: 25,
      limit: 50,
    });
  });

  it('maps sort to the sort query param', async () => {
    await tool.handler({ sort: 'priority:desc,updated_on' });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      sort: 'priority:desc,updated_on',
    });
  });

  it('combines multiple filters correctly', async () => {
    await tool.handler({
      projectId: 100,
      trackerId: 1,
      statusId: 'open',
      assignedToId: 'me',
      offset: 0,
      limit: 10,
      sort: 'updated_on:desc',
    });

    expect(mockClient.get).toHaveBeenCalledWith('/issues.json', {
      project_id: 100,
      tracker_id: 1,
      status_id: 'open',
      assigned_to_id: 'me',
      offset: 0,
      limit: 10,
      sort: 'updated_on:desc',
    });
  });
});
