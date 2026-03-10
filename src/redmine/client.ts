import dotenv from 'dotenv';
import env from 'env-var';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

dotenv.config();

// Rely on the global fetch provided by modern Node.js runtimes.
// Typing is kept loose here to avoid depending on DOM lib types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const fetch: any;

export class RedmineApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Redmine API error: ${status}`);
    this.status = status;
    this.body = body;
  }
}

export class RedmineClient {
  private baseUrl: string;
  private apiKey?: string;
  private basicAuth?: { username: string; password: string };

  constructor() {
    this.baseUrl = env
      .get('REDMINE_URL')
      .required()
      .asString()
      .replace(/\/+$/, '');

    const apiKey = env.get('REDMINE_API_KEY').asString();
    const username = env.get('REDMINE_USERNAME').asString();
    const password = env.get('REDMINE_PASSWORD').asString();

    if (apiKey) {
      this.apiKey = apiKey;
    }

    if (username && password) {
      this.basicAuth = { username, password };
    }

    if (!this.apiKey && !this.basicAuth) {
      throw new Error(
        'Redmine authentication is not configured. Set REDMINE_API_KEY and/or REDMINE_USERNAME and REDMINE_PASSWORD.'
      );
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['X-Redmine-API-Key'] = this.apiKey;
    }

    if (this.basicAuth) {
      const encoded = Buffer.from(
        `${this.basicAuth.username}:${this.basicAuth.password}`
      ).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    }

    return headers;
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      throw new RedmineApiError(res.status, body);
    }

    return body as T;
  }

  /**
   * Downloads the binary content at the given URL and returns it as a
   * base64-encoded string together with the content type.
   */
  async getAttachmentBuffer(
    contentUrl: string
  ): Promise<{ base64: string; mimeType: string }> {
    const res = await fetch(contentUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new RedmineApiError(res.status, await res.text());
    }

    const mimeType =
      res.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return { base64, mimeType };
  }

  /**
   * Streams the binary content at the given URL directly to a file on disk.
   * Creates intermediate directories as needed.
   * Uses a streaming pipeline when the response body is available to avoid
   * loading the entire file into memory.
   */
  async downloadAttachmentToFile(
    contentUrl: string,
    outputPath: string
  ): Promise<void> {
    const res = await fetch(contentUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new RedmineApiError(res.status, await res.text());
    }

    // Ensure the target directory exists.
    const { mkdir, open } = await import('node:fs/promises');
    await mkdir(path.dirname(outputPath), { recursive: true });

    if (res.body) {
      const { pipeline } = await import('node:stream/promises');
      const { Readable } = await import('node:stream');
      const fileHandle = await open(outputPath, 'w');
      try {
        await pipeline(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Readable.fromWeb(res.body as any),
          fileHandle.createWriteStream()
        );
      } finally {
        await fileHandle.close();
      }
    } else {
      // Fallback: buffer the whole response when streaming is unavailable.
      const arrayBuffer = await res.arrayBuffer();
      await writeFile(outputPath, Buffer.from(arrayBuffer));
    }
  }
}
