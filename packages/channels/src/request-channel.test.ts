import { describe, it, expect, vi } from "vitest";
import { createTransport } from "@thuum/transport";
import type { FromRequestChannel, RequestSchema } from "./types";
import { createChannel } from "./request-channel";
import * as utils from "./utils";

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

  it("should sender.send return valid result", async ({ onTestFinished }) => {
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

  it("should sender.send sends invalid topic return error", async () => {
    const { sender } = createChannel({ schemas, transport });

    const result = await sender.send("invalid topic" as "foo", { name: "Foo" });

    expect({ error: new Error(`Topic "invalid topic" not found in schemas`) }).toMatchObject(result);
  });

  it("should sender receive invalid response return error", async ({ onTestFinished }) => {
    const id = utils.uniqueId();
    vi.spyOn(utils, "uniqueId").mockImplementationOnce(() => id);

    const { sender } = createChannel({ schemas, transport });

    const unsubscribe = transport.receiver.on("foo", () => {
      transport.sender.send(`foo:${id}`, { invalid: true });
    });
    onTestFinished(unsubscribe);

    const result = await sender.send("foo", { name: "Foo" });

    expect({ error: new Error(`Topic "foo:${id}" received invalid response`) }).toMatchObject(result);
  });

  it("should receive invalid response result value return error", async ({ onTestFinished }) => {
    const id = utils.uniqueId();
    vi.spyOn(utils, "uniqueId").mockImplementationOnce(() => id);

    const { sender } = createChannel({ schemas, transport });

    const unsubscribe = transport.receiver.on("foo", () => {
      transport.sender.send(`foo:${id}`, { $result: { value: { invalid: true } } });
    });
    onTestFinished(unsubscribe);

    const result = await sender.send("foo", { name: "Foo" });

    expect({
      error: new Error(`Topic "foo:${id}" failed to parse response result`),
      trace: [new Error("id is not in data")],
    }).toMatchObject(result);
  });

  it("should receiver.on invalid topic throw error", () => {
    const { receiver } = createChannel({ schemas, transport });

    expect(() => {
      receiver.on("invalid topic" as "foo", { ondata: vi.fn() });
    }).toThrowError(new Error(`Topic "invalid topic" not found in schemas`));
  });
});
