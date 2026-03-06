import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueCategoriesTool } from './getIssueCategories.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockCategories = {
  issue_categories: [
    { id: 1, name: 'Frontend', project: { id: 42, name: 'My Project' } },
    { id: 2, name: 'Backend', project: { id: 42, name: 'My Project' } },
    { id: 3, name: 'Infrastructure', project: { id: 42, name: 'My Project' } },
  ],
};

describe('getIssueCategoriesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockCategories),
  } as unknown as RedmineClient;

  const tool = getIssueCategoriesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCategories
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue_categories');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of issue categories from the client', async () => {
    const result = await tool.handler({ projectId: 42 });

    expect(result).toEqual(mockCategories);
  });

  it('calls client.get with the correct project-scoped URL', async () => {
    await tool.handler({ projectId: 42 });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/projects/42/issue_categories.json'
    );
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  it('uses the projectId from the input in the URL', async () => {
    await tool.handler({ projectId: 999 });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/projects/999/issue_categories.json'
    );
  });
});
