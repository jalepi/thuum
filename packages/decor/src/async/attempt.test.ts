import { describe, it, expect, assert } from "vitest";
import { attempt } from "./attempt";

describe("attempt async decorator tests", () => {
  it("should attempt to succeed a function call", async () => {
    const fn = () => Promise.resolve("ok");
    const decor = attempt(fn);

    const result = await decor();
    assert("value" in result);
    assert(!("error" in result));
    expect(result.value).toBe("ok");
  });

  it("should attempt to fail a function call", async () => {
    const err = new Error("test");
    const fn = () => Promise.reject(err);
    const decor = attempt(fn);

    const result = await decor();
    assert(!("value" in result));
    assert("error" in result);
    expect(result.error).toBe(err);
  });
});
