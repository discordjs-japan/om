/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
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
import { synthesizer } from "./synthesis";

export interface StateOptions
  extends CreateVoiceConnectionOptions,
    JoinVoiceChannelOptions {
  channelId: string;
}

export default class Pipeline extends EventEmitter {
  static #cache = new Collection<string, Pipeline>();

  static get(guildId: string): Pipeline | null {
    return Pipeline.#cache.get(guildId) ?? null;
  }

  private connection?: VoiceConnection;
  private player?: AudioPlayer;
  private collector?: MessageCollector;
  private readonly audioQueue: AudioResource[] = [];

  constructor(public readonly channel: VoiceBasedChannel) {
    super();
    Pipeline.#cache.set(channel.guild.id, this);
  }

  isBotOnly() {
    return this.channel.members.every((m) => m.user.bot);
  }

  init() {
    this.connection ??= joinVoiceChannel({
      channelId: this.channel.id,
      guildId: this.channel.guild.id,
      adapterCreator: this.channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.player ??= createAudioPlayer();
    this.collector ??= this.channel.createMessageCollector({
      filter: (message) =>
        !message.author.bot && !message.content.startsWith(";"),
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
    synthesizer.on("synthesis", (resource, message) => {
      if (message.channelId !== this.channel.id) return;
      this.emit("synthesis", resource);
    });

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
      synthesizer.dispatchSynthesis(message);
    });
    this.on("synthesis", (audio) => {
      this.audioQueue.push(audio);
      this.play();
    });
    this.on("idle", () => {
      this.play();
    });
  }

  async ready(signal?: AbortSignal) {
    await once(this, "ready", { signal });
  }

  play() {
    if (this.connection?.state.status !== VoiceConnectionStatus.Ready) return;
    if (this.player?.state.status !== AudioPlayerStatus.Idle) return;
    const audio = this.audioQueue.shift();
    if (!audio) return;
    this.player.play(audio);
  }

  skip() {
    this.player?.stop();
    // then this.player#stateChange will be emitted
  }

  isDisconnected() {
    return (
      !this.connection ||
      this.connection.state.status === VoiceConnectionStatus.Disconnected ||
      this.connection.state.status === VoiceConnectionStatus.Destroyed
    );
  }

  async disconnect(signal?: AbortSignal) {
    setImmediate(() => this.connection?.disconnect());
    await once(this, "disconnect", { signal });
  }
}

export default interface Pipeline {
  on<K extends keyof PipelineEvents>(
    event: K,
    listener: (...args: PipelineEvents[K]) => void,
  ): this;
  once<K extends keyof PipelineEvents>(
    event: K,
    listener: (...args: PipelineEvents[K]) => void,
  ): this;
  off<K extends keyof PipelineEvents>(
    event: K,
    listener: (...args: PipelineEvents[K]) => void,
  ): this;
  emit<K extends keyof PipelineEvents>(
    event: K,
    ...args: PipelineEvents[K]
  ): boolean;
}

interface PipelineEvents {
  ready: [];
  disconnect: [];
  destroy: [];
  idle: [];
  message: [message: Message];
  synthesis: [audio: AudioResource];
}

declare module "node:events" {
  class EventEmitter {
    static once(
      emitter: Pipeline,
      event: keyof PipelineEvents,
      options?: { signal?: AbortSignal | undefined },
    ): Promise<void>;
  }
}
