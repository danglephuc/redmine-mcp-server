import { RedmineClient } from '../redmine/client.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ToolsetGroup } from '../types/toolsets.js';
import { getIssuesTool } from './issue/getIssues.js';
import { getIssueTool } from './issue/getIssue.js';
import { getTrackersTool } from './issueMetadata/getTrackers.js';
import { getIssueStatusesTool } from './issueMetadata/getIssueStatuses.js';
import { getIssuePrioritiesTool } from './issueMetadata/getIssuePriorities.js';
import { getIssueCategoriesTool } from './issueMetadata/getIssueCategories.js';
import { getIssueRelationsTool } from './issueMetadata/getIssueRelations.js';

export function allTools(
  client: RedmineClient,
  helper: TranslationHelper
): ToolsetGroup {
  return {
    toolsets: [
      {
        name: 'issue',
        description:
          'Tools for querying Redmine issues (list and single issue).',
        enabled: false,
        tools: [getIssuesTool(client, helper), getIssueTool(client, helper)],
      },
      {
        name: 'issue_metadata',
        description:
          'Tools for querying Redmine issue metadata (trackers, statuses, priorities, categories, relations).',
        enabled: false,
        tools: [
          getTrackersTool(client, helper),
          getIssueStatusesTool(client, helper),
          getIssuePrioritiesTool(client, helper),
          getIssueCategoriesTool(client, helper),
          getIssueRelationsTool(client, helper),
        ],
      },
    ],
  };
}

