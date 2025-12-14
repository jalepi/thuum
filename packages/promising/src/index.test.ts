import { describe, it, expect } from "vitest";
import * as index from ".";

describe("example package exports tests", () => {
  it("should export queue", () => {
    expect(index).toBeDefined();
    expect(index).toMatchObject({
      createContext: index.createContext,
      withResolvers: index.withResolvers,
    } as const satisfies typeof index);
  });
});
