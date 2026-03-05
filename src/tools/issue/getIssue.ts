import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getIssueSchema = z.object({
  id: z.number().int().describe('ID of the issue'),
  include: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of associations to include (attachments, relations, changesets, journals, watchers, allowed_statuses)'
    ),
});

export function getIssueTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue',
    description: t(
      'TOOL_GET_ISSUE_DESCRIPTION',
      'Returns detailed information about a specific Redmine issue.'
    ),
    schema: getIssueSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssueSchema>;
      const params: Record<string, string> = {};
      if (input.include) params.include = input.include;

      return client.get(`/issues/${input.id}.json`, params);
    },
  };
}

