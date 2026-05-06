import { describe, it, expect, vi, onTestFinished } from "bun:test";
import type { CastSchema } from "../../types";
import { sender } from "./sender";
import { receiver } from "./receiver";

type CastFooBarMap = {
  foo: { message: { foo: string } };
  bar: { message: { bar: number } };
};

const schema: CastSchema<CastFooBarMap> = {
  foo: {
    message: {
      "~standard": {
        validate(value) {
          if (!value || typeof value !== "object") {
            return { issues: [{ message: "foo must be an object.", path: [] }] };
          }
          if (!("foo" in value) || typeof value.foo !== "string") {
            return { issues: [{ message: "foo.foo must be a string.", path: ["foo"] }] };
          }
          const { foo } = value;
          return { value: { foo } };
        },
        vendor: "",
        version: 1,
      },
    },
  },
  bar: {
    message: {
      "~standard": {
        validate(value) {
          if (!value || typeof value !== "object") {
            return { issues: [{ message: "bar must be an object.", path: [] }] };
          }
          if (!("bar" in value) || typeof value.bar !== "number") {
            return { issues: [{ message: "bar.bar must be a string.", path: ["foo"] }] };
          }
          const { bar } = value;
          return { value: { bar } };
        },
        vendor: "",
        version: 1,
      },
    },
  },
};

describe("cast/event-target tests", () => {
  it("should send message", async () => {
    const et = new EventTarget();
    const spy = vi.fn();
    onTestFinished(() => {
      et.removeEventListener("foo", spy);
    });

    const sut = sender(schema, et);
    const res = await sut.send("foo", { foo: "this is foo" });

    expect(res.success);
  });

  it("should receive message", async () => {
    const { promise, resolve } = Promise.withResolvers<{ foo: string }>();
    const et = new EventTarget();
    const sut = receiver(schema, et);
    const subscription = sut.on({
      foo: {
        ondata({ data }) {
          resolve(data);
        },
      },
    });

    onTestFinished(() => {
      subscription.unsubscribe();
    });

    queueMicrotask(() => {
      const event = new CustomEvent("foo", { detail: { foo: "testing foo" } });
      et.dispatchEvent(event);
    });

    expect(await promise).toMatchObject({ foo: "testing foo" });
  });
});
