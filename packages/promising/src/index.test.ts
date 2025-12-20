import { describe, it, expect } from "vitest";
import * as index from ".";

describe("example package exports tests", () => {
  it("should export queue", async () => {
    const { default: asyncContext } = await import("./async-context");
    const { default: withResolvers } = await import("./with-resolvers");
    expect(index).toBeDefined();
    expect(index).toMatchObject({
      createContext: asyncContext,
      withResolvers: withResolvers,
    } as const satisfies typeof index);
  });
});
