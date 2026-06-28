import { describe, it, expect, mock } from "bun:test";
import { listener } from "./listener";
import { createFakeMessageTarget, flush } from "./utils";

describe("listener (message-port)", () => {
  it("should receive events filtered by name", async () => {
    type Events = { "user:login": { id: string }; "user:logout": { id: string } };

    const target = createFakeMessageTarget();
    const listen = listener<Events>(target);

    const loginHandler = mock();
    const logoutHandler = mock();
    listen.on("user:login", loginHandler);
    listen.on("user:logout", logoutHandler);

    target.postMessage({ name: "user:login", value: { id: "abc" } });
    await flush();

    expect(loginHandler).toHaveBeenCalledWith({ id: "abc" });
    expect(logoutHandler).not.toHaveBeenCalled();
  });

  it("should unsubscribe when stop() is called", async () => {
    type Events = { data: string };

    const target = createFakeMessageTarget();
    const listen = listener<Events>(target);

    const handler = mock();
    const sub = listen.on("data", handler);

    target.postMessage({ name: "data", value: "first" });
    await flush();

    sub.stop();

    target.postMessage({ name: "data", value: "second" });
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("first");
  });

  it("should ignore messages with non-matching names", async () => {
    type Events = { a: number; b: number };

    const target = createFakeMessageTarget();
    const listen = listener<Events>(target);

    const handler = mock();
    listen.on("a", handler);

    target.postMessage({ name: "b", value: 99 });
    target.postMessage({ name: "a", value: 42 });
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(42);
  });

  it("should return a frozen listener with a frozen stop handle", () => {
    const target = createFakeMessageTarget();
    const listen = listener<{ x: number }>(target);

    expect(Object.isFrozen(listen)).toBe(true);

    const sub = listen.on("x", (_v) => undefined);
    expect(Object.isFrozen(sub)).toBe(true);
  });
});
