import {
  JBONSAI_VERSION,
  JPREPROCESS_VERSION,
  OM_SYRINX_VERSION,
} from "@discordjs-japan/om-syrinx";
import {
  InteractionContextType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { OM_VERSION } from "../version";

export const definition = {
  name: "version",
  description: "バージョン情報を表示します。",
  contexts: [InteractionContextType.Guild],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  await interaction.reply({
    content: `\`\`\`
discordjs-japan/om: ${OM_VERSION}
discordjs-japan/om-syrinx: ${OM_SYRINX_VERSION}
jpreprocess/jpreprocess: ${JPREPROCESS_VERSION}
jpreprocess/jbonsai: ${JBONSAI_VERSION}
\`\`\``,
    flags: MessageFlags.Ephemeral,
  });
}
