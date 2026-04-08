import type { Err, Result, Val } from "./result";

/** A parser that validates and transforms a value, returning a {@link Result}. */
export type Parser<T> = { parse(value: T): Result<T> };

/** Helper type that restricts dictionary keys to strings only. */
export type NotStringDict = {
  [topic: number]: never;
  [topic: symbol]: never;
};

/** Maps topic names to their message payload types for message channels. */
export type MessageMap = {
  [topic: string]: {
    message: unknown;
  };
  [topic: number]: never;
  [topic: symbol]: never;
};

/** Defines parsers for each topic in a {@link MessageMap}, used to validate messages at runtime. */
export type MessageSchema<Map extends MessageMap = MessageMap> = {
  [K in keyof Map & string]: {
    message: Parser<Map[K]["message"]>;
  };
} & NotStringDict;

/** Infers a {@link MessageMap} from a {@link MessageSchema} by extracting parser input types. */
export type MessageMapFromSchema<Schema extends MessageSchema> = {
  [K in keyof Schema & string]: {
    message: Parameters<Schema[K]["message"]["parse"]>[0];
  };
} & NotStringDict;

/** Sends validated messages to a specific topic. */
export interface MessageSender<Map extends MessageMap> {
  send<K extends keyof Map & string>(topic: K, data: Map[K]["message"]): Result<Map[K]["message"]>;
}

/** Callback handler for incoming messages on a topic, with separate data and error paths. */
export type MessageHandler<T extends MessageMap[string]> = {
  ondata(this: void, { value }: Val<T["message"]>): void;
  onerror?(this: void, { error, trace }: Err<unknown>): void;
};

/** Subscribes to messages on a specific topic and returns a disposable subscription. */
export interface MessageReceiver<Map extends MessageMap> {
  on<K extends keyof Map & string>(topic: K, handler: MessageHandler<Map[K]>): { dispose(): void };
}

/** A paired sender and receiver for one-way, schema-validated messaging. */
export type MessageChannel<Map extends MessageMap> = {
  readonly receiver: MessageReceiver<Map>;
  readonly sender: MessageSender<Map>;
};

/** Maps topic names to their request and response payload types for request channels. */
export type RequestMap = {
  [topic: string]: {
    request: unknown;
    response: unknown;
  };
  [topic: number]: never;
  [topic: symbol]: never;
};

/** Defines request and response parsers for each topic in a {@link RequestMap}. */
export type RequestSchema<Map extends RequestMap = RequestMap> = {
  [K in keyof Map & string]: {
    request: Parser<Map[K]["request"]>;
    response: Parser<Map[K]["response"]>;
  };
} & NotStringDict;

/** Infers a {@link RequestMap} from a {@link RequestSchema} by extracting parser input types. */
export type RequestMapFromSchema<Schema extends RequestSchema> = {
  [K in keyof Schema & string]: {
    request: Parameters<Schema[K]["request"]["parse"]>[0];
    response: Parameters<Schema[K]["response"]["parse"]>[0];
  };
} & NotStringDict;

/** Async callback handler for incoming requests, with separate data and error paths. */
export type RequestHandler<T extends RequestMap[string]> = {
  ondata(this: void, { value }: Val<T["request"]>): Promise<T["response"]>;
  onerror?(this: void, { error, trace }: Err<unknown>): Promise<T["response"]>;
};

/** Sends a request to a topic and returns a promise that resolves with the response {@link Result}. */
export interface RequestSender<Map extends RequestMap> {
  send<K extends keyof Map & string>(topic: K, data: Map[K]["request"]): Promise<Result<Map[K]["response"]>>;
}

/** Subscribes to requests on a specific topic and returns a disposable subscription. */
export interface RequestReceiver<Map extends RequestMap> {
  on<K extends keyof Map & string>(
    topic: K,
    handler: RequestHandler<Map[K]>,
  ): {
    dispose(): void;
  };
}

/** A paired sender and receiver for request/response communication with schema validation. */
export type RequestChannel<Map extends RequestMap> = {
  readonly receiver: RequestReceiver<Map>;
  readonly sender: RequestSender<Map>;
};

/** Extracts the handler, request, and response types for each topic from a {@link RequestChannel}. */
export type FromRequestChannel<Channel extends RequestChannel<RequestMap>> =
  Channel extends RequestChannel<infer Map>
    ? {
        [Topic in keyof Map & string]: {
          handler: RequestHandler<Map[Topic]>;
          request: Map[Topic]["request"];
          response: Map[Topic]["response"];
        };
      }
    : never;
