import { describe, it, expect, mock } from "bun:test";
import { emitter } from "./emitter";
import { createSubject } from "./utils";
import type { EventUnion } from "../types";

describe("emitter (rxjs)", () => {
  it("should push a { name, value } object into the observer", () => {
    type Events = { message: string; error: Error };

    const subject = createSubject<EventUnion<Events>>();
    const emit = emitter<Events>(subject);

    const handler = mock();
    subject.subscribe(handler);

    emit.emit("message", "hello");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ name: "message", value: "hello" });
  });

  it("should support multiple event types with distinct payloads", () => {
    type Events = { message: string; count: number };

    const subject = createSubject<EventUnion<Events>>();
    const emit = emitter<Events>(subject);

    const handler = mock();
    subject.subscribe(handler);

    emit.emit("message", "hi");
    emit.emit("count", 42);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ name: "message", value: "hi" });
    expect(handler).toHaveBeenCalledWith({ name: "count", value: 42 });
  });

  it("should support undefined payloads", () => {
    type Events = { logout: undefined };

    const subject = createSubject<EventUnion<Events>>();
    const emit = emitter<Events>(subject);

    const handler = mock();
    subject.subscribe(handler);

    emit.emit("logout", undefined);

    expect(handler).toHaveBeenCalledWith({ name: "logout", value: undefined });
  });

  it("should return a frozen object", () => {
    const subject = createSubject<EventUnion<{ x: number }>>();
    const emit = emitter<{ x: number }>(subject);

    expect(Object.isFrozen(emit)).toBe(true);
  });
});
