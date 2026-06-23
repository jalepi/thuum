import type { Any, MaybePromise, Result } from "../types";

/**
 * The async function signature accepted by {@link probe}.
 *
 * A `ProbeFn` is called with the decorated function's arguments (as a tuple)
 * each time the decorated function is invoked. Because it is async, it can
 * perform asynchronous setup (e.g. opening a span, starting a timer, writing
 * to a log stream) before the target function executes.
 *
 * Two forms are supported:
 * - **Fire-and-forget** — `(args) => Promise<void>` — observe or mutate
 *   arguments only; no completion callback.
 * - **With completion** — `(args) => Promise<(result: Result<R>) => Promise<void>>`
 *   — observe the arguments on entry and the outcome on exit, both
 *   asynchronously.
 *
 * Unlike the sync {@link import("../probe").probe | probe}, the async version
 * receives arguments as a single tuple parameter rather than spread, allowing
 * the probe to mutate the arguments array before the target function sees them.
 *
 * @typeParam Args - The argument tuple type the probe will receive.
 * @typeParam R - The return type used in the completion {@link Result}.
 */
type ProbeFn<Args extends Any[], R> =
  | ((args: Args) => Promise<(result: Result<R>) => Promise<void>>)
  | ((args: Args) => Promise<void>);

/**
 * A decorator created by the async {@link probe} that instruments a function
 * for asynchronous observation without altering its return value or errors.
 *
 * When applied to a function (sync or async), the resulting function always
 * returns a `Promise` and preserves the original semantics — the probe only
 * observes (and optionally mutates arguments), it does not change the return
 * value or swallow errors.
 *
 * `Probe` is contravariant on `Args1` and covariant on `R1`, so a probe typed
 * for a base type can be applied to functions with narrower argument and return
 * types.
 *
 * @typeParam Args1 - The base argument types the probe can observe.
 *   Defaults to `Any[]` (accepts any function).
 * @typeParam R1 - The base return type the probe can observe.
 *   Defaults to `unknown` (accepts any return type).
 *
 * @example
 * ```ts
 * import { probe, type Probe } from "@thuum/decor/async";
 *
 * const logger: Probe<[string], string> = probe(async ([name]) => {
 *   console.log(`called with: ${name}`);
 * });
 *
 * const greet = logger(async (name: string) => `Hello, ${name}!`);
 * await greet("Alice"); // logs: called with: Alice, returns "Hello, Alice!"
 * ```
 */
export type Probe<Args1 extends Any[] = Any[], R1 = unknown> = <const Args2 extends Args1, R2 extends R1>(
  fn: (...args: Args2) => MaybePromise<R2>,
) => (...args: Args2) => Promise<R2>;

/**
 * Creates an async probe decorator that instruments functions for asynchronous
 * observation without modifying their return values or thrown errors.
 *
 * An async probe is a non-invasive observer: it awaits the probe callback
 * before the target function runs, and (optionally) awaits a completion
 * callback after the target function settles. The decorated function always
 * returns a `Promise`, even if the original function was synchronous.
 *
 * The probe callback receives the arguments **as a tuple** (not spread),
 * which allows the probe to mutate the arguments array before the target
 * function sees them. This differs from the sync
 * {@link import("../probe").probe | probe} where arguments are spread.
 *
 * This is useful for async logging, distributed tracing (e.g. OpenTelemetry
 * spans), async metrics collection, request auditing, and argument
 * preprocessing.
 *
 * @typeParam Args - The argument tuple type the probe will receive.
 * @typeParam R - The return type used in the completion {@link Result}.
 *
 * @param probe - A {@link ProbeFn} called on each invocation to asynchronously
 *   observe arguments and, optionally, the result.
 * @returns A {@link Probe} decorator that can be applied to any compatible
 *   function.
 *
 * @example Basic async tracing — observe arguments and result
 * ```ts
 * import { probe } from "@thuum/decor/async";
 *
 * const trace = probe(async (args) => {
 *   console.log("called with:", args);
 *   return async ({ ok, error, value }) => {
 *     if (ok) {
 *       console.log("returned:", value);
 *     } else {
 *       console.log("threw:", error);
 *     }
 *   };
 * });
 *
 * const add = trace(async (a: number, b: number) => a + b);
 * await add(2, 3);
 * // logs: called with: [2, 3]
 * // logs: returned: 5
 * ```
 *
 * @example Fire-and-forget — observe arguments only
 * ```ts
 * import { probe } from "@thuum/decor/async";
 *
 * const logArgs = probe(async (args) => {
 *   await sendToAnalytics("invocation", { args });
 * });
 *
 * const fetchUser = logArgs(async (id: number) => {
 *   return await db.users.findById(id);
 * });
 *
 * await fetchUser(42); // analytics event sent, user returned
 * ```
 *
 * @example Argument mutation — modify args before the target runs
 * ```ts
 * import { probe } from "@thuum/decor/async";
 *
 * const negate = probe(async (args: [a: number, b: number]) => {
 *   args[0] = -args[0];
 *   args[1] = -args[1];
 * });
 *
 * const add = negate(async (a: number, b: number) => a + b);
 * await add(1, 2); // => -3 (args were negated before add ran)
 * ```
 *
 * @example Distributed tracing — wrap calls in spans
 * ```ts
 * import { probe } from "@thuum/decor/async";
 *
 * const traced = (name: string) =>
 *   probe(async (args) => {
 *     const span = tracer.startSpan(name, { attributes: { args } });
 *     return async ({ ok, error }) => {
 *       if (!ok) span.recordException(error as Error);
 *       span.end();
 *     };
 *   });
 *
 * const fetchOrder = traced("fetchOrder")(async (id: string) => {
 *   return await orderService.get(id);
 * });
 *
 * await fetchOrder("order-123"); // span created and ended automatically
 * ```
 *
 * @example Error observation — log failures without swallowing them
 * ```ts
 * import { probe } from "@thuum/decor/async";
 *
 * const errorReporter = probe(async (args) => {
 *   return async ({ ok, error }) => {
 *     if (!ok) {
 *       await reportError(error, { context: args });
 *     }
 *   };
 * });
 *
 * const processPayment = errorReporter(async (amount: number) => {
 *   if (amount <= 0) throw new Error("invalid amount");
 *   return await paymentGateway.charge(amount);
 * });
 *
 * await processPayment(-5); // error reported, then re-thrown
 * ```
 *
 * @example Typed probe — constrain which functions can be decorated
 * ```ts
 * import { probe } from "@thuum/decor/async";
 *
 * // Only decorates functions that take [id: number]
 * const auditLog = probe(async ([id]: [id: number]) => {
 *   console.log(`accessing record ${id}`);
 *   return async ({ ok, value }) => {
 *     if (ok) console.log(`record ${id}:`, value);
 *   };
 * });
 *
 * const getUser = auditLog(async (id: number) => ({ id, name: "Alice" }));
 * await getUser(1);
 * // logs: accessing record 1
 * // logs: record 1: { id: 1, name: "Alice" }
 * ```
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
