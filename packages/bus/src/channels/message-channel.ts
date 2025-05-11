import type { MessageTransport } from "../transport";
import { traceError } from "../result";
import type { MessageChannel, MessageMapFromSchema, MessageSchema, MessageSender, MessageReceiver } from "./types";

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
