import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import * as join from "./commands/join";
import * as leave from "./commands/leave";
import * as skip from "./commands/skip";
import * as version from "./commands/version";
import { ReplyableError } from "./error";
import { logger } from "./logger";
import Pipeline from "./pipeline";
import { OM_VERSION } from "./version";

process.title = "discordjs-japan/om";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  presence: {
    activities: [
      {
        type: ActivityType.Custom,
        name: OM_VERSION,
      },
    ],
  },
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inCachedGuild()) return;
  if (!interaction.isChatInputCommand()) return;

  const interactionLogger = logger.child({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    command: interaction.commandName,
  });

  interactionLogger.debug("Command received");

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
    interactionLogger[e instanceof ReplyableError ? "info" : "error"](
      { error: e },
      "Command error",
    );
    await interaction[interaction.replied ? "followUp" : "reply"](
      ReplyableError.from(e).toReply(),
    );
  }
});

client.on(Events.VoiceStateUpdate, async (_, n) => {
  if (Pipeline.isShuttingDown()) return;

  const pipeline = Pipeline.get(n.guild.id);

  if (!pipeline) return;
  if (!pipeline.isBotOnly()) return;

  const voiceLogger = logger.child({
    guildId: n.guild.id,
    channelId: n.channel?.id,
  });

  voiceLogger.info("Auto-leaving empty voice channel");

  await pipeline.disconnect();
  await pipeline.channel
    .send("ボイスチャンネルに誰もいなくなったため退出しました。")
    .catch((error: unknown) =>
      // installation without create message permission is allowed
      voiceLogger.warn({ error }, "Failed to send leave message"),
    );
});

client.once(Events.ClientReady, async (client) => {
  logger.info(`Logged in as ${client.user.tag}`);
  client.application.commands.cache.clear();
  const commands = await client.application.commands.set([
    version.definition,
    join.definition,
    leave.definition,
    skip.definition,
  ]);
  const commandNames = Array.from(commands.keys()).join(", ");
  logger.info(`Slash commands registered: ${commandNames}`);
});

function shutdown(signal: NodeJS.Signals) {
  if (Pipeline.isShuttingDown()) return;

  logger.info(`Received ${signal}, shutting down`);

  void gracefulShutdown().catch((error: unknown) => {
    logger.error({ error }, "Failed to shut down gracefully");
    process.exit(1);
  });
}

async function gracefulShutdown() {
  const pipelines = Pipeline.beginShutdown();

  await Promise.race([
    Promise.allSettled(
      pipelines.map(async (pipeline) => {
        const pipelineLogger = logger.child({
          guildId: pipeline.channel.guild.id,
        });

        await pipeline.channel
          .send("シャットダウン処理が開始されたため退出します。")
          .catch((error: unknown) =>
            pipelineLogger.warn({ error }, "Failed to send shutdown notice"),
          );
      }),
    ),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  await client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("Starting bot");
void client.login();
