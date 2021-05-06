import { Readable } from 'stream';
import { URL, URLSearchParams } from 'url';
import FormData from 'form-data';
import fetch, {
  Headers,
  HeadersInit,
  BodyInit as OriginalBodyInit,
} from 'node-fetch';
import { invariant } from 'ts-invariant';
import { JsonRoot } from './json-typings';

type BodyInit =
  | Exclude<OriginalBodyInit, ArrayBufferView | NodeJS.ReadableStream>
  | Readable;

type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put';

type QueryParam = Record<string, string> | URLSearchParams;

type BodyType = JsonRoot | BodyInit;

interface CallRecord {
  getBody?: (arg: any) => BodyType;
  getHeaders: ((arg: any) => HeadersInit)[];
  getPath?: (arg: any) => string;
  getQuery: ((arg: any) => QueryParam)[];
  mapError: ((arg: any) => unknown)[];
  mappers: ((arg: any) => unknown)[];
  method?: HttpMethod;
  parseJson?: (arg: unknown) => unknown;
}

function getBodyInfo(
  data: BodyType | undefined,
): { body?: BodyInit; contentType?: string } {
  if (data === undefined) {
    return {};
  } else if (typeof data === 'string') {
    return { body: data, contentType: 'text/plain' };
  } else if (
    data instanceof ArrayBuffer ||
    data instanceof Readable ||
    data instanceof URLSearchParams ||
    data instanceof FormData
  ) {
    return { body: data };
  } else {
    // must be json at this point
    // fixme: what about things that throw here? Can that happen?
    return { body: JSON.stringify(data), contentType: 'application/json' };
  }
}

function mergeQueryParams(defs: QueryParam[]): URLSearchParams {
  const pairs = defs
    .map((e) => new URLSearchParams(e))
    .flatMap<[string, string]>((e) => Array.from(e.entries()));
  return new URLSearchParams(pairs);
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
      getHeaders: [],
      getQuery: [],
      mappers: [],
      mapError: [],
    };
  }

  args<T>(): CallBuilder<Ret, T> {
    return new CallBuilder(this.record);
  }

  method(method: HttpMethod): CallBuilder<Ret, Arg> {
    invariant(this.record.method == null, "Can't set method multiple times");
    this.record.method = method;
    return new CallBuilder(this.record);
  }

  path(path: string): this;
  path(getPath: (args: Arg) => string): this;
  path(pathOrFun: string | ((args: Arg) => string)) {
    invariant(this.record.getPath == null, "Can't set path multiple times");
    if (typeof pathOrFun === 'function') {
      this.record.getPath = pathOrFun;
    } else {
      this.record.getPath = () => pathOrFun;
    }
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

  map<T>(mapper: (data: Ret) => T): CallBuilder<T, Arg> {
    this.record.mappers.push(mapper);
    return new CallBuilder<T, Arg>(this.record);
  }

  body(data: BodyType): this;
  body(fun: (args: Arg) => BodyType): this;
  body(funOrData: ((args: Arg) => BodyType) | BodyType) {
    invariant(this.record.getBody == null, "Can't set body multiple times");
    if (typeof funOrData === 'function') {
      this.record.getBody = funOrData;
    } else {
      this.record.getBody = () => funOrData;
    }
    return new CallBuilder<Ret, Arg>(this.record);
  }

  parseJson<T>(parser: (data: unknown) => T): CallBuilder<T, Arg> {
    this.record.parseJson = parser;
    return new CallBuilder<T, Arg>(this.record);
  }

  build(): BuiltCall<Ret, Arg> {
    const {
      getBody,
      getHeaders,
      getPath,
      getQuery,
      mappers,
      method,
      parseJson,
    } = this.record;
    if (getPath == null) {
      throw new Error('no path function');
    }

    const fun = async (baseUrl: string, args: Arg) => {
      const path = getPath(args);
      const url = new URL(path, baseUrl);

      mergeQueryParams(getQuery.map((e) => e(args))).forEach((val, key) => {
        return url.searchParams.append(key, val);
      });

      const headers = mergeHeaders(getHeaders.map((e) => e(args)));
      const rawBody = getBody ? getBody(args) : undefined;
      const { body, contentType } = getBodyInfo(rawBody);

      if (contentType) {
        // fixme: might need more headers for some types?
        headers.set('content-type', contentType);
      }

      const res = await fetch(url, { method: method, headers, body });

      let data;

      if (parseJson) {
        const text = await res.text();
        const json = JSON.parse(text);
        const parsed = parseJson(json);
        data = parsed;
      } else {
        // fixme: might be binary or whatevs
        const text = await res.text();
        data = text;
      }

      for (const mapper of mappers) {
        data = mapper(data);
      }

      return data;
    };

    return fun as any;
  }
}

export function buildCall(): CallBuilder {
  return new CallBuilder();
}
