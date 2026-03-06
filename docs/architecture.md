# Architecture

This document describes the internal structure of the Redmine MCP Server, its key modules, and how they interact.

---

## Project Structure

```
redmine-mcp/
├── src/
│   ├── index.ts                        # Entry point — wires everything together
│   ├── registerTools.ts                # Registers enabled toolsets onto the MCP server
│   ├── createTranslationHelper.ts      # Utility for collecting and exporting i18n-like strings
│   │
│   ├── redmine/
│   │   └── client.ts                   # HTTP client for the Redmine REST API
│   │
│   ├── tools/
│   │   ├── tools.ts                    # Declares all available toolsets
│   │   ├── issue/
│   │   │   ├── getIssues.ts            # Tool: list issues
│   │   │   └── getIssue.ts             # Tool: get single issue
│   │   └── issueMetadata/
│   │       ├── getTrackers.ts
│   │       ├── getIssueStatuses.ts
│   │       ├── getIssuePriorities.ts
│   │       ├── getIssueCategories.ts
│   │       └── getIssueRelations.ts
│   │
│   ├── handlers/
│   │   ├── builders/
│   │   │   └── composeToolHandler.ts   # Composes handler middleware pipeline
│   │   └── transformers/
│   │       ├── wrapWithErrorHandling.ts  # Catches errors, returns SafeResult
│   │       ├── wrapWithTokenLimit.ts     # Truncates oversized responses
│   │       └── wrapWithToolResult.ts     # Converts SafeResult to MCP CallToolResult
│   │
│   ├── utils/
│   │   ├── toolsetUtils.ts             # Toolset enable/filter logic
│   │   ├── wrapServerWithToolRegistry.ts  # Deduplication guard for tool registration
│   │   ├── runToolSafely.ts            # Executes tools and catches unexpected errors
│   │   ├── tokenCounter.ts             # Approximates token count
│   │   └── logger.ts                   # pino-based structured logger
│   │
│   └── types/
│       ├── tool.ts                     # ToolDefinition interface
│       ├── toolsets.ts                 # Toolset / ToolsetGroup interfaces
│       ├── result.ts                   # SafeResult<T> discriminated union
│       └── mcp.ts                      # MCPOptions interface
│
├── docs/                               # Project documentation (this folder)
├── build/                              # Compiled output (gitignored)
├── .env.example                        # Sample environment configuration
├── package.json
└── tsconfig.json
```

---

## Key Concepts

### Toolsets

A **toolset** is a named group of related tools. Toolsets can be enabled or disabled via the `ENABLE_TOOLSETS` environment variable. This lets users load only the capabilities they need.

```
ToolsetGroup
  └── Toolset[]            (e.g., "issue", "issue_metadata")
        └── ToolDefinition[]  (e.g., getIssuesTool, getIssueTool)
```

Each `ToolDefinition` contains:

- `name` – the tool name (without prefix)
- `description` – shown to the AI/LLM
- `schema` – Zod schema defining accepted parameters
- `handler` – async function implementing the tool's logic

---

### Handler Middleware Pipeline

Every tool's handler goes through a three-layer middleware pipeline assembled by `composeToolHandler`:

```
composeToolHandler(tool, options)
  │
  ├─ 1. wrapWithErrorHandling(handler)
  │       Wraps the raw handler. Catches any thrown error and returns
  │       SafeResult<T> = { kind: 'error', error: ... } instead of re-throwing.
  │
  ├─ 2. wrapWithTokenLimit(handler, maxTokens)
  │       Serializes the ok result to JSON and counts approximate tokens.
  │       If the output exceeds maxTokens, truncates and appends a notice.
  │
  └─ 3. wrapWithToolResult(handler)
          Converts SafeResult<T> to the MCP SDK's CallToolResult shape,
          which the MCP framework sends back to the client.
```

This pipeline cleanly separates error handling, size management, and protocol formatting.

---

### SafeResult

Tools use a discriminated union to propagate results safely through the pipeline:

```typescript
type SafeResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'error'; error: unknown };
```

This avoids throw-based control flow after the initial error boundary.

---

### RedmineClient

`src/redmine/client.ts` is a thin HTTP client that:

- Reads `REDMINE_URL`, `REDMINE_API_KEY`, `REDMINE_USERNAME`, `REDMINE_PASSWORD` from environment variables at construction time
- Attaches appropriate auth headers (`X-Redmine-API-Key` and/or `Authorization: Basic ...`)
- Appends query params (skipping `null`/`undefined` values)
- Parses JSON responses or falls back to plain text
- Throws `RedmineApiError` for non-2xx responses

---

### Tool Registration and Deduplication

`wrapServerWithToolRegistry` decorates the `McpServer` instance with a `registerOnce` method that tracks registered tool names in a `Set`. Any attempt to register the same name twice logs a warning and skips registration — preventing hard-to-debug duplicate handler bugs.

---

## Data Flow

```
MCP Client (AI assistant)
       │
       │  tools/call  →  tool name + params
       ▼
  MCP SDK (StdioServerTransport)
       │
       ▼
  composeToolHandler pipeline
    │  wrapWithErrorHandling
    │  wrapWithTokenLimit
    │  wrapWithToolResult
       │
       ▼
  Tool handler (e.g., getIssuesTool)
       │
       ▼
  RedmineClient.get(...)
       │
       ▼
  Redmine REST API
       │
       ▼
  JSON response → SafeResult → CallToolResult
       │
       ▼
  MCP Client receives result
```

---

## Adding a New Toolset

To add a new toolset (e.g., `projects`):

1. **Create tool files** under `src/tools/projects/`:

   ```typescript
   // src/tools/projects/getProjects.ts
   import { ToolDefinition } from '../../types/tool.js';
   import { RedmineClient } from '../../redmine/client.js';
   import { TranslationHelper } from '../../createTranslationHelper.js';
   import { z } from 'zod';

   export function getProjectsTool(
     client: RedmineClient,
     helper: TranslationHelper
   ): ToolDefinition {
     return {
       name: 'get_projects',
       description: helper.record(
         'get_projects__description',
         'Returns a list of projects'
       ),
       schema: {
         /* zod shape */
       },
       handler: async (_params) => {
         const data = await client.get('/projects.json');
         return { kind: 'ok', data };
       },
     };
   }
   ```

2. **Register the toolset** in `src/tools/tools.ts`:

   ```typescript
   import { getProjectsTool } from './projects/getProjects.js';

   // inside allTools():
   {
     name: 'projects',
     description: 'Tools for querying Redmine projects.',
     enabled: false,
     tools: [getProjectsTool(client, helper)],
   }
   ```

3. **Enable it** via the environment:

   ```
   ENABLE_TOOLSETS=issue,issue_metadata,projects
   ```

4. **Write tests** under `src/tools/projects/getProjects.test.ts` following the patterns in existing test files.
