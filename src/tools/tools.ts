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
import { getAttachmentsTool } from './issue/getAttachments.js';
import { downloadAttachmentTool } from './issue/downloadAttachment.js';

export function allTools(
  client: RedmineClient,
  helper: TranslationHelper
): ToolsetGroup {
  return {
    toolsets: [
      {
        name: 'issue',
        description:
          'Tools for querying Redmine issues and attachments (list/single issues, list/download attachments).',
        enabled: false,
        tools: [
          getIssuesTool(client, helper),
          getIssueTool(client, helper),
          getAttachmentsTool(client, helper),
          downloadAttachmentTool(client, helper),
        ],
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
