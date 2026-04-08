import type { Result } from "./result";

/** Internal wire format for a request message sent over the transport. */
export type RequestModel<T> = {
  readonly $request: string;
  readonly $data: T;
};

/** Internal wire format for a response message sent over the transport. */
export type ResponseModel<T> = {
  readonly $result: Result<T>;
};

/**
 * Type guard that checks whether an unknown message conforms to the {@link RequestModel} shape.
 * @param message - The value to check
 * @returns `true` if the message is a valid request model
 */
export function isRequest(message: unknown): message is RequestModel<unknown> {
  return (
    !!message &&
    typeof message === "object" &&
    "$request" in message &&
    typeof message.$request === "string" &&
    "$data" in message
  );
}

/**
 * Type guard that checks whether an unknown message conforms to the {@link ResponseModel} shape.
 * @param message - The value to check
 * @returns `true` if the message is a valid response model
 */
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
