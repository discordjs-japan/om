import { parentPort, workerData } from "node:worker_threads";
import { AltJTalk } from "node-altjtalk-binding";
import { Result, Task, isAltJTalkConfigValid } from "./common";

if (!isAltJTalkConfigValid(workerData))
  throw new Error("AltJTalk config is invalid.");

const synthesizer: AltJTalk = AltJTalk.fromConfig(workerData);

if (parentPort) {
  parentPort.on("message", (task: Task) => {
    if (!parentPort) return;
    const data = synthesizer.synthesize(task.inputText, task.option);
    parentPort.postMessage({
      type: "task",
      data,
    } satisfies Result);
  });
}
