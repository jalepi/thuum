import type { Emitter, EventMap, Listener } from "./types";
import { freeze } from "./utils";

/**
 * Connects a {@link Listener} (source) to an {@link Emitter} (sink), forwarding
 * all specified events from one side to the other.
 *
 * For each event name provided, a subscription is created on the source listener
 * that re-emits incoming values through the sink emitter. The returned handle
 * allows stopping all forwarding at once.
 *
 * @template Map - An {@link EventMap} shared between the source and sink.
 * @param source - The listener to subscribe to (event source).
 * @param sink - The emitter to forward events into (event destination).
 * @param names - One or more event names to forward.
 * @returns A frozen `{ stop() }` handle that removes all subscriptions when invoked.
 *
 * @example Forward events between two EventTarget-backed ports
 * ```ts
 * import { listener, emitter } from "@thuum/event-emitter/event-target";
 * import { connect } from "@thuum/event-emitter";
 *
 * type Events = {
 *   message: { text: string };
 *   error: { code: number };
 * };
 *
 * const source = new EventTarget();
 * const dest = new EventTarget();
 *
 * const connection = connect(
 *   listener<Events>(source),
 *   emitter<Events>(dest),
 *   "message", "error",
 * );
 *
 * // Events dispatched on `source` are now forwarded to `dest`.
 * // Stop forwarding:
 * connection.stop();
 * ```
 *
 * @example Bridging two targets bidirectionally
 * ```ts
 * import { listener, emitter } from "@thuum/event-emitter/event-target";
 * import { connect } from "@thuum/event-emitter";
 *
 * type Events = { ping: undefined; pong: undefined };
 *
 * const a = new EventTarget();
 * const b = new EventTarget();
 *
 * // Wire A → B and B → A
 * const ab = connect(listener<Events>(a), emitter<Events>(b), "ping");
 * const ba = connect(listener<Events>(b), emitter<Events>(a), "pong");
 *
 * // Cleanup both directions:
 * ab.stop();
 * ba.stop();
 * ```
 */
export const connect = <Map extends EventMap>(
  source: Listener<Map>,
  sink: Emitter<Map>,
  ...names: (keyof Map & string)[]
): { stop(): void } => {
  const subscriptions = names.map((name) =>
    source.on(name, (value) => {
      sink.emit(name, value);
    }),
  );
  return freeze({
    stop() {
      subscriptions.forEach((sub) => {
        sub.stop();
      });
    },
  });
};
