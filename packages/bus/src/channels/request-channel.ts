import { traceError, type Result } from "../result";
import type { MessageTransport } from "../transport";
import { uniqueId } from "../utils";
import type { RequestMapFromSchema, RequestSchema, RequestSender, RequestReceiver, RequestChannel } from "./types";

function isRequest(message: unknown): message is { $request: string; $data: unknown } {
  return !(
    !message ||
    typeof message !== "object" ||
    !("$request" in message) ||
    typeof message.$request !== "string" ||
    !("$data" in message)
  );
}

function isResponse(message: unknown): message is { $result: Result<unknown> } {
  return !(!message || typeof message !== "object" || !("$result" in message));
}

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
        throw new Error(`Topic ${topic} not found in schemas`);
      }

      const { request, response } = schemas[topic];

      const unsubscribe = transport.receiver.on(topic, (message) => {
        if (!isRequest(message)) {
          throw new Error("message is not a valid request");
        }

        const { $request: id, $data } = message;

        const responseTopic = `${topic}:${id}`;
        const result = request.parse($data);

        (async () => ("error" in result ? await onerror?.(result) : await ondata(result)))()
          .then((value) => {
            const result = response.parse(value);

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

      return {
        dispose() {
          unsubscribe();
        },
      };
    },
  };
}

export function createSender<
  Schema extends RequestSchema,
  Map extends RequestMapFromSchema<Schema> = RequestMapFromSchema<Schema>,
>({ schemas, transport }: { schemas: Schema; transport: MessageTransport }): RequestSender<Map> {
  return {
    send(topic, data) {
      if (!(topic in schemas)) {
        return Promise.resolve({
          error: new Error(`Topic ${topic} not found in schemas`),
        });
      }
      const { request, response } = schemas[topic];

      return new Promise<Result<Map[typeof topic]["response"]>>((resolve) => {
        const id = uniqueId();
        const responseTopic = `${topic}:${id}`;

        const timeout = setTimeout(() => {
          unsubscribe();
        }, 5_000);
        const unsubscribe = transport.receiver.on(responseTopic, (message) => {
          if (!isResponse(message)) {
            throw new Error("message is not a valid response");
          }
          unsubscribe();
          clearTimeout(timeout);
          const { $result } = message;

          if ("error" in $result) {
            resolve($result);
            return;
          }

          const result = response.parse($result.value);
          if ("error" in result) {
            resolve({
              error: new Error("Failed to parse response result"),
              trace: traceError(result),
            });
            return;
          }
          resolve({ value: result.value });
        });

        const result = request.parse(data);

        if ("error" in result) {
          resolve({
            error: new Error("Failed to parse request data"),
            trace: traceError(result),
          });
          return;
        }
        transport.sender.send(topic, { $request: id, $data: result.value });
      });
    },
  };
}

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
