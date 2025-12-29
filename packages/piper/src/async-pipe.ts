type MaybePromise<T> = T | Promise<T>;

/** Pipe hold a value that can be piped through another pipe */
type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => MaybePromise<R>) => ValuePipe<R>;
  readonly value: MaybePromise<T>;
};

type PipeVal = <const T>(value: MaybePromise<T>) => ValuePipe<T>;

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
  pipe: (fn) => pipe((async () => await fn(await value))()),
  value,
});

export default pipe;
