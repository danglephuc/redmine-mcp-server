import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getIssueStatusesSchema = z.object({});

export function getIssueStatusesTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue_statuses',
    description: t(
      'TOOL_GET_ISSUE_STATUSES_DESCRIPTION',
      'Returns the list of Redmine issue statuses.'
    ),
    schema: getIssueStatusesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    handler: async () => {
      return client.get('/issue_statuses.json');
    },
  };
}
