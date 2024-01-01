import type { AltJTalkConfig } from "node-altjtalk-binding";

interface Parse<T> {
  parse(this: void, value: string): T;
}

interface Optional {
  handling: "optional";
}

interface Throw {
  handling: "throw";
}

interface Default<T> {
  handling: "default";
  default: T;
}

interface Key {
  key: string;
}

type Config<T extends object, K extends keyof T> = Key &
  (T extends Required<Pick<T, K>> ? Throw | Default<T[K]> : Optional) &
  (T[K] extends string | undefined ? { parse?: never } : Parse<Required<T>[K]>);

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
      switch (c.handling) {
        case "optional":
          break;
        case "throw":
          throwing.push(c.key);
          break;
        case "default":
          result[key] = c.default as T[typeof key];
          break;
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
    handling: "default",
    default: "model/naist-jdic",
  },
  userDictionary: {
    key: "USER_DICTIONARY",
    handling: "optional",
  },
  models: {
    key: "MODELS",
    parse: (value) => value.split(","),
    handling: "default",
    default: ["model/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice"],
  },
});

export const { numThreads } = parse({
  numThreads: {
    key: "NUM_THREADS",
    parse: Number,
    handling: "default",
    default: 1,
  },
});
