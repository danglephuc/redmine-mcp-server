import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAttachmentTool } from './downloadAttachment.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';
import * as fsp from 'node:fs/promises';

// Mock node:fs/promises so the overwrite-protection check does not touch the real FS.
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

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

    // Default: file does not exist (access throws ENOENT).
    vi.mocked(fsp.access).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    );

    // Clear REDMINE_DOWNLOAD_DIR between tests.
    delete process.env.REDMINE_DOWNLOAD_DIR;
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

  it('throws an error when attachment exceeds the 10 MB base64 limit', async () => {
    const largeMetadata = {
      attachment: {
        ...mockAttachmentMetadata.attachment,
        filesize: 11 * 1024 * 1024, // 11 MB
      },
    };
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      largeMetadata
    );

    await expect(tool.handler({ attachmentId: 101 })).rejects.toThrow(
      /too large.*outputPath/i
    );
    expect(mockClient.getAttachmentBuffer).not.toHaveBeenCalled();
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

  it('throws an error when the target file already exists', async () => {
    // Simulate an existing file: access() resolves without throwing.
    vi.mocked(fsp.access).mockResolvedValue(undefined);

    await expect(
      tool.handler({ attachmentId: 101, outputPath: '/tmp/screenshot.png' })
    ).rejects.toThrow(/already exists/i);
    expect(mockClient.downloadAttachmentToFile).not.toHaveBeenCalled();
  });

  it('throws an error when outputPath is outside REDMINE_DOWNLOAD_DIR', async () => {
    process.env.REDMINE_DOWNLOAD_DIR = '/safe/downloads';

    await expect(
      tool.handler({ attachmentId: 101, outputPath: '/tmp/screenshot.png' })
    ).rejects.toThrow(/allowed download directory/i);
    expect(mockClient.downloadAttachmentToFile).not.toHaveBeenCalled();
  });

  it('allows outputPath within REDMINE_DOWNLOAD_DIR', async () => {
    process.env.REDMINE_DOWNLOAD_DIR = '/safe/downloads';

    const result = await tool.handler({
      attachmentId: 101,
      outputPath: '/safe/downloads/screenshot.png',
    });

    expect(mockClient.downloadAttachmentToFile).toHaveBeenCalledWith(
      'https://redmine.example.com/attachments/download/101/screenshot.png',
      '/safe/downloads/screenshot.png'
    );
    expect(result).toEqual({
      success: true,
      savedTo: '/safe/downloads/screenshot.png',
    });
  });
});
