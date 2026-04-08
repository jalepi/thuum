/** A chainable wrapper that transforms a value through successive functions. */
type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => R) => ValuePipe<R>;
  readonly value: T;
};

/** Factory function that initializes a {@link ValuePipe} from an initial value. */
type PipeVal = <const T>(value: T) => ValuePipe<T>;

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
  pipe: (fn) => pipe(fn(value)),
  value,
});
export default pipe;
