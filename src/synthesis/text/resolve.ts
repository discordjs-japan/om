import type { Guild, GuildBasedChannel } from "discord.js";

interface ExternalChannel {
  type: "external";
}

interface UnknownChannel {
  type: "unknown";
}

interface ResolvedChannel {
  type: "resolved";
  channel: GuildBasedChannel;
}

export type ChannelResolution =
  | ExternalChannel
  | UnknownChannel
  | ResolvedChannel;

export interface ChannelReference {
  guildId: string | undefined;
  channelId: string;
}

export function resolveChannel(
  reference: ChannelReference,
  guild: Guild | null,
): ChannelResolution {
  if (!reference.guildId || guild?.id !== reference.guildId)
    return { type: "external" };

  const channel = guild.channels.cache.get(reference.channelId);
  if (!channel) return { type: "unknown" };

  return { type: "resolved", channel };
}
