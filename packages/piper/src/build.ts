import type { Builder, FunctionPipe, PipeFn } from "./build-types";

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
export const build = <const X>(): FunctionPipe<X, X> => builder;
