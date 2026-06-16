import type { Any } from "./types";

/**
 * Decorates a single target function with a wrapper, returning a new function
 * with the same signature whose calls are intercepted by the wrapper.
 *
 * Unlike {@link decorator}, which creates a reusable decorator that can be
 * applied to many functions, `decorate` is a one-shot decoration of a specific
 * function.
 *
 * The wrapper receives the original function with `this` already bound, so it
 * can be called directly without additional binding. The wrapper has full
 * control over the call: it can read or modify arguments, read or modify the
 * return value, short-circuit by never calling `fn`, or call `fn` multiple
 * times (e.g. for retry logic).
 *
 * The decorated function preserves the original function's signature.
 *
 * @typeParam Args - The argument types of the target function.
 * @typeParam R - The return type of the target function.
 *
 * @param fn - The target function to decorate.
 * @param wrapper - A wrapper function that intercepts every call to the
 *   decorated function. It receives the bound original function (with `this`
 *   already bound to the caller's context) followed by the original arguments.
 *   It must return the same type as the target function.
 * @returns A new function with the same signature as `fn`, whose calls are
 *   intercepted by `wrapper`.
 *
 * @example Basic decoration — add logging around a function
 * ```ts
 * function greet(name: string) {
 *   return `Hello, ${name}!`;
 * }
 *
 * const loggedGreet = decorate(greet, (fn, name) => {
 *   console.log(`greet called with "${name}"`);
 *   const result = fn(name);
 *   console.log(`greet returned "${result}"`);
 *   return result;
 * });
 *
 * loggedGreet("Alice");
 * // logs: greet called with "Alice"
 * // logs: greet returned "Hello, Alice!"
 * ```
 *
 * @example Argument validation / guard — clamp input to a valid range
 * ```ts
 * function setVolume(level: number) {
 *   return level;
 * }
 *
 * const safeSetVolume = decorate(setVolume, (fn, level) => {
 *   const clamped = Math.max(0, Math.min(100, level));
 *   return fn(clamped);
 * });
 *
 * safeSetVolume(150); // => 100
 * safeSetVolume(-10); // => 0
 * ```
 *
 * @example Modifying the return value
 * ```ts
 * function fetchName() {
 *   return "  alice  ";
 * }
 *
 * const tidyFetchName = decorate(fetchName, (fn) => {
 *   return fn().trim().toUpperCase();
 * });
 *
 * tidyFetchName(); // => "ALICE"
 * ```
 *
 * @example Short-circuiting — return early without calling `fn`
 * ```ts
 * function divide(a: number, b: number) {
 *   return a / b;
 * }
 *
 * const safeDivide = decorate(divide, (fn, a, b) => {
 *   if (b === 0) return 0;
 *   return fn(a, b);
 * });
 *
 * safeDivide(10, 0); // => 0 (fn is never called)
 * safeDivide(10, 2); // => 5
 * ```
 *
 * @example Retry logic — call `fn` multiple times on failure
 * ```ts
 * function unreliableFetch(url: string): string {
 *   if (Math.random() < 0.5) throw new Error("network error");
 *   return `data from ${url}`;
 * }
 *
 * const resilientFetch = decorate(unreliableFetch, (fn, url) => {
 *   const maxRetries = 3;
 *   for (let attempt = 0; attempt < maxRetries; attempt++) {
 *     try {
 *       return fn(url);
 *     } catch {
 *       if (attempt === maxRetries - 1) throw new Error("all retries failed");
 *     }
 *   }
 *   throw new Error("unreachable");
 * });
 *
 * resilientFetch("https://example.com"); // retries up to 3 times
 * ```
 *
 * @example Memoization — cache results for a single function
 * ```ts
 * function expensiveComputation(n: number) {
 *   console.log("computing...");
 *   return n * n;
 * }
 *
 * const memoized = decorate(expensiveComputation, (() => {
 *   const cache = new Map<number, number>();
 *   return (fn: (n: number) => number, n: number) => {
 *     if (cache.has(n)) return cache.get(n)!;
 *     const result = fn(n);
 *     cache.set(n, result);
 *     return result;
 *   };
 * })());
 *
 * memoized(5); // logs "computing...", returns 25
 * memoized(5); // returns 25 (cached, no log)
 * ```
 */
export const decorate = <Args extends Any[], R>(
  fn: (...args: Args) => R,
  wrapper: (fn: (...args: Args) => R, ...args: Args) => R,
): ((...args: Args) => R) => {
  return function (this: unknown, ...args) {
    return wrapper(fn.bind(this), ...args);
  };
};
