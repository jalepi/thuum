// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

export type Result<T> = { value: T } | { error: unknown };
