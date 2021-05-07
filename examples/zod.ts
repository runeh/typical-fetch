/* eslint-disable no-console */

import * as zod from 'zod';
import { buildCall, unwrapError } from '../src/index';

const baseUrl = 'https://httpbin.org';

const jsonData = { people: [{ name: 'Rune' }, { name: 'David' }] };

const isPeopleResponse = zod
  .object({
    json: zod.object({
      people: zod.array(zod.object({ name: zod.string() })),
    }),
  })
  // zod rejects extra data by default. We allow it here, since the
  // echo request gives us lots of extra stuff we don't care about.
  .nonstrict();

function withZod<T>(validator: zod.Schema<T>) {
  return (data: unknown) => {
    return validator.parse(data);
  };
}

async function parseWithTypanion() {
  const getRequest = buildCall()
    .path('/anything')
    .method('post')
    .body(jsonData)
    .parseJson(withZod(isPeopleResponse))
    .mapError((err) => {
      const unwrapped = unwrapError(err);
      return unwrapped instanceof zod.ZodError ? unwrapped : err;
    })
    .build();

  const res = await getRequest(baseUrl);

  if (res.success) {
    console.log(res.body.json);
  } else {
    console.log(res.error);
  }
}

async function main() {
  await parseWithTypanion();
}

main();
