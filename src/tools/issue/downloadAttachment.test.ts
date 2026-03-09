import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAttachmentTool } from './downloadAttachment.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockAttachmentMetadata = {
  attachment: {
    id: 101,
    filename: 'screenshot.png',
    filesize: 12345,
    content_type: 'image/png',
    content_url:
      'https://redmine.example.com/attachments/download/101/screenshot.png',
    description: 'A screenshot',
    author: { id: 1, name: 'Alice' },
    created_on: '2025-06-01T10:00:00Z',
  },
};

describe('downloadAttachmentTool', () => {
  const mockClient = {
    get: vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue(mockAttachmentMetadata),
    getAttachmentBuffer: vi
      .fn<() => Promise<{ base64: string; mimeType: string }>>()
      .mockResolvedValue({
        base64: 'aGVsbG8=',
        mimeType: 'image/png',
      }),
    downloadAttachmentToFile: vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
  } as unknown as RedmineClient;

  const tool = downloadAttachmentTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockAttachmentMetadata
    );
    (
      mockClient.getAttachmentBuffer as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      base64: 'aGVsbG8=',
      mimeType: 'image/png',
    });
    (
      mockClient.downloadAttachmentToFile as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('download_attachment');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('fetches attachment metadata first', async () => {
    await tool.handler({ attachmentId: 101 });

    expect(mockClient.get).toHaveBeenCalledWith('/attachments/101.json');
  });

  it('returns base64 content when outputPath is not provided', async () => {
    const result = await tool.handler({ attachmentId: 101 });

    expect(mockClient.getAttachmentBuffer).toHaveBeenCalledWith(
      'https://redmine.example.com/attachments/download/101/screenshot.png'
    );
    expect(result).toEqual({
      id: 101,
      filename: 'screenshot.png',
      mimeType: 'image/png',
      filesize: 12345,
      base64Content: 'aGVsbG8=',
    });
  });

  it('saves to disk when outputPath is provided', async () => {
    const result = await tool.handler({
      attachmentId: 101,
      outputPath: '/tmp/screenshot.png',
    });

    expect(mockClient.downloadAttachmentToFile).toHaveBeenCalledWith(
      'https://redmine.example.com/attachments/download/101/screenshot.png',
      '/tmp/screenshot.png'
    );
    expect(result).toEqual({
      success: true,
      savedTo: '/tmp/screenshot.png',
    });
  });

  it('does not call getAttachmentBuffer when outputPath is provided', async () => {
    await tool.handler({
      attachmentId: 101,
      outputPath: '/tmp/screenshot.png',
    });

    expect(mockClient.getAttachmentBuffer).not.toHaveBeenCalled();
  });
});
