# Notes

## todo

- Pass in res to parsers so you can get both headers and body? Some openapi
  things define headers in responses, for example for limit rating. Can/should
  that be parsed out along with the data with the current methods?
- Terminology: fetcher
- pass body text and response to error mapper.
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
- Are there tests missing for headers set when urlsearchparams as body?
- Should `map` be allowed when there is no parser?

## Maybe

- Support browser with native fetch, not pull in node stuff?
- Interceptors / event handlers?
- Add more options to `fetchOptions`
- Should the `baseUrl` call allow function?
- Narrow after calling `method` and `path`?
- Support array as return value from `path`? As in
  `['users', userId,'pages',pageNum]` turns into
  `/users/${userId}/pages/${pageNum}`
- Make CallRecord typed?
