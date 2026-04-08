/** Represents a successful value. */
export type Val<T> = { readonly value: T };

/** Represents an error with an optional trace of preceding errors. */
export type Err<T> = { readonly error: T; readonly trace?: readonly [T, ...T[]] };

/** A discriminated union representing either a successful {@link Val} or an {@link Err}. */
export type Result<V, E = unknown> = Val<V> | Err<E>;

/**
 * Builds a trace array from an {@link Err}, prepending the current error to any existing trace.
 * @param err - The error object containing `error` and optional `trace`
 * @returns A non-empty readonly array of errors ordered from most recent to oldest
 *
 * @example
 * ```ts
 * const err = { error: new Error("outer"), trace: [new Error("inner")] as const };
 * const trace = traceError(err);
 * // [Error("outer"), Error("inner")]
 * ```
 */
export function traceError<const E>({ error, trace }: Err<E>): readonly [E, ...E[]] {
  return trace ? [error, ...trace] : [error];
}
