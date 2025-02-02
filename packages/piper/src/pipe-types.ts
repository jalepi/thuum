/**
 * Pipe hold a value that can be piped through another pipe
 */
export type ValuePipe<T> = {
  pipe: <const R>(fn: (x: T) => R) => ValuePipe<R>;
  readonly value: T;
};

export type PipeVal = <const T>(value: T) => ValuePipe<T>;
