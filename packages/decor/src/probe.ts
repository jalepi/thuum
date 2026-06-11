import type { Any, Result } from "./types";

type ProbeFn<Args extends Any[], R> = ((...args: Args) => void) | ((...args: Args) => (result: Result<R>) => void);

/**
 * Creates a probe decorator
 * @param probe
 * @returns probe decorator
 *
 * @example
 * const trace = probe((...args) => {
 *   console.log("function arguments:", args);
 *   return (result) => {
 *     if ("error" in result) {
 *       console.log("function failed with error: ", result.error);
 *     } else {
 *       console.log("function succeeded with return: ", result.value);
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
export const probe = <const Args extends Any[] = Any[], const R = unknown>(probe: ProbeFn<Args, R>) => {
  return <const Args2 extends Args, const R2 extends R>(fn: (...args: Args2) => R2) => {
    return function (this: void, ...args: Args2): R2 {
      const complete = probe(...args);
      try {
        const value = fn.call(this, ...args);
        complete?.({ value });
        return value;
      } catch (error) {
        complete?.({ error });
        throw error;
      }
    };
  };
};
