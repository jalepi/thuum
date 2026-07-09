import type { Any, Emitter, EventMap, EventUnion } from "../types";
import { freeze } from "../utils";

/**
 * Minimal dispatcher interface required by the message-port emitter adapter.
 *
 * Satisfied by `BroadcastChannel`, `MessagePort`, `Worker`, `Window`, or any
 * object exposing a `postMessage` method.
 */
export interface EmitterSource {
  postMessage(message: Any): void;
}

/**
 * Creates a type-safe emitter that sends messages over a `MessageTarget` (e.g.
 * `BroadcastChannel`, `MessagePort`, or `Window`).
 *
 * Each call to `emit` serializes the event as a `{ name, value }` object via
 * `postMessage`. The receiving side can filter incoming messages by `name` using
 * the corresponding {@link listener}.
 *
 * @template Map - An {@link EventMap} describing event names and their payload types.
 * @param source - The message target to post events through.
 * @returns A frozen {@link Emitter} with a single type-safe `emit` method.
 *
 * @example
 * ```ts
 * import { emitter } from "@thuum/event-emitter/message-port";
 *
 * type Events = {
 *   "user:login": { id: string; role: string };
 *   "user:logout": { id: string };
 * };
 *
 * const channel = new BroadcastChannel("auth");
 * const auth = emitter<Events>(channel);
 *
 * // Type-safe: payload must match the event name
 * auth.emit("user:login", { id: "abc", role: "admin" });
 * auth.emit("user:logout", { id: "abc" });
 * ```
 */
export const emitter = <Map extends EventMap>(source: EmitterSource): Emitter<Map> =>
  freeze({
    emit(name, value) {
      const message: EventUnion<Map> = { name, value };
      source.postMessage(message);
    },
  });
