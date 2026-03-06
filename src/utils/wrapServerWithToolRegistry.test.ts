import { describe, it, expect, vi } from 'vitest';
import { wrapServerWithToolRegistry } from './wrapServerWithToolRegistry.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function makeMockServer() {
  return {
    tool: vi.fn(),
  } as unknown as McpServer;
}

describe('wrapServerWithToolRegistry', () => {
  it('adds the registerOnce method to the server', () => {
    const server = wrapServerWithToolRegistry(makeMockServer());
    expect(typeof server.registerOnce).toBe('function');
  });

  it('initialises __registeredToolNames as an empty Set', () => {
    const server = wrapServerWithToolRegistry(makeMockServer());
    expect(server.__registeredToolNames).toBeInstanceOf(Set);
    expect(server.__registeredToolNames!.size).toBe(0);
  });

  it('calls server.tool on first registration', () => {
    const raw = makeMockServer();
    const server = wrapServerWithToolRegistry(raw);
    const handler = vi.fn();

    server.registerOnce('my_tool', 'desc', {} as never, handler);

    expect(raw.tool).toHaveBeenCalledTimes(1);
    expect(raw.tool).toHaveBeenCalledWith('my_tool', 'desc', {}, handler);
  });

  it('skips duplicate registrations and does not call server.tool again', () => {
    const raw = makeMockServer();
    const server = wrapServerWithToolRegistry(raw);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.registerOnce('dup_tool', 'desc', {} as never, vi.fn());
    server.registerOnce('dup_tool', 'desc', {} as never, vi.fn());

    expect(raw.tool).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('dup_tool'));
    errorSpy.mockRestore();
  });

  it('tracks all registered tool names in __registeredToolNames', () => {
    const server = wrapServerWithToolRegistry(makeMockServer());
    server.registerOnce('tool_a', 'd', {} as never, vi.fn());
    server.registerOnce('tool_b', 'd', {} as never, vi.fn());

    expect(server.__registeredToolNames!.has('tool_a')).toBe(true);
    expect(server.__registeredToolNames!.has('tool_b')).toBe(true);
  });

  it('allows registering different tools independently', () => {
    const raw = makeMockServer();
    const server = wrapServerWithToolRegistry(raw);

    server.registerOnce('tool_x', 'desc x', {} as never, vi.fn());
    server.registerOnce('tool_y', 'desc y', {} as never, vi.fn());

    expect(raw.tool).toHaveBeenCalledTimes(2);
  });
});
