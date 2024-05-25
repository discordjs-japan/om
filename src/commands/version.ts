import {
  JBONSAI_VERSION,
  JPREPROCESS_VERSION,
  OM_SYRINX_VERSION,
} from "@discordjs-japan/om-syrinx";
import type {
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { OM_VERSION } from "../version";

export const definition = {
  name: "version",
  description: "バージョン情報を表示します。",
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function handler(
  interaction: ChatInputCommandInteraction<"cached">,
) {
  await interaction.reply({
    content: `\`\`\`
om: ${OM_VERSION}
om-syrinx: ${OM_SYRINX_VERSION}
jpreprocess: ${JPREPROCESS_VERSION}
jbonsai: ${JBONSAI_VERSION}
\`\`\``,
    ephemeral: true,
  });
}
