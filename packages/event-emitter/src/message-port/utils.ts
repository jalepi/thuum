import type { EmitterSource } from "./emitter";
import type { ListenerSource } from "./listener";

/**
 * Flushes pending microtasks so that queued message deliveries complete.
 *
 * Useful in tests to `await` asynchronous message-port event delivery.
 *
 * @returns A promise that resolves after the next microtask checkpoint.
 *
 * @example
 * ```ts
 * import { createFakeMessageTarget, flush } from "./utils";
 *
 * const target = createFakeMessageTarget();
 * target.postMessage({ name: "ping", value: undefined });
 *
 * // Message not yet delivered (queued as microtask)
 * await flush();
 * // Message now delivered to listeners
 * ```
 */
export const flush = (): Promise<void> =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

/**
 * Creates a minimal fake that simulates the `MessagePort` contract for testing.
 *
 * Calling `postMessage(data)` queues a microtask that dispatches a
 * `MessageEvent` with `{ data }` to all registered listeners — mirroring the
 * asynchronous delivery semantics of `BroadcastChannel`, `MessagePort`, and
 * `Window`.
 *
 * @returns An object satisfying both {@link EmitterSource} and {@link ListenerSource}.
 *
 * @example
 * ```ts
 * import { createFakeMessageTarget, flush } from "./utils";
 * import { emitter } from "./emitter";
 * import { listener } from "./listener";
 *
 * type Events = { greeting: string };
 *
 * const target = createFakeMessageTarget();
 * const emit = emitter<Events>(target);
 * const listen = listener<Events>(target);
 *
 * listen.on("greeting", (msg) => console.log(msg));
 * emit.emit("greeting", "hello");
 * await flush(); // "hello"
 * ```
 */
export function createFakeMessageTarget(): EmitterSource & ListenerSource {
  const listeners: ((ev: MessageEvent) => void)[] = [];
  return {
    postMessage(message: unknown) {
      const event = new MessageEvent("message", { data: message });
      queueMicrotask(() => {
        for (const fn of listeners) {
          fn(event);
        }
      });
    },
    addEventListener(_type: "message", fn: (ev: MessageEvent) => void) {
      listeners.push(fn);
    },
    removeEventListener(_type: "message", fn: (ev: MessageEvent) => void) {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    },
  };
}
