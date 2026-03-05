import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { RedmineClient } from '../../redmine/client.js';

const getTrackersSchema = z.object({});

export function getTrackersTool(
  client: RedmineClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_trackers',
    description: t(
      'TOOL_GET_TRACKERS_DESCRIPTION',
      'Returns the list of Redmine trackers.'
    ),
    schema: getTrackersSchema as unknown as z.ZodObject<z.ZodRawShape>,
    handler: async () => {
      return client.get('/trackers.json');
    },
  };
}

