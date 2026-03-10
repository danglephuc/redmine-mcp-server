import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getAttachmentsSchema = z.object({
  issueId: z.number().int().describe('ID of the Redmine issue'),
});

interface RedmineAttachment {
  id: number;
  filename: string;
  filesize: number;
  content_type: string;
  description: string;
  content_url: string;
  author: { id: number; name: string };
  created_on: string;
}

interface RedmineIssueWithAttachments {
  issue: {
    attachments?: RedmineAttachment[];
  };
}

export function getAttachmentsTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_attachments',
    description: t(
      'TOOL_GET_ATTACHMENTS_DESCRIPTION',
      'Returns a list of attachments (images, files, etc.) for a specific Redmine issue.'
    ),
    schema: getAttachmentsSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getAttachmentsSchema>;

      const data = await client.get<RedmineIssueWithAttachments>(
        `/issues/${input.issueId}.json`,
        { include: 'attachments' }
      );

      const attachments = Array.isArray(data.issue.attachments)
        ? data.issue.attachments
        : [];

      return attachments.map((att) => ({
        id: att.id,
        filename: att.filename,
        filesize: att.filesize,
        content_type: att.content_type,
        description: att.description,
        content_url: att.content_url,
        created_on: att.created_on,
        author: att.author ? { name: att.author.name } : null,
      }));
    },
  };
}
