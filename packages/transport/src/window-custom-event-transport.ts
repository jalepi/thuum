import type { MessageMap, MessageTransport } from "./types";

export function createTransport<Map extends MessageMap = MessageMap>({
  namespace,
}: {
  namespace: string;
}): MessageTransport<Map> {
  const transport: MessageTransport<Map> = {
    namespace,
    receiver: {
      on(topic, handler) {
        const type = `${namespace}:${topic}`;
        const listener = (event: Event) => {
          if ("detail" in event) {
            handler(event.detail as Map[typeof topic]);
          }
        };
        window.addEventListener(type, listener);
        return () => {
          window.removeEventListener(type, listener);
        };
      },
    },
    sender: {
      send(topic, message) {
        queueMicrotask(() => {
          const type = `${namespace}:${topic}`;
          const event = new CustomEvent(type, { detail: message });
          window.dispatchEvent(event);
        });
      },
    },
  };

  return Object.freeze(transport);
}
