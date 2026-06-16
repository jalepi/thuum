import type { Any, MaybePromise } from "../types";

/**
 * Creates a decorator with a middleware
 *
 * @example
 * ```ts
 * import { decorate } from "./middleware";
 *
 * const time = middleware(async (next) => {
 *   const before = performance.now();
 *   await next();
 *   const after = performance.now();
 *   console.log(`it took: ${(after - before).toFixed(3)} seconds.`);
 * });
 *
 * async function doSomething() {
 *   // does something...
 *   await new Promise((resolve) => setTimeout(resolve, 1_000));
 * }
 *
 * const _doSomething = time(doSomething);
 *
 * // pass through the time middleware
 * await _doSomething();
 *
 * // should print the time doSomething took.
 *
 * const featureAccess = (feature: string) => middleware(async (next) => {
 *   if (!await isFeatureAllowed(feature)) {
 *     throw new FeatureNotAllowedError(feature);
 *   }
 *   await next();
 * });
 *
 * const _doSomething = await featureAccess("my feature name")(doSomething);
 *
 * await doSomething();  // works fine.
 * await _doSomething(); // it might throw error when feature is not allowed.
 * ```
 * @param middleware
 * @returns decorated function
 */
export const middleware =
  (middleware: (next: () => Promise<void>) => Promise<void>) =>
  <This, Args extends Any[], R>(
    fn: (this: This, ...args: Args) => MaybePromise<R>,
  ): ((this: This, ...args: Args) => Promise<R>) => {
    return async function (this, ...args) {
      let result = undefined as R;
      await middleware(async () => {
        result = await fn.apply(this, args);
      });
      return result;
    };
  };
