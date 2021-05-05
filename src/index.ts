import { URL } from 'url';
import fetch from 'node-fetch';

type HttpMethod = 'get' | 'post';

interface CallRecord {
  getBody: (arg: any) => any;
  getHeader: ((arg: any) => any)[];
  getPath?: (arg: any) => string;
  getQuery: ((arg: any) => any)[];
  map: ((arg: any) => any)[];
  mapError: ((arg: any) => any)[];
  method?: HttpMethod;
  parse: (arg: any) => any;
}

class CallBuilder<Ret = any, Arg = any> {
  private record: CallRecord = {
    getBody: (e) => e,
    getHeader: [],
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

  withPath(path: string): this;
  withPath(getPath: (args: Arg) => string): this;
  withPath(pathOrFun: any) {
    const fun = typeof pathOrFun === 'string' ? () => pathOrFun : pathOrFun;
    this.record.getPath = fun;
    return this;
  }

  withArg<T>(): CallBuilder<Ret, T> {
    return this as any;
  }

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

  // map<T>(parser: (raw: Ret) => T): CallBuilder<T, Arg> {
  //   return this as any;
  // }

  build(): (baseUrl: string | URL, arg: Arg) => Promise<Ret> {
    const { getPath } = this.record;
    if (getPath == null) {
      throw new Error('no path function');
    }

    const fun = async (baseUrl: string, args: any) => {
      const path = getPath(args);

      const url = new URL(path, baseUrl);
      const res = await fetch(url, { method: this.record.method });
      const text = await res.text();

      return text;
    };

    return fun as any;
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
