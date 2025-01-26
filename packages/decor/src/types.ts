// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

export type Attempt<T> = [error: undefined, value: T] | [error: unknown, value: undefined];
