import type { AltJTalkConfig } from "node-altjtalk-binding";

interface Parse<T> {
  parse(this: void, value: string): T;
}

interface Key {
  key: string;
}

type SelectOneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]-?: T[P] } & { [P in Exclude<keyof T, K>]?: never }
  : never;

type Handling<T> = SelectOneOf<{
  default: T;
  optional: true;
  throw: true;
}>;

type RI<T, K extends keyof T> = Required<T>[K];

type Config<T extends object, K extends keyof T> = Key &
  (Pick<T, K> extends Required<Pick<T, K>>
    ? Exclude<Handling<RI<T, K>>, { optional: true }>
    : Extract<Handling<RI<T, K>>, { optional: true }>) &
  (string extends RI<T, K> ? Partial<Parse<RI<T, K>>> : Parse<RI<T, K>>);

type ConfigRecord<T extends object> = {
  [K in keyof T]-?: Config<T, K>;
};

function parse<T extends object>(config: ConfigRecord<T>): T {
  const result = {} as T;
  const throwing: string[] = [];
  for (const key in config) {
    const c = config[key];
    const value = process.env[c.key];
    if (value === undefined) {
      if (c.optional) {
        continue;
      } else if (c.throw) {
        throwing.push(c.key);
      } else {
        result[key] = c.default;
      }
    } else {
      if (c.parse) {
        result[key] = c.parse(value);
      } else {
        // c.parse is optional only if T[typeof key] is string
        result[key] = value as T[typeof key];
      }
    }
  }
  if (throwing.length > 0) {
    throw new Error(
      `Environment variables ${throwing.join(", ")} are required.`,
    );
  }
  return result;
}

export const config = parse<AltJTalkConfig>({
  dictionary: {
    key: "DICTIONARY",
    default: "model/naist-jdic",
  },
  userDictionary: {
    key: "USER_DICTIONARY",
    optional: true,
  },
  models: {
    key: "MODELS",
    parse: (value) => value.split(","),
    default: ["model/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice"],
  },
});

export const { numThreads } = parse({
  numThreads: {
    key: "NUM_THREADS",
    parse: Number,
    default: 1,
  },
  token: {
    key: "DISCORD_TOKEN",
    throw: true,
  },
});
