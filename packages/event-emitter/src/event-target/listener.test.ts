import { describe, expect, it, mock } from "bun:test";
import { listener } from "./listener";

describe("listener (event-target)", () => {
  it("should receive the typed payload from a CustomEvent", () => {
    type Events = { message: { text: string; from: string } };

    const target = new EventTarget();
    const listen = listener<Events>(target);

    const handler = mock();
    listen.on("message", handler);

    target.dispatchEvent(new CustomEvent("message", { detail: { text: "hello", from: "server" } }));

    expect(handler).toHaveBeenCalledWith({ text: "hello", from: "server" });
  });

  it("should unsubscribe when stop() is called", () => {
    type Events = { tick: number };

    const target = new EventTarget();
    const listen = listener<Events>(target);

    const handler = mock();
    const subscription = listen.on("tick", handler);

    target.dispatchEvent(new CustomEvent("tick", { detail: 1 }));
    subscription.stop();
    target.dispatchEvent(new CustomEvent("tick", { detail: 2 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it("should support multiple independent subscriptions", () => {
    type Events = { data: string };

    const target = new EventTarget();
    const listen = listener<Events>(target);

    const handler1 = mock();
    const handler2 = mock();
    const sub1 = listen.on("data", handler1);
    listen.on("data", handler2);

    target.dispatchEvent(new CustomEvent("data", { detail: "first" }));

    sub1.stop();
    target.dispatchEvent(new CustomEvent("data", { detail: "second" }));

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith("first");
    expect(handler2).toHaveBeenCalledTimes(2);
    expect(handler2).toHaveBeenCalledWith("second");
  });

  it("should return a frozen listener with a frozen stop handle", () => {
    const target = new EventTarget();
    const listen = listener<{ x: number }>(target);

    expect(Object.isFrozen(listen)).toBe(true);

    const sub = listen.on("x", (_v) => undefined);
    expect(Object.isFrozen(sub)).toBe(true);
  });
});
