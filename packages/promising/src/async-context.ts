// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

type EventMap = {
  waiting: object;
  pending: object;
  resolved: object;
  rejected: object;
};

/** Lifecycle event emitted by an {@link AsyncContext} as tasks transition between states. */
export type AsyncContextEvent = {
  [K in keyof EventMap]: {
    type: K;
    name: string;
    size: number;
    taskId: number;
  } & EventMap[K];
}[keyof EventMap];

/** Options for creating an {@link AsyncContext}. */
export interface AsyncContextOptions {
  /** Optional callback invoked on every task lifecycle transition. */
  watch?(this: void, event: AsyncContextEvent): void;
  /** Optional function to generate unique task IDs. */
  id?(this: void): string;
}

/** Manages sequential execution of async tasks with lifecycle monitoring. */
export interface AsyncContext {
  /** Enqueues an async task that runs after all previously queued tasks complete. */
  run<Args extends Any[], R>(name: string, fn: (...args: Args) => R | Promise<R>, ...args: Args): Promise<R>;
  /** A promise that resolves when the most recently enqueued task completes. */
  get continuation(): Promise<unknown>;
}

type AsyncContextCtor = (options: AsyncContextOptions) => AsyncContext;

/**
 * Creates an {@link AsyncContext} that ensures async tasks execute sequentially in the order they were enqueued.
 * @param options - Optional configuration with a `watch` callback for lifecycle monitoring
 * @returns An {@link AsyncContext} instance
 *
 * @example
 * ```ts
 * import createContext from "./async-context";
 *
 * const ctx = createContext({
 *   watch: (event) => console.log(event.type, event.name),
 * });
 *
 * ctx.run("first", async () => { await delay(100); return 1; });
 * ctx.run("second", async () => { return 2; });
 * // "first" always completes before "second" starts
 * ```
 */
const createContext: AsyncContextCtor = ({ watch }) => {
  let size = 0;
  let seed = 0;
  let continuation = Promise.resolve<unknown>(undefined);
  const ctx: AsyncContext = {
    run(name, fn, ...args) {
      const taskId = ++seed;
      watch?.({ type: "waiting", name, size: ++size, taskId });
      const c = continuation
        .catch((_reason: unknown) => {
          /** noop */
        })
        .then(async () => {
          try {
            watch?.({ type: "pending", name, size, taskId });
            const r = await fn(...args);
            watch?.({ type: "resolved", name, size: --size, taskId });
            return r;
          } catch (error: unknown) {
            watch?.({ type: "rejected", name, size: --size, taskId });
            throw error;
          }
        });
      continuation = c;
      return c;
    },
    get continuation() {
      return continuation;
    },
  };
  return ctx;
};

export default createContext;
