import { test, expect, vi } from "vitest";
import { rep, req } from "./req";
import type { MakeReq, RequestMessage, ResponseMessage } from "./types";

type TestMap = MakeReq<
  "type",
  {
    foo: {
      request: { name: string };
      response: { hello: string };
    };
    bar: {
      request: { age: number };
      response: { world: string };
    };
  }
>;

test("req", async ({ onTestFinished }) => {
  const channels = {
    request: new BroadcastChannel(`request:foo`),
    response: new BroadcastChannel(`response:foo`),
  };

  const autoReply = (ev: MessageEvent) => {
    const {
      $$id,
      payload: { type, name },
    } = ev.data as RequestMessage<TestMap["foo"]["request"]>;
    channels.response.postMessage({
      $$id,
      value: {
        type,
        hello: "Hi " + name,
      },
    } satisfies ResponseMessage<TestMap["foo"]["response"]>);
  };

  channels.request.addEventListener("message", autoReply);
  onTestFinished(() => {
    channels.request.removeEventListener("message", autoReply);
  });

  const r = req<TestMap>();
  const h = r.of("foo");

  const response = await h.handle({ type: "foo", name: "Joe" });
  expect(response).toBeTypeOf("object");
  expect(response).toMatchObject({
    type: "foo",
    hello: "Hi Joe",
  });
});

test("rep", async ({ onTestFinished }) => {
  const r = rep<TestMap>();
  onTestFinished(() => {
    r.disconnect();
  });

  r.listen("foo", async (request) => {
    const hello = await Promise.resolve("hi " + request.name);
    return {
      type: "foo",
      hello,
    };
  });

  const channels = {
    request: new BroadcastChannel(`request:foo`),
    response: new BroadcastChannel(`response:foo`),
  };

  const spy = vi.fn();
  const messageHandler = (ev: MessageEvent) => {
    spy(ev.data);
  };

  channels.response.addEventListener("message", messageHandler);
  onTestFinished(() => {
    channels.response.removeEventListener("message", messageHandler);
  });

  channels.request.postMessage({ $$id: "abc123", payload: { type: "foo", name: "Joe" } } satisfies RequestMessage<
    TestMap["foo"]["request"]
  >);

  await vi.waitUntil(() => spy.mock.calls.length > 0);

  expect(spy.mock.calls[0]).toMatchObject([
    {
      $$id: "abc123",
      value: {
        type: "foo",
        hello: "hi Joe",
      },
    } satisfies ResponseMessage<TestMap["foo"]["response"]>,
  ]);
});
