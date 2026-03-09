import path from 'node:path';
import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

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
      'Absolute file path to save the attachment directly to disk. When provided, the file is streamed to disk instead of being returned as base64.'
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
      'Downloads a specific attachment file from a Redmine issue. Use get_attachments first to obtain the attachment ID. By default returns the file as base64-encoded content. If outputPath is provided, streams the file directly to disk (recommended for large files) and returns a success confirmation instead.'
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

      // If an output path is provided, stream directly to disk.
      if (input.outputPath) {
        await client.downloadAttachmentToFile(
          attachment.content_url,
          input.outputPath
        );
        return {
          success: true,
          savedTo: input.outputPath,
        };
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
