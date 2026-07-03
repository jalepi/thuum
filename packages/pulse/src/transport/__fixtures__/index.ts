import type { StandardSchemaV1 } from "../../standard-schema-v1";
import type { Transport } from "../types";
import { fromEventTarget } from "../event-target";
import { inMemoryTransport } from "../in-memory";
import type { StructLike } from "../../base";

export const transports: { name: string; create(this: void): Transport }[] = [
  {
    name: "event-target",
    create() {
      return fromEventTarget(new EventTarget());
    },
  },
  {
    name: "in-memory",
    create() {
      return inMemoryTransport();
    },
  },
];

export type SchemaFixture = {
  foo: StandardSchemaV1<{ value: string }>;
  bar: StandardSchemaV1<{ age: number }>;
};

export const schemas: SchemaFixture = {
  foo: {
    "~standard": {
      version: 1,
      vendor: "",
      validate(foo) {
        try {
          if (!foo || typeof foo !== "object") {
            return { issues: [{ message: "foo must be an object", path: ["foo"] }] };
          }
          if (!("value" in foo) || typeof foo.value !== "string") {
            return { issues: [{ message: "foo.value must be a string", path: ["foo", "value"] }] };
          }
          return { value: foo as { value: string } };
        } catch (e) {
          return { issues: [{ message: e instanceof Error ? e.message : String(e) }] };
        }
      },
    },
  },
  bar: {
    "~standard": {
      version: 1,
      vendor: "",
      validate(bar) {
        try {
          if (!bar || typeof bar !== "object") {
            return { issues: [{ message: "bar must be an object", path: ["bar"] }] };
          }
          if (!("age" in bar) || typeof bar.age !== "number") {
            return { issues: [{ message: "bar.age must be a number", path: ["bar", "age"] }] };
          }
          return { value: bar as { age: number } };
        } catch (e) {
          return { issues: [{ message: e instanceof Error ? e.message : String(e) }] };
        }
      },
    },
  },
} as const satisfies SchemaFixture;

type Receipt<T extends StructLike> = {
  [K in keyof T & string]: { success: true; topic: K; content: T[K] } | { success: false; topic: K; error: unknown };
}[keyof T & string];

export const composeReceivers = async <T extends StructLike>(
  transports: Transport<T>[],
  topics: (keyof T & string)[],
  breathe: () => Promise<void> = () => Promise.resolve(),
): Promise<{
  readonly consumers: AsyncIterator<Receipt<T>>[];
  connection: { close(): Promise<void> };
}> => {
  const promises = transports.flatMap((input) => {
    return topics.map(async (topic) => {
      const { consumer, producer } = createChannel<Receipt<T>>();
      const connection = await input.receive(topic, {
        async ondata(content) {
          await breathe();
          producer.next({ success: true, topic, content });
          return { success: true };
        },
        async onerror(error) {
          await breathe();
          producer.next({ success: false, topic, error });
          return { success: false, error };
        },
      });
      return {
        connection: {
          async close() {
            await connection.close();
            producer.complete();
          },
        },
        consumer,
      } as const;
    });
  });

  const results = await Promise.all(promises);
  return {
    consumers: results.map(({ consumer }) => consumer),
    connection: {
      async close(): Promise<void> {
        await Promise.all(
          results.map(async ({ connection }) => {
            await connection.close();
          }),
        );
      },
    },
  };
};

export const composeReceiver = async <T extends StructLike>(
  transport: Transport<T>,
  topic: keyof T & string,
  breathe: () => Promise<void> = () => Promise.resolve(),
): Promise<{
  readonly consumer: AsyncIterator<Receipt<T>>;
  readonly connection: { close(): Promise<void> };
}> => {
  const { consumer, producer } = createChannel<Receipt<T>>();
  const connection = await transport.receive(topic, {
    async ondata(content) {
      await breathe();
      producer.next({ success: true, topic, content });
      return { success: true };
    },
    async onerror(error) {
      await breathe();
      producer.next({ success: false, topic, error });
      return { success: false, error };
    },
  });
  return {
    connection: {
      async close() {
        await connection.close();
        producer.complete();
      },
    },
    consumer,
  } as const;
};

type AsyncChannel<T> = {
  producer: {
    next(value: T): void;
    error(error: unknown): void;
    complete(): void;
  };
  consumer: AsyncIterator<T>;
};

export function createChannel<T>(): AsyncChannel<T> {
  type Resolver = {
    resolve(result: IteratorResult<T>): void;
    reject(error: unknown): void;
  };

  const buffer: IteratorResult<T>[] = [];
  const resolvers: Resolver[] = [];
  let done = false;

  return {
    producer: {
      next(value) {
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
      error(error) {
        if (done) {
          return;
        }
        done = true;
        for (const resolver of resolvers) {
          resolver.reject(error);
        }
        resolvers.length = 0;
      },
      complete() {
        if (done) {
          return;
        }
        done = true;
        for (const resolver of resolvers) {
          resolver.resolve({ done: true, value: undefined });
        }
      },
    },
    consumer: {
      next() {
        const resolver = buffer.shift();
        if (resolver) {
          return Promise.resolve(resolver);
        }
        if (done) {
          return Promise.resolve({ done: true, value: undefined });
        }
        return new Promise((resolve, reject) => {
          resolvers.push({ resolve, reject });
        });
      },
      return() {
        done = true;
        for (const waiter of resolvers) {
          waiter.resolve({ done: true, value: undefined });
        }
        resolvers.length = 0;
        return Promise.resolve({ done: true, value: undefined });
      },
    },
  };
}

export function* circular<T>(values: Iterable<T, T>, stop: () => boolean): Iterable<T, undefined, T> {
  while (!stop()) {
    for (const value of values) {
      yield value;
    }
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function breath(pace: number[]): () => Promise<void> {
  const iterable = circular(pace, () => false);
  const iterator = iterable[Symbol.iterator]();
  return () => {
    const { value } = iterator.next();
    return delay(value ?? 0);
  };
}
