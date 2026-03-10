import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAttachmentsTool } from './getAttachments.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockIssueWithAttachments = {
  issue: {
    attachments: [
      {
        id: 101,
        filename: 'screenshot.png',
        filesize: 12345,
        content_type: 'image/png',
        description: 'A screenshot',
        content_url:
          'https://redmine.example.com/attachments/download/101/screenshot.png',
        author: { id: 1, name: 'Alice' },
        created_on: '2025-06-01T10:00:00Z',
      },
      {
        id: 102,
        filename: 'report.pdf',
        filesize: 54321,
        content_type: 'application/pdf',
        description: '',
        content_url:
          'https://redmine.example.com/attachments/download/102/report.pdf',
        author: { id: 2, name: 'Bob' },
        created_on: '2025-06-02T14:30:00Z',
      },
    ],
  },
};

const mockIssueNoAttachments = {
  issue: {},
};

describe('getAttachmentsTool', () => {
  const mockClient = {
    get: vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue(mockIssueWithAttachments),
  } as unknown as RedmineClient;

  const tool = getAttachmentsTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueWithAttachments
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_attachments');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('calls client.get with the correct URL and include param', async () => {
    await tool.handler({ issueId: 42 });

    expect(mockClient.get).toHaveBeenCalledWith('/issues/42.json', {
      include: 'attachments',
    });
  });

  it('returns mapped attachment data', async () => {
    const result = await tool.handler({ issueId: 42 });

    expect(result).toEqual([
      {
        id: 101,
        filename: 'screenshot.png',
        filesize: 12345,
        content_type: 'image/png',
        description: 'A screenshot',
        content_url:
          'https://redmine.example.com/attachments/download/101/screenshot.png',
        created_on: '2025-06-01T10:00:00Z',
        author: { name: 'Alice' },
      },
      {
        id: 102,
        filename: 'report.pdf',
        filesize: 54321,
        content_type: 'application/pdf',
        description: '',
        content_url:
          'https://redmine.example.com/attachments/download/102/report.pdf',
        created_on: '2025-06-02T14:30:00Z',
        author: { name: 'Bob' },
      },
    ]);
  });

  it('returns an empty array when issue has no attachments', async () => {
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueNoAttachments
    );

    const result = await tool.handler({ issueId: 99 });

    expect(result).toEqual([]);
  });
});
