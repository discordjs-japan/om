import { Readable } from "node:stream";

export default class SynthesizedSoundStream extends Readable {
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
