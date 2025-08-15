import { describe, it, expect } from "vitest";
import * as Index from ".";

describe("package exports tests", () => {
  it("should export 'createTransport'", () => {
    expect(Index).toMatchObject({
      createTransport: expect.any(Function) as unknown,
    });
  });
});
