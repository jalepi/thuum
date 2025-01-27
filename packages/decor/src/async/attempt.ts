import { Any, Attempt } from "../types";

/**
 * Decorates a function, returning a try-catch version which returns a {@link Attempt}
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
  <const Args extends Any[], const R>(fn: (...args: Args) => Promise<R>): ((...args: Args) => Promise<Attempt<R>>) =>
  async (...args: Args): Promise<Attempt<R>> => {
    try {
      const value = await fn(...args);
      return [undefined, value];
    } catch (error) {
      return [error, undefined];
    }
  };
