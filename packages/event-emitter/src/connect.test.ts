import { describe, it, expect } from "bun:test";
import { connect } from "./connect";
import type { Emitter, EventMap, Listener } from "./types";

/** Minimal in-memory emitter/listener pair for testing */
function createPair<Map extends EventMap>() {
  const handlers: Record<string, ((value: unknown) => void)[]> = {};

  const emitter: Emitter<Map> = {
    emit(name, value) {
      (handlers[name] ?? []).forEach((fn) => {
        fn(value);
      });
    },
  };

  const listener: Listener<Map> = {
    on(name, handler) {
      handlers[name] ??= [];
      handlers[name].push(handler as (value: unknown) => void);
      return {
        stop() {
          handlers[name] = handlers[name].filter((fn) => fn !== handler);
        },
      };
    },
  };

  return { emitter, listener };
}

describe("connect", () => {
  type Events = { message: string; error: { code: number } };

  it("should forward events from source listener to sink emitter", () => {
    const source = createPair<Events>();
    const sink = createPair<Events>();

    connect(source.listener, sink.emitter, "message");

    const received: string[] = [];
    sink.listener.on("message", (value) => received.push(value));

    source.emitter.emit("message", "hello");
    source.emitter.emit("message", "world");

    expect(received).toEqual(["hello", "world"]);
  });

  it("should forward multiple event names", () => {
    const source = createPair<Events>();
    const sink = createPair<Events>();

    connect(source.listener, sink.emitter, "message", "error");

    const messages: string[] = [];
    const errors: { code: number }[] = [];
    sink.listener.on("message", (value) => messages.push(value));
    sink.listener.on("error", (value) => errors.push(value));

    source.emitter.emit("message", "hi");
    source.emitter.emit("error", { code: 42 });

    expect(messages).toEqual(["hi"]);
    expect(errors).toEqual([{ code: 42 }]);
  });

  it("should stop forwarding when stop() is called", () => {
    const source = createPair<Events>();
    const sink = createPair<Events>();

    const connection = connect(source.listener, sink.emitter, "message");

    const received: string[] = [];
    sink.listener.on("message", (value) => received.push(value));

    source.emitter.emit("message", "before");
    connection.stop();
    source.emitter.emit("message", "after");

    expect(received).toEqual(["before"]);
  });

  it("should not forward events for names not specified", () => {
    const source = createPair<Events>();
    const sink = createPair<Events>();

    connect(source.listener, sink.emitter, "message");

    const errors: { code: number }[] = [];
    sink.listener.on("error", (value) => errors.push(value));

    source.emitter.emit("error", { code: 500 });

    expect(errors).toEqual([]);
  });

  it("should return a frozen handle", () => {
    const source = createPair<Events>();
    const sink = createPair<Events>();

    const connection = connect(source.listener, sink.emitter, "message");

    expect(Object.isFrozen(connection)).toBe(true);
  });
});
