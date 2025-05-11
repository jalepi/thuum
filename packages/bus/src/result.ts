export type Val<T> = Readonly<{ value: T }>;
export type Err<T> = Readonly<{ error: T; trace?: readonly [T, ...T[]] }>;
export type Result<V, E = unknown> = Val<V> | Err<E>;

export function traceError<const E>({ error, trace }: Err<E>): readonly [E, ...E[]] {
  return trace ? [error, ...trace] : [error];
}
