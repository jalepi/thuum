import { describe, it, expect } from "vitest";

describe("package exports tests", () => {
  it("should export 'build', 'pipe'", async () => {
    const index = await import(".");

    expect(Object.keys(index)).toStrictEqual(["build", "pipe"]);

    const { build, pipe } = index;

    expect(build).toBeTypeOf("function");
    expect(pipe).toBeTypeOf("function");
  });
});
