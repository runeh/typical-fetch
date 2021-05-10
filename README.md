# typical-fetch

Toolkit for creating strongly typed HTTP calls.

`typical-fetch` lets users generate functions that perform HTTP calls. This is
useful both when hand-crafting API clients, or for tools that generate API
client code.

Principles:

- All inputs and outputs should be strongly typed by default
- Errors are treated as return values, not by throwing, so they can be
  exhaustively checked.

## API

todo

## Examples

### Basic

Generate function that sends a `GET` result to the `/ping/` path of the base url
passed in to the function. In this case `https://example.org/api/ping`.

```typescript
const fetcher = buildCall() //
  .method('get')
  .path('/ping')
  .build();

await getRequest({ baseUrl: 'https://example.org/api' });
```

### Post some JSON

Generate a function that sends a `POST` containing the JSON `{ name: 'Rune' }`.

```typescript
const fetcher = buildCall()
  .method('post')
  .path('/create-user')
  .body({ name: 'Rune' })
  .build();

await getRequest({ baseUrl: 'https://example.org/api' });
```

### Post some JSON as an argument

Generate a function that sends a `POST` containing some JSON, where the data to
send is passed in as arguments to the function.

```typescript
const fetcher = buildCall()
  .args<{ userName: string }>()
  .method('post')
  .path('/create-user')
  .body((args) => ({ name: args.userName }))
  .build();

await getRequest({
  baseUrl: 'https://example.org/api',
  name: 'Rune',
});
```

### Fetch some JSON and parse it

Generate a function that sends a `GET` request that returns some JSON. Invoke a
parser function that converts the JSON to a known type.

For this example, assume the data returned from the server looks like this:
`["foo", "bar", "baz"]`.

```typescript
const getUsers = buildCall()
  .method('get')
  .path('/user-names')
  .parseJson((data) => {
    if (Array.isArray(data) && data.every((e) => typeof e === 'string')) {
      return data as string[];
    } else {
      throw new Error('Unexpected data');
    }
  })
  .build();

const result = await getUsers({ baseUrl: 'https://example.org/api' });
if (result.success) {
  console.log(result.data);
}
```

### Fetch some JSON, parse and transform it

Generate a function that sends a `GET` request that returns some JSON. Invoke a
parser function that converts the JSON to a known type. After parsing, pass the
data to a `map` function, to transform it.

For this example, assume the data returned from the server looks like this:
`["2018-04-24", "2019-08-03", "2020-11-19"]`.

After parsing and mapping, the result is an array of `Date` objects.

```typescript
const getUsers = buildCall()
  .method('get')
  .path('/dates')
  .parseJson((data) => {
    if (Array.isArray(data) && data.every((e) => typeof e === 'string')) {
      return data as string[];
    } else {
      throw new Error('Unexpected data');
    }
  })
  .map((data) => data.map((dateString) => new Date(dateString)))
  .build();

const result = await getUsers({ baseUrl: 'https://example.org/api' });
if (result.success) {
  console.log(result.data);
}
```

### Parse a request object

Generate a function that sends a `POST` request that receives a `201: Created`
response. Use the `parseResponse` to extract the location header from the
response object, and return that as the return value of the function.

```typescript
const createNote = buildCall()
  .method('post')
  .path('/notes')
  .parseResponse((res) => {
    return res.headers.location;
  })
  .build();

const result = await createNote({ baseUrl: 'https://example.org/api' });
if (result.success) {
  console.log(result.data);
}
```

### Fetch some text and parse it

Generate a function that sends a `GET` request that fetches some semi colon
separated lines and parses it into an array of arrays.

```typescript
const getLines = buildCall()
  .method('get')
  .path('/csv')
  .parseText((data) => {
    return data.split('\n').map((line) => line.split(';'));
  })
  .build();

const result = await getLines({ baseUrl: 'https://example.org/api' });
if (result.success) {
  console.log(result.data);
}
```

Generate a function takes arguments that are used to set the correct path and
query parameters for the request.

### Use arguments for path and query

```typescript
const getTeamMembers = buildCall()
  .args<{ teamId: string; sortOrder: 'asc' | 'desc' }>()
  .method('get')
  .path('/users')
  .parseJson((data) => {
    return parseTeamMembers(data);
  })
  .build();

const result = await getTeamMembers({
  baseUrl: 'https://example.org/api',
  teamId: '1234',
  sortOrder: 'asc',
});

if (result.success) {
  console.log(result.data);
}
```

Generate a function with `baseUrl` and some headers set as part of the builder.
This means the baseUrl does not need to be passed as an argument when caling the
function.

### Use constant baseUrl and set some headers

```typescript
const getUsers = buildCall()
  .baseUrl('https://example.org/api')
  .headers({ 'user-agent': 'typical-fetch' })
  .method('get')
  .path('/users')
  .parseJson((data) => {
    return parseUsers(data);
  })
  .build();

const result = await getUsers();

if (result.success) {
  console.log(result.data);
}
```

### Use base builder to create multiple calls

Generate two different functions, one for a `GET` and one for a `POST` that
share a lot of setup code by building off a common builder.

```typescript
const baseBuilder = buildCall()
  .args<{ apiToken: string }>()
  .baseUrl('https://example.org/api')
  .headers((args) => ({
    'user-agent': 'typical-fetch',
    authorizaton: `Bearer ${args.apiToken}`,
  }));

const getUser = baseBuilder
  .args<{ id: string }>()
  .method('get')
  .path((args) => `/user/${args.id}`)
  .parseJson((data) => {
    return parseUsers(data);
  })
  .build();

const createUser = baseBuilder
  .args<{ name: string; birthDate: string }>()
  .method('post')
  .path('/user')
  .body((args) => {
    return { name: args.name, birthDate: args.birthDate };
  })
  .parseJson((data) => parseUser(data))
  .build();

const createResult = await createUser({
  apiToken: 'asdf',
  name: 'Rune',
  birthDate: '1975-05-24',
});

// Normally we would should check for errors on the result
const userId = createResult.body.id;
```

### Handle errors

Generate a function that sends a `GET` request that gets an error response from
the server. The errors are not thrown, but returned as the `error` value on the
`result` object. The errors returned are one of two types. Either
`TypicalHttpError` or `TypicalWrappedError`. The latter wraps an inner exception
that is likely more specific.

```typescript
const fetcher = buildCall() //
  .method('get')
  .path('/error')
  .build();

const result = await fetcher({ baseUrl: 'https://example.org/api' });

if (result.success === false) {
  const error = result.error;

  if (error instanceof TypicalHttpError) {
    console.log(`Got HTTP error ${error.status}`);
  } else if (error instanceof TypicalWrappedError) {
    console.log(`Got an error: ${error.wrapped}`);
  } else {
    // this can never happen! The instanceof checks exhaustively checks the
    // errors that are returned from the call
  }
}
```

Generate a function that sends a `GET` request that gets an error response from
the server. The `mapError` function transforms the error objects into strings.
Thus the `.error` value on the returned `result` object becomes a string, not an
`error` object.

### Handle errors by mapping them

```typescript
const fetcher = buildCall()
  .method('get')
  .path('/error')
  .mapError((error) => {
    if (error instanceof TypicalHttpError) {
      return `Got HTTP error ${error.status}`;
    } else {
      return `Got an error: ${error.wrapped}`;
    }
  })
  .build();

const result = await fetcher({ baseUrl: 'https://example.org/api' });

if (result.success === false) {
  console.log(result.error);
}
```
