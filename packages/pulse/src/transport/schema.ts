import type { StructLike } from "../base";
import type { Transport, SchemaLike } from "./types";

export const withStandardSchemas =
  <T extends StructLike>(schemas: SchemaLike<T>) =>
  (transport: Transport<T>): Transport<T> => {
    return {
      async send(topic, content) {
        const { issues } = await schemas[topic]["~standard"].validate(content);
        if (!issues) {
          return await transport.send(topic, content);
        }
        return { success: false, error: { issues } };
      },
      receive(topic, { ondata, onerror }) {
        return transport.receive(topic, {
          async ondata(content) {
            const { issues } = await schemas[topic]["~standard"].validate(content);
            if (!issues) {
              return await ondata(content);
            }
            if (typeof onerror === "function") {
              return await onerror({ issues });
            }
            return {
              success: false,
              error: { issues },
            };
          },
          onerror,
        });
      },
    };
  };
