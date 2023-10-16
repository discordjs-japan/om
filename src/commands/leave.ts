import type {
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { ReplyableError } from "../error";
import Pipeline from "../pipeline";
import { once } from "events";

export const definition = {
  name: "leave",
  description: "現在参加しているボイスチャンネルから退出します。",
} satisfies RESTPostAPIApplicationCommandsJSONBody;

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  const pipeline = Pipeline.get(interaction.guildId);
  if (!pipeline) {
    throw new ReplyableError("ボイスチャンネルに参加していません。");
  }
  pipeline.connection.destroy();
  await Promise.all([interaction.deferReply(), once(pipeline, "destroy")]);
  await interaction.editReply("退出しました。");
}
