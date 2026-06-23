import type { Any } from "./types";

export type Decorator<Args1 extends Any[] = Any[], R1 = unknown> = <Args2 extends Args1, R2 extends R1>(
  fn: (...args: Args2) => R2,
) => (...args: Args2) => R2;

/**
 * Creates a type-safe function decorator.
 *
 * Takes a wrapper function that intercepts calls to the decorated function,
 * allowing you to add behavior before, after, or around the original invocation.
 * The wrapper receives the bound original function and its arguments, and must
 * return the same type as the original.
 *
 * @param wrapper - A wrapper function that receives the original function (with `this` already bound) and its arguments.
 * @returns A decorator that can be applied to any compatible function, preserving its signature.
 *
 * @example
 * ```ts
 * const withLogging = decorator((fn, ...args) => {
 *   console.log("calling with", args);
 *   const result = fn(...args);
 *   console.log("returned", result);
 *   return result;
 * });
 *
 * const add = withLogging((a: number, b: number) => a + b);
 * add(1, 2); // logs: calling with [1, 2] → returned 3
 * ```
 */
export const decorator =
  <const Args extends Any[], const R>(wrapper: (fn: (...args: Args) => R, ...args: Args) => R): Decorator<Args, R> =>
  (fn) => {
    return function (this: unknown, ...args) {
      return wrapper(
        (...args) => {
          return fn.call(this, ...(args as Parameters<typeof fn>));
        },
        ...args,
      ) as ReturnType<typeof fn>;
    };
  };
