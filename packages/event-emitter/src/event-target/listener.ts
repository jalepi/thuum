import type { EventMap, Listener } from "../types";
import { freeze } from "../utils";

/**
 * Minimal subscription interface required by the event-target listener adapter.
 *
 * This is satisfied by any standard `EventTarget` (DOM elements, `Window`,
 * `new EventTarget()`, etc.).
 */
export interface ListenerSource {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/**
 * Creates a type-safe event listener backed by a DOM `EventTarget`.
 *
 * Under the hood, handlers are registered with `addEventListener` and
 * incoming events are narrowed to `CustomEvent` so the typed `detail`
 * payload is forwarded to the handler.
 *
 * Each call to `on` returns a frozen object with a `stop()` method that
 * removes the underlying event listener, making it easy to unsubscribe
 * without holding a reference to the raw listener function.
 *
 * @template Map - An {@link EventMap} describing the event names and their associated payload types.
 * @param source - The `EventTarget` to listen on (must match the target used by the corresponding emitter).
 * @returns A frozen {@link Listener} whose `on` method subscribes a handler and returns a `{ stop() }` handle.
 *
 * @example
 * ```ts
 * import { emitter, listener } from "@thuum/event-emitter/event-target";
 *
 * type Events = {
 *   message: { text: string; from: string };
 *   disconnect: undefined;
 * };
 *
 * const target = new EventTarget();
 * const emit = emitter<Events>(target);
 * const listen = listener<Events>(target);
 *
 * // Handler receives the typed payload directly:
 * const subscription = listen.on("message", (value) => {
 *   console.log(value.text); // string — fully typed
 * });
 *
 * emit.emit("message", { text: "hello", from: "server" });
 *
 * // Unsubscribe when done:
 * subscription.stop();
 * ```
 */
export const listener = <Map extends EventMap>(source: ListenerSource): Listener<Map> =>
  freeze({
    on(name, handler) {
      const listener = (event: Event) => {
        const { detail } = event as CustomEvent<Map[typeof name]>;
        handler(detail);
      };
      source.addEventListener(name, listener);
      return freeze({
        stop() {
          source.removeEventListener(name, listener);
        },
      });
    },
  });
