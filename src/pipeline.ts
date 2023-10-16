/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { EventEmitter } from "events";
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
import { synthesis } from "./synthesis";

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

  public readonly connection: VoiceConnection;
  public readonly player: AudioPlayer;
  private readonly collector: MessageCollector;
  private messageQueue: Message[] = [];
  private audioQueue: AudioResource[] = [];
  private isSynthesizing = false;

  constructor(public readonly channel: VoiceBasedChannel) {
    super();
    Pipeline.#cache.set(channel.guild.id, this);

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.player = createAudioPlayer();
    this.collector = channel.createMessageCollector({
      filter: (message) => !message.author.bot,
    });

    this.init();
  }

  init() {
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

    this.on("ready", () => {
      this.play();
    });
    this.on("disconnect", () => {
      this.destroy();
    });
    this.on("destroy", () => {
      Pipeline.#cache.delete(this.channel.guild.id);
    });
    this.on("message", (message) => {
      this.messageQueue.push(message);
      this.synthesis();
    });
    this.on("synthesis", (audio) => {
      this.audioQueue.push(audio);
      this.play();
      this.synthesis();
    });
    this.on("idle", () => {
      this.play();
    });
  }

  synthesis() {
    if (this.isSynthesizing) return;
    const message = this.messageQueue.shift();
    if (!message) return;
    this.isSynthesizing = true;
    void synthesis(message)
      .then((audio) => this.emit("synthesis", audio))
      .finally(() => (this.isSynthesizing = false));
  }

  play() {
    if (this.connection.state.status !== VoiceConnectionStatus.Ready) return;
    if (this.player.state.status !== AudioPlayerStatus.Idle) return;
    const audio = this.audioQueue.shift();
    if (!audio) return;
    this.player.play(audio);
  }

  destroy() {
    this.connection.destroy();
    this.player.stop(true);
    this.collector.stop();
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
    static once(emitter: Pipeline, event: keyof PipelineEvents): Promise<void>;
  }
}
