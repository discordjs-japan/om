import { once } from "events";
import {
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  ChannelType,
  type RESTPostAPIApplicationCommandsJSONBody,
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
} satisfies RESTPostAPIApplicationCommandsJSONBody;

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
  const pipeline = new Pipeline(channel);
  await Promise.all([interaction.deferReply(), once(pipeline, "ready")]);
  await interaction.editReply(`${channel}に参加しました。`);
}
