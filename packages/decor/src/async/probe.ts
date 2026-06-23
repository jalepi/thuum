import type { Any, MaybePromise, Result } from "../types";

type ProbeFn<Args extends Any[], R> =
  | ((args: Args) => Promise<(result: Result<R>) => Promise<void>>)
  | ((args: Args) => Promise<void>);

export type Probe<Args1 extends Any[] = Any[], R1 = unknown> = <const Args2 extends Args1, R2 extends R1>(
  fn: (...args: Args2) => MaybePromise<R2>,
) => (...args: Args2) => Promise<R2>;

/**
 * Creates an async probe decorator
 * @param probe
 * @returns async probe decorator
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
export const probe = <const Args extends Any[], const R>(probe: ProbeFn<Args, R>): Probe<Args, R> => {
  return (fn) => {
    return async (...args) => {
      const complete = await probe(args);
      try {
        const value = await fn.apply(this, args);
        await complete?.({ ok: true, value });
        return value;
      } catch (error) {
        await complete?.({ ok: false, error });
        throw error;
      }
    };
  };
};
