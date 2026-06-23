import type { Any, MaybePromise } from "../types";

export type Decorator<Args1 extends Any[] = Any[], R1 = unknown> = <Args2 extends Args1, R2 extends R1>(
  fn: (...args: Args2) => MaybePromise<R2>,
) => (...args: Args2) => Promise<R2>;

/**
 * Creates a type-safe async function decorator.
 *
 * Takes an async wrapper function that intercepts calls to the decorated function,
 * allowing you to add behavior before, after, or around the original invocation.
 * The wrapper receives the bound original function and its arguments, and must
 * return a Promise resolving to the same type as the original.
 *
 * @param wrapper - An async wrapper function that receives the original function (with `this` already bound) and its arguments.
 * @returns A decorator that can be applied to any compatible async function, preserving its signature.
 *
 * @example
 * ```ts
 * const withLogging = decorator(async (fn, ...args) => {
 *   console.log("calling with", args);
 *   const result = await fn(...args);
 *   console.log("returned", result);
 *   return result;
 * });
 *
 * const fetchUser = withLogging(async (id: number) => {
 *   const res = await fetch(`/api/users/${id}`);
 *   return res.json();
 * });
 * await fetchUser(1); // logs: calling with [1] → returned {...}
 * ```
 */
export const decorator =
  <const Args extends Any[], const R>(
    wrapper: (fn: (...args: Args) => MaybePromise<R>, ...args: Args) => Promise<R>,
  ): Decorator<Args, R> =>
  (fn) => {
    return async function (this: unknown, ...args) {
      return (await wrapper(
        async (...args) => {
          return await fn.call(this, ...(args as Parameters<typeof fn>));
        },
        ...args,
      )) as ReturnType<typeof fn>;
    };
  };
