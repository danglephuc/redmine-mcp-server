import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrackersTool } from './getTrackers.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { RedmineClient } from '../../redmine/client.js';

const mockTrackers = {
  trackers: [
    { id: 1, name: 'Bug', default_status: { id: 1, name: 'New' } },
    { id: 2, name: 'Feature', default_status: { id: 1, name: 'New' } },
    { id: 3, name: 'Support', default_status: { id: 1, name: 'New' } },
  ],
};

describe('getTrackersTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockTrackers),
  } as unknown as RedmineClient;

  const tool = getTrackersTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockTrackers
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_trackers');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of trackers from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockTrackers);
  });

  it('calls client.get with the correct URL and no params', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/trackers.json');
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });
});
