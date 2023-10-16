import { Readable } from "stream";
import { AudioResource, createAudioResource } from "@discordjs/voice";
import { Message } from "discord.js";

// eslint-disable-next-line @typescript-eslint/require-await
export async function synthesis(_message: Message): Promise<AudioResource> {
  return createAudioResource(new Readable());
}
