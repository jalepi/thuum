import type { Any, Result } from "../types";

/**
 * Decorates a function, returning a try-catch version which returns a {@link Result}
 * @param fn function
 * @returns attempt version of the function
 *
 * @example
 * ```ts
 * const fetchData = async <T>(path: string): T => {
 *   const res = await fetch(`https://jsonplaceholder.typicode.com/${path}`);
 *   const data = await res.json() as T;
 *   return data;
 * }
 *
 * const attemptToFetch = attempt(fetchData);
 *
 * const [error, data] = attemptToFetch("users/1/todos");
 * if (error) {
 *   console.error(`Could fetch data because: `, error);
 * } else {
 *   console.info(`Fetched data: `, data);
 * }
 * ```
 */
export const attempt =
  <const Args extends Any[], const R>(fn: (...args: Args) => Promise<R>) =>
  async (...args: Args): Promise<Result<R>> => {
    try {
      const value = await fn.apply(args);
      return { value };
    } catch (error) {
      return { error };
    }
  };
