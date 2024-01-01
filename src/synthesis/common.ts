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
    isStringArray(arg.models)
  );
}

export function isStringArray(arg: unknown): arg is string[] {
  return (
    Array.isArray(arg) &&
    arg.every((elem): elem is string => typeof elem === "string")
  );
}
