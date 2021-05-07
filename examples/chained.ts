import { createReadStream } from 'fs';
import { getType } from 'mime';
import * as rt from 'runtypes';
import { buildCall, unwrapError } from '../src/index';

function withRuntype<T>(validator: rt.Runtype<T>) {
  return (data: unknown) => {
    return validator.check(data);
  };
}

const accountInfoRt = rt.Record({
  id: rt.String,
  name: rt.String,
  permissions: rt.Array(rt.String),
  avatar: rt.String.optional(),
});

export function makeApiCalls() {
  const baseBuilder = buildCall()
    .args<{ apiToken: string }>()
    .headers((args) => [
      ['user-agent', 'typical-fetch'],
      ['authorization', `Bearer ${args.apiToken}`],
    ])
    .mapError((originalError) => {
      const error = unwrapError(originalError);
      return error instanceof rt.ValidationError ? error : originalError;
    });

  const getAccountInfo = baseBuilder
    .args<{ accountId: string }>()
    .method('get')
    .path((e) => `/user/${e.accountId}`)
    .parseJson(withRuntype(accountInfoRt));

  const updateAccountInfo = baseBuilder
    .args<{ account: rt.Static<typeof accountInfoRt> }>()
    .method('post')
    .path((e) => `/user/${e.account.id}`)
    .parseJson(withRuntype(accountInfoRt));

  const deleteAccountInfo = baseBuilder
    .args<{ accountId: string }>()
    .method('delete')
    .path((e) => `/user/${e.accountId}`);

  const setAvatar = baseBuilder
    .args<{ accountId: string; avatarFilePath: string }>()
    .method('post')
    .path((e) => `/user/${e.accountId}/avatar`)
    .headers((e) => {
      const mimeType = getType(e.avatarFilePath);
      if (mimeType) {
        return { 'content-type': mimeType };
      } else {
        throw new Error(`No mime type for "${e.avatarFilePath}"`);
      }
    })
    .body((e) => {
      const stream = createReadStream(e.avatarFilePath);
      return stream;
    });

  return {
    getAccountInfo,
    updateAccountInfo,
    deleteAccountInfo,
    setAvatar,
  };
}
