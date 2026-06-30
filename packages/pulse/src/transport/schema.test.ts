import { describe, it, expect, onTestFinished } from "bun:test";
import type { StandardSchemaV1 } from "../standard-schema-v1";
import { withStandardSchemas } from "./schema";
import * as eventTarget from "./event-target";
import { withScheduler } from "./synchronize";
import { continuation } from "../schedulers";
import { pipe } from "../monads";
import { withHook } from "./hooks";

describe("transport schema", () => {
  const schemas = {
    foo: {
      "~standard": {
        version: 1,
        vendor: "",
        validate(foo) {
          try {
            if (!foo || typeof foo !== "object") {
              return { issues: [{ message: "foo must be an object", path: ["foo"] }] };
            }
            if (!("value" in foo) || typeof foo.value !== "string") {
              return { issues: [{ message: "foo.value must be a string", path: ["foo", "value"] }] };
            }
            return { value: foo as { value: string } };
          } catch (e) {
            return { issues: [{ message: e instanceof Error ? e.message : String(e) }] };
          }
        },
      },
    } as StandardSchemaV1<{ value: string }>,
    bar: {
      "~standard": {
        version: 1,
        vendor: "",
        validate(bar) {
          try {
            if (!bar || typeof bar !== "object") {
              return { issues: [{ message: "bar must be an object", path: ["bar"] }] };
            }
            if (!("age" in bar) || typeof bar.age !== "number") {
              return { issues: [{ message: "bar.age must be a number", path: ["bar", "age"] }] };
            }
            return { value: bar as { age: number } };
          } catch (e) {
            return { issues: [{ message: e instanceof Error ? e.message : String(e) }] };
          }
        },
      },
    } as StandardSchemaV1<{ age: number }>,
  };

  it("should send foo", async () => {
    const transport = eventTarget.fromEventTarget(new EventTarget());
    const scheduler = continuation();
    const schemaTransport = pipe(transport)
      .through(
        withHook((hook, topic, ...args) => {
          console.log(hook, `topic: "${topic}"`, ...args.map((arg) => JSON.stringify(arg, null, 2)));
        }),
      )
      .through(withScheduler(scheduler))
      .through(withStandardSchemas(schemas))
      .end();
    // const { apply } = chain(withScheduler(scheduler)).chain(withStandardSchemas(schemas));
    // const schemaTransport = apply(transport);

    const received = new Promise((resolve, reject) => {
      const subs = schemaTransport.receive("foo", {
        ondata(content) {
          resolve(content);
          return { success: true };
        },
        onerror(error: unknown) {
          reject(new Error(JSON.stringify(error, null, 2)));
          return { success: false, error };
        },
      });
      onTestFinished(() => {
        subs.close();
      });
    });
    const result = await schemaTransport.send("foo", { value: "foo" });
    expect(result).toEqual({ success: true });

    expect(received).resolves.toEqual({ value: "foo" });
  });
});
