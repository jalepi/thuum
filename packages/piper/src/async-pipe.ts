/** A value that may or may not be wrapped in a Promise. */
type MaybePromise<T> = T | Promise<T>;

/** A chainable wrapper that transforms a value through successive sync or async functions. */
type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => MaybePromise<R>) => ValuePipe<R>;
  readonly value: MaybePromise<T>;
};

/** Factory function that initializes an async {@link ValuePipe} from an initial value. */
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
