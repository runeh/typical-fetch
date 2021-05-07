import fetch, { HeadersInit } from 'node-fetch';
import { invariant } from 'ts-invariant';
import { getFetchParams } from './common';
import {
  BodyType,
  BuiltCall,
  CallRecord,
  HttpMethod,
  MergedArgs,
  QueryParam,
  TypicalError,
} from './types';

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
    const { getBody, getPath, mappers, method, parseJson } = this.record;

    invariant(getPath != null, 'No path set');
    invariant(method != null, 'No method set');
    if (getBody && ['head', 'get', 'delete'].includes(method)) {
      throw new Error(`Can't include body in "${method}" request`);
    }

    const fun = async (baseUrl: string, args: Arg) => {
      const { body, headers, url } = getFetchParams(this.record, baseUrl, args);

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
