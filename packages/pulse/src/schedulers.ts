import type { MaybePromise } from "./base";

/**
 * Schedules callback execution
 */
export type Scheduler = {
  /**
   * Schedules a callback to be executed, returning a promise that resolves to the callback's result.
   *
   * @example
   * ```ts
   * const result = await scheduler.next(() => 42);
   * console.log(result); // 42
   * ```
   */
  next<T>(callback: () => MaybePromise<T>): Promise<T>;
};

/**
 * Provides a continuation scheduler that wraps a promise seed and executes callbacks synchronously.
 * @param seed
 * @returns Scheduler
 *
 * @example
 * ```ts
 * import { continuation } from "@thuum/pulse";
 *
 * const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
 * const scheduler = continuation();
 * await Promise.all([
 *   scheduler.next(() => delay(3000)).then(() => console.log("3s")),
 *   scheduler.next(() => delay(2000)).then(() => console.log("2s")),
 *   scheduler.next(() => delay(1000)).then(() => console.log("1s")),
 * ]);
 * // prints "3s", "2s", "1s" in order
 * ```
 */
export const continuation = (seed: Promise<unknown> = Promise.resolve()): Scheduler => ({
  next<T>(callback: () => MaybePromise<T>): Promise<T> {
    const current = seed.then(callback).catch(callback);
    seed = current.finally();
    return current;
  },
});
