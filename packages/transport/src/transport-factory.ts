import type { MessageMap, MessageTransport } from "./types";
import * as CustomEventTransport from "./window-custom-event-transport";

export type TransportType = "window-custom-event" | "window-message-event" | "broadcast-message-event";
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
