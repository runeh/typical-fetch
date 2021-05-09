import * as rt from 'runtypes';
import { buildCall } from '../src';

// see https://jsonplaceholder.typicode.com/guide/

const PostRt = rt.Record({
  userId: rt.Number,
  id: rt.Number,
  title: rt.String,
  body: rt.String,
});

const UserRt = rt.Record({
  id: rt.Number,
  name: rt.String,
  username: rt.String,
  email: rt.String,
  address: rt.Record({
    street: rt.String,
    suite: rt.String,
    city: rt.String,
    zipcode: rt.String,
    geo: rt.Record({
      lat: rt.String,
      lng: rt.String,
    }),
  }),
  phone: rt.String,
  website: rt.String,
  company: rt.Record({
    name: rt.String,
    catchPhrase: rt.String,
    bs: rt.String,
  }),
});

type User = rt.Static<typeof UserRt>;

const AlbumRt = rt.Record({
  userId: rt.Number,
  id: rt.Number,
  title: rt.String,
});

const TodoRt = rt.Record({
  userId: rt.Number,
  id: rt.Number,
  title: rt.String,
  completed: rt.Boolean,
});

const CommentRt = rt.Record({
  postId: rt.Number,
  id: rt.Number,
  name: rt.String,
  email: rt.String,
  body: rt.String,
});

function withRuntype<T>(validator: rt.Runtype<T>) {
  return (data: unknown) => {
    return validator.check(data);
  };
}

function getClient() {
  const baseBuilder = buildCall()
    .baseUrl('https://jsonplaceholder.typicode.com/')
    .headers({ 'user-agent': 'typical-fetch-demo' });

  const getUsers = baseBuilder
    .method('get')
    .path('/users')
    .parseJson(withRuntype(rt.Array(UserRt)))
    .build();

  const getUser = baseBuilder
    .args<{ userId: number }>()
    .method('get')
    .path(({ userId }) => `/users/${userId}`)
    .parseJson(withRuntype(UserRt))
    .build();

  const createUser = baseBuilder
    .method('post')
    .path('/users')
    .args<Omit<User, 'id'>>()
    .body((args) => args)
    .parseJson(withRuntype(UserRt))
    .build();

  return { getUsers, getUser, createUser };
}

async function main() {
  const client = getClient();
  // const users = await client.getUsers();
  // console.log(users);

  const user = await client.createUser({
    name: 'Rune',
    address: {
      city: 'asdf',
      geo: {
        lat: '1',
        lng: '2',
      },
      street: 'asdf',
      suite: '1234',
      zipcode: '1234',
    },
    email: 'adsf',
    username: 'afoadsf',
    phone: 'adsfa',
    website: 'asdf',
    company: {
      bs: 'asdf',
      catchPhrase: 'asdf',
      name: 'asdf',
    },
  });
  console.log('user', user);
}

main();
