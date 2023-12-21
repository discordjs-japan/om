import type {
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { ReplyableError } from "../error";
import Pipeline from "../pipeline";

export const definition = {
  name: "skip",
  description: "現在読み上げ中のメッセージの読み上げを中止します。",
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  const pipeline = Pipeline.get(interaction.guildId);
  if (!pipeline) {
    throw new ReplyableError("ボイスチャンネルに参加していません。");
  }
  pipeline.skip();
  await interaction.reply({
    content: "読み上げを中止しました。",
    ephemeral: true,
  });
}
