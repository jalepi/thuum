interface AsyncChannel<T> {
  producer: {
    next(value: T): void;
    throw(error: unknown): void;
    return(): void;
  };
  consumer: {
    enumerate(): AsyncIterable<T>;
  };
}

type Resolver<T> = {
  resolve: (result: IteratorResult<T>) => void;
  reject: (err: unknown) => void;
};

export function createChannel<T>(): AsyncChannel<T> {
  const buffer: IteratorResult<T>[] = [];
  const resolvers: Resolver<T>[] = [];
  let done = false;

  return {
    producer: {
      next(value: T) {
        if (done) {
          return;
        }
        const resolver = resolvers.shift();
        if (resolver) {
          resolver.resolve({ value, done: false });
        } else {
          buffer.push({ value, done: false });
        }
      },

      throw(error: unknown) {
        if (done) {
          return;
        }
        done = true;
        for (const resolver of resolvers) {
          resolver.reject(error);
        }
        resolvers.length = 0;
      },

      return() {
        if (done) {
          return;
        }
        done = true;
        for (const resolver of resolvers) {
          resolver.resolve({ value: undefined, done: true });
        }
        resolvers.length = 0;
      },
    },
    consumer: {
      enumerate() {
        return {
          [Symbol.asyncIterator](): AsyncIterator<T> {
            return {
              next(): Promise<IteratorResult<T>> {
                const item = buffer.shift();
                if (item) {
                  return Promise.resolve(item);
                }
                if (done) {
                  return Promise.resolve({ value: undefined, done: true });
                }
                return new Promise((resolve, reject) => {
                  resolvers.push({ resolve, reject });
                });
              },
              return(): Promise<IteratorResult<T>> {
                done = true;
                for (const resolver of resolvers) {
                  resolver.resolve({ value: undefined, done: true });
                }
                resolvers.length = 0;
                return Promise.resolve({ value: undefined, done: true });
              },
            };
          },
        };
      },
    },
  };
}

export function createMultiChannel<T>(): AsyncChannel<T> {
  type Listener = {
    buffer: IteratorResult<T>[];
    resolvers: Resolver<T>[];
  };
  const audience = new Set<Listener>();

  return {
    producer: {
      next(value: T) {
        if (audience.size === 0) {
          return;
        }
        for (const { resolvers, buffer } of [...audience]) {
          const resolver = resolvers.shift();
          if (resolver) {
            resolver.resolve({ value, done: false });
          } else {
            buffer.push({ value, done: false });
          }
        }
      },

      throw(error: unknown) {
        if (audience.size === 0) {
          return;
        }
        for (const { resolvers } of [...audience]) {
          for (const resolver of resolvers) {
            resolver.reject(error);
          }
          resolvers.length = 0;
        }
        audience.clear();
      },

      return() {
        if (audience.size === 0) {
          return;
        }
        for (const { resolvers } of [...audience]) {
          for (const resolver of resolvers) {
            resolver.resolve({ value: undefined, done: true });
          }
          resolvers.length = 0;
        }
        audience.clear();
      },
    },
    consumer: {
      enumerate() {
        const listener: Listener = {
          buffer: [],
          resolvers: [],
        };
        audience.add(listener);
        return {
          [Symbol.asyncIterator](): AsyncIterator<T> {
            return {
              next(): Promise<IteratorResult<T>> {
                const item = listener.buffer.shift();
                if (item) {
                  return Promise.resolve(item);
                }
                if (!audience.has(listener)) {
                  return Promise.resolve({ value: undefined, done: true });
                }
                return new Promise((resolve, reject) => {
                  listener.resolvers.push({ resolve, reject });
                });
              },
              return(): Promise<IteratorResult<T>> {
                audience.delete(listener);
                for (const resolver of listener.resolvers) {
                  resolver.resolve({ value: undefined, done: true });
                }
                listener.resolvers.length = 0;
                return Promise.resolve({ value: undefined, done: true });
              },
            };
          },
        };
      },
    },
  };
}
