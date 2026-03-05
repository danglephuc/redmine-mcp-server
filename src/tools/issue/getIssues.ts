import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getIssuesSchema = z.object({
  projectId: z.number().int().optional().describe('Filter by project ID'),
  trackerId: z.number().int().optional().describe('Filter by tracker ID'),
  statusId: z
    .union([z.string(), z.number().int()])
    .optional()
    .describe('Filter by status (id, or special values: open, closed, *)'),
  assignedToId: z
    .union([z.number().int(), z.literal('me')])
    .optional()
    .describe('Filter by assignee ID, or "me" for current user'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Offset for pagination (default: 0)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Limit for pagination (1-100, default: 25)'),
  sort: z
    .string()
    .optional()
    .describe(
      'Sort expression, e.g. "priority:desc,updated_on" (Redmine sort syntax)'
    ),
});

export function getIssuesTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issues',
    description: t(
      'TOOL_GET_ISSUES_DESCRIPTION',
      'Returns a list of Redmine issues with optional filters.'
    ),
    schema: getIssuesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssuesSchema>;
      const params: Record<string, string | number | boolean> = {};

      if (input.projectId !== undefined) params.project_id = input.projectId;
      if (input.trackerId !== undefined) params.tracker_id = input.trackerId;
      if (input.statusId !== undefined) params.status_id = input.statusId;
      if (input.assignedToId !== undefined)
        params.assigned_to_id = input.assignedToId;
      if (input.offset !== undefined) params.offset = input.offset;
      if (input.limit !== undefined) params.limit = input.limit;
      if (input.sort !== undefined) params.sort = input.sort;

      return client.get('/issues.json', params);
    },
  };
}
