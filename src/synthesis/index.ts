import { Synthesizer } from "./synthesizer";
import WorkerSynthesizer from "./worker-synthesizer";

export const synthesizer: Synthesizer = new WorkerSynthesizer(
  process.env.DICTIONARY ?? "/app/model/naist-jdic",
  process.env.MODEL ??
    "/app/model/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice",
);
