import { Readable } from 'stream';
import { URL, URLSearchParams } from 'url';
import FormData from 'form-data';
import { BodyInit, Headers, HeadersInit } from 'node-fetch';
import invariant from 'ts-invariant';
import { BodyType, CallRecord, QueryParam } from './types';

export function getBodyInfo(
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

export function mergeQueryParams(defs: QueryParam[]): URLSearchParams {
  const pairs = defs
    .map((e) => new URLSearchParams(e))
    .flatMap<[string, string]>((e) => Array.from(e.entries()));
  return new URLSearchParams(pairs);
}

export function mergeHeaders(defs: HeadersInit[]): Headers {
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

export function getFetchParams(
  record: CallRecord,
  baseUrl: string,
  args: any,
): { url: URL; headers: Headers; body: BodyInit | undefined } {
  const { getHeaders, getBody, getPath, getQuery } = record;
  invariant(getPath != null, 'No path set');

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

  return { url, headers, body };
}

export function applyErrorMappers(
  error: any,
  mappers: CallRecord['errorMappers'],
  args: any,
) {
  let newError = error;
  for (const mapper of mappers) {
    newError = mapper(error, args);
  }
  return newError;
}
