import { describe, it, expect } from "vitest";
import * as Index from ".";

describe("channels tests", () => {
  it("should export", () => {
    expect(Index).toBeDefined();
    expect({
      createMessageChannel: expect.any(Function) as unknown,
      createRequestChannel: expect.any(Function) as unknown,
    }).toMatchObject(Index);
  });
});
