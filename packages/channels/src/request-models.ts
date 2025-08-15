import type { Result } from "./result";

export type RequestModel<T> = {
  readonly $request: string;
  readonly $data: T;
};

export type ResponseModel<T> = {
  readonly $result: Result<T>;
};

export function isRequest(message: unknown): message is RequestModel<unknown> {
  return (
    !!message &&
    typeof message === "object" &&
    "$request" in message &&
    typeof message.$request === "string" &&
    "$data" in message
  );
}

export function isResponse(message: unknown): message is ResponseModel<unknown> {
  return (
    !!message &&
    typeof message === "object" &&
    "$result" in message &&
    !!message.$result &&
    typeof message.$result === "object" &&
    ("value" in message.$result || "error" in message.$result)
  );
}
