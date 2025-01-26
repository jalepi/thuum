import { Any, Attempt } from "./types";

/**
 * Decorates a function, returning a try-catch version which returns a {@link Attempt}
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
 * // ? (a: number, b: number) => [error: undefined, value: number] | [error: unknown, value?: number]
 *
 * const [error, value] = attemptToDivide(a, b);
 * // ? [error: undefined, value: number] | [error: unknown, value?: number]
 * if (error) {
 *   console.error(`Could not divide ${a} by ${b} because: `, error);
 * } else {
 *   console.info(`${a} divided by ${b} is ${value}`);
 * }
 * ```
 */
export const attempt =
  <Args extends Any[], R>(fn: (...args: Args) => R): ((...args: Args) => Attempt<R>) =>
  (...args: Args): Attempt<R> => {
    try {
      const value = fn(...args);
      return [undefined, value];
    } catch (error) {
      return [error, undefined];
    }
  };
