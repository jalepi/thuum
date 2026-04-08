/** Convenience alias for `any` used to relax generic constraints in decorator signatures. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

/** A discriminated union representing either a successful `{ value: T }` or a failed `{ error: unknown }`. */
export type Result<T> = { value: T } | { error: unknown };
