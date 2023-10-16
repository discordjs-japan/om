import { AudioResource, createAudioResource } from "@discordjs/voice";
import { Message } from "discord.js";
import { Readable } from "stream";

export async function synthesis(message: Message): Promise<AudioResource> {
  return createAudioResource(new Readable());
}
