import type { MessageTransport } from "@thuum/transport";
import { traceError, type Result } from "./result";
import { uniqueId } from "./utils";
import { isRequest, isResponse, type RequestModel } from "./request-models";
import type { RequestChannel, RequestMapFromSchema, RequestReceiver, RequestSchema, RequestSender } from "./types";

/**
 * Creates a request receiver that listens for incoming requests, validates them, and sends responses back through the transport.
 * @param options - The schemas and transport to use
 * @returns A {@link RequestReceiver} bound to the given schemas and transport
 */
export function createReceiver<Schema extends RequestSchema, Map extends RequestMapFromSchema<Schema>>({
  schemas,
  transport,
}: {
  schemas: Schema;
  transport: MessageTransport;
}): RequestReceiver<Map> {
  return {
    on(topic, { ondata, onerror }) {
      if (!(topic in schemas)) {
        throw new Error(`Topic "${topic}" not found in schemas`);
      }

      const schema = schemas[topic];

      const dispose = transport.receiver.on(topic, (message) => {
        if (!isRequest(message)) {
          throw new Error("message is not a valid request");
        }

        const { $request: id, $data } = message;

        const responseTopic = `${topic}:${id}`;
        const result = schema.request.parse($data);

        (async () => ("error" in result ? await onerror?.(result) : await ondata(result)))()
          .then((value) => {
            const result = schema.response.parse(value);

            if ("error" in result) {
              transport.sender.send(responseTopic, {
                $result: { error: new Error("Failed to parse response data"), trace: traceError(result) },
              });
            } else {
              transport.sender.send(responseTopic, {
                $result: { value: result.value },
              });
            }
          })
          .catch((error: unknown) => {
            transport.sender.send(responseTopic, {
              $result: { error },
            });
          });
      });

      return { dispose };
    },
  };
}

/**
 * Creates a request sender that validates outgoing requests, sends them, and listens for the correlated response.
 * @param options - The schemas and transport to use
 * @returns A {@link RequestSender} bound to the given schemas and transport
 */
export function createSender<
  Schema extends RequestSchema,
  Map extends RequestMapFromSchema<Schema> = RequestMapFromSchema<Schema>,
>({ schemas, transport }: { schemas: Schema; transport: MessageTransport }): RequestSender<Map> {
  return {
    send(topic, data) {
      if (!(topic in schemas)) {
        return Promise.resolve({
          error: new Error(`Topic "${topic}" not found in schemas`),
        });
      }
      const schema = schemas[topic];

      return new Promise<Result<Map[typeof topic]["response"]>>((resolve) => {
        const id = uniqueId();
        const responseTopic = `${topic}:${id}`;

        const timeout = setTimeout(() => {
          dispose();
        }, 5_000);
        const dispose = transport.receiver.on(responseTopic, (message) => {
          dispose();
          clearTimeout(timeout);

          if (!isResponse(message)) {
            resolve({ error: new Error(`Topic "${responseTopic}" received invalid response`) });
            return;
          }

          const { $result } = message;

          if ("error" in $result) {
            resolve($result);
            return;
          }

          const result = schema.response.parse($result.value);
          if ("error" in result) {
            resolve({
              error: new Error(`Topic "${responseTopic}" failed to parse response result`),
              trace: traceError(result),
            });
            return;
          }
          resolve({ value: result.value });
        });

        const result = schema.request.parse(data);

        if ("error" in result) {
          resolve({
            error: new Error("Failed to parse request data"),
            trace: traceError(result),
          });
          return;
        }
        transport.sender.send(topic, { $request: id, $data: result.value } satisfies RequestModel<unknown>);
      });
    },
  };
}

/**
 * Creates a request/response channel with a paired sender and receiver, both validated against the provided schemas.
 * @param options - The schemas defining allowed topics and the transport for message delivery
 * @returns A {@link RequestChannel} with `sender` and `receiver` properties
 *
 * @example
 * ```ts
 * import { createRequestChannel } from "@thuum/channels";
 * import { createTransport } from "@thuum/transport";
 *
 * const channel = createRequestChannel({
 *   schemas: {
 *     add: {
 *       request: { parse: (data) => ({ value: data }) },
 *       response: { parse: (data) => ({ value: data }) },
 *     },
 *   },
 *   transport: createTransport({ type: "window-custom-event", namespace: "app" }),
 * });
 *
 * channel.receiver.on("add", {
 *   ondata: async ({ value }) => value.a + value.b,
 * });
 *
 * const result = await channel.sender.send("add", { a: 2, b: 3 });
 * // { value: 5 }
 * ```
 */
export function createChannel<Schema extends RequestSchema, Map extends RequestMapFromSchema<Schema>>({
  schemas,
  transport,
}: {
  schemas: Schema;
  transport: MessageTransport;
}): RequestChannel<Map> {
  return {
    receiver: createReceiver({ schemas, transport }),
    sender: createSender({ schemas, transport }),
  };
}
