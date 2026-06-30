type Chain<T, U> = {
  into<R>(nextFn: (input: U) => R): Chain<T, R>;
  apply(input: T): U;
};

export const chain = <T, U>(fn: (input: T) => U): Chain<T, U> => ({
  into(nextFn) {
    return chain((input) => nextFn(fn(input)));
  },
  apply(input) {
    return fn(input);
  },
});

type Pipe<T> = {
  through<U>(fn: (input: T) => U): Pipe<U>;
  tap(fn: (value: T) => void): Pipe<T>;
  end(): T;
};

export const pipe = <T>(value: T): Pipe<T> => ({
  through(fn) {
    return pipe(fn(value));
  },
  tap(fn) {
    fn(value);
    return pipe(value);
  },
  end() {
    return value;
  },
});
