import { Readable } from "node:stream";
import { StreamType, createAudioResource } from "@discordjs/voice";
import { EncoderType, Syrinx } from "@discordjs-japan/om-syrinx";
import type { Message } from "discord.js";
import { config } from "../env";
import { cleanMarkdown } from "./clean";
import { ignoreParenContent } from "./ignore";
import { createSynthesisOption } from "./options";

const syrinx = Syrinx.fromConfig({
  ...config,
  encoder: { type: EncoderType.Opus },
});

export async function synthesize(message: Message) {
  const cleanText = cleanMarkdown(message);
  const ignoredText = ignoreParenContent(cleanText);
  const inputText =
    ignoredText.length > 200
      ? `${ignoredText.slice(0, 196)} 以下略`
      : ignoredText;
  const option = createSynthesisOption(message);

  const stream = syrinx.synthesize(inputText, option);
  // HACK: while `EventEmitter.once` or `once` from "node:events" somehow does not accept `Readable` type,
  // `Readable.once` does accept it because it refers to 'declare module "node:events" { /* snip */ }' in discord.js.
  // pay attention to https://github.com/discordjs/discord.js/pull/10360
  await Readable.once(stream, "readable");

  if (stream.readableLength === 0) return null;
  return createAudioResource(stream, {
    inputType: StreamType.Opus,
    metadata: { message },
  });
}
