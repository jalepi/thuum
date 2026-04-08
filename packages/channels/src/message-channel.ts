import type { MessageTransport } from "@thuum/transport";
import { traceError } from "./result";
import type { MessageChannel, MessageMapFromSchema, MessageSchema, MessageSender, MessageReceiver } from "./types";

/**
 * Creates a message receiver that subscribes to topics and validates incoming messages against the schema.
 * @param options - The schemas and transport to use
 * @returns A {@link MessageReceiver} bound to the given schemas and transport
 */
export function createReceiver<
  Schema extends MessageSchema,
  Map extends MessageMapFromSchema<Schema> = MessageMapFromSchema<Schema>,
>({ schemas, transport }: { schemas: Schema; transport: MessageTransport }): MessageReceiver<Map> {
  return {
    on(topic, { ondata, onerror }) {
      if (!(topic in schemas)) {
        throw new Error(`Topic "${topic}" not found in schemas`);
      }

      const schema = schemas[topic];
      const unsubscribe = transport.receiver.on(topic, (message) => {
        const result = schema.message.parse(message);
        if ("error" in result) {
          onerror?.({
            error: new Error("Failed to parse message"),
            trace: traceError(result),
          });
        } else {
          ondata({ value: result.value });
        }
      });

      return {
        dispose() {
          unsubscribe();
        },
      };
    },
  };
}

/**
 * Creates a message sender that validates outgoing messages against the schema before sending.
 * @param options - The schemas and transport to use
 * @returns A {@link MessageSender} bound to the given schemas and transport
 */
export function createSender<
  Schema extends MessageSchema,
  Map extends MessageMapFromSchema<Schema> = MessageMapFromSchema<Schema>,
>({ schemas, transport }: { schemas: Schema; transport: MessageTransport }): MessageSender<Map> {
  return {
    send(topic, message) {
      if (!(topic in schemas)) {
        return { error: new Error(`Topic "${topic}" not found in schemas`) };
      }

      const schema = schemas[topic];
      const result = schema.message.parse(message);

      if ("error" in result) {
        return {
          error: new Error("Failed to parse message"),
          trace: traceError(result),
        };
      }

      transport.sender.send(topic, result.value);
      return { value: result.value };
    },
  };
}

/**
 * Creates a message channel with a paired sender and receiver, both validated against the provided schemas.
 * @param options - The schemas defining allowed topics and the transport for message delivery
 * @returns A {@link MessageChannel} with `sender` and `receiver` properties
 *
 * @example
 * ```ts
 * import { createMessageChannel } from "@thuum/channels";
 * import { createTransport } from "@thuum/transport";
 *
 * const channel = createMessageChannel({
 *   schemas: {
 *     greeting: { message: { parse: (data) => ({ value: data }) } },
 *   },
 *   transport: createTransport({ type: "window-custom-event", namespace: "app" }),
 * });
 *
 * channel.receiver.on("greeting", {
 *   ondata: ({ value }) => console.log(value),
 * });
 *
 * channel.sender.send("greeting", { text: "Hello!" });
 * ```
 */
export function createChannel<Schema extends MessageSchema, Map extends MessageMapFromSchema<Schema>>({
  schemas,
  transport,
}: {
  schemas: Schema;
  transport: MessageTransport;
}): MessageChannel<Map> {
  return {
    receiver: createReceiver({ schemas, transport }),
    sender: createSender({ schemas, transport }),
  };
}
