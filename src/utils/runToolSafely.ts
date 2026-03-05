import { ErrorLike, OkResult, SafeResult } from '../types/result.js';
import { RedmineApiError } from '../redmine/client.js';

export function runToolSafely<I, T>(
  fn: (input: I) => Promise<T>,
  onError?: (err: unknown) => ErrorLike
): (input: I) => Promise<SafeResult<T>> {
  return async (input: I): Promise<SafeResult<T>> => {
    try {
      const data = await fn(input);
      return { kind: 'ok', data } as OkResult<T>;
    } catch (err) {
      if (onError) {
        return onError(err);
      }

      if (err instanceof RedmineApiError) {
        return {
          kind: 'error',
          message: err.message,
          status: err.status,
          details: err.body,
        };
      }

      if (err instanceof Error) {
        return { kind: 'error', message: err.message };
      }

      return { kind: 'error', message: 'Unknown error' };
    }
  };
}
