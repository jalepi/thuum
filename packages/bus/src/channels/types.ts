import type { Err, Result, Val } from "../result";

export type Parser<T> = { parse(value: T): Result<T> };

export type NotStringDict = {
  [topic: number]: never;
  [topic: symbol]: never;
};

export type MessageMap = {
  [topic: string]: {
    message: unknown;
  };
  [topic: number]: never;
  [topic: symbol]: never;
};

export type MessageSchema<Map extends MessageMap = MessageMap> = {
  [K in keyof Map & string]: {
    message: Parser<Map[K]["message"]>;
  };
} & NotStringDict;

export type MessageMapFromSchema<Schema extends MessageSchema> = {
  [K in keyof Schema & string]: {
    message: Parameters<Schema[K]["message"]["parse"]>[0];
  };
} & NotStringDict;

export interface MessageSender<Map extends MessageMap> {
  send<K extends keyof Map & string>(topic: K, data: Map[K]["message"]): Result<Map[K]["message"]>;
}

export type MessageHandler<T extends MessageMap[string]> = {
  ondata(this: void, { value }: Val<T["message"]>): void;
  onerror?(this: void, { error, trace }: Err<unknown>): void;
};

export interface MessageReceiver<Map extends MessageMap> {
  on<K extends keyof Map & string>(topic: K, handler: MessageHandler<Map[K]>): { dispose(): void };
}

export type MessageChannel<Map extends MessageMap> = {
  readonly receiver: MessageReceiver<Map>;
  readonly sender: MessageSender<Map>;
};

export type RequestMap = {
  [topic: string]: {
    request: unknown;
    response: unknown;
  };
  [topic: number]: never;
  [topic: symbol]: never;
};

export type RequestSchema<Map extends RequestMap = RequestMap> = {
  [K in keyof Map & string]: {
    request: Parser<Map[K]["request"]>;
    response: Parser<Map[K]["response"]>;
  };
} & NotStringDict;

export type RequestMapFromSchema<Schema extends RequestSchema> = {
  [K in keyof Schema & string]: {
    request: Parameters<Schema[K]["request"]["parse"]>[0];
    response: Parameters<Schema[K]["response"]["parse"]>[0];
  };
} & NotStringDict;

export type RequestHandler<T extends RequestMap[string]> = {
  ondata(this: void, { value }: Val<T["request"]>): Promise<T["response"]>;
  onerror?(this: void, { error, trace }: Err<unknown>): Promise<T["response"]>;
};

export interface RequestSender<Map extends RequestMap> {
  send<K extends keyof Map & string>(topic: K, data: Map[K]["request"]): Promise<Result<Map[K]["response"]>>;
}

export interface RequestReceiver<Map extends RequestMap> {
  on<K extends keyof Map & string>(
    topic: K,
    handler: RequestHandler<Map[K]>,
  ): {
    dispose(): void;
  };
}

export type RequestChannel<Map extends RequestMap> = {
  readonly receiver: RequestReceiver<Map>;
  readonly sender: RequestSender<Map>;
};

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
