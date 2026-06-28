import type { EventMap, EventUnion, Listener } from "../types";
import { freeze } from "../utils";

/**
 * Minimal observable interface required by the rxjs listener adapter.
 *
 * Satisfied by any RxJS `Subject`, `Observable`, or object that exposes a
 * `subscribe` method returning an object with `unsubscribe()`.
 *
 * @template T - The type of values emitted by the observable.
 */
export interface ListenerSource<T> {
  subscribe(next: (value: T) => void): {
    unsubscribe(): void;
  };
}

/**
 * Creates a type-safe {@link Listener} that subscribes to a single RxJS-compatible
 * `Observable` stream and filters multiplexed `{ name, value }` events by name.
 *
 * Only events whose `name` matches the subscribed key are forwarded to the handler,
 * with the payload narrowed to the correct type from the event map.
 *
 * The returned `stop()` handle maps directly to the underlying subscription's
 * `unsubscribe()`, allowing deterministic cleanup of individual listeners.
 *
 * @template Map - An {@link EventMap} defining the allowed event names and their payload types.
 * @param source - An RxJS-compatible `Observable` (e.g. a `Subject`) emitting multiplexed event objects.
 * @returns A frozen {@link Listener} whose `on` method subscribes to filtered events by name.
 *
 * @example
 * ```ts
 * import { Subject } from "rxjs";
 * import { listener } from "@thuum/event-emitter/rxjs";
 *
 * type Events = {
 *   message: string;
 *   disconnect: { reason: string };
 * };
 *
 * const subject = new Subject<{ name: string; value: unknown }>();
 * const li = listener<Events>(subject);
 *
 * // Subscribe to "message" events — handler receives `string`
 * const handle = li.on("message", (text) => {
 *   console.log("received:", text);
 * });
 *
 * // stop() calls unsubscribe() on the underlying RxJS subscription
 * handle.stop();
 * ```
 */
export const listener = <Map extends EventMap>(source: ListenerSource<EventUnion<Map>>): Listener<Map> =>
  freeze({
    on(name, handler) {
      const subscription = source.subscribe((message) => {
        if (message.name !== name) {
          return;
        }
        handler(message.value as Map[typeof name]);
      });
      return freeze({
        stop() {
          subscription.unsubscribe();
        },
      });
    },
  } satisfies Listener<Map>);
