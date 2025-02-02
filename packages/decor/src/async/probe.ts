import type { Any, Result } from "../types";

type ProbeAsyncFn<Args extends Any[], R> =
  | ((args: Args) => Promise<(result: Result<R>) => Promise<void>>)
  | ((args: Args) => Promise<void>);

/**
 * Creates an async probe decorator
 * @param probe
 * @returns async probe decorator
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
export const probe = <const Args extends Any[], const R>(probe: ProbeAsyncFn<Args, R>) => {
  return <const Args2 extends Args, const R2 extends R>(fn: (...args: Args2) => Promise<R2>) => {
    return async (...args: Args2): Promise<R2> => {
      const complete = await probe(args);
      try {
        const value = await fn.apply(this, args);
        await complete?.({ value });
        return value;
      } catch (error) {
        await complete?.({ error });
        throw error;
      }
    };
  };
};
