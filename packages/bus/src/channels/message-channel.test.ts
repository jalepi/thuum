import { describe, it, expect, vi } from "vitest";
import { createChannel } from "./message-channel";
import { createTransport } from "../transport";
import type { MessageSchema } from "./types";

type TestMap = {
  foo: { message: { name: string } };
  bar: { message: { age: number } };
};
const schemas: MessageSchema<TestMap> = {
  foo: {
    message: {
      parse(data) {
        return "name" in data ? { value: data } : { error: new Error("name is not in data") };
      },
    },
  },
  bar: {
    message: {
      parse(data) {
        return "age" in data ? { value: data } : { error: new Error("age is not in data") };
      },
    },
  },
};

const transport = createTransport({ type: "window-custom-event", namespace: "test" });

describe("message channel tests", () => {
  it("should create message channel", () => {
    const { receiver, sender } = createChannel({ transport, schemas });
    expect(receiver).toBeDefined();
    expect(sender).toBeDefined();
  });

  it("should sender.send sends and receiver.on receive messages", async ({ onTestFinished }) => {
    const { receiver } = createChannel({ transport, schemas });
    const { sender } = createChannel({ transport, schemas });
    const spy = vi.fn();

    const disposable = receiver.on("foo", {
      ondata({ value }) {
        spy(value);
      },
    });
    onTestFinished(() => {
      disposable.dispose();
    });

    sender.send("foo", { name: "Foo" });

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ name: "Foo" });
    });
  });

  it("should receiver.on receive invalid topic throw error", () => {
    const { receiver } = createChannel({ schemas, transport });
    expect(() => {
      receiver.on("invalid topic" as "foo", { ondata: vi.fn() });
    }).toThrowError(new Error(`Topic "invalid topic" not found in schemas`));
  });

  it("should sender.send invalid message returns error", () => {
    const { sender } = createChannel({ schemas, transport });

    const result = sender.send("foo", { invalid: "foo" } as unknown as { name: string });
    expect(result).toMatchObject({
      error: new Error("Failed to parse message"),
      trace: [new Error("name is not in data")],
    });
  });

  it("should sender.send invalid topic returns error", () => {
    const { sender } = createChannel({ schemas, transport });

    const result = sender.send("invalid topic" as "foo", { name: "not foo" });
    expect(result).toMatchObject({
      error: new Error(`Topic "invalid topic" not found in schemas`),
    });
  });

  it("should receiver.on invalid topic throw error", () => {
    const { receiver } = createChannel({ schemas, transport });

    expect(() => {
      receiver.on("invalid topic" as "foo", { ondata: vi.fn() });
    }).toThrowError(new Error(`Topic "invalid topic" not found in schemas`));
  });

  it("should receiver.on invalid message calls back onerror", async ({ onTestFinished }) => {
    const { receiver } = createChannel({ transport, schemas });

    const handlerSpy = {
      ondata: vi.fn(),
      onerror: vi.fn(),
    };

    const subscription = receiver.on("foo", handlerSpy);
    onTestFinished(() => {
      subscription.dispose();
    });

    transport.sender.send("foo", { invalid: "foo" });

    await vi.waitFor(() => {
      expect(handlerSpy.onerror).toHaveBeenCalledWith({
        error: new Error("Failed to parse message"),
        trace: [new Error("name is not in data")],
      });
    });
  });
});
