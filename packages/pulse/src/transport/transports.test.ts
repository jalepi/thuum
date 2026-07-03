import { describe, it, expect, onTestFinished } from "bun:test";
import * as fixtures from "./__fixtures__";

describe.each(fixtures.transports)("$name", ({ create }) => {
  it("should dispatch events", async () => {
    const t = create();
    const { promise, resolve, reject } = Promise.withResolvers();
    const subs = await t.receive("test", {
      ondata(content) {
        resolve(content);
        return { success: true };
      },
      onerror(error) {
        reject(error);
        return { success: false, error };
      },
    });
    onTestFinished(() => subs.close());

    await t.send("test", { data: "hello" });

    expect(promise).resolves.toEqual({ data: "hello" });
  });
});
