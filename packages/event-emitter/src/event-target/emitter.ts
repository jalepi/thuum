import type { Emitter, EventMap } from "../types";
import { freeze } from "../utils";

/**
 * Minimal dispatcher interface required by the event-target emitter adapter.
 *
 * This is satisfied by any standard `EventTarget` (DOM elements, `Window`,
 * `new EventTarget()`, etc.).
 */
export interface EmitterSource {
  dispatchEvent(event: Event): boolean;
}

/**
 * Creates a type-safe event emitter backed by a DOM `EventTarget`.
 *
 * Events are dispatched as `CustomEvent` instances, with the payload stored
 * in the `detail` property. This allows seamless interop with native DOM
 * event listeners while preserving full type safety over event names and
 * payloads.
 *
 * @template Map - An {@link EventMap} describing the event names and their associated payload types.
 * @param source - The `EventTarget` used to dispatch events (e.g. `window`, a DOM element, or `new EventTarget()`).
 * @returns A frozen {@link Emitter} whose `emit` method dispatches a `CustomEvent` on the source.
 *
 * @example
 * ```ts
 * import { emitter } from "@thuum/event-emitter/event-target";
 *
 * type Events = {
 *   login: { userId: string };
 *   logout: undefined;
 * };
 *
 * const target = new EventTarget();
 * const emit = emitter<Events>(target);
 *
 * // Type-safe — only accepts payloads matching the map:
 * emit.emit("login", { userId: "abc-123" });
 * emit.emit("logout", undefined);
 *
 * // @ts-expect-error — "login" requires a { userId: string } payload
 * emit.emit("login", { wrong: true });
 * ```
 */
export const emitter = <Map extends EventMap>(source: EmitterSource): Emitter<Map> =>
  freeze({
    emit(name, value) {
      source.dispatchEvent(new CustomEvent<Map[typeof name]>(name, { detail: value }));
    },
  });
