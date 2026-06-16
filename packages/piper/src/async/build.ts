type MaybePromise<T> = T | Promise<T>;

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
 * Builds a function pipe
 * @returns builder
 *
 * @example
 * ```ts
 * const { fn } = build<number>()
 *   .pipe(x => Promise.resolve(x + 1))
 *   .pipe(x => Promise.resolve(x * 2));
 *
 * assert(4 === await fn(1));
 * assert(6 === await fn(2));
 * ```
 */
const build = <const X>(): FunctionPipe<X, X> => builder;

export default build;
