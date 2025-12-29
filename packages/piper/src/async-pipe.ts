/** Pipe hold a value that can be piped through another pipe */
type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => Promise<R>) => ValuePipe<R>;
  readonly value: Promise<T>;
};

type PipeVal = <const T>(value: Promise<T>) => ValuePipe<T>;

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
const pipe: PipeVal = (value) => ({
  pipe: (fn) => pipe(value.then(fn)),
  value,
});

export default pipe;
