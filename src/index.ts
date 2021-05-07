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

type CallReturn<Ret, Err> =
  | { success: true; response: Ret; error: undefined }
  | { success: false; response: undefined; error: Err };

// The `[]` is due to this:
// https://github.com/microsoft/TypeScript/issues/23182#issuecomment-379091887

type BuiltCall<Ret, Arg, Err> = [Arg] extends [never]
  ? (baseUrl: string) => Promise<CallReturn<Ret, Err>>
  : (baseUrl: string, args: Arg) => Promise<CallReturn<Ret, Err>>;

type MergedArgs<OldArg, NewArg> = [OldArg] extends [never]
  ? NewArg
  : OldArg & NewArg;

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
  mappers: ((res: any, arg: any) => unknown)[];
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

class TypicalError extends Error {}

class CallBuilder<Ret = void, Arg = never, Err = TypicalError> {
  record: CallRecord;

  constructor(record?: CallRecord) {
    this.record = record ?? {
      getHeaders: [],
      getQuery: [],
      mappers: [],
      mapError: [],
    };
  }

  args<T>(): CallBuilder<Ret, MergedArgs<Arg, T>, Err> {
    return new CallBuilder(this.record);
  }

  method(method: HttpMethod): CallBuilder<Ret, Arg, Err> {
    invariant(this.record.method == null, "Can't set method multiple times");
    return new CallBuilder({ ...this.record, method });
  }

  path(path: string): this;
  path(getPath: (args: Arg) => string): this;
  path(pathOrFun: string | ((args: Arg) => string)) {
    invariant(this.record.getPath == null, "Can't set path multiple times");
    const getPath =
      typeof pathOrFun === 'function' ? pathOrFun : () => pathOrFun;

    return new CallBuilder<Ret, Arg, Err>({ ...this.record, getPath });
  }

  query(headers: QueryParam): CallBuilder<Ret, Arg, Err>;
  query(fun: (args: Arg) => QueryParam): CallBuilder<Ret, Arg, Err>;
  query(funOrQuery: QueryParam | ((args: Arg) => QueryParam)) {
    const getQueryFun =
      typeof funOrQuery === 'function' ? funOrQuery : () => funOrQuery;

    return new CallBuilder<Ret, Arg, Err>({
      ...this.record,
      getQuery: [...this.record.getQuery, getQueryFun],
    });
  }

  headers(headers: HeadersInit): CallBuilder<Ret, Arg, Err>;
  headers(fun: (args: Arg) => HeadersInit): CallBuilder<Ret, Arg, Err>;
  headers(
    funOrHeaders: HeadersInit | ((args: Arg) => HeadersInit),
  ): CallBuilder<Ret, Arg, Err> {
    const getHeadersFun =
      typeof funOrHeaders === 'function' ? funOrHeaders : () => funOrHeaders;

    return new CallBuilder<Ret, Arg, Err>({
      ...this.record,
      getHeaders: [...this.record.getHeaders, getHeadersFun],
    });
  }

  map<T>(mapper: (data: Ret, args: Arg) => T): CallBuilder<T, Arg, Err> {
    return new CallBuilder<T, Arg, Err>({
      ...this.record,
      mappers: [...this.record.mappers, mapper],
    });
  }

  body(data: BodyType): this;
  body(fun: (args: Arg) => BodyType): this;
  body(funOrData: ((args: Arg) => BodyType) | BodyType) {
    invariant(this.record.getBody == null, "Can't set body multiple times");
    const getBody =
      typeof funOrData === 'function' ? funOrData : () => funOrData;
    return new CallBuilder<Ret, Arg, Err>({ ...this.record, getBody });
  }

  parseJson<T>(parser: (data: unknown) => T): CallBuilder<T, Arg, Err> {
    return new CallBuilder<T, Arg, Err>({ ...this.record, parseJson: parser });
  }

  build(): BuiltCall<Ret, Arg, Err> {
    const {
      getBody,
      getHeaders,
      getPath,
      getQuery,
      mappers,
      method,
      parseJson,
    } = this.record;

    invariant(getPath != null, 'No path set');
    invariant(method != null, 'No method set');
    if (getBody && ['head', 'get', 'delete'].includes(method)) {
      throw new Error(`Can't include body in "${method}" request`);
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

      const res = await fetch(url, { method, headers, body });

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
        data = mapper(data, args);
      }

      return { success: true, response: data, error: undefined };
    };

    return fun as any;
  }
}

export function buildCall(): CallBuilder {
  return new CallBuilder();
}
