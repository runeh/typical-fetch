# Notes

## todo

- Signature for errors passed to error mapper is wrong? It can get other things
  than that in the sig?
- Tests for text/response in error object
- Add response object to the result?
- Add kitchen sink tests
- Helpers for isWrappedError etc?
- Clean up where error handling happens
- Test for throwing in weird places
- Have more custom errors? For parsing?
- Docs
- Add response text if available to error?

## Maybe

- Interceptors / event handlers?
- Add more options to `fetchOptions`
- Should the `baseUrl` call allow function?
- Narrow after calling `method` and `path`?
- Support array as return value from `path`? As in
  `['users', userId,'pages',pageNum]` turns into
  `/users/${userId}/pages/${pageNum}`
- Make CallRecord typed?
