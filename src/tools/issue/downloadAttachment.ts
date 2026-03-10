import path from 'node:path';
import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

/**
 * Maximum file size (in bytes) allowed for base64 inline return mode.
 * Files larger than this must be saved to disk via outputPath.
 */
const MAX_BASE64_FILESIZE = 10 * 1024 * 1024; // 10 MB

const downloadAttachmentSchema = z.object({
  attachmentId: z
    .number()
    .int()
    .describe('The ID of the attachment to download'),
  outputPath: z
    .string()
    .refine(path.isAbsolute, {
      message: 'outputPath must be an absolute path',
    })
    .optional()
    .describe(
      'Absolute file path to save the attachment to disk. When provided, the file is streamed directly to disk instead of being returned as base64. Files larger than 10 MB require this option.'
    ),
});

interface RedmineAttachmentMetadata {
  attachment: {
    id: number;
    filename: string;
    filesize: number;
    content_type: string;
    content_url: string;
    description: string;
    author: { id: number; name: string };
    created_on: string;
  };
}

export function downloadAttachmentTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'download_attachment',
    description: t(
      'TOOL_DOWNLOAD_ATTACHMENT_DESCRIPTION',
      'Downloads a specific attachment file from a Redmine issue. Use get_attachments first to obtain the attachment ID. By default returns the file as base64-encoded content (limited to 10 MB). If outputPath is provided, streams the file directly to disk and returns a success confirmation instead.'
    ),
    schema: downloadAttachmentSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof downloadAttachmentSchema>;

      // Fetch attachment metadata to get the content URL and filename.
      const metadata = await client.get<RedmineAttachmentMetadata>(
        `/attachments/${input.attachmentId}.json`
      );

      const { attachment } = metadata;

      // If an output path is provided, validate it and stream directly to disk.
      if (input.outputPath) {
        // Normalize the path to remove any `..` traversal components.
        const resolvedPath = path.resolve(input.outputPath);

        // If REDMINE_DOWNLOAD_DIR is configured, restrict writes to that directory.
        const downloadDir = process.env.REDMINE_DOWNLOAD_DIR;
        if (downloadDir) {
          const resolvedDownloadDir = path.resolve(downloadDir);
          const relative = path.relative(resolvedDownloadDir, resolvedPath);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(
              `outputPath must be within the allowed download directory: ${resolvedDownloadDir}`
            );
          }
        }

        // Refuse to overwrite existing files.
        const { access } = await import('node:fs/promises');
        try {
          await access(resolvedPath);
          throw new Error(
            `File already exists at ${resolvedPath}. Remove it first or choose a different path.`
          );
        } catch (err) {
          // access() throws when the file does not exist — that is the expected case.
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw err;
          }
        }

        await client.downloadAttachmentToFile(
          attachment.content_url,
          resolvedPath
        );
        return {
          success: true,
          savedTo: resolvedPath,
        };
      }

      // Reject base64 mode for files that exceed the size limit.
      if (attachment.filesize > MAX_BASE64_FILESIZE) {
        throw new Error(
          `Attachment is too large (${attachment.filesize} bytes) to return as base64 inline. ` +
            `Please provide an outputPath to stream the file to disk instead.`
        );
      }

      // Download the binary content.
      const { base64, mimeType } = await client.getAttachmentBuffer(
        attachment.content_url
      );

      return {
        id: attachment.id,
        filename: attachment.filename,
        mimeType,
        filesize: attachment.filesize,
        base64Content: base64,
      };
    },
  };
}
