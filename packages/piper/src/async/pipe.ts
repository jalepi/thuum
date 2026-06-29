/** A value that may or may not be wrapped in a Promise. */
type MaybePromise<T> = T | Promise<T>;

/**
 * A chainable wrapper that transforms a value through successive sync or async functions.
 *
 * Each `.pipe(fn)` step may return a plain value or a `Promise`. The pipeline
 * automatically awaits intermediate results, so downstream steps always receive
 * the resolved value.
 *
 * Access the final result via `.value` (a `MaybePromise<T>` — await it to unwrap).
 */
type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => MaybePromise<R>) => ValuePipe<R>;
  readonly value: MaybePromise<T>;
};

/** Factory function that initializes an async {@link ValuePipe} from an initial value or Promise. */
type PipeVal = <const T>(value: MaybePromise<T>) => ValuePipe<T>;

/**
 * Transforms a value through a chain of sync or async functions.
 *
 * Works like the synchronous `pipe`, but each step can return either a plain
 * value or a `Promise`. The initial value can also be a `Promise`. This allows
 * you to seamlessly mix synchronous logic with async I/O (fetch, database
 * queries, file reads, etc.) in a single readable pipeline.
 *
 * @param value - The initial value or Promise to transform.
 * @returns A {@link ValuePipe} whose `.value` is a `MaybePromise` of the result.
 *
 * @example Fetching and transforming API data
 * ```ts
 * const { value: userName } = pipe(fetch("/api/user/1"))
 *   .pipe(res => res.json())
 *   .pipe(data => data.name)
 *   .pipe(name => name.toUpperCase());
 *
 * expect(await userName).toBe("ALICE");
 * ```
 *
 * @example Mixing sync and async steps
 * ```ts
 * const { value } = pipe(5)
 *   .pipe(x => x * 2)                          // sync
 *   .pipe(async x => await lookupLabel(x))      // async I/O
 *   .pipe(label => label.trim());               // sync
 *
 * expect(await value).toBe("ten");
 * ```
 *
 * @example Starting from an existing Promise
 * ```ts
 * const { value } = pipe(Promise.resolve("raw input"))
 *   .pipe(s => s.trim())
 *   .pipe(async s => await translate(s, "en", "fr"));
 *
 * expect(await value).toBe("entrée brute");
 * ```
 *
 * @example Error propagation — rejected promises short-circuit the chain
 * ```ts
 * const { value } = pipe(1)
 *   .pipe(() => Promise.reject(new Error("boom")))
 *   .pipe(x => x + 1); // never called
 *
 * await expect(value).rejects.toThrow("boom");
 * ```
 */
const pipe: PipeVal = (value) => ({
  pipe: (fn) => pipe((async () => await fn(await value))()),
  value,
});

export default pipe;
