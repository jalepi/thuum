import { describe, it, expect } from "vitest";
import { traceError } from "./result";

describe("result tests", () => {
  it("should trace errors", () => {
    expect(traceError({ error: "foo" })).toMatchObject(["foo"]);
    expect(traceError({ error: "foo", trace: ["bar"] })).toMatchObject(["foo", "bar"]);
    expect(traceError({ error: "foo", trace: ["bar", "baz"] })).toMatchObject(["foo", "bar", "baz"]);
  });
});
