import { describe, expect, it } from "bun:test";
import * as index from ".";

describe("event-target module exports", () => {
  it("should export emitter and listener", async () => {
    expect(index).toBeDefined();
    const { emitter } = await import("./emitter");
    const { listener } = await import("./listener");
    expect(index).toMatchObject({
      emitter,
      listener,
    } as const satisfies typeof index);
  });
});
