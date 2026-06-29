import { describe, it, expect, mock } from "bun:test";
import { emitter } from "./emitter";
import { createFakeMessageTarget, flush } from "./utils";

describe("emitter (message-port)", () => {
  it("should post a { name, value } message to the target asynchronously", async () => {
    type Events = { "user:login": { id: string; role: string } };

    const target = createFakeMessageTarget();
    const emit = emitter<Events>(target);

    const handler = mock();
    target.addEventListener("message", handler);

    emit.emit("user:login", { id: "abc", role: "admin" });

    // Not yet delivered — queued as microtask
    expect(handler).not.toHaveBeenCalled();

    await flush();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "message",
        data: {
          name: "user:login",
          value: {
            id: "abc",
            role: "admin",
          },
        },
      }),
    );
  });

  it("should return a frozen object", () => {
    const target = createFakeMessageTarget();
    const emit = emitter<{ x: number }>(target);

    expect(Object.isFrozen(emit)).toBe(true);
  });
});
