import type { Emitter, EventMap, EventUnion } from "../types";
import { freeze } from "../utils";

/**
 * Minimal observer interface required by the rxjs emitter adapter.
 *
 * Satisfied by any RxJS `Subject` or `Observer` that exposes a `next` method.
 *
 * @template T - The type of values pushed through the observer.
 */
export type EmitterSource<T> = {
  next(value: T): void;
};

/**
 * Creates a type-safe {@link Emitter} that multiplexes events as `{ name, value }`
 * objects through a single RxJS-compatible `Observer` stream.
 *
 * Each call to `emit` pushes a discriminated event union into the observer,
 * allowing multiple event types to share a single subject.
 *
 * @template Map - An {@link EventMap} defining the allowed event names and their payload types.
 * @param source - An RxJS-compatible `Observer` (e.g. a `Subject`) that receives multiplexed event objects.
 * @returns A frozen {@link Emitter} whose `emit` method forwards events into the observer.
 *
 * @example
 * ```ts
 * import { Subject } from "rxjs";
 * import { emitter } from "@thuum/event-emitter/rxjs";
 *
 * type Events = {
 *   message: string;
 *   disconnect: { reason: string };
 * };
 *
 * const subject = new Subject<{ name: string; value: unknown }>();
 * const em = emitter<Events>(subject);
 *
 * // Type-safe: only valid event names and matching payloads are accepted
 * em.emit("message", "hello");
 * em.emit("disconnect", { reason: "timeout" });
 * ```
 */
export const emitter = <Map extends EventMap>(source: EmitterSource<EventUnion<Map>>): Emitter<Map> =>
  freeze({
    emit(name, value) {
      source.next({ name, value });
    },
  } satisfies Emitter<Map>);
