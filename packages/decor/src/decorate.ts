import type { Any } from "./types";

type Decorator<F extends (...args: Any[]) => unknown> = <F2 extends F>(
  fn: F2,
) => (this: ThisParameterType<F2>, ...args: Parameters<F2>) => ReturnType<F2>;

/**
 * Creates a type-safe function decorator.
 *
 * Takes a wrapper function that intercepts calls to the decorated function,
 * allowing you to add behavior before, after, or around the original invocation.
 * The wrapper receives the bound original function and its arguments, and must
 * return the same type as the original.
 *
 * @param decorator - A wrapper function that receives the original function (with `this` already bound) and its arguments.
 * @returns A decorator that can be applied to any compatible function, preserving its signature.
 *
 * @example
 * ```ts
 * const withLogging = decorate((fn, ...args) => {
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
export const decorate =
  <const Func extends (this: unknown, ...args: Any[]) => unknown>(
    decorator: (fn: Func, ...args: Parameters<Func>) => ReturnType<Func>,
  ): Decorator<Func> =>
  (fn) => {
    return function (this, ...args) {
      return decorator(fn.bind(this) as Func, ...args);
    };
  };
