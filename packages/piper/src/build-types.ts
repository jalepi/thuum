export type FunctionPipe<X, Y> = {
  pipe: <const Z>(fn: (y: Y) => Z) => FunctionPipe<X, Z>;
  fn: (x: X) => Y;
};

export type PipeFn = <const X, const Y>(fn: (x: X) => Y) => FunctionPipe<X, Y>;

export type Builder = {
  pipe: <const X, const Y>(fn: (x: X) => Y) => FunctionPipe<X, Y>;
  fn: <const X>(x: X) => X;
};
