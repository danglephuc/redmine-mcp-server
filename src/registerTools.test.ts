import { describe, it, expect, vi } from 'vitest';
import { registerTools } from './registerTools.js';
import type { RedmineMCPServer } from './utils/wrapServerWithToolRegistry.js';
import type { ToolsetGroup } from './types/toolsets.js';

describe('registerTools', () => {
  it('registers enabled tools with prefix and maxTokens', () => {
    const registerOnce = vi.fn();
    const server = { registerOnce } as unknown as RedmineMCPServer;

    const toolsetGroup: ToolsetGroup = {
      toolsets: [
        {
          name: 'test',
          enabled: true,
          tools: [
            {
              name: 'foo',
              description: 'Foo tool',
              // minimal shape-like object for schema
              schema: { shape: {} as never },
            } as never,
          ],
        },
        {
          name: 'disabled',
          enabled: false,
          tools: [
            {
              name: 'bar',
              description: 'Bar tool',
              schema: { shape: {} as never },
            } as never,
          ],
        },
      ],
    };

    const options = { prefix: 'redmine_', maxTokens: 123 };

    registerTools(server, toolsetGroup, options as never);

    expect(registerOnce).toHaveBeenCalledTimes(1);
    const [name, description, schema, handler] = registerOnce.mock.calls[0];
    expect(name).toBe('redmine_foo');
    expect(description).toBe('Foo tool');
    expect(schema).toBe(
      (toolsetGroup.toolsets[0].tools[0] as any).schema.shape
    );
    expect(typeof handler).toBe('function');
  });
});
