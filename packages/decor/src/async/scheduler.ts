import type { MaybePromise } from "../types";
import { type Decorator, decorator } from "./decorator";

/**
 * A scheduling strategy that controls when a callable unit of work is executed.
 *
 * A `Scheduler` accepts a zero-argument callable that returns either a value or
 * a `Promise`, and returns a `Promise` that resolves with the callable's result
 * once the scheduler decides to run it.
 *
 * Different scheduler implementations can enforce ordering guarantees (e.g.
 * sequential via {@link continuation}), concurrency limits, debouncing,
 * throttling, or priority-based execution.
 *
 * @typeParam T - The return type of the scheduled callable.
 *
 * @param callable - A zero-argument function returning `T` or `Promise<T>`.
 * @returns A `Promise<T>` that resolves when the scheduler executes the callable.
 *
 * @example Inline usage with a custom scheduler
 * ```ts
 * const immediate: Scheduler = (callable) => Promise.resolve().then(callable);
 *
 * const result = await immediate(() => 42);
 * // result => 42
 * ```
 */
export type Scheduler = <T>(callable: () => MaybePromise<T>) => Promise<T>;

/**
 * Creates a continuation-based {@link Scheduler} that executes callables
 * sequentially, one after the other, regardless of how fast they are enqueued.
 *
 * Each callable waits for the previous one to settle (resolve or reject) before
 * starting. This guarantees FIFO ordering and prevents concurrent execution,
 * making it useful for serializing access to shared resources like databases,
 * files, or rate-limited APIs.
 *
 * If a callable rejects, the rejection is propagated to its individual caller,
 * but the chain continues — subsequent callables are not affected.
 *
 * @param seed - An optional initial promise to chain onto. Defaults to an
 *   already-resolved promise, meaning the first callable runs immediately.
 *   Pass a pending promise to delay the entire chain until some precondition
 *   is met.
 * @returns A {@link Scheduler} that enqueues callables in continuation order.
 *
 * @example Basic sequential execution
 * ```ts
 * import { continuation } from "@thuum/decor/async";
 *
 * const next = continuation();
 *
 * const results: number[] = [];
 *
 * await Promise.all([
 *   next(() => { results.push(1); return 1; }),
 *   next(() => { results.push(2); return 2; }),
 *   next(() => { results.push(3); return 3; }),
 * ]);
 *
 * // results => [1, 2, 3] — always in order, regardless of timing
 * ```
 *
 * @example Failure isolation — one rejection doesn't break the chain
 * ```ts
 * import { continuation } from "@thuum/decor/async";
 *
 * const next = continuation();
 *
 * const p1 = next(() => "first");
 * const p2 = next(() => { throw new Error("oops"); });
 * const p3 = next(() => "third");
 *
 * await p1;                    // => "first"
 * await p2.catch((e) => e);    // => Error("oops")
 * await p3;                    // => "third" — still runs
 * ```
 *
 * @example Seeding with a precondition
 * ```ts
 * import { continuation } from "@thuum/decor/async";
 *
 * const ready = fetch("/api/health").then(() => undefined);
 * const next = continuation(ready);
 *
 * // These won't execute until the health check resolves
 * next(() => fetch("/api/data"));
 * next(() => fetch("/api/more-data"));
 * ```
 */
export const continuation = (seed: Promise<unknown> = Promise.resolve(undefined)): Scheduler => {
  return (callable) => {
    const c = seed.then(callable).catch(callable);
    seed = c.finally();
    return c;
  };
};

/**
 * Creates a {@link Decorator} that schedules every invocation of the decorated
 * function through the given {@link Scheduler}.
 *
 * This bridges the scheduling strategy with the decorator pattern: any function
 * decorated with the returned decorator will have its calls routed through
 * `next`, which decides when they actually execute. The decorated function
 * preserves its original signature but always returns a `Promise`.
 *
 * Combined with {@link continuation}, this is especially useful for ensuring
 * that concurrent calls to an async function are serialized (e.g. database
 * writes, file I/O, sequential API calls).
 *
 * @param next - The scheduling strategy to use for each invocation.
 * @returns A {@link Decorator} that can be applied to any function, scheduling
 *   its execution through `next`.
 *
 * @example Sequential processing with continuation
 * ```ts
 * import { scheduler, continuation } from "@thuum/decor/async";
 *
 * const next = continuation();
 * const sequential = scheduler(next);
 *
 * async function process(id: string): Promise<string> {
 *   return await new Promise((resolve) => {
 *     setTimeout(() => resolve(id + " done"), Math.random() * 25);
 *   });
 * }
 *
 * // Calls execute one-at-a-time, in the order they were invoked
 * const scheduledProcess = sequential(process);
 *
 * const results = await Promise.all(
 *   ["a", "b", "c", "d"].map((id) => scheduledProcess(id)),
 * );
 * // results => ["a done", "b done", "c done", "d done"] — always in order
 * ```
 *
 * @example Serializing database writes
 * ```ts
 * import { scheduler, continuation } from "@thuum/decor/async";
 *
 * const next = continuation();
 * const serialize = scheduler(next);
 *
 * async function saveRecord(record: { id: number; data: string }) {
 *   await db.insert(record);
 *   return record.id;
 * }
 *
 * // Prevents concurrent inserts that could cause conflicts
 * const safeSave = serialize(saveRecord);
 *
 * // These run sequentially even though they're fired concurrently
 * safeSave({ id: 1, data: "first" });
 * safeSave({ id: 2, data: "second" });
 * safeSave({ id: 3, data: "third" });
 * ```
 *
 * @example Custom scheduler — throttle with a minimum delay between calls
 * ```ts
 * import { scheduler } from "@thuum/decor/async";
 * import type { Scheduler } from "@thuum/decor/async";
 *
 * const throttled: Scheduler = (() => {
 *   let last = Promise.resolve() as Promise<unknown>;
 *   return (callable) => {
 *     const next = last.then(
 *       () => new Promise((r) => setTimeout(r, 200)),
 *     ).then(callable);
 *     last = next.catch(() => {});
 *     return next;
 *   };
 * })();
 *
 * const throttledScheduler = scheduler(throttled);
 *
 * async function callApi(endpoint: string) {
 *   return await fetch(endpoint).then((r) => r.json());
 * }
 *
 * // At least 200ms between each API call
 * const safeCallApi = throttledScheduler(callApi);
 * ```
 *
 * @example Applying to multiple functions with one scheduler
 * ```ts
 * import { scheduler, continuation } from "@thuum/decor/async";
 *
 * const next = continuation();
 * const sequential = scheduler(next);
 *
 * const readFile = sequential(async (path: string) => "...");
 * const writeFile = sequential(async (path: string, data: string) => "...");
 *
 * // Both readFile and writeFile share the same queue,
 * // so reads and writes are fully serialized
 * await readFile("/tmp/data.txt");
 * await writeFile("/tmp/data.txt", "updated");
 * ```
 */
export const scheduler = (next: Scheduler): Decorator => {
  return decorator((fn, ...args: unknown[]) => next(() => fn(...args)));
};
