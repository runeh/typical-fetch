import { URL, URLSearchParams } from 'url';
import fetch, { Headers, HeadersInit } from 'node-fetch';

type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put';

type QueryParam = Record<string, string> | URLSearchParams;

interface CallRecord {
  getBody: (arg: any) => any;
  getHeaders: ((arg: any) => HeadersInit)[];
  getPath?: (arg: any) => string;
  getQuery: ((arg: any) => QueryParam)[];
  map: ((arg: any) => any)[];
  mapError: ((arg: any) => any)[];
  method?: HttpMethod;
  parse: (arg: any) => any;
}

function mergeHeaders(defs: HeadersInit[]): Headers {
  const headersList = defs.flatMap((e) => {
    if (Array.isArray(e)) {
      return e;
    } else if (e instanceof Headers) {
      return Array.from(e.entries());
    } else {
      return Object.entries(e);
    }
  });
  return new Headers(headersList);
}

// The `[]` is due to this:
// https://github.com/microsoft/TypeScript/issues/23182#issuecomment-379091887

type BuiltCall<Ret, Arg> = [Arg] extends [never]
  ? (baseUrl: string) => Promise<Ret>
  : (baseUrl: string, args: Arg) => Promise<Ret>;

class CallBuilder<Ret = void, Arg = never> {
  private record: CallRecord;

  constructor(record?: CallRecord) {
    this.record = record ?? {
      getBody: (e) => e,
      getHeaders: [],
      getQuery: [],
      map: [],
      mapError: [],
      method: undefined,
      parse: (e) => e,
    };
  }

  args<T>(): CallBuilder<Ret, T> {
    return new CallBuilder(this.record);
  }

  method(method: HttpMethod): CallBuilder<Ret, Arg> {
    this.record.method = method;
    return new CallBuilder(this.record);
  }

  path(path: string): this;
  path(getPath: (args: Arg) => string): this;
  path(pathOrFun: string | ((args: Arg) => string)) {
    const fun = typeof pathOrFun === 'string' ? () => pathOrFun : pathOrFun;
    this.record.getPath = fun;
    return new CallBuilder<Ret, Arg>(this.record);
  }

  query(headers: QueryParam): CallBuilder<Ret, Arg>;
  query(fun: (args: Arg) => QueryParam): CallBuilder<Ret, Arg>;
  query(funOrQuery: QueryParam | ((args: Arg) => QueryParam)) {
    if (typeof funOrQuery === 'function') {
      this.record.getQuery.push(funOrQuery);
    } else {
      this.record.getQuery.push(() => funOrQuery);
    }
    return new CallBuilder<Ret, Arg>(this.record);
  }

  headers(headers: HeadersInit): CallBuilder<Ret, Arg>;
  headers(fun: (args: Arg) => HeadersInit): CallBuilder<Ret, Arg>;
  headers(
    funOrHeaders: HeadersInit | ((args: Arg) => HeadersInit),
  ): CallBuilder<Ret, Arg> {
    if (typeof funOrHeaders === 'function') {
      this.record.getHeaders.push(funOrHeaders);
    } else {
      this.record.getHeaders.push(() => funOrHeaders);
    }
    return new CallBuilder<Ret, Arg>(this.record);
  }

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

  build(): BuiltCall<Ret, Arg> {
    const { getPath } = this.record;
    if (getPath == null) {
      throw new Error('no path function');
    }

    const fun = async (baseUrl: string, args: Arg) => {
      const path = getPath(args);
      const url = new URL(path, baseUrl);

      this.record.getQuery
        .map((e) => e(args))
        .map((e) => new URLSearchParams(e))
        .flatMap((e) => Array.from(e.entries()))
        .forEach(([key, val]) => {
          url.searchParams.append(key, val.toString());
        });

      const headers = mergeHeaders(this.record.getHeaders.map((e) => e(args)));

      const res = await fetch(url, { method: this.record.method, headers });
      const text = await res.text();

      return text;
    };

    return fun as any;
  }
}

export function buildCall(): CallBuilder {
  return new CallBuilder();
}
