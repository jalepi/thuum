import type { Any } from "../types";

type Decorator<F extends (...args: Any[]) => Promise<unknown>> = <F2 extends F>(
  fn: F2,
) => (this: ThisParameterType<F2>, ...args: Parameters<F2>) => ReturnType<F2>;

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
  <const Func extends (this: unknown, ...args: Any[]) => Promise<unknown>>(
    wrapper: (fn: Func, ...args: Parameters<Func>) => ReturnType<Func>,
  ): Decorator<Func> =>
  (fn) => {
    return function (this, ...args) {
      return wrapper(fn.bind(this) as Func, ...args);
    };
  };
