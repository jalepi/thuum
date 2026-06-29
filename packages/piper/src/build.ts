/**
 * A composable chain of functions that produces a single reusable function.
 *
 * Each call to `.pipe(fn)` appends a transformation step. The composed result
 * is available via the `.fn` property and accepts the original input type `X`,
 * returning the final output type `Y`.
 */
type FunctionPipe<X, Y> = {
  pipe: <const Z>(fn: (y: Y) => Z) => FunctionPipe<X, Z>;
  fn: (x: X) => Y;
};

type PipeFn = <const X, const Y>(fn: (x: X) => Y) => FunctionPipe<X, Y>;

type Builder = {
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
 * Composes a sequence of functions into a single reusable function.
 *
 * Unlike {@link pipe} which transforms a concrete value immediately, `build`
 * creates a reusable pipeline that can be applied to many inputs. The type
 * parameter `X` defines the input type; the output type is inferred from the
 * chain of `.pipe(fn)` calls.
 *
 * @typeParam X - The input type the composed function will accept.
 * @returns A {@link FunctionPipe} starting with the identity function.
 *
 * @example Basic composition
 * ```ts
 * const { fn } = build<number>()
 *   .pipe(x => x + 1)
 *   .pipe(x => x * 2);
 *
 * expect(fn(1)).toBe(4);
 * expect(fn(2)).toBe(6);
 * ```
 *
 * @example Building a URL slug generator
 * ```ts
 * const { fn: toSlug } = build<string>()
 *   .pipe(s => s.trim())
 *   .pipe(s => s.toLowerCase())
 *   .pipe(s => s.replace(/\s+/g, "-"))
 *   .pipe(s => s.replace(/[^a-z0-9-]/g, ""));
 *
 * expect(toSlug("  Blog Post Title! ")).toBe("blog-post-title");
 * expect(toSlug("Another One  ")).toBe("another-one");
 * ```
 *
 * @example Domain-specific formatter
 * ```ts
 * const { fn: formatPrice } = build<number>()
 *   .pipe(cents => cents / 100)
 *   .pipe(dollars => dollars.toFixed(2))
 *   .pipe(str => `$${str}`);
 *
 * expect(formatPrice(1999)).toBe("$19.99");
 * expect(formatPrice(50)).toBe("$0.50");
 * ```
 */
const build = <const X>(): FunctionPipe<X, X> => builder;

export default build;
