import {
  InteractionContextType,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { ReplyableError } from "../error";
import Pipeline from "../pipeline";

export const definition = {
  name: "leave",
  description: "現在参加しているボイスチャンネルから退出します。",
  contexts: [InteractionContextType.Guild],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  const pipeline = Pipeline.get(interaction.guildId);
  if (!pipeline) {
    throw new ReplyableError("ボイスチャンネルに参加していません。");
  }
  await Promise.all([interaction.deferReply(), pipeline.disconnect()]);
  await interaction.editReply("退出しました。");
}
