import { Client, Events, GatewayIntentBits } from "discord.js";
import * as join from "./commands/join";
import * as leave from "./commands/leave";
import { ReplyableError } from "./error";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inCachedGuild()) return;
  if (!interaction.isChatInputCommand()) return;
  try {
    switch (interaction.commandName) {
      case "join":
        return await join.handler(interaction);
      case "leave":
        return await leave.handler(interaction);
      default:
        throw new Error("不明なコマンドです。");
    }
  } catch (e) {
    if (!(e instanceof ReplyableError)) console.error(e);
    await interaction.reply(ReplyableError.from(e).toReply());
  }
});

client.once(Events.ClientReady, async (client) => {
  client.application.commands.cache.clear();
  await client.application.commands.set([join.definition, leave.definition]);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

void client.login();
