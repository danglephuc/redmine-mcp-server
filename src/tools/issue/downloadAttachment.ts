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
    .union([z.number().int(), z.array(z.number().int())])
    .describe(
      'The ID of the attachment to download, or an array of attachment IDs for batch download.'
    ),
  outputPath: z
    .string()
    .refine(path.isAbsolute, {
      message: 'outputPath must be an absolute path',
    })
    .optional()
    .describe(
      'For single attachment: absolute file path to save the attachment. For multiple attachments: directory path where files will be saved using their original filenames. When provided, files are streamed directly to disk instead of being returned as base64. Files larger than 10 MB require this option.'
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
      'Downloads one or more attachment files from a Redmine issue. Use get_attachments first to obtain attachment IDs. By default returns the file as base64-encoded content (limited to 10 MB). If outputPath is provided, streams the file directly to disk. For multiple attachments, outputPath is required and treated as a directory where files are saved using their original filenames.'
    ),
    schema: downloadAttachmentSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof downloadAttachmentSchema>;

      const ids = Array.isArray(input.attachmentId)
        ? input.attachmentId
        : [input.attachmentId];

      const results: Array<{
        id: number;
        filename: string;
        success: boolean;
        savedTo?: string;
        error?: string;
      }> = [];

      for (const id of ids) {
        // Fetch attachment metadata to get the content URL and filename.
        const metadata = await client.get<RedmineAttachmentMetadata>(
          `/attachments/${id}.json`
        );

        const { attachment } = metadata;

        // If an output path is provided, validate it and stream directly to disk.
        if (input.outputPath) {
          // Normalize the path to remove any `..` traversal components.
          const resolvedOutputPath = path.resolve(input.outputPath);
          const isMultiple = ids.length > 1;

          // Determine the target path: for multiple downloads, treat outputPath as a directory.
          const targetPath = isMultiple
            ? path.join(resolvedOutputPath, attachment.filename)
            : resolvedOutputPath;

          // If REDMINE_DOWNLOAD_DIR is configured, restrict writes to that directory.
          const downloadDir = process.env.REDMINE_DOWNLOAD_DIR;
          if (downloadDir) {
            const resolvedDownloadDir = path.resolve(downloadDir);
            const relative = path.relative(resolvedDownloadDir, targetPath);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
              throw new Error(
                `outputPath must be within the allowed download directory: ${resolvedDownloadDir}`
              );
            }
          }

          await client.downloadAttachmentToFile(
            attachment.content_url,
            targetPath
          );

          results.push({
            id: attachment.id,
            filename: attachment.filename,
            success: true,
            savedTo: targetPath,
          });
        } else {
          // Base64 inline mode (only supported for single attachment).
          if (ids.length > 1) {
            throw new Error(
              'outputPath is required when downloading multiple attachments. ' +
                'Please provide a directory path where files will be saved.'
            );
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

          results.push({
            id: attachment.id,
            filename: attachment.filename,
            success: true,
            savedTo: undefined,
          });

          return {
            id: attachment.id,
            filename: attachment.filename,
            mimeType,
            filesize: attachment.filesize,
            base64Content: base64,
          };
        }
      }

      // Return batch results for multiple downloads.
      return {
        results,
        savedCount: results.filter((r) => r.success).length,
        failedCount: results.filter((r) => !r.success).length,
      };
    },
  };
}
