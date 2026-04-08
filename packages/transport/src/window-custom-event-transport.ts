import type { MessageMap, MessageTransport } from "./types";

/**
 * Creates a {@link MessageTransport} backed by `window` `CustomEvent` dispatching.
 * Messages are namespaced as `"namespace:topic"` event types.
 * @param options - Configuration with `namespace` for event scoping
 * @returns A frozen {@link MessageTransport} using `window.addEventListener` / `window.dispatchEvent`
 */
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
