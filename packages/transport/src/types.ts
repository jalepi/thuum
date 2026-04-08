/** Maps topic names to their payload types. String keys only. */
export type MessageMap = {
  [topic: string]: unknown;
  [topic: number]: never;
  [topic: symbol]: never;
};

/** Subscribes to messages on a given topic and returns an unsubscribe function. */
export interface MessageReceiver<Map extends MessageMap = MessageMap> {
  on<K extends keyof Map & string>(topic: K, handler: (message: Map[K]) => void): () => void;
}

/** Sends messages to a given topic. */
export interface MessageSender<Map extends MessageMap = MessageMap> {
  send<K extends keyof Map & string>(topic: K, message: Map[K]): void;
}

/** A bidirectional message transport with a {@link MessageReceiver} and {@link MessageSender}, scoped by namespace. */
export interface MessageTransport<R extends MessageMap = MessageMap, S extends MessageMap = MessageMap> {
  readonly receiver: MessageReceiver<R>;
  readonly sender: MessageSender<S>;
  readonly namespace: string;
}
