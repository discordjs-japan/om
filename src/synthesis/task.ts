import { parentPort } from "node:worker_threads";
import {
  AltJTalk,
  AltJTalkConfig,
  SynthesisOption,
} from "node-altjtalk-binding";

export type Task =
  | {
      type: "setup";
      config: AltJTalkConfig;
    }
  | {
      type: "task";
      inputText: string;
      option: SynthesisOption;
    };

export type Result = {
  type: "task";
  data: Int16Array;
};

let synthesizer: AltJTalk | undefined = undefined;

if (parentPort) {
  parentPort.on("message", (task: Task) => {
    if (!parentPort) return;

    switch (task.type) {
      case "setup":
        synthesizer = AltJTalk.fromConfig(task.config);
        break;
      case "task": {
        if (!synthesizer) throw new Error("Synthesizer is not initialized!");
        const data = synthesizer.synthesize(task.inputText, task.option);
        parentPort.postMessage({
          type: "task",
          data,
        } satisfies Result);
        break;
      }
    }
  });
}
