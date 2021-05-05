type HttpMethod = "get" | "post";

interface CallRecord {
  getBody: (arg: any) => any;
  getHeader: ((arg: any) => any)[];
  getPath: (arg: any) => any;
  getQuery: ((arg: any) => any)[];
  map: ((arg: any) => any)[];
  mapError: ((arg: any) => any)[];
  method: HttpMethod | undefined;
  parse: (arg: any) => any;
}

class CallBuilder<Ret = never, Arg = never> {
  private record: CallRecord = {
    getBody: (e) => e,
    getHeader: [],
    getPath: (e) => e,
    getQuery: [],
    map: [],
    mapError: [],
    method: undefined,
    parse: (e) => e,
  };

  withMethod(method: HttpMethod): CallBuilder<Ret, Arg> {
    this.record.method = method;
    return this;
  }

  // withArg<T>(): CallBuilder<Ret, T> {
  //   return this as any;
  // }

  // withPath(cb: (args: Arg) => string): CallBuilder<Ret, Arg>;
  // withPath(path: string): CallBuilder<Ret, Arg>;
  // withPath(a: any) {
  //   return this;
  // }

  // withHeaders(headers: Record<string, string>): CallBuilder<Ret, Arg>;
  // withHeaders(
  //   fun: (args: Arg) => Record<string, string>
  // ): CallBuilder<Ret, Arg>;
  // withHeaders(a: any): CallBuilder<Ret, Arg> {
  //   return this;
  // }

  // withQuery(headers: Record<string, string>): CallBuilder<Ret, Arg>;
  // withQuery(fun: (args: Arg) => Record<string, string>): CallBuilder<Ret, Arg>;
  // withQuery(a: any): CallBuilder<Ret, Arg> {
  //   return this;
  // }

  // formData / json
  // withBody(headers: Record<string, string>): CallBuilder<Ret, Arg>;
  // withBody(
  //   fun: (args: Arg) => Record<string, string>
  // ): CallBuilder<Ret, Arg>;
  // withBody(a: any): CallBuilder<Ret, Arg> {
  //   return this;
  // }

  // withParser<T>(parser: (raw: string) => T): CallBuilder<T, Arg> {
  //   return this as any;
  // }

  map<T>(parser: (raw: Ret) => T): CallBuilder<T, Arg> {
    return this as any;
  }

  build(): (arg: Arg) => Promise<Ret> {
    return {} as any;
  }
}

export function buildCall(): CallBuilder {
  return new CallBuilder();
}

// const lal = new CallBuilder()
//   .withMethod("post")
//   .withArg<{ foo: string }>()
//   .withPath((e) => e.foo)
//   .withParser((e) => {
//     return { morradi: "mann" };
//   })
//   .map((e) => {
//     return {
//       fooooo: e.morradi,
//     };
//   })
//   .map((e) => {
//     return {
//       baaaaar: e.fooooo,
//     };
//   })
//   .build();
