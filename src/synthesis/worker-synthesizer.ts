/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import EventEmitter from "events";
import { StreamType, createAudioResource } from "@discordjs/voice";
import { Message } from "discord.js";
import type { AltJTalkConfig } from "node-altjtalk-binding";
import { cleanMarkdown } from "./clean";
import type { Result, Payload } from "./common";
import { ignoreParenContent } from "./ignore";
import { createSynthesisOption } from "./options";
import SynthesizedSoundStream from "./stream";
import type { Synthesizer, SynthesizerEvents } from "./synthesizer";
import WorkerPool from "./worker-pool";

interface Task {
  payload: Payload;
  message: Message;
}

export default class WorkerSynthesizer
  extends EventEmitter
  implements Synthesizer
{
  workerPool: WorkerPool<Task, Result, AltJTalkConfig>;

  constructor(config: AltJTalkConfig, numThreads: number) {
    super();
    this.workerPool = new WorkerPool(
      new URL("task", import.meta.url),
      config,
      numThreads,
    );
    this.workerPool.on("data", ({ data }, { message }) => {
      const resource = createAudioResource(new SynthesizedSoundStream(data), {
        inputType: StreamType.Raw,
      });
      this.emit("synthesis", resource, message);
    });
  }

  public dispatchSynthesis(message: Message) {
    const cleanText = cleanMarkdown(message);
    const ignoredText = ignoreParenContent(cleanText);
    const inputText =
      ignoredText.length > 200
        ? `${ignoredText.slice(0, 196)} 以下略`
        : ignoredText;
    const option = createSynthesisOption(message);
    option.samplingFrequency = 48000;

    this.workerPool.queueTask({
      payload: { inputText, option },
      message,
    });
  }
}

export default interface WorkerSynthesizer {
  on<K extends keyof SynthesizerEvents>(
    event: K,
    listener: (...args: SynthesizerEvents[K]) => void,
  ): this;
  once<K extends keyof SynthesizerEvents>(
    event: K,
    listener: (...args: SynthesizerEvents[K]) => void,
  ): this;
  off<K extends keyof SynthesizerEvents>(
    event: K,
    listener: (...args: SynthesizerEvents[K]) => void,
  ): this;
  emit<K extends keyof SynthesizerEvents>(
    event: K,
    ...args: SynthesizerEvents[K]
  ): boolean;
}
