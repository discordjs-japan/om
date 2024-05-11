import {
  StreamType,
  createAudioResource,
  type AudioResource,
} from "@discordjs/voice";
import type { Message } from "discord.js";
import { AltJTalk } from "node-altjtalk-binding";
import { config } from "../env";
import { cleanMarkdown } from "./clean";
import { ignoreParenContent } from "./ignore";
import { createSynthesisOption } from "./options";
import { SpeechStream } from "./stream";

class Synthesizer {
  constructor(readonly altJtalk: AltJTalk) {}

  synthesize(message: Message): AudioResource {
    const inputText = ignoreParenContent(cleanMarkdown(message));
    const option = createSynthesisOption(message);
    const stream = new SpeechStream(this.altJtalk, inputText, option);
    return createAudioResource(stream, { inputType: StreamType.Opus });
  }
}

export type { Synthesizer };

const altJtalk = AltJTalk.fromConfig(config);
export const synthesizer = new Synthesizer(altJtalk);
