import { describe, it, expect, mock } from "bun:test";
import { emitter } from "./emitter";

describe("emitter (event-target)", () => {
  it("should dispatch a CustomEvent with the payload as detail", () => {
    type Events = { login: { userId: string }; logout: undefined };

    const target = new EventTarget();
    const emit = emitter<Events>(target);

    const handler = mock();
    target.addEventListener("login", handler);

    emit.emit("login", { userId: "abc-123" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<{ userId: string }>;
    expect(event.detail).toEqual({ userId: "abc-123" });
  });

  it("should support undefined payloads", () => {
    type Events = { logout: undefined };

    const target = new EventTarget();
    const emit = emitter<Events>(target);

    const handler = mock();
    target.addEventListener("logout", handler);

    emit.emit("logout", undefined);

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<undefined>;
    expect(event.detail).toBeNull();
  });

  it("should return a frozen object", () => {
    const target = new EventTarget();
    const emit = emitter<{ x: number }>(target);

    expect(Object.isFrozen(emit)).toBe(true);
  });
});
