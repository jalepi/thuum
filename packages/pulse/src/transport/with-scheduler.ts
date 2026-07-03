import type { StructLike } from "../base";
import type { Scheduler } from "../schedulers";
import type { Transport } from "./types";

export const withScheduler =
  <T extends StructLike>(schedulers: { input: Scheduler; output: Scheduler }) =>
  (transport: Transport<T>): Transport<T> => {
    return {
      async send(topic, content) {
        return await schedulers.output.next(() => transport.send(topic, content));
      },
      receive(topic, { ondata, onerror }) {
        return transport.receive(topic, {
          ondata: (content) => schedulers.input.next(() => ondata(content)),
          onerror: onerror ? (error) => schedulers.input.next(() => onerror(error)) : undefined,
        });
      },
    };
  };
