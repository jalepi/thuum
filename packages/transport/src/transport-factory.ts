import type { MessageMap, MessageTransport } from "./types";
import * as CustomEventTransport from "./window-custom-event-transport";

/** Supported transport implementation types. */
export type TransportType = "window-custom-event" | "window-message-event" | "broadcast-message-event";

/**
 * Creates a {@link MessageTransport} of the specified type.
 * @param options - Transport configuration including `type` and `namespace`
 * @returns A frozen {@link MessageTransport} instance
 * @throws If the transport type is not implemented
 *
 * @example
 * ```ts
 * import { createTransport } from "@thuum/transport";
 *
 * const transport = createTransport({
 *   type: "window-custom-event",
 *   namespace: "my-app",
 * });
 *
 * const unsubscribe = transport.receiver.on("greeting", (msg) => console.log(msg));
 * transport.sender.send("greeting", { text: "Hello!" });
 * unsubscribe();
 * ```
 */
export function createTransport<Map extends MessageMap = MessageMap>({
  type,
  ...options
}: {
  type: TransportType;
  namespace: string;
}): MessageTransport<Map> {
  switch (type) {
    case "window-custom-event":
      return CustomEventTransport.createTransport({ ...options });
    case "window-message-event":
    case "broadcast-message-event":
      throw new Error("Not implemented");
    default: {
      throw new Error(`Invalid transport type: ${type as string}`);
    }
  }
}
