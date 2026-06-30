import { describe, it, expect, onTestFinished } from "bun:test";
import { fromEventTarget } from "./event-target";

describe("event-target", () => {
  it("should dispatch events", async () => {
    const et = new EventTarget();

    const t = fromEventTarget(et);
    const received = new Promise((resolve) => {
      const subs = t.receive("test", {
        ondata(content) {
          resolve(content);
          return { success: true };
        },
      });
      onTestFinished(() => {
        subs.close();
      });
    });

    await t.send("test", { data: "hello" });

    expect(received).resolves.toEqual({ data: "hello" });
  });
});
