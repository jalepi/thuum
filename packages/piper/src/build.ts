export type FunctionPipe<X, Y> = {
  pipe: <const Z>(fn: (y: Y) => Z) => FunctionPipe<X, Z>;
  fn: (x: X) => Y;
};

export type PipeFn = <const X, const Y>(fn: (x: X) => Y) => FunctionPipe<X, Y>;

export type Builder = {
  pipe: <const X, const Y>(fn: (x: X) => Y) => FunctionPipe<X, Y>;
  fn: <const X>(x: X) => X;
};

const pipe: PipeFn = (fn) => ({
  pipe: (fn2) => pipe((x) => fn2(fn(x))),
  fn,
});

const builder: Builder = {
  pipe: (fn) => pipe(fn),
  fn: (x) => x,
};

/**
 * Builds a function pipe
 * @returns builder
 *
 * @example
 * ```ts
 * const { fn } = build<number>().pipe(x => x + 1).pipe(x => x * 2);
 *
 * assert(fn(1) === 4);
 * assert(fn(2) === 6);
 * ```
 */
const build = <const X>(): FunctionPipe<X, X> => builder;

export default build;
