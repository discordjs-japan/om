import { Synthesizer } from "./synthesizer";
import WorkerSynthesizer from "./worker-synthesizer";

export const synthesizer: Synthesizer = new WorkerSynthesizer(
  process.env.DICTIONARY ?? "/app/model/naist-jdic",
  process.env.MODEL ??
    "/app/model/hts_voice_nitech_jp_atr503_m001-1.05/nitech_jp_atr503_m001.htsvoice",
);
