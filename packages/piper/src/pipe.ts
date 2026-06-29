/**
 * A chainable wrapper that transforms a value through successive functions.
 *
 * Each call to `.pipe(fn)` applies `fn` to the current value and returns
 * a new `ValuePipe` holding the result, enabling fluent left-to-right composition.
 *
 * Access the final result via the `.value` property.
 */
type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => R) => ValuePipe<R>;
  readonly value: T;
};

/** Factory function that initializes a {@link ValuePipe} from an initial value. */
type PipeVal = <const T>(value: T) => ValuePipe<T>;

/**
 * Transforms a value through a chain of functions, evaluated left to right.
 *
 * Use `pipe` when you want to apply a sequence of transformations to a single
 * value without nesting function calls. Each `.pipe(fn)` step receives the
 * output of the previous step and full type inference is preserved throughout.
 *
 * @param value - The initial value to transform.
 * @returns A {@link ValuePipe} whose `.value` holds the current result.
 *
 * @example Basic arithmetic
 * ```ts
 * const { value } = pipe(1)
 *   .pipe(x => x + 1)
 *   .pipe(x => x * 2);
 *
 * expect(value).toBe(4);
 * ```
 *
 * @example Parsing and normalizing user input
 * ```ts
 * const { value: slug } = pipe("  Hello World!  ")
 *   .pipe(s => s.trim())
 *   .pipe(s => s.toLowerCase())
 *   .pipe(s => s.replace(/\s+/g, "-"))
 *   .pipe(s => s.replace(/[^a-z0-9-]/g, ""));
 *
 * expect(slug).toBe("hello-world");
 * ```
 *
 * @example Reshaping an object through multiple steps
 * ```ts
 * const { value: greeting } = pipe({ first: "Jane", last: "Doe", age: 28 })
 *   .pipe(user => ({ ...user, fullName: `${user.first} ${user.last}` }))
 *   .pipe(user => `Hi ${user.fullName}, you are ${user.age} years old.`);
 *
 * expect(greeting).toBe("Hi Jane Doe, you are 28 years old.");
 * ```
 */
const pipe: PipeVal = (value) => ({
  pipe: (fn) => pipe(fn(value)),
  value,
});
export default pipe;
