import { describe, it, expect, vi } from "vitest";
import type { FromRequestChannel, RequestSchema } from "./types";
import { createTransport } from "../transport";
import { createChannel } from "./request-channel";

type TestRequestMap = {
  foo: { request: { name: string }; response: { id: number } };
  bar: { request: { age: number }; response: { id: string } };
};

const schemas: RequestSchema<TestRequestMap> = {
  foo: {
    request: {
      parse(data) {
        return "name" in data ? { value: data } : { error: new Error("name is not in data") };
      },
    },
    response: {
      parse(data) {
        return "id" in data ? { value: data } : { error: new Error("id is not in data") };
      },
    },
  },
  bar: {
    request: {
      parse(data) {
        return "age" in data ? { value: data } : { error: new Error("age is not in data") };
      },
    },
    response: {
      parse(data) {
        return "id" in data ? { value: data } : { error: new Error("id is not in data") };
      },
    },
  },
};

const transport = createTransport({ type: "window-custom-event", namespace: "test" });

describe("request channel tests", () => {
  it("should create channel", () => {
    const { receiver, sender } = createChannel({ schemas, transport });
    expect(receiver).toBeDefined();
    expect(sender).toBeDefined();
  });

  it("should request and respond", async ({ onTestFinished }) => {
    const channel1 = createChannel({ schemas, transport });
    const channel2 = createChannel({ schemas, transport });

    const spy = vi.fn();

    const handler: FromRequestChannel<typeof channel1>["foo"]["handler"] = {
      ondata(data) {
        spy(data);
        return Promise.resolve({ id: 42 });
      },
    };

    const disposable = channel1.receiver.on("foo", handler);

    onTestFinished(() => {
      disposable.dispose();
    });
    const response = await channel2.sender.send("foo", { name: "Foo" });

    expect(response).toMatchObject({
      value: { id: 42 },
    });
    expect(spy).toHaveBeenCalledWith({ value: { name: "Foo" } });
  });
});
