interface JsonObject {
  [member: string]: Value;
}

type JsonArray = Array<Value>;

type Value = string | number | boolean | null | JsonObject | JsonArray;

export type JsonRoot = JsonArray | JsonObject;
