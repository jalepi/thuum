import { describe, it, expect } from "vitest";
import * as index from ".";

describe("package exports tests", () => {
  it("should export 'build', 'pipe'", async () => {
    const { default: build } = await import("./build");
    const { default: pipe } = await import("./pipe");

    expect(index).toMatchObject({
      build,
      pipe,
    } satisfies typeof index);
  });
});
