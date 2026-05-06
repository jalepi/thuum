import type { CastMap, CastSchema, CastSender } from "../../types";

export const sender = <Map extends CastMap>(schema: CastSchema<Map>, target: EventTarget): CastSender<Map> => {
  return {
    async send(topic, message) {
      const result = await schema[topic].message["~standard"].validate(message);

      if (result.issues) {
        return { success: false, error: result.issues };
      }

      await new Promise<void>((resolve) => {
        try {
          const event = new CustomEvent(topic, { detail: message });
          target.dispatchEvent(event);
        } finally {
          resolve();
        }
      });

      return { success: true };
    },
  };
};
