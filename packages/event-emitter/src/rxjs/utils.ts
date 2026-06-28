import type { EmitterSource } from "./emitter";
import type { ListenerSource } from "./listener";

/**
 * Creates a minimal RxJS `Subject` stand-in that satisfies both the
 * {@link EmitterSource} (observer) and {@link ListenerSource} (observable)
 * interfaces.
 *
 * Useful for testing or environments where a full RxJS dependency is not
 * desired.
 *
 * @template T - The type of values flowing through the subject.
 * @returns An object with `next(value)` and `subscribe(next)` methods.
 *
 * @example
 * ```ts
 * import { createSubject } from "@thuum/event-emitter/rxjs/utils"; // internal helper
 * import { emitter, listener } from "@thuum/event-emitter/rxjs";
 * import type { EventUnion } from "@thuum/event-emitter";
 *
 * type Events = { ping: undefined; pong: undefined };
 *
 * const subject = createSubject<EventUnion<Events>>();
 * const emit = emitter<Events>(subject);
 * const listen = listener<Events>(subject);
 *
 * listen.on("ping", () => console.log("ping received"));
 * emit.emit("ping", undefined);
 * ```
 */
export function createSubject<T>(): EmitterSource<T> & ListenerSource<T> {
  const subscribers: ((value: T) => void)[] = [];
  return {
    next(value: T): void {
      for (const fn of subscribers) {
        fn(value);
      }
    },
    subscribe(next: (value: T) => void) {
      subscribers.push(next);
      return {
        unsubscribe() {
          const idx = subscribers.indexOf(next);
          if (idx !== -1) subscribers.splice(idx, 1);
        },
      };
    },
  };
}
