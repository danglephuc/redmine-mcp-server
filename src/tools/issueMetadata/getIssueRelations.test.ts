import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueRelationsTool } from './getIssueRelations.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockRelations = {
  relations: [
    {
      id: 1,
      issue_id: 100,
      issue_to_id: 200,
      relation_type: 'blocks',
      delay: null,
    },
    {
      id: 2,
      issue_id: 100,
      issue_to_id: 300,
      relation_type: 'relates',
      delay: null,
    },
  ],
};

describe('getIssueRelationsTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockRelations),
  } as unknown as RedmineClient;

  const tool = getIssueRelationsTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRelations
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue_relations');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of relations from the client', async () => {
    const result = await tool.handler({ issueId: 100 });

    expect(result).toEqual(mockRelations);
  });

  it('calls client.get with the correct issue-scoped URL', async () => {
    await tool.handler({ issueId: 100 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues/100/relations.json');
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  it('uses the issueId from the input in the URL', async () => {
    await tool.handler({ issueId: 999 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues/999/relations.json');
  });
});
