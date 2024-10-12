import {
  InteractionContextType,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { ReplyableError } from "../error";
import Pipeline from "../pipeline";

export const definition = {
  name: "skip",
  description: "現在読み上げ中のメッセージの読み上げを中止します。",
  contexts: [InteractionContextType.Guild],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  const pipeline = Pipeline.get(interaction.guildId);
  if (!pipeline) {
    throw new ReplyableError("ボイスチャンネルに参加していません。");
  }
  const playing = pipeline.skip();
  if (!playing) {
    throw new ReplyableError("読み上げ中のメッセージがありません。");
  }

  await interaction.reply({
    content: "読み上げを中止しました。",
    ephemeral: playing.metadata.message.author.id === interaction.user.id,
  });
}
