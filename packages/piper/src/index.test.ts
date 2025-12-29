import { describe, it, expect } from "vitest";
import * as index from ".";

describe("package exports tests", () => {
  it("should export 'build', 'pipe'", async () => {
    const { default: build } = await import("./build");
    const { default: pipe } = await import("./pipe");
    const { default: asyncBuild } = await import("./async-build");
    const { default: asyncPipe } = await import("./async-pipe");

    expect(index).toMatchObject({
      build,
      pipe,
      asyncBuild,
      asyncPipe,
    } satisfies typeof index);
  });
});
