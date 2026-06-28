/**
 * Internal utility alias for `any` to suppress ESLint `@typescript-eslint/no-explicit-any`
 * warnings throughout source files without requiring per-line disable comments.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

/**
 * Base constraint for event maps. An event map is a record whose keys are
 * string event names and whose values are the corresponding event payloads.
 *
 * Number and symbol keys are explicitly disallowed (`never`) so that only
 * string-keyed records satisfy this constraint.
 *
 * @example
 * ```ts
 * // Satisfies EventMap — only string keys allowed:
 * type MyEvents = {
 *   message: string;
 *   error: Error;
 * };
 * ```
 */
export type EventMap = {
  [name: string]: unknown;
  [name: number]: never;
  [name: symbol]: never;
};

/**
 * Converts an event map into a discriminated union of `{ name, value }` pairs.
 *
 * This is useful for adapters (e.g. message-port or rxjs) that multiplex
 * multiple event types through a single channel and need a tagged-union
 * representation to discriminate between them.
 *
 * @template Map - An {@link EventMap} describing the available events.
 *
 * @example
 * ```ts
 * type MyEvents = { message: string; error: Error };
 *
 * type Union = EventUnion<MyEvents>;
 * // => { name: "message"; value: string } | { name: "error"; value: Error }
 * ```
 */
export type EventUnion<Map extends EventMap> = {
  [K in keyof Map]: { name: K & string; value: Map[K & string] };
}[keyof Map];

/**
 * Shared interface for type-safe event dispatching.
 *
 * Implementations of `Emitter` provide an `emit` method that accepts a
 * known event name and its corresponding payload, ensuring compile-time
 * safety for all event emissions.
 *
 * @template Map - An {@link EventMap} describing the events this emitter can dispatch.
 *
 * @example
 * ```ts
 * type MyEvents = { message: string; error: Error };
 *
 * declare const emitter: Emitter<MyEvents>;
 *
 * emitter.emit("message", "hello world"); // ✓
 * emitter.emit("error", new Error("fail")); // ✓
 * emitter.emit("message", 42); // ✗ type error
 * ```
 */
export interface Emitter<Map extends EventMap> {
  /**
   * Dispatches an event with the given name and value.
   *
   * @template K - The event name, inferred from the first argument.
   * @param name - The name of the event to emit.
   * @param value - The payload associated with the event.
   */
  emit<K extends keyof Map>(name: K & string, value: Map[K & string]): void;
}

/**
 * Shared interface for type-safe event subscription.
 *
 * Implementations of `Listener` provide an `on` method that registers a
 * handler for a specific event name. The returned object exposes a `stop`
 * method to unsubscribe the handler.
 *
 * @template Map - An {@link EventMap} describing the events this listener supports.
 *
 * @example
 * ```ts
 * type MyEvents = { message: string; error: Error };
 *
 * declare const listener: Listener<MyEvents>;
 *
 * const subscription = listener.on("message", (value) => {
 *   console.log(value); // value is typed as `string`
 * });
 *
 * // Later, unsubscribe:
 * subscription.stop();
 * ```
 */
export interface Listener<Map extends EventMap> {
  /**
   * Registers an event handler for the given event name.
   *
   * @template K - The event name, inferred from the first argument.
   * @param name - The name of the event to listen for.
   * @param handler - A callback invoked with the event's payload each time the event fires.
   * @returns An object with a `stop()` method that removes the handler when called.
   */
  on<K extends keyof Map>(name: K & string, handler: (value: Map[K & string]) => void): { stop(): void };
}
