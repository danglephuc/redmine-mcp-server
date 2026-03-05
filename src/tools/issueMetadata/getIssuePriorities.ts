import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getIssuePrioritiesSchema = z.object({});

export function getIssuePrioritiesTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue_priorities',
    description: t(
      'TOOL_GET_ISSUE_PRIORITIES_DESCRIPTION',
      'Returns the list of Redmine issue priorities.'
    ),
    schema: getIssuePrioritiesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    handler: async () => {
      return client.get('/enumerations/issue_priorities.json');
    },
  };
}

