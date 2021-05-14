# typical-fetch

Toolkit for creating strongly typed HTTP calls.

`typical-fetch` generates functions that wrap HTTP calls and make sure responses
and errors are strictly typed.

Principles:

- All inputs and outputs are strongly typed by default
- Errors are treated as return values, not by throwing, so they can be
  exhaustively checked.

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
  }))
  .mapError((error) => {
    if (error instanceof TypicalHttpError && error.status === 401) {
      return new NotAuthorizedError();
    } else {
      return error;
    }
  });

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

## API

Create a fetcher by calling `buildCall()`. `buildCall` returns an instance of
`CallBuilder` that you can chain calls on. You can also use `new CallBuilder()`
rather than `buildCall` if you prefer.

The `CallBuilder` class has methods to control how the produced function should
work. At the end of the chain, call `.build()` to produce the fetcher function.

So for example:

```typescript
const sendPing = buildCall()
  .baseUrl('https://httpbin.org')
  .method('head')
  .path('/head')
  .build();

await sendPing();
```

### `.baseUrl`

`baseUrl` sets the base url used when making requests. The argument must be
either a string or a URL object. The base url is joined with the `path`
argument.

The base url is optional. If not used, then `baseUrl` will be an argument on the
fetcher function:

```typescript
const fetcher1 = buildCall()
  .baseUrl('https://httpbin.org')
  .method('get')
  .path('/get')
  .build();

const result1 = await withBaseUrl();

const fetcher2 = buildCall() //
  .method('get')
  .path('/get')
  .build();

const result2 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });
```

### `.args`

The `args` method lets you define arguments that are required when calling the
fetcher function. The arguments will be available to callbacks in other builder
methods. The syntax is slightly weird. You call a method on the builder with a
generic type argument, but no value arguments:

The generic must be an object with string keys, and arbitrary values.

The `args` method can be called multiple times. The argument types will be
combined into a single type.

If `.baseUrl` is not called on the builder, then `baseUrl` will be an argument
on the fetcher.

```typescript
const fetcher1 = buildCall() //
  .args<{ id: string }>()
  .method('post')
  .path('/post')
  .build();

const result1 = await withBaseUrl({
  baseUrl: 'https://httpbin.org',
  id: 'test',
});

const fetcher2 = buildCall() //
  .args<{ id: string; name: string }>()
  .method('post')
  .path('/post')
  .args<{ overwrite: boolean }>()
  .build();

const result2 = await withBaseUrl({
  baseUrl: 'https://httpbin.org',
  id: 'test',
  name: 'Rune',
  overwrite: true,
});
```

### `.method`

The `method` method takes a single argument, which must be one of `delete`,
`get`, `head`, `patch`, `post`, `put`. The fetcher function will use this method
when making HTTP requests.

The `method` method must be called before calling `build`.

```typescript
const fetcher = buildCall() //
  .method('head')
  .path('/')
  .build();

const result = fetcher({ baseUrl: 'https://httpbin.org' });
```

### `.path`

The `path` method sets the path the fetcher will request from. The path is
joined with the base URL. Thus, if the `baseUrl` is
`https://example.org/dev-api` and the `path` is `/tags/article`, then the full
URL of the request will be `https://example.org/dev-api/tags/article`.

The argument to the `path` method is either a string, or a function that returns
a string. The function will receive all arguments defined via `.args` calls.

The `path` method must be called before calling `build`.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/')
  .build();

const result1 = await fetcher1({ baseUrl: 'https://example.org' });

const fetcher2 = buildCall() //
  .args<{ id: string }>()
  .method('get')
  .path((args) => `/user/${args.id}`)
  .build();

// fetches https://example.org/user/1
const result2 = await fetcher1({ baseUrl: 'https://example.org', id: '1' });
```

### `.query`

The `query` method adds query parameters the the URL that will be called by the
fetcher.

The argument can be either an object of key/values, a `URLSearchParams` object,
or a function returning one of those types. The function will receive all
arguments defined via `.args` calls.

The `query` method can be called multiple times. The query parameters from all
the calls are joined together.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/')
  .query({ userId: '1' })
  .build();

// fetches https://example.org?userId=1
const result1 = await fetcher1({ baseUrl: 'https://example.org' });

const urlSearchParams = new URLSearchParams();

urlSearchParams.add('articleId', '1');

const fetcher2 = buildCall() //
  .method('get')
  .path('/')
  .query(urlSearchParams)
  .build();

// fetches https://example.org?articleId=1
const result2 = await fetcher2({ baseUrl: 'https://example.org' });

const fetcher3 = buildCall() //
  .args<{ id: string }>()
  .method('get')
  .path('/')
  .query((args) => ({ id: args.id }))
  .build();

// fetches https://example.org?id=1
const result3 = await fetcher3({ baseUrl: 'https://example.org', id: '1' });
```

### `.headers`

The `headers` method adds headers to the request that will be sent by the
fetcher.

The argument can be either a `Header` object, an object of key/values or and
array of `[key value]` tuples. The argument can also be a function that returns
one of those types. The function will receive all arguments defined via `.args`
calls.

The `headers` method can be called multiple times. The headers from all the
calls will be sent.

