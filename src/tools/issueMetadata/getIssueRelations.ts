import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getIssueRelationsSchema = z.object({
  issueId: z.number().int().describe('ID of the issue whose relations should be listed'),
});

export function getIssueRelationsTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue_relations',
    description: t(
      'TOOL_GET_ISSUE_RELATIONS_DESCRIPTION',
      'Returns the list of relations for a given issue.'
    ),
    schema: getIssueRelationsSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssueRelationsSchema>;
      return client.get(`/issues/${input.issueId}/relations.json`);
    },
  };
}

