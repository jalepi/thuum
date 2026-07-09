import { describe, expect, it, mock } from "bun:test";
import type { EventUnion } from "../types";
import { listener } from "./listener";
import { createSubject } from "./utils";

describe("listener (rxjs)", () => {
  it("should receive the typed payload filtered by event name", () => {
    type Events = { message: string; count: number };

    const subject = createSubject<EventUnion<Events>>();
    const listen = listener<Events>(subject);

    const handler = mock();
    listen.on("message", handler);

    subject.next({ name: "message", value: "hello" });
    subject.next({ name: "count", value: 5 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("should unsubscribe when stop() is called", () => {
    type Events = { tick: number };

    const subject = createSubject<EventUnion<Events>>();
    const listen = listener<Events>(subject);

    const handler = mock();
    const subscription = listen.on("tick", handler);

    subject.next({ name: "tick", value: 1 });
    subscription.stop();
    subject.next({ name: "tick", value: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it("should support multiple independent subscriptions", () => {
    type Events = { data: string };

    const subject = createSubject<EventUnion<Events>>();
    const listen = listener<Events>(subject);

    const handler1 = mock();
    const handler2 = mock();
    const sub1 = listen.on("data", handler1);
    listen.on("data", handler2);

    subject.next({ name: "data", value: "first" });
    sub1.stop();
    subject.next({ name: "data", value: "second" });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith("first");
    expect(handler2).toHaveBeenCalledTimes(2);
    expect(handler2).toHaveBeenCalledWith("second");
  });

  it("should not deliver events for other names", () => {
    type Events = { ping: undefined; pong: undefined };

    const subject = createSubject<EventUnion<Events>>();
    const listen = listener<Events>(subject);

    const handler = mock();
    listen.on("pong", handler);

    subject.next({ name: "ping", value: undefined });

    expect(handler).not.toHaveBeenCalled();
  });

  it("should return a frozen listener with a frozen stop handle", () => {
    const subject = createSubject<EventUnion<{ x: number }>>();
    const listen = listener<{ x: number }>(subject);

    expect(Object.isFrozen(listen)).toBe(true);

    const sub = listen.on("x", (_v) => undefined);
    expect(Object.isFrozen(sub)).toBe(true);
  });
});
