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
  type DiscordGatewayAdapterCreator,
} from "@discordjs/voice";
import {
  Collection,
  Message,
  MessageCollector,
  type VoiceBasedChannel,
} from "discord.js";
import { synthesize } from "./synthesis";

export interface StateOptions
  extends CreateVoiceConnectionOptions,
    JoinVoiceChannelOptions {
  channelId: string;
}

export default class Pipeline extends EventEmitter<PipelineEventsMap> {
  static #cache = new Collection<string, Pipeline>();

  static get(guildId: string): Pipeline | null {
    return Pipeline.#cache.get(guildId) ?? null;
  }

  private connection?: VoiceConnection;
  private player?: AudioPlayer;
  private collector?: MessageCollector;
  private readonly audioQueue: AudioResource<{ message: Message }>[] = [];
  private playing?: AudioResource<{ message: Message }>;

  constructor(public readonly channel: VoiceBasedChannel) {
    super();
  }

  isBotOnly() {
    return this.channel.members.every((m) => m.user.bot);
  }

  init() {
    Pipeline.#cache.set(this.channel.guild.id, this);
    this.connection ??= joinVoiceChannel({
      channelId: this.channel.id,
      guildId: this.channel.guild.id,
      // HACK: voiceAdapterCreator as DiscordGatewayAdapterCreator
      // This is due to different versions of `discord-api-types`.
      adapterCreator: this.channel.guild
        .voiceAdapterCreator as DiscordGatewayAdapterCreator,
      selfDeaf: true,
    });
    this.player ??= createAudioPlayer();
    this.collector ??= this.channel.createMessageCollector({
      filter: (message) => !message.author.bot,
    });

    this.connection.subscribe(this.player);
    this.connection.on("stateChange", (_, newState) => {
      switch (newState.status) {
        case VoiceConnectionStatus.Ready:
          return this.emit("ready");
        case VoiceConnectionStatus.Disconnected:
          return this.emit("disconnect");
        case VoiceConnectionStatus.Destroyed:
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
      synthesize(message)
        .then((audio) => {
          if (audio != null) {
            this.emit("synthesis", audio);
          }
        })
        .catch((e: unknown) => this.emit("error", e));
    });
    this.on("synthesis", (audio) => {
      this.audioQueue.push(audio);
      this.play();
    });
    this.on("idle", () => {
      delete this.playing;
      this.play();
    });
  }

  async ready(signal?: AbortSignal) {
    await once(this, "ready", { signal });
  }

  play() {
    if (this.connection?.state.status !== VoiceConnectionStatus.Ready) return;
    if (this.player?.state.status !== AudioPlayerStatus.Idle) return;
    if (this.isHumanSpeaking()) return;
    const audio = this.audioQueue.shift();
    if (!audio) return;
    this.playing = audio;
    this.player.play(audio);
  }

  skip() {
    this.player?.stop();
    // then this.player#stateChange will be emitted
    return this.playing;
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
