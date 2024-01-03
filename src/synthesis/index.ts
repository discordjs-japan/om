import { config, numThreads } from "../env";
import type { Synthesizer } from "./synthesizer";
import WorkerSynthesizer from "./worker-synthesizer";

export const synthesizer: Synthesizer = new WorkerSynthesizer(
  config,
  numThreads,
);
