/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import EventEmitter from "events";
import { StreamType, createAudioResource } from "@discordjs/voice";
import { Message } from "discord.js";
import { AltJTalkConfig } from "node-altjtalk-binding";
import { Result, Task } from "./common";
import { createSynthesisOption } from "./options";
import SynthesizedSoundStream from "./stream";
import { Synthesizer, SynthesizerEvents } from "./synthesizer";
import WorkerPool from "./worker-pool";

export default class WorkerSynthesizer
  extends EventEmitter
  implements Synthesizer
{
  workerPool: WorkerPool<Task, Result, AltJTalkConfig, Message>;

  constructor(dictionary: string, model: string) {
    super();
    this.workerPool = new WorkerPool(
      new URL("task", import.meta.url),
      {
        dictionary,
        model,
      },
      process.env.NUM_THREADS ? Number(process.env.NUM_THREADS) : 1,
    );
    this.workerPool.on("data", ({ data }: Result, message) => {
      const resource = createAudioResource(new SynthesizedSoundStream(data), {
        inputType: StreamType.Raw,
      });
      this.emit("synthesis", resource, message);
    });
  }

  public dispatchSynthesis(message: Message) {
    const inputText =
      message.cleanContent.length > 200
        ? `${message.cleanContent.slice(0, 196)} 以下略`
        : message.cleanContent;
    const option = createSynthesisOption(message);

    this.workerPool.dispatchTask(
      {
        inputText,
        option: {
          ...option,
          samplingFrequency: 48000,
        },
      },
      message,
    );
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
