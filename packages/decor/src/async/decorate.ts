import type { Any, MaybePromise } from "../types";

/**
 * Async version of {@link decorate}. Takes a target function and an async
 * wrapper, returning a new async decorated version.
 *
 * The target function can be either sync or async (its return type is
 * `MaybePromise<R>`). The result is always an async function returning
 * `Promise<R>`.
 *
 * The wrapper receives the original function with `this` already bound, so it
 * can be called naturally without worrying about context. The wrapper has full
 * control over the call: it can read or modify arguments before forwarding,
 * read or modify the return value, short-circuit without calling the original,
 * retry the call, add delays, or any combination of these.
 *
 * Errors propagate naturally — both sync throws and rejected promises from the
 * target function will surface as a rejected promise from the decorated
 * function.
 *
 * @param fn - The target function to decorate. Can be sync or async (accepts
 *   `MaybePromise<R>` as its return type).
 * @param wrapper - An async wrapper function that intercepts every call. It
 *   receives the bound original function (with `this` already applied) as its
 *   first argument, followed by the original arguments. It must return a
 *   `Promise<R>`.
 * @returns A new async function with the same parameter signature as `fn`,
 *   always returning `Promise<R>`.
 *
 * @example
 * **Basic async decoration — add logging around an async fetch**
 * ```ts
 * async function fetchUser(id: string) {
 *   const res = await fetch(`/api/users/${id}`);
 *   return res.json();
 * }
 *
 * const fetchUserWithLogging = decorate(fetchUser, async (fn, id) => {
 *   console.log(`Fetching user ${id}…`);
 *   const user = await fn(id);
 *   console.log(`Fetched user ${id}:`, user);
 *   return user;
 * });
 *
 * await fetchUserWithLogging("42");
 * // logs: Fetching user 42…
 * // logs: Fetched user 42: { … }
 * ```
 *
 * @example
 * **Decorating a sync function to become async**
 * ```ts
 * function add(a: number, b: number) {
 *   return a + b;
 * }
 *
 * const addAsync = decorate(add, async (fn, a, b) => {
 *   await someAsyncSetup();
 *   return fn(a, b);
 * });
 *
 * // `add` is sync, but `addAsync` always returns a Promise<number>
 * const result = await addAsync(1, 2); // 3
 * ```
 *
 * @example
 * **Retry with delay**
 * ```ts
 * const fetchWithRetry = decorate(fetchUser, async (fn, id) => {
 *   const maxRetries = 3;
 *   for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *     try {
 *       return await fn(id);
 *     } catch (err) {
 *       if (attempt === maxRetries) throw err;
 *       await new Promise((r) => setTimeout(r, 1000 * attempt));
 *     }
 *   }
 *   throw new Error("unreachable");
 * });
 * ```
 *
 * @example
 * **Timeout pattern**
 * ```ts
 * const fetchWithTimeout = decorate(fetchUser, async (fn, id) => {
 *   const result = await Promise.race([
 *     fn(id),
 *     new Promise<never>((_, reject) =>
 *       setTimeout(() => reject(new Error("Timeout")), 5000),
 *     ),
 *   ]);
 *   return result;
 * });
 * ```
 *
 * @example
 * **Short-circuiting / caching**
 * ```ts
 * const cache = new Map<string, User>();
 *
 * const fetchUserCached = decorate(fetchUser, async (fn, id) => {
 *   const cached = cache.get(id);
 *   if (cached) return cached;
 *
 *   const user = await fn(id);
 *   cache.set(id, user);
 *   return user;
 * });
 * ```
 */
export const decorate = <Args extends Any[], R>(
  fn: (...args: Args) => MaybePromise<R>,
  wrapper: (fn: (...args: Args) => MaybePromise<R>, ...args: Args) => Promise<R>,
): ((...args: Args) => Promise<R>) => {
  return async function (this: unknown, ...args) {
    return await wrapper(fn.bind(this), ...args);
  };
};
