import { describe, test, expect, vi } from "vitest";

describe("broadcast channel tests", () => {
  test("broadcast send and receive", async ({ onTestFinished }) => {
    const sender = new BroadcastChannel("hello");
    const receiver = new BroadcastChannel("hello");

    const spy = vi.fn();
    const handler = (ev: MessageEvent) => {
      spy(ev.data);
    };
    receiver.addEventListener("message", handler);
    onTestFinished(() => {
      receiver.removeEventListener("message", handler);
    });

    sender.postMessage("hello world");

    await vi.waitUntil(() => spy.mock.calls.length > 0);

    expect(spy.mock.calls[0]).toMatchObject(["hello world"]);
  });
});
