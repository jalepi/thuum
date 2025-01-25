export type FunctionPipe<X, Y> = Readonly<{
  pipe: <const Z>(fn: (y: Y) => Z) => FunctionPipe<X, Z>;
  fn: (x: X) => Y;
}>;

const pipe = <const X, const Y>(fn: (x: X) => Y): FunctionPipe<X, Y> =>
  Object.freeze({
    pipe: (fn2) => pipe((x) => fn2(fn(x))),
    fn,
  } as const satisfies FunctionPipe<X, Y>);

type Builder = Readonly<{
  pipe: <const X, const Y>(fn: (x: X) => Y) => FunctionPipe<X, Y>;
  fn: <const X>(x: X) => X;
}>;

const builder: Builder = Object.freeze({
  pipe: (fn) => pipe(fn),
  fn: (x) => x,
});

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
export const build = <const X>(): FunctionPipe<X, X> => builder;
