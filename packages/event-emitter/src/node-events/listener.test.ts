import { describe, it, expect, mock } from "bun:test";
import { EventEmitter } from "node:events";
import { listener } from "./listener";

describe("listener (node-events)", () => {
  it("should receive typed events from the underlying EventEmitter", () => {
    type Events = { message: string; count: number };

    const ee = new EventEmitter();
    const listen = listener<Events>(ee);

    const handler = mock();
    listen.on("message", handler);

    ee.emit("message", "hello");

    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("should unsubscribe when stop() is called", () => {
    type Events = { message: string };

    const ee = new EventEmitter();
    const listen = listener<Events>(ee);

    const handler = mock();
    const subscription = listen.on("message", handler);

    ee.emit("message", "first");
    subscription.stop();
    ee.emit("message", "second");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("first");
  });

  it("should support multiple independent subscriptions", () => {
    type Events = { data: number };

    const ee = new EventEmitter();
    const listen = listener<Events>(ee);

    const handler1 = mock();
    const handler2 = mock();
    const sub1 = listen.on("data", handler1);
    listen.on("data", handler2);

    ee.emit("data", 42);
    sub1.stop();
    ee.emit("data", 99);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith(42);
    expect(handler2).toHaveBeenCalledTimes(2);
    expect(handler2).toHaveBeenCalledWith(99);
  });

  it("should return a frozen object with a frozen stop handle", () => {
    const ee = new EventEmitter();
    const listen = listener<{ x: number }>(ee);

    expect(Object.isFrozen(listen)).toBe(true);

    const sub = listen.on("x", (_v) => undefined);
    expect(Object.isFrozen(sub)).toBe(true);
  });
});
