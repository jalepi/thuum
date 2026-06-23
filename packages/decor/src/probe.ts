import type { Any, Result } from "./types";

/**
 * The function signature accepted by {@link probe}.
 *
 * A `ProbeFn` is called with the decorated function's arguments each time it
 * is invoked. It can optionally return a completion callback that receives the
 * {@link Result} (success or failure) of the invocation.
 *
 * Two forms are supported:
 * - **Fire-and-forget** — `(...args) => void` — observe arguments only.
 * - **With completion** — `(...args) => (result: Result<R>) => void` — observe
 *   both the arguments and the outcome.
 *
 * @typeParam Args - The argument types the probe will receive.
 * @typeParam R - The return type used in the completion {@link Result}.
 */
type ProbeFn<Args extends Any[], R> = ((...args: Args) => void) | ((...args: Args) => (result: Result<R>) => void);

/**
 * A decorator created by {@link probe} that instruments a function for
 * observation without modifying its behavior.
 *
 * When applied to a function, the resulting function has the same signature and
 * semantics as the original — the probe only observes, it does not intercept or
 * alter arguments, return values, or thrown errors.
 *
 * `Probe` is contravariant on `Args1` and covariant on `R1`, meaning a probe
 * typed for a base type can be applied to functions with more specific
 * (narrower) argument and return types.
 *
 * @typeParam Args1 - The base argument types the probe can observe.
 *   Defaults to `Any[]` (accepts any function).
 * @typeParam R1 - The base return type the probe can observe.
 *   Defaults to `unknown` (accepts any return type).
 *
 * @example
 * ```ts
 * import { probe, type Probe } from "@thuum/decor";
 *
 * // A Probe that works with any function taking a single string
 * const logger: Probe<[string], unknown> = probe((name: string) => {
 *   console.log(`called with: ${name}`);
 * });
 *
 * const greet = logger((name: string) => `Hello, ${name}!`);
 * greet("Alice"); // logs: called with: Alice, returns "Hello, Alice!"
 * ```
 */
export type Probe<Args1 extends Any[] = Any[], R1 = unknown> = <Args2 extends Args1, R2 extends R1>(
  fn: (...args: Args2) => R2,
) => (...args: Args2) => R2;

/**
 * Creates a probe decorator that instruments functions for observation without
 * modifying their behavior.
 *
 * A probe is a non-invasive observer: it sees the arguments on entry and
 * (optionally) the {@link Result} on exit, but it cannot change them. The
 * decorated function's signature, return value, and thrown errors are preserved
 * exactly.
 *
 * The `probe` callback is invoked with the function's arguments before the
 * original function runs. It may optionally return a completion callback that
 * will be called with a {@link Result} after the function returns or throws.
 *
 * This is useful for logging, tracing, metrics, assertions, and debugging
 * without coupling instrumentation logic to business code.
 *
 * @typeParam Args - The argument types the probe will receive.
 * @typeParam R - The return type used in the completion {@link Result}.
 *
 * @param probe - A {@link ProbeFn} called on each invocation to observe
 *   arguments and, optionally, the result.
 * @returns A {@link Probe} decorator that can be applied to any compatible
 *   function.
 *
 * @example Basic tracing — observe arguments and result
 * ```ts
 * import { probe } from "@thuum/decor";
 *
 * const trace = probe((...args) => {
 *   console.log("called with:", args);
 *   return ({ ok, error, value }) => {
 *     if (ok) {
 *       console.log("returned:", value);
 *     } else {
 *       console.log("threw:", error);
 *     }
 *   };
 * });
 *
 * const add = trace((a: number, b: number) => a + b);
 * add(2, 3);
 * // logs: called with: [2, 3]
 * // logs: returned: 5
 * ```
 *
 * @example Fire-and-forget — observe arguments only
 * ```ts
 * import { probe } from "@thuum/decor";
 *
 * const logArgs = probe((...args) => {
 *   console.log("arguments:", args);
 * });
 *
 * const greet = logArgs((name: string) => `Hello, ${name}!`);
 * greet("Bob");
 * // logs: arguments: ["Bob"]
 * // returns: "Hello, Bob!"
 * ```
 *
 * @example Error observation — log failures without swallowing them
 * ```ts
 * import { probe } from "@thuum/decor";
 *
 * const errorLogger = probe((...args) => {
 *   return ({ ok, error }) => {
 *     if (!ok) {
 *       console.error("Function failed:", error);
 *     }
 *   };
 * });
 *
 * function divide(a: number, b: number) {
 *   if (b === 0) throw new Error("cannot divide by zero");
 *   return a / b;
 * }
 *
 * const safeDivide = errorLogger(divide);
 * safeDivide(10, 2); // => 5 (no log)
 * safeDivide(10, 0); // logs error, then re-throws
 * ```
 *
 * @example Named logger factory — reusable probe with context
 * ```ts
 * import { probe } from "@thuum/decor";
 *
 * const logger = (method: string) =>
 *   probe((...args: unknown[]) => {
 *     console.log(`[${method}] entered with:`, args);
 *     return ({ ok, error, value }) => {
 *       if (ok) {
 *         console.log(`[${method}] returned:`, value);
 *       } else {
 *         console.log(`[${method}] threw:`, error);
 *       }
 *     };
 *   });
 *
 * const rate = (performance: number) => (performance > 7.0 ? "good" : "bad");
 *
 * const tracedRate = logger("rate")(rate);
 * tracedRate(8.0);
 * // logs: [rate] entered with: [8]
 * // logs: [rate] returned: "good"
 * ```
 *
 * @example Composing probes — stack multiple observers
 * ```ts
 * import { probe } from "@thuum/decor";
 *
 * const timing = probe((...args) => {
 *   const start = performance.now();
 *   return () => {
 *     const ms = (performance.now() - start).toFixed(2);
 *     console.log(`took ${ms}ms`);
 *   };
 * });
 *
 * const counting = (() => {
 *   let calls = 0;
 *   return probe(() => {
 *     calls++;
 *     console.log(`call #${calls}`);
 *   });
 * })();
 *
 * const fn = timing(counting((x: number) => x * x));
 * fn(5);
 * // logs: call #1
 * // logs: took 0.01ms
 * ```
 *
 * @example Typed probe — constrain which functions can be decorated
 * ```ts
 * import { probe } from "@thuum/decor";
 *
 * // Only decorates functions that take (id: number)
 * const auditLog = probe((id: number) => {
 *   console.log(`accessing record ${id}`);
 *   return ({ ok, value }) => {
 *     if (ok) console.log(`record ${id}:`, value);
 *   };
 * });
 *
 * const getUser = auditLog((id: number) => ({ id, name: "Alice" }));
 * getUser(1);
 * // logs: accessing record 1
 * // logs: record 1: { id: 1, name: "Alice" }
 * ```
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
