import { describe, it, expect, onTestFinished } from "bun:test";
import { withSchemas } from "./with-schemas";
import { fromEventTarget } from "./event-target";
import { withScheduler } from "./with-scheduler";
import { continuation } from "../schedulers";
import { pipe } from "../monads";
import { withHooks } from "./with-hooks";
import { inMemoryTransport } from "./in-memory";
import * as fixtures from "./__fixtures__";
import { composeReceiver } from "./__fixtures__";

describe.each([
  {
    name: "event-target",
    create(this: void) {
      return fromEventTarget(new EventTarget());
    },
  },
  {
    name: "in-memory",
    create(this: void) {
      return inMemoryTransport();
    },
  },
])("transport $name with schema", ({ create }) => {
  it("should send foo", async () => {
    const transport = create();
    const schemaTransport = pipe(transport)
      .through(
        withHooks((hook, { topic, ...rest }) => {
          console.log(hook, `topic: "${topic}"`, JSON.stringify(rest, null, 2));
        }),
      )
      .through(withScheduler({ input: continuation(), output: continuation() }))
      .through(withSchemas(fixtures.schemas))
      .end();
    // const { apply } = chain(withScheduler(scheduler)).chain(withStandardSchemas(schemas));
    // const schemaTransport = apply(transport);
    const { promise, resolve, reject } = Promise.withResolvers();

    const subs = await schemaTransport.receive("foo", {
      ondata(content) {
        resolve(content);
        return { success: true };
      },
      onerror(error: unknown) {
        reject(new Error(JSON.stringify(error, null, 2)));
        return { success: false, error };
      },
    });
    onTestFinished(() => subs.close());
    const result = await schemaTransport.send("foo", { value: "foo" });
    expect(result).toEqual({ success: true });

    expect(promise).resolves.toEqual({ value: "foo" });
  });

  it("should send foo", async () => {
    const transport = create();
    const schemaTransport = pipe(transport)
      .through(
        withHooks((hook, { topic, ...rest }) => {
          console.log(hook, `topic: "${topic}"`, JSON.stringify(rest, null, 2));
        }),
      )
      .through(withScheduler({ input: continuation(), output: continuation() }))
      .through(withSchemas(fixtures.schemas))
      .end();

    const foo = await composeReceiver(schemaTransport, "foo");
    onTestFinished(() => foo.connection.close());
    const bar = await composeReceiver(schemaTransport, "bar");
    onTestFinished(() => bar.connection.close());

    const fooResult = await schemaTransport.send("foo", { value: "foo" });
    expect(fooResult).toEqual({ success: true });

    const barResult = await schemaTransport.send("bar", { age: 42 });
    expect(barResult).toEqual({ success: true });

    expect(foo.consumer.next()).resolves.toEqual({
      done: false,
      value: { success: true, topic: "foo", content: { value: "foo" } },
    });

    expect(bar.consumer.next()).resolves.toEqual({
      done: false,
      value: { success: true, topic: "bar", content: { age: 42 } },
    });
  });
});
