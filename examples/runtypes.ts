/* eslint-disable no-console */

import * as rt from 'runtypes';
import { buildCall, unwrapError } from '../src/index';

const baseUrl = 'https://httpbin.org';

const jsonData = { people: [{ name: 'Rune' }, { name: 'David' }] };

const isPeopleResponse = rt.Record({
  json: rt.Record({
    people: rt.Array(rt.Record({ name: rt.String })),
  }),
});

function withRuntype<T>(validator: rt.Runtype<T>) {
  return (data: unknown) => {
    return validator.check(data);
  };
}

async function parseWithRuntypes() {
  const getRequest = buildCall()
    .path('/anything')
    .method('post')
    .body(jsonData)
    .parseJson(withRuntype(isPeopleResponse))
    .mapError((err) => {
      const unwrapped = unwrapError(err);
      return unwrapped instanceof rt.ValidationError ? unwrapped : err;
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
  await parseWithRuntypes();
}

main();
