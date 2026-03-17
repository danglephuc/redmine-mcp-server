import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueTool } from './getIssue.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockIssue = {
  issue: {
    id: 174836,
    project: { id: 318, name: 'Test Project' },
    tracker: { id: 1, name: 'Bug' },
    status: { id: 1, name: 'New', is_closed: false },
    priority: { id: 2, name: 'Normal' },
    author: { id: 1, name: 'Alice' },
    subject: 'Sample issue subject',
    description: 'Sample issue description',
    done_ratio: 0,
    is_private: false,
    created_on: '2025-01-01T00:00:00Z',
    updated_on: '2025-01-02T00:00:00Z',
    closed_on: null,
    journals: [
      {
        id: 1,
        notes: 'First change',
        private_notes: true,
        details: [
          {
            property: 'attr',
            name: 'status_id',
            old_value: '1',
            new_value: '2',
          },
        ],
      },
      {
        id: 2,
        notes: 'Second change',
        private_notes: false,
        details: [
          {
            property: 'attr',
            name: 'assigned_to_id',
            value: '5',
          },
        ],
      },
    ],
  },
};

describe('getIssueTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssue),
  } as unknown as RedmineClient;

  const tool = getIssueTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockIssue);
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the issue data from the client', async () => {
    const result = await tool.handler({ id: 174836 });

    expect(result).toEqual({
      issue: {
        ...mockIssue.issue,
        journals: mockIssue.issue.journals?.map((journal, index) => ({
          id: journal.id,
          notes: journal.notes,
          order: index + 1,
        })),
      },
    });
  });

  it('calls client.get with the correct URL for a given id', async () => {
    await tool.handler({ id: 174836 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues/174836.json', {});
  });

  it('passes the include param when provided', async () => {
    await tool.handler({ id: 42, include: 'journals,relations' });

    expect(mockClient.get).toHaveBeenCalledWith('/issues/42.json', {
      include: 'journals,relations',
    });
  });

  it('omits the include param when not provided', async () => {
    await tool.handler({ id: 1 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues/1.json', {});
  });

  it('removes journal private_notes and details fields and adds order for compact responses', async () => {
    const result = (await tool.handler({ id: 174836 })) as {
      issue: {
        journals: Array<{
          id: number;
          notes: string;
          order: number;
          private_notes?: boolean;
          details?: unknown;
        }>;
      };
    };

    expect(result.issue.journals).toHaveLength(2);

    result.issue.journals.forEach((journal, index) => {
      expect(journal.private_notes).toBeUndefined();
      expect(journal.details).toBeUndefined();
      expect(journal.order).toBe(index + 1);
    });
  });
});
