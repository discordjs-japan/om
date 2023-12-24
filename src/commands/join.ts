import {
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  ChannelType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { ReplyableError } from "../error";
import Pipeline from "../pipeline";

export const definition = {
  name: "join",
  description:
    "ボイスチャンネルに参加します。デフォルトではあなたがいるボイスチャンネルに参加します。",
  options: [
    {
      name: "channel",
      description: "参加するボイスチャンネル",
      type: ApplicationCommandOptionType.Channel,
      required: false,
      channel_types: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
    },
  ],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

type AllowedChannelType =
  (typeof definition.options)[0]["channel_types"][number];

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  const channel =
    interaction.options.getChannel<AllowedChannelType>("channel") ??
    interaction.member.voice.channel;
  if (!channel) {
    throw new ReplyableError(
      "ボイスチャンネルに参加するか、チャンネルを指定してください。",
    );
  }
  if (!channel.joinable) {
    throw new ReplyableError("ボイスチャンネルに接続する権限がありません。");
  }
  if (Pipeline.get(channel.guildId) != null) {
    throw new ReplyableError("すでにボイスチャンネルに接続しています。");
  }
  if (channel.members.filter((m) => !m.user.bot).size === 0) {
    throw new ReplyableError(
      "無人のボイスチャンネルに接続することはできません。",
    );
  }
  const pipeline = new Pipeline(channel);
  pipeline.init();
  const abortController = new AbortController();
  const signal = abortController.signal;
  setTimeout(() => {
    abortController.abort();
  }, 15_000);
  await Promise.all([
    interaction.deferReply(),
    pipeline.ready(signal).catch((err) => {
      if (!pipeline.isDestroyed()) pipeline.disconnect().catch(console.error);
      if (!signal.aborted) throw err;
    }),
  ]);

  if (signal.aborted) {
    await interaction.editReply("ボイスチャンネルに接続できませんでした。");
    return;
  }
  await interaction.editReply(`${channel}に参加しました。`);
}
