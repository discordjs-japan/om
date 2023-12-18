import { Message } from "discord.js";
import { SynthesisOption } from "node-altjtalk-binding";

export function createSynthesisOption(_: Message): SynthesisOption {
  return {
    additionalHalfTone: -5,
    speechSpeedRate: 1.2,
  };
}
