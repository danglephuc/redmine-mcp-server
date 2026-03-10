# Tools Reference

This page documents every tool available in the Redmine MCP Server, including their parameters and usage examples.

> **Note:** Tool names are prefixed with the value of `PREFIX` (e.g., `redmine_` → `redmine_get_issues`). If `PREFIX` is empty, tool names are used as-is.

---

## Toolset: `issue`

### `get_issues`

Returns a paginated list of Redmine issues with optional filters.

**Redmine endpoint:** `GET /issues.json`

#### Parameters

| Parameter      | Type                                      | Required | Description                                                                           |
| -------------- | ----------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `projectId`    | number                                    | No       | Filter by project ID                                                                  |
| `trackerId`    | number                                    | No       | Filter by tracker ID                                                                  |
| `statusId`     | number \| `"open"` \| `"closed"` \| `"*"` | No       | Filter by status. Use `"open"` for all open, `"closed"` for all closed, `"*"` for all |
| `assignedToId` | number \| `"me"`                          | No       | Filter by assignee. Use `"me"` for the authenticated user                             |
| `offset`       | number                                    | No       | Pagination offset (default: `0`)                                                      |
| `limit`        | number                                    | No       | Pagination limit, 1–100 (default: `25`)                                               |
| `sort`         | string                                    | No       | Sort expression, e.g. `"priority:desc,updated_on"`                                    |

#### Example Usage

```
Get all open high-priority issues assigned to me in project 12
→ get_issues(projectId=12, statusId="open", assignedToId="me", sort="priority:desc")

Get the first 10 bugs in project 5
→ get_issues(projectId=5, trackerId=1, limit=10)
```

---

### `get_issue`

Returns detailed information about a single Redmine issue by ID.

**Redmine endpoint:** `GET /issues/:id.json`

#### Parameters

| Parameter | Type   | Required | Description                                                                     |
| --------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `id`      | number | **Yes**  | The Redmine issue ID                                                            |
| `include` | string | No       | Comma-separated list of associated data to include. See below for valid values. |

#### `include` Values

| Value              | Description                                |
| ------------------ | ------------------------------------------ |
| `attachments`      | File attachments                           |
| `relations`        | Issue relations (blocks, duplicates, etc.) |
| `changesets`       | Associated VCS changesets                  |
| `journals`         | Activity log / history                     |
| `watchers`         | Users watching the issue                   |
| `allowed_statuses` | Statuses the issue can transition to       |

#### Example Usage

```
Get issue #1234 with its journals and attachments
→ get_issue(id=1234, include="journals,attachments")

Get basic info for issue #999
→ get_issue(id=999)
```

---

### `get_attachments`

Returns a list of attachments (images, files, etc.) for a specific Redmine issue.

**Redmine endpoint:** `GET /issues/:id.json` (with `include=attachments`)

#### Parameters

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| `issueId` | number | **Yes**  | The Redmine issue ID |

#### Example Usage

```
Get all attachments for issue #1234
→ get_attachments(issueId=1234)
```

---

### `download_attachment`

Downloads a specific attachment file from a Redmine issue. Use `get_attachments` first to obtain the attachment ID. By default returns the file as base64-encoded content (limited to 10 MB). If `outputPath` is provided, the file is streamed directly to disk and the tool returns a success confirmation instead of base64 content. Files larger than 10 MB require `outputPath`. If `REDMINE_DOWNLOAD_DIR` is set in the environment, all `outputPath` values must reside within that directory.

**Redmine endpoint:** `GET /attachments/:id.json`

#### Parameters

| Parameter      | Type   | Required | Description                                                                                                                                                   |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `attachmentId` | number | **Yes**  | The ID of the attachment to download                                                                                                                          |
| `outputPath`   | string | No       | Absolute file path to save the attachment to disk. When provided, the file is streamed directly to disk instead of being returned as base64. Required for files larger than 10 MB. The file must not already exist. |

#### Example Usage

```
Download attachment 107092 as base64
→ download_attachment(attachmentId=107092)

Save attachment 107092 to disk
→ download_attachment(attachmentId=107092, outputPath="/tmp/screenshot.png")
```

---

## Toolset: `issue_metadata`

### `get_trackers`

Returns all trackers defined in the Redmine instance (e.g., Bug, Feature, Support).

**Redmine endpoint:** `GET /trackers.json`

**Parameters:** None

---

### `get_issue_statuses`

Returns all issue statuses defined in the Redmine instance (e.g., New, In Progress, Resolved, Closed).

**Redmine endpoint:** `GET /issue_statuses.json`

**Parameters:** None

---

### `get_issue_priorities`

Returns all issue priorities defined in the Redmine instance (e.g., Low, Normal, High, Urgent, Immediate).

**Redmine endpoint:** `GET /enumerations/issue_priorities.json`

**Parameters:** None

---

### `get_issue_categories`

Returns all issue categories for a given project.

**Redmine endpoint:** `GET /projects/:project_id/issue_categories.json`

#### Parameters

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `projectId` | number | **Yes**  | The Redmine project ID |

#### Example Usage

```
Get categories for project 7
→ get_issue_categories(projectId=7)
```

---

### `get_issue_relations`

Returns all relations for a given issue (e.g., blocks, is blocked by, duplicates, is duplicate of).

**Redmine endpoint:** `GET /issues/:issue_id/relations.json`

#### Parameters

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| `issueId` | number | **Yes**  | The Redmine issue ID |

#### Example Usage

```
Get all relations for issue #500
→ get_issue_relations(issueId=500)
```

---

## Token Limiting

All tools are subject to the `MAX_TOKENS` limit. If a response exceeds the configured limit, the server truncates the JSON output and appends:

```
...(output truncated due to token limit)
```

Increase `MAX_TOKENS` or narrow your query filters if you receive truncated results.
