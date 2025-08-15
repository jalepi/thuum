export type Val<T> = { readonly value: T };
export type Err<T> = { readonly error: T; readonly trace?: readonly [T, ...T[]] };
export type Result<V, E = unknown> = Val<V> | Err<E>;

export function traceError<const E>({ error, trace }: Err<E>): readonly [E, ...E[]] {
  return trace ? [error, ...trace] : [error];
}
