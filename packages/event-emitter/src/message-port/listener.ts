import type { EventMap, EventUnion, Listener } from "../types";
import { freeze } from "../utils";

/**
 * Minimal subscription interface required by the message-port listener adapter.
 *
 * Satisfied by `BroadcastChannel`, `MessagePort`, `Worker`, `Window`, or any
 * object that supports `addEventListener`/`removeEventListener` for `"message"` events.
 */
export interface ListenerSource {
  addEventListener(type: "message", listener: (ev: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (ev: MessageEvent) => void): void;
}

/**
 * Creates a type-safe listener that subscribes to messages on a `MessageTarget`
 * (e.g. `BroadcastChannel`, `MessagePort`, or `Window`).
 *
 * Incoming `MessageEvent` data is expected to be shaped as `{ name, value }`.
 * The listener filters events by `name` and only invokes the handler when the
 * name matches, providing full type-safety on the received value.
 *
 * Each call to `on` returns a `{ stop() }` handle that removes the underlying
 * event listener when invoked, preventing memory leaks and unwanted side effects.
 *
 * @template Map - An {@link EventMap} describing event names and their payload types.
 * @param source - The message target to listen on.
 * @returns A frozen {@link Listener} with a single type-safe `on` method.
 *
 * @example
 * ```ts
 * import { listener } from "@thuum/event-emitter/message-port";
 *
 * type Events = {
 *   "user:login": { id: string; role: string };
 *   "user:logout": { id: string };
 * };
 *
 * const channel = new BroadcastChannel("auth");
 * const auth = listener<Events>(channel);
 *
 * // Subscribe — handler receives a typed payload
 * const subscription = auth.on("user:login", (payload) => {
 *   console.log(payload.id, payload.role); // fully typed
 * });
 *
 * // Unsubscribe when done
 * subscription.stop();
 * ```
 */
export const listener = <Map extends EventMap>(source: ListenerSource): Listener<Map> =>
  freeze({
    on(name, handler) {
      const listener = ({ data }: MessageEvent<EventUnion<Map>>) => {
        if (data.name !== name) {
          return;
        }
        handler(data.value as Map[typeof name]);
      };
      source.addEventListener("message", listener);
      return freeze({
        stop() {
          source.removeEventListener("message", listener);
        },
      });
    },
  });
