import { parentPort, workerData } from "node:worker_threads";
import { AltJTalk } from "node-altjtalk-binding";
import { type Result, type Payload, isAltJTalkConfigValid } from "./common";

if (!isAltJTalkConfigValid(workerData))
  throw new Error("AltJTalk config is invalid.");
if (!parentPort) throw new Error("This file must be called as worker");

const synthesizer = AltJTalk.fromConfig(workerData);

parentPort.on("message", (payload: Payload) => {
  if (!parentPort) return;
  const data = synthesizer.synthesize(payload.inputText, payload.option);
  parentPort.postMessage({ data } satisfies Result);
});
