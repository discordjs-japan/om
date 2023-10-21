import { Readable } from "node:stream";
import {
  AudioResource,
  StreamType,
  createAudioResource,
} from "@discordjs/voice";
import { Message } from "discord.js";
import { AltJTalkConfig, SynthesisOption } from "node-altjtalk-binding";
import { Result, Task } from "./common";
import WorkerPool from "./worker-pool";

class SynthesizeWorkerPool extends WorkerPool<Task, Result, AltJTalkConfig> {
  constructor(config: AltJTalkConfig, numThreads?: number) {
    super(new URL("task", import.meta.url), config, numThreads ?? 1);
  }

  public async synthesize(
    inputText: string,
    option: SynthesisOption,
  ): Promise<Int16Array> {
    const result = await this.runTask({ inputText, option });
    return result.data;
  }
}

class SynthesizedSoundStream extends Readable {
  private pos: number = 0;
  private buf: Int16Array | null;
  constructor(buf: Int16Array) {
    super();
    this.buf = buf;
  }
  _read(size: number = ((48000 * 2 * 2) / 1000) * 20) {
    if (!this.buf) {
      throw new Error("Stream ended");
    }

    const offset = this.pos;
    let end = Math.ceil(size / 4);
    if (end + offset > this.buf.length) {
      end = this.buf.length - offset;
    }
    const buf = Buffer.alloc(end * 4);
    const dst = new Int16Array(buf.buffer);
    for (let i = 0; i < end; ++i) {
      const elem = this.buf[i + offset];
      dst[i * 2] = elem;
      dst[i * 2 + 1] = elem;
    }
    this.push(buf);
    this.pos += end;
    if (this.pos == this.buf.length) {
      this.buf = null;
      this.push(null);
    }
  }
  _destroy() {
    this.buf = null;
  }
}

const pool =
  process.env.DICTIONARY && process.env.MODEL
    ? new SynthesizeWorkerPool(
        {
          dictionary: process.env.DICTIONARY,
          model: process.env.MODEL,
        },
        process.env.NUM_THREADS ? Number(process.env.NUM_THREADS) : undefined,
      )
    : undefined;

export async function synthesis(message: Message): Promise<AudioResource> {
  if (!pool) throw new Error("Please provide path to the dictionary and model");

  const content =
    message.cleanContent.length > 200
      ? `${message.cleanContent.slice(0, 190)} 以下略`
      : message.cleanContent;

  const data = await pool.synthesize(content, {
    samplingFrequency: 48000,
  });

  return createAudioResource(new SynthesizedSoundStream(data), {
    inputType: StreamType.Raw,
  });
}
