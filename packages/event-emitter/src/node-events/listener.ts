import type { EventEmitter } from "node:events";
import type { EventMap, Listener } from "../types";
import { freeze } from "../utils";

/**
 * Minimal subscription interface required by the node-events listener adapter.
 *
 * Satisfied by Node.js `EventEmitter` or any object with compatible `on`/`off` methods.
 */
export interface ListenerSource extends Pick<EventEmitter, "on" | "off"> {}

/**
 * Wraps a Node.js `EventEmitter` as a typed {@link Listener}.
 *
 * Provides a type-safe `on` method that subscribes to named events and returns a handle to unsubscribe.
 *
 * @template Map - An {@link EventMap} defining valid event names and their payload types.
 * @param source - The underlying Node.js `EventEmitter` instance.
 * @returns A frozen {@link Listener} that delegates to `source.on` / `source.off`.
 *
 * @example
 * ```ts
 * import { EventEmitter } from "node:events";
 * import { listener } from "@thuum/event-emitter/node-events";
 *
 * type Events = { message: string; count: number };
 *
 * const ee = new EventEmitter();
 * const listen = listener<Events>(ee);
 *
 * const subscription = listen.on("message", (msg) => {
 *   console.log(msg); // typed as string
 * });
 *
 * // Later, unsubscribe:
 * subscription.stop();
 * ```
 */
export const listener = <Map extends EventMap>(source: ListenerSource): Listener<Map> =>
  freeze({
    on(name, handler) {
      const listener = (value: Map[typeof name]) => {
        handler(value);
      };
      source.on(name, listener);
      return freeze({
        stop() {
          source.off(name, listener);
        },
      });
    },
  } satisfies Listener<Map>);
