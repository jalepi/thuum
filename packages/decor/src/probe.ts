import type { Any, AvoidableFn, Result } from "./types";

type ProbeFn<Args extends Any[], R> = AvoidableFn<(...args: Args) => (result: Result<R>) => void>;

/**
 * Creates a probe decorator
 * @param probe
 * @returns probe decorator
 *
 * @example
 * const trace = probe((...args) => {
 *   console.log("function arguments:", args);
 *   return ([error, value]) => {
 *     if (error) {
 *       console.log("function failed with error: ", error);
 *     } else {
 *       console.log("function succeeded with return: ", value);
 *     }
 *   };
 * });
 *
 * const hello = trace((name: string) => console.log(`Hello, ${name}!`));
 * hello("my friend");
 *
 * // prints function arguments: "my friend"
 * // prints Hello, my friend
 * // prints function succeeded with return: "Hello, my friend"
 */
export const probe = <const Args extends Any[], const R>(probe: ProbeFn<Args, R>) => {
  return <const Args2 extends Args, const R2 extends R>(fn: (...args: Args2) => R2) => {
    return (...args: Args2): R2 => {
      const complete = probe.apply(probe, args);
      try {
        const value = fn.apply(fn, args);
        complete?.({ value });
        return value;
      } catch (error) {
        complete?.({ error });
        throw error;
      }
    };
  };
};
