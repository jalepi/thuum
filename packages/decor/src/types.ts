// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

export type Attempt<T> = { success: true; value: T } | { success?: false; error: unknown };
