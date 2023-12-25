import type { AltJTalkConfig, SynthesisOption } from "node-altjtalk-binding";

export interface Task {
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
    "model" in arg &&
    typeof arg.dictionary === "string" &&
    typeof arg.model === "string"
  );
}
