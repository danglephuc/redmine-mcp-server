# Redmine MCP Server

A **read-only** [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for querying Redmine issue data via the Redmine REST API. Designed to integrate seamlessly with AI assistants (e.g., Claude, Cursor, GitHub Copilot) that support MCP.

## Features

- 🔍 **Read-only access to Redmine** — list issues, get issue details, query metadata
- 🔐 **Flexible authentication** — API key or HTTP Basic Auth (or both combined)
- 📦 **Toolset system** — enable only the tools you need
- 🔤 **Configurable tool prefix** — avoid naming conflicts across multiple MCP servers
- 🪙 **Token limiting** — automatically truncates oversized responses to avoid context overflow
- 🚀 **Zero local install** — run directly via `npx` without cloning the repo

## Available Tools

### Toolset: `issue`

| Tool                  | Description                                     | Redmine Endpoint            |
| --------------------- | ----------------------------------------------- | --------------------------- |
| `get_issues`          | List issues with rich filters                   | `GET /issues.json`          |
| `get_issue`           | Get a single issue with associated data         | `GET /issues/:id.json`      |
| `get_attachments`     | List attachments for an issue                   | `GET /issues/:id.json`      |
| `download_attachment` | Download an attachment as base64 (≤ 10 MB) or stream to disk via `outputPath` | `GET /attachments/:id.json` |

### Toolset: `issue_metadata`

| Tool                   | Description                   | Redmine Endpoint                          |
| ---------------------- | ----------------------------- | ----------------------------------------- |
| `get_trackers`         | List all trackers             | `GET /trackers.json`                      |
| `get_issue_statuses`   | List all issue statuses       | `GET /issue_statuses.json`                |
| `get_issue_priorities` | List all issue priorities     | `GET /enumerations/issue_priorities.json` |
| `get_issue_categories` | List categories for a project | `GET /projects/:id/issue_categories.json` |
| `get_issue_relations`  | List relations for an issue   | `GET /issues/:id/relations.json`          |

> Tools are prefixed with the value of `PREFIX` (e.g., `redmine_get_issues`). See [Configuration](docs/configuration.md) for details.

## Quick Start

### Requirements

- Node.js 20+ (uses built-in `fetch` and ES modules)
- A running Redmine instance with the REST API enabled
- A valid API key **or** username/password credentials

### Installation (via `npx`)

Add this to your MCP client configuration (e.g., Claude Desktop, Cursor, etc.):

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
        "ENABLE_TOOLSETS": "issue,issue_metadata",
      },
    },
  },
}
```

> See [Configuration](docs/configuration.md) for all available environment variables and CLI flags.

## Documentation

| Document                               | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [Configuration](docs/configuration.md) | All environment variables, CLI flags, and auth options |
| [Tools Reference](docs/tools.md)       | Detailed parameters and examples for every tool        |
| [Architecture](docs/architecture.md)   | Project structure, key modules, and extension guide    |
| [Development](docs/development.md)     | How to run, build, test, and extend this project       |

## Development

```bash
npm install
npm run dev          # run with tsx (hot reload)
npm run inspect      # launch MCP Inspector UI at http://localhost:6274
npm run build        # type-check and compile to build/
npm run test         # run all tests with vitest
npm run test:coverage  # run tests with coverage
npm run lint         # lint with eslint
npm run format       # check formatting with prettier
```

## License

MIT
