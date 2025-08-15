import type { Err, Result, Val } from "./result";

export type MessageHandler<T extends MessageMap[string]> = {
  value({ value }: Val<T["message"]>): void;
  error?({ error }: Err<unknown>): void;
};

export type MessageMap = {
  [topic: string]: {
    message: unknown;
  };
  [topic: number]: never;
  [topic: symbol]: never;
};

export type MessageSender<Map extends MessageMap> = {
  send<Topic extends keyof Map>(topic: Topic, message: Map[Topic]["message"]): Result<never>;
};

export type MessageReceiver<Map extends MessageMap> = {
  on<Topic extends keyof Map>(topic: Topic, handler: MessageHandler<Map[Topic]>): { unsubscribe(): void };
};

export type MessageSubscriptionFn = <Map extends MessageMap>(
  receiver: MessageReceiver<Map>,
) => {
  subscribeAll(handlers: { [Topic in keyof Map]: MessageHandler<Map[Topic]> }): { unsubscribe(): void };
  subscribeSome(handlers: { [Topic in keyof Map]?: MessageHandler<Map[Topic]> }): { unsubscribe(): void };
};
