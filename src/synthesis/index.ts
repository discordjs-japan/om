import { once } from "node:events";
import { StreamType, createAudioResource } from "@discordjs/voice";
import { EncoderType, Syrinx } from "@discordjs-japan/om-syrinx";
import type { Message } from "discord.js";
import { config } from "../env";
import { createSynthesisOption } from "./options";
import { getInputText } from "./text";

const syrinx = Syrinx.fromConfig({
  ...config,
  encoder: { type: EncoderType.Opus },
});

export async function synthesize(message: Message) {
  const inputText = getInputText(message);
  const option = createSynthesisOption(message);

  const stream = syrinx.synthesize(inputText, option);
  await once(stream, "readable");

  if (stream.readableLength === 0) return null;
  return createAudioResource(stream, {
    inputType: StreamType.Opus,
    metadata: { message },
  });
}
