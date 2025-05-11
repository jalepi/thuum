export type MessageMap = {
  [topic: string]: unknown;
  [topic: number]: never;
  [topic: symbol]: never;
};

export interface MessageReceiver<Map extends MessageMap = MessageMap> {
  on<K extends keyof Map & string>(topic: K, handler: (message: Map[K]) => void): () => void;
}

export interface MessageSender<Map extends MessageMap = MessageMap> {
  send<K extends keyof Map & string>(topic: K, message: Map[K]): void;
}

export interface MessageTransport<R extends MessageMap = MessageMap, S extends MessageMap = MessageMap> {
  readonly receiver: MessageReceiver<R>;
  readonly sender: MessageSender<S>;
  readonly namespace: string;
}
