import { parentPort, workerData } from "node:worker_threads";
import { AltJTalk } from "node-altjtalk-binding";
import { Result, Task, isAltJTalkConfigValid } from "./common";

if (!isAltJTalkConfigValid(workerData))
  throw new Error("AltJTalk config is invalid.");
if (!parentPort) throw new Error("This file must be called as worker");

const synthesizer = AltJTalk.fromConfig(workerData);

parentPort.on("message", (task: Task) => {
  if (!parentPort) return;
  const data = synthesizer.synthesize(task.inputText, task.option);
  parentPort.postMessage({ data } satisfies Result);
});
