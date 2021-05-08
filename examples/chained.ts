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

type AccountInfo = rt.Static<typeof accountInfoRt>;

export function makeClient(baseUrl: URL) {
  const baseBuilder = buildCall()
    .baseUrl(baseUrl)
    .args<{ apiToken: string }>()
    .headers((args) => [
      ['user-agent', 'typical-fetch'],
      ['authorization', `Bearer ${args.apiToken}`],
    ])
    .mapError((originalError) => {
      const error = unwrapError(originalError);
      return error instanceof rt.ValidationError ? error : originalError;
    });

  const createAccountInfo = baseBuilder
    .args<Omit<AccountInfo, 'id'>>()
    .method('put')
    .path('/user')
    .parseJson(withRuntype(accountInfoRt))
    .build();

  const getAccountInfo = baseBuilder
    .args<{ id: string }>()
    .method('get')
    .path((e) => `/user/${e.id}`)
    .parseJson(withRuntype(accountInfoRt))
    .build();

  const updateAccountInfo = baseBuilder
    .args<{ account: { id: string } & Partial<AccountInfo> }>()
    .method('post')
    .path((e) => `/user/${e.account.id}`)
    .parseJson(withRuntype(accountInfoRt))
    .build();

  const deleteAccountInfo = baseBuilder
    .args<{ id: string }>()
    .method('delete')
    .path((e) => `/user/${e.id}`)
    .build();

  const setAvatar = baseBuilder
    .args<{ id: string; avatarFilePath: string }>()
    .method('post')
    .path((e) => `/user/${e.id}/avatar`)
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
    })
    .build();

  return {
    getAccountInfo,
    updateAccountInfo,
    deleteAccountInfo,
    createAccountInfo,
    setAvatar,
  };
}
