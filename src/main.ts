import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import * as join from "./commands/join";
import * as leave from "./commands/leave";
import * as skip from "./commands/skip";
import * as version from "./commands/version";
import { ReplyableError } from "./error";
import Pipeline from "./pipeline";
import { OM_VERSION } from "./version";

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
      case "version":
        return await version.handler(interaction);
      case "join":
        return await join.handler(interaction);
      case "leave":
        return await leave.handler(interaction);
      case "skip":
        return await skip.handler(interaction);
      default:
        throw new Error("不明なコマンドです。");
    }
  } catch (e) {
    if (!(e instanceof ReplyableError)) console.error(e);
    await interaction[interaction.replied ? "followUp" : "reply"](
      ReplyableError.from(e).toReply(),
    );
  }
});

client.on(Events.VoiceStateUpdate, async (_, n) => {
  const pipeline = Pipeline.get(n.guild.id);

  if (!pipeline) return;
  if (!pipeline.isBotOnly()) return;

  await pipeline.disconnect();
  await pipeline.channel
    .send("ボイスチャンネルに誰もいなくなったため退出しました。")
    .catch(console.error);
});

client.once(Events.ClientReady, async (client) => {
  process.title = "discordbot-om";
  client.application.commands.cache.clear();
  await client.application.commands.set([
    version.definition,
    join.definition,
    leave.definition,
    skip.definition,
  ]);
  client.user.setActivity({
    type: ActivityType.Custom,
    name: `v${OM_VERSION}`,
  });
});

function shutdown() {
  void client.destroy().then(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void client.login();
