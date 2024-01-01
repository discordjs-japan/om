import type { AltJTalkConfig } from "node-altjtalk-binding";

interface Parse<T> {
  parse(this: void, value: string): T;
}

interface Default<T> {
  default: T;
}

interface Throw {
  throw: true;
}

interface Key {
  key: string;
}

type ConfigRecord<T extends object> = {
  [K in keyof T]-?: Key &
    (undefined extends T[K] ? unknown : Default<Required<T>[K]> | Throw) &
    (T[K] extends string | undefined
      ? Partial<Parse<Required<T>[K]>>
      : Parse<Required<T>[K]>);
};

function parse<T extends object>(config: ConfigRecord<T>): T {
  const result = {} as T;
  for (const key in config) {
    const c = config[key];
    const value = process.env[c.key];
    if (value === undefined) {
      // c may have property "default" of value undefined, so we have to check with "in"
      if ("default" in c) {
        // c.default has type `T[typeof key]` if it exists.
        result[key] = c.default as T[typeof key];
      } else if ("throw" in c) {
        throw new Error(`Environment variable ${c.key} is not defined.`);
      }
      // one of following is true:
      // - c has property "default"
      // - c has property "throw"
      // - the key is optional
    } else {
      if (c.parse) {
        result[key] = c.parse(value);
      } else {
        // c.parse is optional only if T[typeof key] is string
        result[key] = value as T[typeof key];
      }
    }
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
});
