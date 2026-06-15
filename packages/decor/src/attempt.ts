import type { Any, Result } from "./types";

/**
 * Decorates a function, returning a try-catch version which returns a {@link Result}
 * @param fn function
 * @returns attempt version of the function
 *
 * @example
 * ```ts
 * const divide = (a: number, b: number) => {
 *   if (b === 0) {
 *     throw new Error("Divide by zero error");
 *   }
 *   return a / b;
 * };
 *
 * const attemptToDivide = attempt(divide);
 * // ? (a: number, b: number) => { ok: true; value: number; error?: undefined } | { ok: false; value?: undefined; error: unknown }
 *
 * const { ok, value, error } = attemptToDivide(a, b);
 * // ? { ok: true, value: number; error?: undefined } | { ok: false; value?: undefined; error: unknown }
 * if (!ok) {
 *   console.error(`Could not divide ${a} by ${b} because: `, error);
 * } else {
 *   console.info(`${a} divided by ${b} is ${value}`);
 * }
 * ```
 */
export const attempt = <const Args extends Any[], const R>(fn: (...args: Args) => R) =>
  function (this: void, ...args: Args): Result<R> {
    try {
      const value = fn.apply(this, args);
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error };
    }
  };
