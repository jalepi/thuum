import { describe, it, expect } from "vitest";
import { isRequest, isResponse } from "./request-models";

describe("request models tests", () => {
  it.for([
    { expected: true, request: { $request: "abc", $data: {} } },
    { expected: true, request: { $request: "abc", $data: "" } },
    { expected: true, request: { $request: "abc", $data: 1 } },
    { expected: true, request: { $request: "abc", $data: false } },
    { expected: true, request: { $request: "abc", $data: undefined } },
    { expected: true, request: { $request: "abc", $data: null } },
    { expected: false, request: undefined },
    { expected: false, request: null },
    { expected: false, request: "" },
    { expected: false, request: {} },
    { expected: false, request: { $request: "abc" } },
  ])("should be request? ($expected)", ({ expected, request }) => {
    expect(isRequest(request), `should ${JSON.stringify(request)} be a request? (${expected.toString()})`).toBe(
      expected,
    );
  });

  it.for([
    { expected: true, response: { $result: { value: 1 } } },
    { expected: true, response: { $result: { error: 1 } } },
    { expected: false, response: undefined },
    { expected: false, response: null },
    { expected: false, response: {} },
    { expected: false, response: { $result: {} } },
  ])("should be response? ($expected)", ({ expected, response }) => {
    expect(isResponse(response), `should ${JSON.stringify(response)} be a response? (${expected.toString()})`).toBe(
      expected,
    );
  });
});
