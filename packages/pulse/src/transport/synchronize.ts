import type { StructLike } from "../base";
import type { Scheduler } from "../schedulers";
import type { Transport } from "./types";

export const withScheduler =
  <T extends StructLike>(scheduler: Scheduler) =>
  (transport: Transport<T>): Transport<T> => {
    return {
      async send(topic, content) {
        return await scheduler.next(() => transport.send(topic, content));
      },
      receive(topic, { ondata, onerror }) {
        return transport.receive(topic, {
          ondata: (content) => scheduler.next(() => ondata(content)),
          onerror: onerror ? (error) => scheduler.next(() => onerror(error)) : undefined,
        });
      },
    };
  };
