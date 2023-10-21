import { Readable } from "node:stream";
import { StreamType, createAudioResource } from "@discordjs/voice";
import { AltJTalkConfig } from "node-altjtalk-binding";
import { Result, Task } from "./common";
import WorkerPool from "./worker-pool";

export class SynthesisWorkerPool extends WorkerPool<
  Task,
  Result,
  AltJTalkConfig,
  object
> {
  constructor(dictionary: string, model: string) {
    super(
      new URL("task", import.meta.url),
      {
        dictionary,
        model,
      },
      process.env.NUM_THREADS ? Number(process.env.NUM_THREADS) : 1,
    );
    this.on("data", ({ data }: Result) => {
      const resource = createAudioResource(new SynthesizedSoundStream(data), {
        inputType: StreamType.Raw,
      });
      this.emit("synthesis", resource);
    });
  }

  public dispatchSynthesis(inputText: string) {
    this.dispatchTask(
      {
        inputText,
        option: {
          samplingFrequency: 48000,
        },
      },
      {},
    );
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
