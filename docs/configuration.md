# Configuration

All configuration can be provided via **environment variables** (e.g., in `.env` or directly in the MCP client config) or **CLI flags** (useful when running the server directly).

CLI flags always take precedence over environment variables.

---

## Environment Variables

### Required

| Variable      | Description                                           | Example                       |
| ------------- | ----------------------------------------------------- | ----------------------------- |
| `REDMINE_URL` | Base URL of your Redmine instance (no trailing slash) | `https://redmine.example.com` |

### Authentication

You must configure **at least one** of the following auth methods.

| Variable           | Description                                                           |
| ------------------ | --------------------------------------------------------------------- |
| `REDMINE_API_KEY`  | Redmine API key. Sent as the `X-Redmine-API-Key` header.              |
| `REDMINE_USERNAME` | Username for HTTP Basic Auth. Must be paired with `REDMINE_PASSWORD`. |
| `REDMINE_PASSWORD` | Password for HTTP Basic Auth. Must be paired with `REDMINE_USERNAME`. |

> **Using both API key and Basic Auth:**
> If **both** `REDMINE_API_KEY` and `REDMINE_USERNAME`/`REDMINE_PASSWORD` are set, the server sends **both** authentication headers on every request. This is useful when Redmine sits behind an HTTP proxy that requires Basic Auth in addition to the Redmine API key.

### Optional

| Variable          | Default      | Description                                                                                                                                              |
| ----------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_TOKENS`      | `50000`      | Maximum number of tokens allowed in a single tool response. Responses exceeding this are truncated.                                                      |
| `PREFIX`          | `""` (empty) | String prefix to prepend to all tool names (e.g., `redmine_` → `redmine_get_issues`). Useful to avoid name collisions when running multiple MCP servers. |
| `ENABLE_TOOLSETS` | `all`        | Comma-separated list of toolsets to enable. Available values: `issue`, `issue_metadata`, `all`.                                                          |

---

## CLI Flags

The following flags are available when running the server directly (e.g., `npx github:danglephuc/redmine-mcp-server [flags]`).

| Flag                    | Type    | Default | Description                                       |
| ----------------------- | ------- | ------- | ------------------------------------------------- |
| `--max-tokens`          | number  | `50000` | Maximum tokens per response                       |
| `--prefix`              | string  | `""`    | Tool name prefix                                  |
| `--enable-toolsets`     | array   | `all`   | Space-separated list of toolsets to enable        |
| `--export-translations` | boolean | `false` | Export internal translation keys as JSON and exit |

**Example:**

```bash
npx github:danglephuc/redmine-mcp-server \
  --max-tokens 30000 \
  --prefix redmine_ \
  --enable-toolsets issue issue_metadata
```

---

## MCP Client Configuration Examples

### Using API Key

```jsonc
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["github:danglephuc/redmine-mcp-server"],
      "env": {
        "REDMINE_URL": "https://redmine.example.com",
        "REDMINE_API_KEY": "your-api-key-here",
        "PREFIX": "redmine_",
        "ENABLE_TOOLSETS": "issue,issue_metadata",
      },
    },
  },
}
```

### Using Basic Auth

```jsonc
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["github:danglephuc/redmine-mcp-server"],
      "env": {
        "REDMINE_URL": "https://redmine.example.com",
        "REDMINE_USERNAME": "alice",
        "REDMINE_PASSWORD": "secret",
      },
    },
  },
}
```

### Selective Toolsets

```jsonc
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["github:danglephuc/redmine-mcp-server"],
      "env": {
        "REDMINE_URL": "https://redmine.example.com",
        "REDMINE_API_KEY": "your-api-key-here",
        "ENABLE_TOOLSETS": "issue", // Only enable issue tools
      },
    },
  },
}
```

---

## `.env` File (Local / Dev)

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```dotenv
REDMINE_URL=https://redmine.example.com
REDMINE_API_KEY=your-api-key-here

# Optional
MAX_TOKENS=50000
PREFIX=redmine_
ENABLE_TOOLSETS=all
```
