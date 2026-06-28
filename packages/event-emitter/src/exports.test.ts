import { describe, it, expect } from "bun:test";

describe("module exports match shape", () => {
  it("should module export", async () => {
    const m = await import("@thuum/event-emitter");
    expect(m).toMatchObject({
      connect: expect.any(Function),
      eventTarget: expect.objectContaining({
        emitter: expect.any(Function),
        listener: expect.any(Function),
      }),
      messagePort: expect.objectContaining({
        emitter: expect.any(Function),
        listener: expect.any(Function),
      }),
      nodeEvents: expect.objectContaining({
        emitter: expect.any(Function),
        listener: expect.any(Function),
      }),
      rxjs: expect.objectContaining({
        emitter: expect.any(Function),
        listener: expect.any(Function),
      }),
    });
  });

  it.each(["event-target", "message-port", "node-events", "rxjs"] as const)(
    "module %s exports emitter and listener",
    async (f) => {
      const m = await import(`@thuum/event-emitter/${f}`);
      expect(m).toMatchObject({
        emitter: expect.any(Function),
        listener: expect.any(Function),
      });
    },
  );
});

describe("module exports match module", () => {
  it("should module export", async () => {
    const pkg = await import("@thuum/event-emitter");
    const mod = await import(".");
    expect(pkg).toMatchObject(mod);
  });

  it.each(["event-target", "message-port", "node-events", "rxjs"] as const)(
    "module %s exports emitter and listener",
    async (f) => {
      const index = await import(`@thuum/event-emitter/${f}`);
      const { emitter } = await import(`./${f}/emitter`);
      const { listener } = await import(`./${f}/listener`);
      expect(index).toMatchObject({ emitter, listener });
    },
  );
});
