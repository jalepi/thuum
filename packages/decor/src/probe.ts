import type { Any, Result } from "./types";

type ProbeFn<Args extends Any[], R> = ((...args: Args) => void) | ((...args: Args) => (result: Result<R>) => void);

type Probe<Args1 extends Any[] = Any[], R1 = unknown> = <Args2 extends Args1, R2 extends R1>(
  fn: (...args: Args2) => R2,
) => (...args: Args2) => R2;

/**
 * Creates a probe decorator
 * @param probe
 * @returns probe decorator
 *
 * @example
 * const trace = probe((...args) => {
 *   console.log("function arguments:", args);
 *   return ({ ok, error, value }) => {
 *     if (!ok) {
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
export const probe = <const Args extends Any[] = Any[], const R = unknown>(probe: ProbeFn<Args, R>): Probe<Args, R> => {
  return (fn) => {
    return function (this: void, ...args) {
      const complete = probe(...args);
      try {
        const value = fn.call(this, ...args);
        complete?.({ ok: true, value });
        return value;
      } catch (error) {
        complete?.({ ok: false, error });
        throw error;
      }
    };
  };
};
