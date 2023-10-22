import { Synthesizer } from "./synthesizer";
import WorkerSynthesizer from "./worker-synthesizer";

if (!process.env.DICTIONARY || !process.env.MODEL) {
  throw new Error("Dictionary and model must be specified.");
}
export const synthesizer: Synthesizer = new WorkerSynthesizer(
  process.env.DICTIONARY,
  process.env.MODEL,
);
