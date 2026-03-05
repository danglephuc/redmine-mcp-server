import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';

export interface RedmineMCPServer extends McpServer {
  __registeredToolNames?: Set<string>;

  registerOnce: (
    name: string,
    description: string,
    schema: ZodRawShapeCompat,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any
  ) => void;
}

export function wrapServerWithToolRegistry(server: McpServer): RedmineMCPServer {
  const s = server as RedmineMCPServer;

  if (!s.__registeredToolNames) {
    s.__registeredToolNames = new Set<string>();
  }

  s.registerOnce = (
    name: string,
    description: string,
    schema: ZodRawShapeCompat,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any
  ) => {
    if (s.__registeredToolNames!.has(name)) {
      // eslint-disable-next-line no-console
      console.warn(`Skipping duplicate tool registration: ${name}`);
      return;
    }
    s.__registeredToolNames!.add(name);
    (s as any).tool(name, description, schema, handler);
  };

  return s;
}

