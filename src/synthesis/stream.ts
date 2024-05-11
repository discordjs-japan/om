import { Readable } from "stream";
import type { AltJTalk, SynthesisOption } from "node-altjtalk-binding";

export class SpeechStream extends Readable {
  #frames: Buffer[] = [];
  #requested: number = 0;

  constructor(
    readonly altJtalk: AltJTalk,
    readonly inputText: string,
    readonly option: SynthesisOption = {},
  ) {
    super({ objectMode: true });
  }

  _construct(callback: (error?: Error | null | undefined) => void): void {
    try {
      this.altJtalk.synthesize(this.inputText, this.option, (err, frame) => {
        if (err) this.emit("error", err);
        else {
          if (this.#requested > 0) {
            this.push(frame.length > 0 ? frame : null);
            this.#requested--;
          } else this.#frames.push(frame);
        }
      });
      callback();
    } catch (error) {
      if (error instanceof Error) callback(error);
      else callback(new Error("An unknown error occurred"));
    }
  }

  _read() {
    const frame = this.#frames.shift();
    if (frame) this.push(frame.length > 0 ? frame : null);
    else this.#requested++;
  }
}
