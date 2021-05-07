/* eslint-disable no-console */

import * as t from 'typanion';
import { buildCall, unwrapError } from '../src/index';

const baseUrl = 'https://httpbin.org';

const jsonData = { people: [{ name: 'Rune' }, { name: 'David' }] };

const isPeopleResponse = t.isObject(
  {
    json: t.isObject({
      people: t.isArray(t.isObject({ name: t.isString() })),
    }),
  },
  // typanion rejects extra data by default. We allow it here, since the
  // echo request gives us lots of extra stuff we don't care about.
  { extra: t.isUnknown() },
);

class TypanionError extends Error {
  constructor(public errors: string[]) {
    super(`Typanion validation failed`);
    this.name = 'TypanionError';
  }
}

function withTypanion<T>(validator: t.StrictValidator<unknown, T>) {
  return (data: unknown) => {
    const errors: string[] = [];
    if (validator(data, { errors })) {
      return data;
    } else {
      throw new TypanionError(errors);
    }
  };
}

async function parseWithTypanion() {
  const getRequest = buildCall()
    .path('/anything')
    .method('post')
    .body(jsonData)
    .parseJson(withTypanion(isPeopleResponse))
    .mapError((err) => {
      const unwrapped = unwrapError(err);
      return unwrapped instanceof TypanionError ? unwrapped : err;
    })

    .build();

  const res = await getRequest(baseUrl);

  if (res.success) {
    console.log(res.response.json);
  } else {
    console.log(res.error.name);
  }
}

async function main() {
  await parseWithTypanion();
}

main();
