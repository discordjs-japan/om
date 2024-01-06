import type { AltJTalkConfig, SynthesisOption } from "node-altjtalk-binding";

export interface Payload {
  inputText: string;
  option: SynthesisOption;
}

export interface Result {
  data: Int16Array;
}

export function isAltJTalkConfigValid(arg: unknown): arg is AltJTalkConfig {
  return (
    typeof arg === "object" &&
    arg !== null &&
    "dictionary" in arg &&
    "models" in arg &&
    typeof arg.dictionary === "string" &&
    Array.isArray(arg.models) &&
    arg.models.every((s) => typeof s === "string") &&
    (!("userDictionary" in arg) || typeof arg.userDictionary === "string")
  );
}
