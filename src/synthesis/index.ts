import type { Synthesizer } from "./synthesizer";
import WorkerSynthesizer from "./worker-synthesizer";

export const synthesizer: Synthesizer = new WorkerSynthesizer(
  process.env.DICTIONARY ?? "model/naist-jdic",
  process.env.MODEL ?? "model/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice",
);
