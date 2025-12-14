// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

type EventMap = {
  waiting: object;
  starting: object;
  completed: object;
  failed: object;
};
export type AsyncContextEvent = {
  [K in keyof EventMap]: {
    type: K;
    name: string;
    size: number;
    taskId: number;
  } & EventMap[K];
}[keyof EventMap];

export interface AsyncContextOptions {
  watch?(this: void, event: AsyncContextEvent): void;
  id?(this: void): string;
}

export interface AsyncContext {
  run<Args extends Any[], R>(name: string, fn: (...args: Args) => R | Promise<R>, ...args: Args): Promise<R>;
}

type AsyncContextCtor = (options: AsyncContextOptions) => AsyncContext;

const createContext: AsyncContextCtor = ({ watch }) => {
  let size = 0;
  let seed = 0;
  let continuation = Promise.resolve<unknown>(undefined);
  const ctx: AsyncContext = {
    run(name, fn, ...args) {
      const taskId = ++seed;
      watch?.({ type: "waiting", name, size: ++size, taskId });
      const c = continuation.then(async () => {
        try {
          watch?.({ type: "starting", name, size, taskId });
          const r = await fn(...args);
          watch?.({ type: "completed", name, size: --size, taskId });
          return r;
        } catch (error: unknown) {
          watch?.({ type: "failed", name, size: --size, taskId });
          throw error;
        }
      });
      continuation = c;
      return c;
    },
  };
  return ctx;
};

export default createContext;
