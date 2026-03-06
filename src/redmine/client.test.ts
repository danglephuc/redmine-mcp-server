import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedmineClient, RedmineApiError } from './client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(
  status: number,
  body: unknown,
  contentType = 'application/json'
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name === 'content-type' ? contentType : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  });
}

function setupEnv() {
  process.env.REDMINE_URL = 'https://redmine.example.com';
  process.env.REDMINE_API_KEY = 'test-api-key';
  delete process.env.REDMINE_USERNAME;
  delete process.env.REDMINE_PASSWORD;
}

function clearEnv() {
  delete process.env.REDMINE_URL;
  delete process.env.REDMINE_API_KEY;
  delete process.env.REDMINE_USERNAME;
  delete process.env.REDMINE_PASSWORD;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedmineApiError', () => {
  it('has the correct message, status, and body', () => {
    const err = new RedmineApiError(404, { error: 'Not found' });
    expect(err.message).toBe('Redmine API error: 404');
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ error: 'Not found' });
    expect(err).toBeInstanceOf(Error);
  });
});

describe('RedmineClient', () => {
  beforeEach(() => {
    setupEnv();
  });

  afterEach(() => {
    clearEnv();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('initialises with REDMINE_API_KEY', () => {
      expect(() => new RedmineClient()).not.toThrow();
    });

    it('initialises with REDMINE_USERNAME + REDMINE_PASSWORD', () => {
      delete process.env.REDMINE_API_KEY;
      process.env.REDMINE_USERNAME = 'user';
      process.env.REDMINE_PASSWORD = 'pass';
      expect(() => new RedmineClient()).not.toThrow();
    });

    it('throws when neither API key nor basic-auth credentials are set', () => {
      delete process.env.REDMINE_API_KEY;
      expect(() => new RedmineClient()).toThrow(
        'Redmine authentication is not configured'
      );
    });

    it('throws when REDMINE_URL is missing', () => {
      delete process.env.REDMINE_URL;
      expect(() => new RedmineClient()).toThrow();
    });

    it('strips a trailing slash from REDMINE_URL', () => {
      process.env.REDMINE_URL = 'https://redmine.example.com/';
      const mockFetch = makeFetchMock(200, { issues: [] });
      vi.stubGlobal('fetch', mockFetch);

      const client = new RedmineClient();
      client.get('/issues.json');

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('//issues');
    });
  });

  // -------------------------------------------------------------------------
  // get() — happy path
  // -------------------------------------------------------------------------

  describe('get()', () => {
    it('returns parsed JSON body on a successful response', async () => {
      const responseBody = { issues: [{ id: 1 }] };
      vi.stubGlobal('fetch', makeFetchMock(200, responseBody));

      const client = new RedmineClient();
      const result = await client.get('/issues.json');

      expect(result).toEqual(responseBody);
    });

    it('sends the X-Redmine-API-Key header when configured with an API key', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new RedmineClient();
      await client.get('/issues.json');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-Redmine-API-Key']).toBe('test-api-key');
    });

    it('sends the Authorization: Basic header when configured with username/password', async () => {
      delete process.env.REDMINE_API_KEY;
      process.env.REDMINE_USERNAME = 'alice';
      process.env.REDMINE_PASSWORD = 'secret';

      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new RedmineClient();
      await client.get('/issues.json');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('appends query params to the URL', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new RedmineClient();
      await client.get('/issues.json', { project_id: 5, status_id: 'open' });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('project_id=5');
      expect(calledUrl).toContain('status_id=open');
    });

    it('skips null/undefined param values', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new RedmineClient();
      await client.get('/issues.json', {
        project_id: undefined as never,
        limit: 10,
      });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('project_id');
      expect(calledUrl).toContain('limit=10');
    });

    it('returns plain text when the response Content-Type is not JSON', async () => {
      vi.stubGlobal('fetch', makeFetchMock(200, 'plain text', 'text/plain'));

      const client = new RedmineClient();
      const result = await client.get('/some/endpoint');
      expect(result).toBe('plain text');
    });

    // -------------------------------------------------------------------------
    // get() — error paths
    // -------------------------------------------------------------------------

    it('throws RedmineApiError on a 404 response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetchMock(404, { errors: ['Issue not found'] })
      );

      const client = new RedmineClient();
      await expect(client.get('/issues/999.json')).rejects.toBeInstanceOf(
        RedmineApiError
      );
    });

    it('includes the HTTP status and body in the thrown RedmineApiError', async () => {
      const errorBody = { errors: ['Forbidden'] };
      vi.stubGlobal('fetch', makeFetchMock(403, errorBody));

      const client = new RedmineClient();
      try {
        await client.get('/issues.json');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RedmineApiError);
        const apiErr = err as RedmineApiError;
        expect(apiErr.status).toBe(403);
        expect(apiErr.body).toEqual(errorBody);
      }
    });

    it('throws RedmineApiError on a 500 response', async () => {
      vi.stubGlobal('fetch', makeFetchMock(500, { error: 'Server error' }));

      const client = new RedmineClient();
      await expect(client.get('/issues.json')).rejects.toBeInstanceOf(
        RedmineApiError
      );
    });
  });
});
