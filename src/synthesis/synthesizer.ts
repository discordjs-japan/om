import { AudioResource } from "@discordjs/voice";
import { Message } from "discord.js";

export interface Synthesizer {
  dispatchSynthesis(message: Message): void;
  on<K extends keyof SynthesizerEvents>(
    event: K,
    listener: (...args: SynthesizerEvents[K]) => void,
  ): this;
}

export interface SynthesizerEvents {
  synthesis: [resource: AudioResource, message: Message];
}
