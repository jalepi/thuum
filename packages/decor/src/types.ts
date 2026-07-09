// biome-ignore lint/suspicious/noExplicitAny: use any with alias
export type Any = any;

/** Represents any function for use in type constraints */
export type AnyFn = (...args: Any[]) => Any;

/** A discriminated union representing either a successful `{ value: T }` or a failed `{ error: unknown }`. */
export type Result<T> = { ok: true; value: T; error?: never } | { ok: false; value?: never; error: unknown };

/** A type that could be a promise or not */
export type MaybePromise<T> = T | Promise<T>;
