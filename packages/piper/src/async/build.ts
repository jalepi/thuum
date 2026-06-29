type MaybePromise<T> = T | Promise<T>;

/**
 * A composable chain of sync/async functions that produces a single reusable async function.
 *
 * Each `.pipe(fn)` appends a transformation that may return a value or a `Promise`.
 * The composed `.fn` accepts the original input type `X` and returns `MaybePromise<Y>`.
 */
type FunctionPipe<X, Y> = {
  pipe: <const Z>(fn: (y: Y) => MaybePromise<Z>) => FunctionPipe<X, Z>;
  fn: (x: X) => MaybePromise<Y>;
};

type PipeFn = <const X, const Y>(fn: (x: X) => MaybePromise<Y>) => FunctionPipe<X, Y>;

type Builder = {
  pipe: <const X, const Y>(fn: (x: X) => MaybePromise<Y>) => FunctionPipe<X, Y>;
  fn: <const X>(x: X) => MaybePromise<X>;
};

const pipe: PipeFn = (fn) => ({
  pipe: (fn2) => pipe((x) => (async () => await fn2(await fn(await x)))()),
  fn,
});

const builder: Builder = {
  pipe: (fn) => pipe(fn),
  fn: async (x) => await x,
};

/**
 * Composes a sequence of sync and async functions into a single reusable async function.
 *
 * Like the synchronous `build`, but each step may return a `Promise`. This is
 * ideal for constructing reusable workflows that involve I/O — HTTP requests,
 * database queries, file operations — interleaved with synchronous transforms.
 *
 * @typeParam X - The input type the composed function will accept.
 * @returns A {@link FunctionPipe} starting with an async identity function.
 *
 * @example Composing an API client handler
 * ```ts
 * const { fn: getUser } = build<number>()
 *   .pipe(async id => fetch(`/api/users/${id}`))
 *   .pipe(res => res.json())
 *   .pipe(data => ({ id: data.id, name: data.name }));
 *
 * const user = await getUser(42);
 * expect(user.name).toBe("Alice");
 * ```
 *
 * @example Reusable file processing pipeline
 * ```ts
 * const { fn: processFile } = build<string>()
 *   .pipe(async path => await readFile(path, "utf-8"))
 *   .pipe(content => content.split("\n"))
 *   .pipe(lines => lines.filter(line => line.trim() !== ""))
 *   .pipe(lines => lines.length);
 *
 * expect(await processFile("./data.txt")).toBe(150);
 * ```
 *
 * @example Mixed sync/async with error short-circuiting
 * ```ts
 * const { fn: safeDivide } = build<{ a: number; b: number }>()
 *   .pipe(({ a, b }) => {
 *     if (b === 0) throw new Error("Division by zero");
 *     return a / b;
 *   })
 *   .pipe(async result => await saveToAuditLog(result))
 *   .pipe(saved => saved.id);
 *
 * expect(await safeDivide({ a: 10, b: 2 })).toBe("audit-5");
 * await expect(safeDivide({ a: 1, b: 0 })).rejects.toThrow("Division by zero");
 * ```
 */
const build = <const X>(): FunctionPipe<X, X> => builder;

export default build;
