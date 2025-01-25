/**
 * Pipe hold a value that can be piped through another pipe
 */
export type ValuePipe<T> = Readonly<{
  pipe: <const R>(fn: (x: T) => R) => ValuePipe<R>;
  value: T;
}>;

/**
 * Initializes a pipe with input value
 * @param value input value
 * @returns instance of a pipe
 *
 * @example
 * ```ts
 * const { value } = pipe(1).pipe(x => x + 1).pipe(x => x * 2);
 *
 * expect(value).toBe(4);
 * ```
 */
export const pipe = <const T>(value: T): ValuePipe<T> =>
  Object.freeze({
    pipe: (fn) => pipe(fn(value)),
    value,
  } as const satisfies ValuePipe<T>);
