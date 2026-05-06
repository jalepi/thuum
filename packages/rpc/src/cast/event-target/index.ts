import type { CastMap, CastSchema, CastReceiver, CastSender } from "../../types";

export const sender = <Map extends CastMap>(schema: CastSchema<Map>, target: EventTarget): CastSender<Map> => {
  return {
    async send(topic, message) {
      const result = await schema[topic].message["~standard"].validate(message);

      if (result.issues) {
        return { success: false, error: result.issues };
      }

      await new Promise(() => {
        const event = new CustomEvent(topic, { detail: message });
        target.dispatchEvent(event);
      });

      return { success: true };
    },
  };
};

export const receiver = <Map extends CastMap>(schema: CastSchema<Map>, target: EventTarget): CastReceiver<Map> => {
  return {
    on(handlers) {
      const subscribers: { unsubscribe(): void }[] = [];

      for (const [topic, handler] of Object.entries(handlers)) {
        const validator = schema[topic].message["~standard"];

        const listener = (event?: Event) => {
          const message = ((event ?? {}) as CustomEvent<Map[typeof topic]>).detail;

          void (async () => {
            const validation = await validator.validate(message);

            if (validation.issues) {
              await handler?.onerror?.({ error: validation.issues });
              return;
            }

            await handler?.ondata({ data: validation.value });
          })();
        };

        target.addEventListener(topic, listener);
        subscribers.unshift({
          unsubscribe() {
            target.removeEventListener(topic, listener);
          },
        });
      }

      return {
        unsubscribe() {
          for (const subscriber of subscribers) {
            subscriber.unsubscribe();
          }
          subscribers.length = 0;
        },
      };
    },
  };
};
