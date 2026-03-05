## Redmine MCP Server

A read-only Model Context Protocol (MCP) server for querying Redmine issue data via the Redmine REST API.

### Features

- **Read-only** access to Redmine:
  - List issues with rich filters (`get_issues`)
  - Get a single issue with associated data (`get_issue`)
  - Query issue metadata:
    - Trackers (`get_trackers`)
    - Issue statuses (`get_issue_statuses`)
    - Issue priorities (`get_issue_priorities`)
    - Project issue categories (`get_issue_categories`)
    - Issue relations (`get_issue_relations`)
- **Authentication**:
  - API key (`X-Redmine-API-Key`)
  - HTTP Basic Auth (username/password)
- **MCP integration**:
  - Token limiting to avoid huge responses
  - Toolsets (`issue`, `issue_metadata`)

---

### Requirements

- Node.js 20+ (for built-in `fetch` and ES modules)
- A Redmine instance with REST API enabled
- Either:
  - A Redmine API key, or
  - A username/password with sufficient permissions

---

### Installation & MCP configuration (using `npx`)

```jsonc
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["github:danglephuc/redmine-mcp-server"],
      "env": {
        "REDMINE_URL": "https://redmine.example.com",
        "REDMINE_API_KEY": "your-api-key-here",        
        // "REDMINE_USERNAME": "your-username",
        // "REDMINE_PASSWORD": "your-password",
        "MAX_TOKENS": "50000",
        "PREFIX": "redmine_",
        "ENABLE_TOOLSETS": "issue,issue_metadata"
      }
    }
  }
}
```

---

### Available Toolsets and Tools

#### Toolset: `issue`

- **`get_issues`**
  - **Description**: Returns a list of issues.
  - **Redmine endpoint**: `GET /issues.json`
  - **Parameters (subset)**:
    - `projectId` (number) – filter by project ID
    - `trackerId` (number) – filter by tracker ID
    - `statusId` (number or string) – status ID or special values `open`, `closed`, `*`
    - `assignedToId` (number or `"me"`) – assignee filter
    - `offset` (number) – pagination offset
    - `limit` (number) – pagination limit (1–100)
    - `sort` (string) – Redmine sort expression, e.g. `"priority:desc,updated_on"`

- **`get_issue`**
  - **Description**: Returns detailed information about a single issue.
  - **Redmine endpoint**: `GET /issues/:id.json`
  - **Parameters**:
    - `id` (number) – issue ID
    - `include` (string, optional) – comma-separated list of associations (`attachments,relations,changesets,journals,watchers,allowed_statuses`, etc.)

#### Toolset: `issue_metadata`

- **`get_trackers`**
  - `GET /trackers.json`
- **`get_issue_statuses`**
  - `GET /issue_statuses.json`
- **`get_issue_priorities`**
  - `GET /enumerations/issue_priorities.json`
- **`get_issue_categories`**
  - `GET /projects/:project_id/issue_categories.json`
  - Parameters: `projectId` (number)
- **`get_issue_relations`**
  - `GET /issues/:issue_id/relations.json`
  - Parameters: `issueId` (number)

---

### Environment Variables

- **Required**
  - `REDMINE_URL` – base URL of your Redmine instance (no trailing slash)
- **Auth**
  - `REDMINE_API_KEY` (optional)
  - `REDMINE_USERNAME` and `REDMINE_PASSWORD` (optional)

  You must set at least one auth method (API key or basic auth). If **both** are set, the server sends **both** `X-Redmine-API-Key` and `Authorization: Basic ...` headers on each request, which matches setups where Redmine is behind additional HTTP auth.

- **Optional**
  - `MAX_TOKENS` – maximum tokens for responses (default `50000`)
  - `PREFIX` – prefix for tool names (e.g. `redmine_`)
  - `ENABLE_TOOLSETS` – comma-separated list of toolsets to enable (`issue`, `issue_metadata`, or `all`)

---

### Development

```bash
npm run dev      # run with tsx
npm run build    # type-check and emit to build/
npm run typecheck
```

You can extend this server with additional toolsets (projects, time entries, etc.) by following the same patterns used for the existing issue-focused tools.

