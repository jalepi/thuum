import { describe, it, expect, mock } from "bun:test";
import { EventEmitter } from "node:events";
import { emitter } from "./emitter";

describe("emitter (node-events)", () => {
  it("should emit events to the underlying EventEmitter", () => {
    type Events = { message: string; error: Error };

    const ee = new EventEmitter();
    const send = emitter<Events>(ee);

    const handler = mock();
    ee.on("message", handler);

    send.emit("message", "hello");

    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("should support multiple event types with distinct payloads", () => {
    type Events = { message: string; error: Error };

    const ee = new EventEmitter();
    const send = emitter<Events>(ee);

    const onMessage = mock();
    const onError = mock();
    ee.on("message", onMessage);
    ee.on("error", onError);

    send.emit("message", "hello");
    send.emit("error", new Error("oops"));

    expect(onMessage).toHaveBeenCalledWith("hello");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect((onError.mock.calls[0][0] as Error).message).toBe("oops");
  });

  it("should return a frozen object", () => {
    const ee = new EventEmitter();
    const send = emitter<{ x: number }>(ee);

    expect(Object.isFrozen(send)).toBe(true);
  });
});
