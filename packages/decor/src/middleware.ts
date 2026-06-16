import type { Any } from "./types";

/**
 * Creates a decorator with a middleware
 *
 * @example
 * ```ts
 * import { decorate } from "./middleware";
 *
 * const time = middleware((next) => {
 *   const before = performance.now();
 *   next();
 *   const after = performance.now();
 *   console.log(`it took: ${(after - before).toFixed(3)} seconds.`);
 * });
 *
 * function doSomething() {
 *   // does something...
 * }
 *
 * const _doSomething = time(doSomething);
 * _doSomething();
 *
 * // should print the time doSomething took.
 *
 * const featureAccess = (feature: string) => middleware((next) => {
 *   if (!isFeatureAllowed(feature)) {
 *     throw new FeatureNotAllowedError(feature);
 *   }
 *   next();
 * });
 *
 * const _doSomething = featureAccess("my feature name")(doSomething);
 *
 * doSomething();  // works fine.
 * _doSomething(); // it might throw error when feature is not allowed.
 * ```
 * @param middleware
 * @returns decorated function
 */
export const middleware =
  (middleware: (next: () => void) => void) =>
  <This, Args extends Any[], R>(fn: (this: This, ...args: Args) => R): ((this: This, ...args: Args) => R) => {
    return function (this, ...args) {
      let result = undefined as R;
      middleware(() => {
        result = fn.apply(this, args);
      });
      return result;
    };
  };
