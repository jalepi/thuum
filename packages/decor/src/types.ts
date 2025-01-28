// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

export type Result<T> = { value: T } | { error: unknown };

export type Avoidable<T> = T | void;
export type AvoidableFn<T extends (...args: Any[]) => Any> = T extends (...args: infer Args) => infer R
  ? (...args: Args) => R | void
  : never;
