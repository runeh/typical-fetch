# typical-fetch

Generate function for performing type safe HTTP calls.

## Notes

How the API to define functions looks isn't super important. It could be a
builder, or by passing an object or something else.

## Examples

### Basic

```typescript
const fetchUsers = typicalFetch
  .build()
  .method('GET')
  .headers({ Authorization: 'anonymous' })
  .path('/users.json');

type fetchUsersCall = () => Promise<
  | { success: true; error: undefined; response: unknown }
  | { success: false; error: unknown; response: undefined }
>;
```

### Parser

```typescript
// Assuming the JSON is of shape `["name1", "name2"]`
function parseUsers(raw: unknown): string[] {
  const parsed = JSON.parse(raw);
  return parsed;
}

const fetchUsers = typicalFetch
  .build()
  .method('GET')
  .headers({ Authorization: 'anonymous' })
  .path('/users.json')
  .parser(parseUser);

type fetchUsersCall = () => Promise<
  | { success: true; error: undefined; response: string[] }
  | { success: false; error: unknown; response: undefined }
>;
```

### Kitchen sink

```typescript
/**
 * the parser should use runtypes or typanion or something validate the  body
 * of the response.
 * Here is a runtypes example where the shape of the response is:
 * [{ "id": "1234", "name": "Rune", "signupDate": "2020-08-11" }]
 *
 * @param raw
 * @returns
 */

function parseUsers(raw: string): string[] {
  const json = JSON.parse(raw);
  const runtype = rt.Array(
    rt.Record({
      id: rt.String,
      name: rt.String,
      signupDate: rt.String,
    }),
  );
  return runtype.check(json);
}

const fetchUsers = typicalFetch
  .build()
  .arguments<{ token: string; orgId: string; sortOrder: 'asc' | 'desc' }>()
  .method('GET')
  .path((args) => `/org/${args.orgId}/users`)
  .headers({ 'User-Agent': 'typical-fetch' })
  .headers((args) => ({ Authorization: `Bearer ${args.token}` }))
  .parser(parseUsers)
  .map((res) => {
    // res is the return from parseUser
    // this function can do whatever transforms it wants. In this case, convert
    // the signupDate field from a string to a Date object
    return res.map((person) => {
      return { ...person, signupDate: new Date(person.signupDate) };
    });
  })
  .catch((err: unknown) => {
    // map whatever error can occur to a well known type. Usually you'd
    // have a number of well known error types that can be returned
    if (err instanceof rt.ValidationError) {
      return { name: 'validationError' };
    } else if (err instanceof HttpError) {
      // httperror is provided by typical-fetch, to signal 404 and whatever
      return { name: 'httpError', status: err.status };
    } else {
      return { name: 'unknown error!' };
    }
  });

// types of the generated fetchUsers function and data

type FetchUsersCallResult = Array<{
  id: string;
  name: string;
  signupDate: Date;
}>;

type FetchUsersCallError =
  | { name: 'validationError' }
  | { name: 'httpError'; status: err.status }
  | { name: 'unknown error!' };

type FetchUsersCall = (args: {
  token: string;
  orgId: string;
  sortOrder: 'asc' | 'desc';
}) => Promise<
  | { success: true; result: FetchUsersCallResult; error: undefined }
  | { success: false; result: undefined; error: FetchUsersCallError }
>;
```

### todo

- Narrow after calling `method` and `path`?
- Support array as return value from `path`? As in
  `['users', userId,'pages',pageNum]` turns into
  `/users/${userId}/pages/${pageNum}`
- Make CallRecord typed?
- adapter for runtypes/typanion etc examples
- copy record properly
- multiple .args calls allowed?
- pass response to mappers? Wrap it in a proxy that throws if you try to
  edit/call it?
- can parseJson just add two parsers? one for text->unknown and then the user
  provided one?
- Add kitchen sink tests
- Error handling
- Tests for methods?
- Errors if trying to use body with GET etc?
- follow redirects?
- support parser fun for args?
- pass in args to parsers
