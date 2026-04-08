import type { StandardSchemaV1 } from "./standard-schema-v1";

/** A value that may be synchronous or wrapped in a `Promise`. */
type MaybePromise<T> = T | Promise<T>;

/** Wrapper for a successful value. */
interface Val<T> {
  readonly data: T;
}

/** Wrapper for an error, with an optional causal trace. */
interface Err<T> {
  readonly error: T;
  readonly trace?: readonly [T, ...T[]];
}

/** A successful result carrying `data`. */
interface ValResult<T = unknown> extends Val<T> {
  readonly success: true;
}

/** A failed result carrying `error` and an optional `trace`. */
interface ErrResult<T = unknown> extends Err<T> {
  readonly success: false;
}

/** Discriminated union representing either a success (`ValResult`) or a failure (`ErrResult`). */
export type Result<V, E = unknown> = ValResult<V> | ErrResult<E>;

/** Constraint that restricts a mapped type to string keys only. */
export type NotStringDict = {
  [key: number]: never;
  [key: symbol]: never;
};

/**
 * Defines the shape of a fire-and-forget (cast) channel.
 * Each string key is a topic mapped to its `message` payload type.
 */
export type CastMap = {
  [topic: string]: { message: unknown };
  [topic: number]: never;
  [topic: symbol]: never;
};

/** Runtime validation schema for a {@link CastMap}, using Standard Schema v1 validators per topic. */
export type CastSchema<Map extends CastMap> = {
  [K in keyof Map]: {
    message: StandardSchemaV1<Map[K]["message"], Map[K]["message"]>;
  };
} & NotStringDict;

/** Sends fire-and-forget messages to topics defined in a {@link CastMap}. */
export type CastSender<Map extends CastMap> = {
  send<Topic extends keyof Map & string>(topic: Topic, message: Map[Topic]["message"]): Promise<Result<void>>;
};

/** Subscribes to fire-and-forget messages from topics defined in a {@link CastMap}. */
export type CastReceiver<Map extends CastMap> = {
  on(handlers: {
    [Topic in keyof Map & string]?: {
      ondata({ data }: Val<Map[Topic]["message"]>): MaybePromise<void>;
      onerror?({ error, trace }: Err<unknown>): MaybePromise<void>;
    };
  }): { unsubscribe(): void };
};

/**
 * Defines the shape of a request/response (call) channel.
 * Each string key is a topic mapped to its `request` and `response` payload types.
 */
export type CallMap = {
  [topic: string]: { request: unknown; response: unknown };
  [topic: number]: never;
  [topic: symbol]: never;
};

/** Runtime validation schema for a {@link CallMap}, using Standard Schema v1 validators per topic. */
export type CallSchema<Map extends CallMap> = {
  [Topic in keyof Map]: {
    request: StandardSchemaV1<Map[Topic]["request"], Map[Topic]["request"]>;
    response: StandardSchemaV1<Map[Topic]["response"], Map[Topic]["response"]>;
  };
} & NotStringDict;

/** Sends requests and awaits typed responses for topics defined in a {@link CallMap}. */
export type CallSender<Map extends CallMap> = {
  send<Topic extends keyof Map & string>(
    topic: Topic,
    request: Map[Topic]["request"],
  ): Promise<Result<Map[Topic]["response"]>>;
};

/** Subscribes to incoming requests and provides typed responses for topics defined in a {@link CallMap}. */
export type CallReceiver<Map extends CallMap> = {
  on(handlers: {
    [Topic in keyof Map & string]?: {
      ondata({ data }: Val<Map[Topic]["request"]>): MaybePromise<Map[Topic]["response"]>;
      onerror?({ error, trace }: Err<unknown>): MaybePromise<Map[Topic]["response"]>;
    };
  }): { unsubscribe(): void };
};
