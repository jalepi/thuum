type PromiseNextType = Readonly<{
  withResolvers<T>(): Readonly<{
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
  }>;
}>;

const noop = () => {
  //
};

export const PromiseNext: PromiseNextType = Object.freeze({
  withResolvers<T>() {
    let resolve: (value: T) => void = noop;
    let reject: (reason: unknown) => void = noop;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  },
} satisfies PromiseNextType);
