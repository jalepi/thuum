import type { Any } from "./types";

/**
 * Transforms a target function into a new function with a potentially different
 * signature (arguments and/or return type), using a transformer function that
 * has access to the original.
 *
 * Unlike {@link decorate}, which preserves the original function's signature,
 * `transform` allows you to change the argument types, return type, or both.
 * This makes it ideal for adapting functions to new interfaces, wrapping sync
 * functions as async, converting return types (e.g. into `Result` objects), or
 * changing arity.
 *
 * The transformer receives the original function with `this` already bound, so
 * it can be called directly without additional binding. The transformer has full
 * control over the call: it can modify arguments before forwarding, reshape the
 * return value, change arity, or skip calling `fn` entirely.
 *
 * @typeParam Args1 - The argument types of the original target function.
 * @typeParam R1 - The return type of the original target function.
 * @typeParam Args2 - The argument types of the resulting transformed function.
 *   Defaults to `Args1` when not specified.
 * @typeParam R2 - The return type of the resulting transformed function.
 *   Defaults to `R1` when not specified.
 *
 * @param fn - The target function to transform.
 * @param transformer - A function that defines the new behavior. It receives
 *   the bound original function (with `this` already bound to the caller's
 *   context) followed by the new arguments. It may return a different type
 *   than the original function.
 * @returns A new function with the signature `(...args: Args2) => R2`.
 *
 * @example Intercept and observe — add side-effects without changing the signature
 * ```ts
 * const increment = (n: number) => n + 1;
 *
 * const traced = transform(increment, (fn, ...args) => {
 *   const result = fn(...args);
 *   console.log(`increment(${args}) => ${result}`);
 *   return result;
 * });
 *
 * traced(1); // logs: increment(1) => 2, returns 2
 * ```
 *
 * @example Change argument signature — accept multiple values instead of one
 * ```ts
 * const reverse = (s: string) => s.split("").reverse().join("");
 *
 * const reverseAll = transform(reverse, (fn, ...values: string[]) => {
 *   return values.map((s) => fn(s)).join(" ");
 * });
 *
 * reverseAll("hello", "world"); // => "olleh dlrow"
 * ```
 *
 * @example Change return type — wrap in a Result object for safe error handling
 * ```ts
 * import type { Result } from "./types";
 *
 * const parse = (input: string) => {
 *   const n = Number(input);
 *   if (Number.isNaN(n)) throw new Error(`Invalid number: ${input}`);
 *   return n;
 * };
 *
 * const safeParse = transform(
 *   parse,
 *   (fn, ...args): Result<number> => {
 *     try {
 *       return { ok: true, value: fn(...args) };
 *     } catch (error) {
 *       return { ok: false, error };
 *     }
 *   },
 * );
 *
 * safeParse("42");   // => { ok: true, value: 42 }
 * safeParse("nope"); // => { ok: false, error: Error(...) }
 * ```
 *
 * @example Convert sync to async
 * ```ts
 * const add = (a: number, b: number) => a + b;
 *
 * const asyncAdd = transform(add, async (fn, a, b) => {
 *   return await Promise.resolve(fn(a, b));
 * });
 *
 * await asyncAdd(2, 3); // => 5 (as a Promise)
 * ```
 *
 * @example Transform return type — extract a field from the result
 * ```ts
 * const getUser = async (id: number) => ({ id, name: "Alice" });
 *
 * const getUserName = transform(getUser, async (fn, id: number) => {
 *   const user = await fn(id);
 *   return user.name;
 * });
 *
 * await getUserName(1); // => "Alice"
 * ```
 *
 * @example Retry logic — automatically retry on failure
 * ```ts
 * const fetchData = async (url: string) => {
 *   const res = await fetch(url);
 *   if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *   return res.json();
 * };
 *
 * const resilientFetch = transform(fetchData, async (fn, ...args) => {
 *   try {
 *     return await fn(...args);
 *   } catch {
 *     await new Promise((r) => setTimeout(r, 100));
 *     return await fn(...args);
 *   }
 * });
 *
 * await resilientFetch("/api/data"); // retries once on failure
 * ```
 *
 * @example Timeout — race the original function against a deadline
 * ```ts
 * const slow = async () => {
 *   await new Promise((r) => setTimeout(r, 5000));
 *   return "done";
 * };
 *
 * const withTimeout = transform(slow, async (fn, ...args) => {
 *   return await Promise.race([
 *     fn(...args),
 *     new Promise<never>((_, reject) =>
 *       setTimeout(() => reject(new Error("Timeout")), 1000),
 *     ),
 *   ]);
 * });
 *
 * await withTimeout(); // throws Error("Timeout") after 1s
 * ```
 *
 * @example Change arity and return type together — batch multiple inputs
 * ```ts
 * const square = async (n: number) => n * n;
 *
 * const batchSquare = transform(square, async (fn, ...nums: number[]) => {
 *   const results = await Promise.all(nums.map((n) => fn(n)));
 *   return results.join(", ");
 * });
 *
 * await batchSquare(2, 3, 4); // => "4, 9, 16"
 * ```
 */
export const transform = <Args1 extends Any[], R1, Args2 extends Any[] = Args1, R2 = R1>(
  fn: (...args: Args1) => R1,
  transformer: (fn: (...args: Args1) => R1, ...args: Args2) => R2,
): ((...args: Args2) => R2) => {
  return function (this: unknown, ...args) {
    return transformer(fn.bind(this), ...args);
  };
};
