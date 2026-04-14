import { describe, expect, vi, it, onTestFinished } from "bun:test";
import { waitFor } from "../../../test-helpers";
import { createTransport, type TransportType } from "./transport-factory";

const types = ["window-custom-event"] as const satisfies TransportType[];
const namespace = "test";

describe("transport factory tests", () => {
  it.each(["abc", "broadcast-message-event", "window-message-event"])(
    "[%s] should create with invalid transport type throw error",
    (type) => {
      expect(() => {
        createTransport({ type: type as unknown as "window-custom-event", namespace: "test" });
      }).toThrow();
    },
  );

  it.each(types)("[%s] should create transport", (type) => {
    const { receiver, sender } = createTransport({ type, namespace });

    expect(receiver).toBeDefined();
    expect(sender).toBeDefined();
    expect(receiver).toHaveProperty("on");
    expect(sender).toHaveProperty("send");
  });

  it.each(types)("[%s] should send and receive message", async (type) => {
    const actorA = createTransport({ type, namespace });
    const actorB = createTransport({ type, namespace });
    expect(actorA).not.toBe(actorB);

    const spy = vi.fn();
    onTestFinished(actorB.receiver.on("foo", spy));

    actorA.sender.send("foo", { name: "Foo" });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ name: "Foo" });
    });
  });

  it.each(types)("[%s] should ping pong", async (type) => {
    const actorA = createTransport({ type, namespace });
    const actorB = createTransport({ type, namespace });
    expect(actorA).not.toBe(actorB);

    const spy = vi.fn();
    onTestFinished(
      actorB.receiver.on("ping", (incoming) => {
        actorB.sender.send("pong", 1 + (incoming as number));
      }),
    );
    onTestFinished(actorB.receiver.on("pong", spy));

    actorA.sender.send("ping", 1);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(2);
    });
  });
});
