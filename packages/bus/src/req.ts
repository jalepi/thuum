export type Kv<K extends string, V> = Record<K, V>;

export type StringDict<T> = {
  [key: string]: T;
  [key: number]: never;
  [key: symbol]: never;
};

type Typed<T> = {
  [K in keyof T]: { type: K } & T[K];
};

type M = Typed<{
  foo: { name: string };
  bar: { age: number };
}>;

type N = Typed<{
  foo: { hello: string };
  bar: { age: number };
}>;

type Constr<T> = {
  [K in keyof T]: { type: K };
};

export type Req<R extends Constr<R>, S extends Record<keyof R, unknown>> = {
  get<K extends keyof R>(r: { type: K } & R[K]): S[K];
};

declare const g: <R extends Constr<R>, S extends Record<keyof R, unknown>>() => Req<R, S>;

const r1 = g<M, N>().get({ type: "foo", name: "foo" });
console.log(r1.hello);

declare function get<K extends keyof M>(m: { type: K } & M[K]): N[K];

const r = get({ type: "foo", name: "foo" });

console.log(r.hello);

type RequestHandlerConstraint<P extends string, T> = {
  [K in keyof T]: { request: Kv<P, K>; response: Kv<P, K> };
};

export type HandleRequest<In, Out> = (value: In) => Promise<Out>;

export type RequestHandler<Map extends RequestHandlerConstraint<"type", Map>> = {
  // handle<K extends keyof Map>(req: { type: K } & Map[K]["request"]): Map[K]["response"];
  handle<K extends keyof Map>(req: { type: K } & Map[K]["request"]): Promise<Map[K]["response"]>;
};

type RequestMap = {
  foo: {
    request: {
      type: "foo";
      name: string;
    };
    response: {
      type: "foo";
      hello: string;
    };
  };
  bar: {
    request: {
      type: "bar";
      age: number;
    };
    response: {
      type: "bar";
      timestamp: number;
    };
  };
};

declare const handler: RequestHandler<RequestMap>;

void (async () => {
  const fooResp = await handler.handle({ type: "foo", name: "bar" });
  console.log(fooResp.hello);

  const barResp = await handler.handle({ type: "bar", age: 42 });
  console.log(barResp.timestamp);
})();
