import { EventEmitter, once } from "events";
import {
  joinVoiceChannel,
  type CreateVoiceConnectionOptions,
  type JoinVoiceChannelOptions,
  type VoiceConnection,
  VoiceConnectionStatus,
  AudioPlayer,
  createAudioPlayer,
  AudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import {
  Collection,
  Message,
  MessageCollector,
  type VoiceBasedChannel,
} from "discord.js";
import type { Logger } from "pino";
import { logger } from "./logger";
import { synthesize } from "./synthesis";

export interface StateOptions
  extends CreateVoiceConnectionOptions, JoinVoiceChannelOptions {
  channelId: string;
}

export default class Pipeline extends EventEmitter<PipelineEventsMap> {
  static #cache = new Collection<string, Pipeline>();

  static get(guildId: string): Pipeline | null {
    return Pipeline.#cache.get(guildId) ?? null;
  }

  private readonly logger: Logger;

  private connection?: VoiceConnection;
  private player?: AudioPlayer;
  private collector?: MessageCollector;
  private readonly audioQueue: AudioResource<{ message: Message }>[] = [];
  private playing?: AudioResource<{ message: Message }>;

  constructor(public readonly channel: VoiceBasedChannel) {
    super();
    this.logger = logger.child({
      guildId: channel.guild.id,
      channelId: channel.id,
    });
  }

  isBotOnly() {
    return this.channel.members.every((m) => m.user.bot);
  }

  init() {
    Pipeline.#cache.set(this.channel.guild.id, this);
    this.logger.info("Initializing pipeline");
    this.connection ??= joinVoiceChannel({
      channelId: this.channel.id,
      guildId: this.channel.guild.id,
      adapterCreator: this.channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.player ??= createAudioPlayer();
    this.collector ??= this.channel.createMessageCollector({
      filter: (message) => !message.author.bot,
    });

    this.connection.subscribe(this.player);
    this.connection.on("stateChange", (oldState, newState) => {
      this.logger.debug(
        { oldState: oldState.status, newState: newState.status },
        "Voice connection state changed",
      );
      switch (newState.status) {
        case VoiceConnectionStatus.Ready:
          this.logger.info("Voice connection ready");
          return this.emit("ready");
        case VoiceConnectionStatus.Disconnected:
          this.logger.info("Voice connection disconnected");
          return this.emit("disconnect");
        case VoiceConnectionStatus.Destroyed:
          this.logger.info("Voice connection destroyed");
          return this.emit("destroy");
      }
    });
    this.connection.receiver.speaking.on("end", () => {
      // wait for ...speaking.users to be updated before this.play()
      setImmediate(() => this.play());
    });
    this.player.on("stateChange", (_, newState) => {
      switch (newState.status) {
        case AudioPlayerStatus.Idle:
          return this.emit("idle");
      }
    });
    this.collector.on(
      "collect",
      (message) => void this.emit("message", message),
    );

    this.on("ready", () => {
      this.play();
    });
    this.on("disconnect", () => {
      this.connection?.destroy();
    });
    this.on("destroy", () => {
      Pipeline.#cache.delete(this.channel.guild.id);
      this.player?.stop(true);
      this.collector?.stop();
    });
    this.on("message", (message) => {
      this.logger.debug(
        { messageId: message.id },
        "Received message to synthesize",
      );
      synthesize(message)
        .then((audio) => {
          if (audio != null) {
            this.logger.debug(
              { messageId: message.id },
              "Successfully synthesized message",
            );
            this.emit("synthesis", audio);
          } else {
            this.logger.debug(
              { messageId: message.id },
              "Message synthesis skipped due to empty audio",
            );
          }
        })
        .catch((e: unknown) => {
          this.logger.error(
            { error: e, messageId: message.id },
            "Failed to synthesize message",
          );
          this.emit("error", e);
        });
    });
    this.on("synthesis", (audio) => {
      this.logger.debug("Adding synthesized audio to queue");
      this.audioQueue.push(audio);
      this.play();
    });
    this.on("idle", () => {
      this.logger.debug("Audio player became idle");
      delete this.playing;
      this.play();
    });

    this.logger.info("Pipeline initialized");
  }

  async ready(signal?: AbortSignal) {
    await once(this, "ready", { signal });
  }

  play() {
    if (this.connection?.state.status !== VoiceConnectionStatus.Ready) {
      this.logger.debug("Skipping play: connection not ready");
      return;
    }
    if (this.player?.state.status !== AudioPlayerStatus.Idle) {
      this.logger.debug("Skipping play: player not idle");
      return;
    }
    if (this.isHumanSpeaking()) {
      this.logger.debug("Skipping play: human is speaking");
      return;
    }
    const audio = this.audioQueue.shift();
    if (!audio) {
      this.logger.debug("Skipping play: no audio in queue");
      return;
    }
    this.playing = audio;
    this.logger.debug(
      { messageId: audio.metadata.message.id },
      "Playing audio",
    );
    this.player.play(audio);
  }

  skip() {
    const skipped = this.playing;
    if (skipped) {
      this.logger.info(
        { messageId: skipped.metadata.message.id },
        "Skipping current audio",
      );
    }
    this.player?.stop();
    return skipped;
  }

  isDisconnected() {
    return (
      !this.connection ||
      this.connection.state.status === VoiceConnectionStatus.Disconnected ||
      this.connection.state.status === VoiceConnectionStatus.Destroyed
    );
  }

  isHumanSpeaking() {
    return new Collection(this.connection?.receiver.speaking.users).some(
      (epoch, id) => this.channel.client.users.cache.get(id)?.bot === false,
    );
  }

  async disconnect(signal?: AbortSignal) {
    this.logger.info("Disconnecting from voice channel");
    setImmediate(() => this.connection?.disconnect());
    await once(this, "disconnect", { signal });
  }
}

interface PipelineEventsMap {
  ready: [];
  disconnect: [];
  destroy: [];
  idle: [];
  message: [message: Message];
  synthesis: [audio: AudioResource<{ message: Message }>];
  error: [error: unknown];
}
