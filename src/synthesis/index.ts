import type { Synthesizer } from "./synthesizer";
import WorkerSynthesizer from "./worker-synthesizer";

function parseStringArray(arg: string) {
  const data: unknown = JSON.parse(arg);
  if (
    Array.isArray(data) &&
    data.every((elem): elem is string => typeof elem === "string")
  ) {
    return data;
  } else {
    throw new Error(`${arg} is not array of string`);
  }
}

export const synthesizer: Synthesizer = new WorkerSynthesizer(
  process.env.DICTIONARY ?? "model/naist-jdic",
  process.env.DICTIONARY
    ? process.env.USER_DICTIONARY
    : "model/user-dictionary.bin",
  process.env.MODEL
    ? parseStringArray(process.env.MODEL)
    : ["model/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice"],
);
