import type { Any, Attempt } from "../types";

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
export const probe = <const Args extends Any[], const R>(
  probe: (...args: Args) => Promise<void | (([error, value]: Attempt<R>) => Promise<void>)>,
) => {
  return <const Args2 extends Args, const R2 extends R>(fn: (...args: Args2) => Promise<R2>) => {
    return async (...args: Args2): Promise<R2> => {
      const complete = await probe(...args);
      try {
        const value = await fn(...args);
        await complete?.([undefined, value]);
        return value;
      } catch (error) {
        await complete?.([error, undefined]);
        throw error;
      }
    };
  };
};
