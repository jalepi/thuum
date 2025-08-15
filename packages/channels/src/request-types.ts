import { type Err, type Result, type Val } from "./result";

export type RequestMap = {
  [topic: string]: {
    request: unknown;
    response: unknown;
  };
  [topic: number]: never;
  [topic: symbol]: never;
};

export type RequestHandler<T extends { request: unknown; response: unknown }> = {
  value({ value }: Val<T["request"]>): Promise<T["response"]>;
  error?({ error, trace }: Err<unknown>): Promise<T["response"]>;
};

export type RequestSender<Map extends RequestMap> = {
  send<Topic extends keyof Map>(topic: Topic, request: Map[Topic]["request"]): Promise<Result<Map[Topic]["response"]>>;
};

export type RequestReceiver<Map extends RequestMap> = {
  on<Topic extends keyof Map>(
    topic: Topic,
    handler: {
      value({ value }: Val<Map[Topic]["request"]>): Promise<Map[Topic]["response"]>;
      error?({ error, trace }: Err<unknown>): Promise<Map[Topic]["response"]>;
    },
  ): { unsubscribe(): void };
};
