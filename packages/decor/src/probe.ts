import type { Any, Attempt } from "./types";

/**
 * Creates a probe decorator
 * @param probe
 * @returns probe decorator
 *
 * @example
 * const trace = probe(({ args }) => {
 *   console.log("function arguments:", args);
 *   return (result) => {
 *     if (result.success) {
 *       console.log("function succeeded with return: ", result.value);
 *     } else {
 *       console.log("function failed with error: ", result.error);
 *     }
 *   };
 * });
 *
 */
export const probe = <Args extends Any[], R>(probe: (opts: { args: Args }) => (opts: Attempt<R>) => void) => {
  return <Args2 extends Args, R2 extends R>(fn: (...args: Args2) => R2) => {
    return (...args: Args2): R2 => {
      const complete = probe({ args });
      try {
        const value = fn(...args);
        complete({ success: true, value });
        return value;
      } catch (error) {
        complete({ success: false, error });
        throw error;
      }
    };
  };
};
