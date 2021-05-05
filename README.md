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
  .withMethod('GET')
  .withHeaders({ Authorization: 'anonymous' })
  .withPath('/users.json');

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
  .withMethod('GET')
  .withHeaders({ Authorization: 'anonymous' })
  .withPath('/users.json')
  .withParser(parseUser);

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
  .withArguments<{ token: string; orgId: string; sortOrder: 'asc' | 'desc' }>()
  .withMethod('GET')
  .withPath((args) => `/org/${args.orgId}/users`)
  .withHeaders({ 'User-Agent': 'typical-fetch' })
  .withHeaders((args) => ({ Authorization: `Bearer ${args.token}` }))
  .withParser(parseUsers)
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

type FethUsersCall = (args: {
  token: string;
  orgId: string;
  sortOrder: 'asc' | 'desc';
}) => Promise<
  | { success: true; result: FetchUsersCallResult; error: undefined }
  | { success: false; result: undefined; error: FetchUsersCallError }
>;
```

### todo

- Narrow after calling `withMethod` and path?
- support array path?
- Does withPath(() => {}) work when there is no arg?
