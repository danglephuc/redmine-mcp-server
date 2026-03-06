# Development Guide

This document covers how to set up a local development environment, run the server, write tests, and contribute to the project.

---

## Prerequisites

- **Node.js 20+** — required for native `fetch` and ES module support
- **npm** (bundled with Node.js)
- A Redmine instance (or a mock) for manual testing

---

## Setup

```bash
# Clone the repo
git clone https://github.com/danglephuc/redmine-mcp-server.git
cd redmine-mcp-server

# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env
```

---

## Running Locally

```bash
npm run dev
```

This uses `tsx` to run `src/index.ts` directly (no compilation step). The server starts and listens on **stdio** (standard input/output), as required by the MCP protocol.

To connect a local MCP client to your dev server, point it to the local script:

```jsonc
{
  "mcpServers": {
    "redmine-dev": {
      "command": "npx",
      "args": ["tsx", "/path/to/redmine-mcp/src/index.ts"],
      "env": {
        "REDMINE_URL": "https://redmine.example.com",
        "REDMINE_API_KEY": "your-api-key",
      },
    },
  },
}
```

---

## Debugging with MCP Inspector

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the official debugging tool for MCP servers. It provides a web UI where you can browse tools, call them with custom inputs, and inspect raw responses in real time — without needing a full AI client.

### Quick Start

```bash
npm run inspect
```

This runs:

```
npx @modelcontextprotocol/inspector tsx src/index.ts
```

The Inspector starts two processes:

- **MCP Proxy** — relays messages between the UI and your server (default port `6277`)
- **Inspector UI** — a React web app (default port `6274`)

Then open `http://localhost:6274` in your browser.

### Environment Variables

The inspector needs your Redmine credentials. The server automatically loads `.env` via `dotenv`, so as long as your `.env` file is populated, no extra steps are needed:

```dotenv
# .env
REDMINE_URL=https://redmine.example.com
REDMINE_API_KEY=your-api-key-here
PREFIX=redmine_
ENABLE_TOOLSETS=issue,issue_metadata
```

Alternatively, you can pass env vars inline:

```bash
REDMINE_URL=https://... REDMINE_API_KEY=... npm run inspect
```

### Using the Inspector UI

Once the browser is open at `http://localhost:6274`:

1. **Connect** — the Inspector automatically connects to your running MCP server
2. **Tools tab** — lists all registered tools with their schemas and descriptions
3. **Call a tool** — select a tool, fill in its parameters (JSON form), and click **Run**
4. **Inspect the response** — view the raw JSON result or any error messages
5. **Server logs** — stderr output from the server (e.g., pino logs) appears in the terminal where you ran `npm run inspect`

### Customising Ports

If the default ports conflict with other services:

```bash
CLIENT_PORT=8080 SERVER_PORT=9000 npm run inspect
```

### After Building

You can also inspect the compiled server (closer to production behavior):

```bash
npm run build
npx @modelcontextprotocol/inspector node build/index.js
```

---

## Building

```bash
npm run build
```

Compiles TypeScript to `build/` using `tsc`. The compiled output is what gets published and run with `npx`.

```bash
npm run typecheck
```

Type-checks the source without emitting any files. Useful for CI or pre-commit checks.

---

## Testing

The project uses [Vitest](https://vitest.dev/) for unit tests. Tests live alongside source files as `*.test.ts`.

```bash
npm run test              # run all tests in watch mode
npm run test:coverage     # run tests once and generate a coverage report
```

### Test Structure

Each module has a corresponding test file. For example:

| Source                                            | Test                                                   |
| ------------------------------------------------- | ------------------------------------------------------ |
| `src/redmine/client.ts`                           | `src/redmine/client.test.ts`                           |
| `src/tools/issue/getIssue.ts`                     | `src/tools/issue/getIssue.test.ts`                     |
| `src/handlers/transformers/wrapWithTokenLimit.ts` | `src/handlers/transformers/wrapWithTokenLimit.test.ts` |

### Writing Tests for a New Tool

Follow the existing pattern. See `src/tools/issue/getIssue.test.ts` as a reference:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getMyNewTool } from './getMyNew.js';

describe('getMyNewTool', () => {
  it('calls the correct endpoint', async () => {
    const mockClient = { get: vi.fn().mockResolvedValue({ data: [] }) };
    const mockHelper = { record: (_key: string, val: string) => val };

    const tool = getMyNewTool(mockClient as any, mockHelper as any);
    const result = await tool.handler({
      /* params */
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/my-endpoint.json',
      expect.any(Object)
    );
    expect(result.kind).toBe('ok');
  });
});
```

---

## Linting and Formatting

```bash
npm run lint          # check with eslint
npm run lint:fix      # auto-fix eslint issues
npm run format        # check formatting with prettier
npm run format:fix    # auto-fix formatting
```

The project uses ESLint with `@typescript-eslint` and Prettier for consistent code style.

---

## Releasing

Releases are managed with [release-it](https://github.com/release-it/release-it) and conventional commits.

```bash
npm run release       # bump version, update CHANGELOG, create git tag
```

The `.release-it.json` config controls the release workflow (version bumping, changelog generation, etc.).

---

## Project Scripts Summary

| Script                  | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Run the server with `tsx` (no build needed)                  |
| `npm run inspect`       | Launch MCP Inspector + dev server at `http://localhost:6274` |
| `npm run build`         | Compile TypeScript to `build/`                               |
| `npm run typecheck`     | Type-check without emitting                                  |
| `npm run test`          | Run tests with Vitest (watch mode)                           |
| `npm run test:coverage` | Run tests with V8 coverage report                            |
| `npm run lint`          | Lint with ESLint                                             |
| `npm run lint:fix`      | Auto-fix lint issues                                         |
| `npm run format`        | Check formatting with Prettier                               |
| `npm run format:fix`    | Auto-fix formatting                                          |

---

## Exporting Translations

The server has a built-in translation helper that collects all user-facing strings and allows them to be exported for potential localization:

```bash
node build/index.js --export-translations
# or (in dev)
npx tsx src/index.ts --export-translations
```

This prints a JSON object of all registered translation keys and their default values to stdout, then exits.
