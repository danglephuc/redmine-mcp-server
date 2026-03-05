import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getIssueCategoriesSchema = z.object({
  projectId: z
    .number()
    .int()
    .describe('ID of the project whose issue categories should be listed'),
});

export function getIssueCategoriesTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue_categories',
    description: t(
      'TOOL_GET_ISSUE_CATEGORIES_DESCRIPTION',
      'Returns the list of issue categories for a given project.'
    ),
    schema: getIssueCategoriesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssueCategoriesSchema>;
      return client.get(`/projects/${input.projectId}/issue_categories.json`);
    },
  };
}
