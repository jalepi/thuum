import type { Any, Result } from "./types";

type ProbeFn<Ctx, Args extends Any[], R> =
  | (({ ctx, args }: { ctx: Ctx; args: Args }) => void)
  | (({ ctx, args }: { ctx: Ctx; args: Args }) => (result: Result<R>) => void);

/**
 * Creates a probe decorator
 * @param probe
 * @returns probe decorator
 *
 * @example
 * const trace = probe(({ ctx, args }) => {
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
export const probe = <const Ctx, const Args extends Any[] = Any[], const R = unknown>(probe: ProbeFn<Ctx, Args, R>) => {
  return <const Args2 extends Args, const R2 extends R>(ctx: Ctx, fn: (...args: Args2) => R2) => {
    return function (this: void, ...args: Args2): R2 {
      const complete = probe({ ctx, args });
      try {
        const value = fn.apply(this, args);
        complete?.({ value });
        return value;
      } catch (error) {
        complete?.({ error });
        throw error;
      }
    };
  };
};