fixme: examples

### `.body`

Sets a body to send.

The argument can be a `string`, `Buffer`, `Readable`, `URLSearchParams`,
`FormData`, or a JSON object. The argument can also be a function that returns
one of those types. The function will receive all arguments defined via `.args`
calls.

If the object is JSON, it will be serialized and the appropriate header for JSON
is set.

If the object is a `FormData` or `URLSearchParams` object, the appropriate
headers for posting a form will be set.

For other types of data, that require content type headers or similar, the user
must set them explicitly.

The `.body` method is not required. It can only be called once.

```typescript
const fetcher1 = buildCall() //
  .method('post')
  .path('/post')
  .body({ id: '1234', name: 'Rune' })
  .build();

const result1 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });

const fetcher2 = buildCall() //
  .method('post')
  .path('/post')
  .body(fs.createReadStream(somePdfFilePath))
  .headers({ 'content-type': 'application/pdf' })
  .build();

const result2 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });

const fetcher3 = buildCall() //
  .method('post')
  .path('/post')
  .body('id,name\n1,Rune')
  .headers({ 'content-type': 'text/csv' })
  .build();

const result3 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });

const fetcher4 = buildCall() //
  .args<{ uploadPath: string; ownerId: string }>()
  .method('post')
  .path('/post')
  .body((args) => {
    const formData = new FormData();
    const stream = fs.createReadStream(args.uploadPath);
    const filename = path.basename(args.uploadPath);
    formData.append('file', stream, filename);
    formData.append('owner', args.ownerId);
    return formData;
  })
  .build();

const result4 = await withBaseUrl({
  baseUrl: 'https://httpbin.org',
  uploadPath: '/tmp/receipt.pdf',
  ownerId: '1',
});
```

### `.parseJson`

Adds a function that will parse JSON received from the request. The return type
of this call becomes the return type of the fetcher call.

The parser function receives two arguments. The raw JSON and any arguments
defined via `.args` calls.

This function is usually used to take untyped data, the raw JSON, and return
something that has been validated.

The `.parseJson` method at most be called once.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/json')
  .parseJson((rawJson) => {
    // This would normally do real validation of the raw json.
    return rawJson as string[];
  })
  .build();

const result1 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });
if (result1.success) {
  // this is the return value from the parseJson call:
  console.log(result1.data);
}
```

### `.parseText`

Adds a function that will parse text received from the request. The return type
of this call becomes the return type of the fetcher call.

The parser function receives two arguments. The raw text and any arguments
defined via `.args` calls.

This function is usually used to take untyped data, the raw text, and return
something that has been validated.

The `.parseText` method at most be called once.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/json')
  .parseText((rawText) => {
    // assuming we received some lines of semi-colon separated data:
    return rawText //
      .split('\n')
      .map((line) => line.split(';'));
  })
  .build();

const result1 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });
if (result1.success) {
  // this is the return value from the parseText call:
  console.log(result1.data);
}
```

### `.parseResponse`

Adds a function that will parse the response object received from the request.
The return type of this call becomes the return type of the fetcher call.

The parser function receives two arguments. The response object and any
arguments defined via `.args` calls.

This function is usually used to parse responses where there content you're
interested in is not in the body. For example if a header contains the data you
need.

The `.parseResponse ` method at most be called once.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/json')
  .parseResponse((response) => {
    return response.headers['Cookie'];
  })
  .build();

const result1 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });
if (result1.success) {
  // this is the return value from the parseResponse call:
  console.log(result1.data);
}
```

### `.map`

`map` transforms a result in some way. It takes the current return type of the
fetcher, for example what a `parseJson` call returns, and transforms it. The
return type of `map` becomes the new return type of the fetcher.

There can be multiple map calls. Each receives the output of the previous one as
its input.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/visitorCount')
  // return the text from the response unchanged
  .parseText((text) => text)
  // convert the text to a number
  .map((text) => parseFloat(text))
  // convert the number to a string of a fixed precision
  .map((num) => num.toFixed(3))
  .build();

const result1 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });
if (result1.success) {
  // this is the return value from the last map call:
  console.log(result1.data);
}
```

### `.mapError`

A `mapError` function transforms exceptions. By default, all exceptions that
occur when a fetcher is called is transformed into a `TypicalHttpError` or a
`TypicalWrappedError`. The wrapped error type wraps all non-http errors that may
occur during execution.

The error mapper may convert any of these errors to more specific errors.

There can be multiple error mappers. The result of the previous error mapper is
passed as the error to the next error mapper.

```typescript
const fetcher1 = buildCall() //
  .method('get')
  .path('/ping')
  .mapError((error) => {
    if (error instanceof TypicalHttpError) {
      if (error.status === 404) {
        // some custom 404 error in your app
        return new NotFoundError();
      } else if (error.status === 401) {
        return new AuthenticationError();
      }
    }
    return error;
  })
  .build();

const result1 = await withBaseUrl({ baseUrl: 'https://httpbin.org' });
if (!result1.success) {
  // this is the return value from the mapError call:
  console.log(result1.error);
}
```

### `.build`

Returns the function defined by the builder.
