import type { EventEmitter } from "node:events";
import type { Emitter, EventMap } from "../types";
import { freeze } from "../utils";

/**
 * Minimal dispatcher interface required by the node-events emitter adapter.
 *
 * Satisfied by Node.js `EventEmitter` or any object with a compatible `emit` method.
 */
export interface EmitterSource extends Pick<EventEmitter, "emit"> {}

/**
 * Wraps a Node.js `EventEmitter` as a typed {@link Emitter}.
 *
 * Provides a type-safe `emit` method constrained to the event names and payloads defined in `Map`.
 *
 * @template Map - An {@link EventMap} defining valid event names and their payload types.
 * @param source - The underlying Node.js `EventEmitter` instance.
 * @returns A frozen {@link Emitter} that delegates to `source.emit`.
 *
 * @example
 * ```ts
 * import { EventEmitter } from "node:events";
 * import { emitter } from "@thuum/event-emitter/node-events";
 *
 * type Events = { message: string; error: Error };
 *
 * const ee = new EventEmitter();
 * const send = emitter<Events>(ee);
 *
 * send.emit("message", "hello");
 * send.emit("error", new Error("oops"));
 * // send.emit("message", 42); // TS error: number is not assignable to string
 * ```
 */
export const emitter = <Map extends EventMap>(source: EmitterSource): Emitter<Map> =>
  freeze({
    emit(name, value) {
      source.emit(name, value);
    },
  } satisfies Emitter<Map>);
