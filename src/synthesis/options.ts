import { Message } from "discord.js";
import { SynthesisOption } from "node-altjtalk-binding";

class SeededRng {
  private static readonly A = 48271n;
  private static readonly M = 2147483647n;

  private x: bigint;

  constructor(seed: string) {
    try {
      this.x = BigInt(seed);
    } catch {
      this.x = 0n;
    }
  }

  next() {
    this.x = (SeededRng.A * this.x) % SeededRng.M;
  }

  /**
   * @param exponent must be positive odd integer. the bigger, the more likely to be near mean.
   */
  range(mean: number, radius: number, exponent = 1): number {
    this.next();
    const disk = (2 * Number(this.x)) / Number(SeededRng.M) - 1;
    return mean + disk ** exponent * radius;
  }
}

export function createSynthesisOption(message: Message): SynthesisOption {
  const rng = new SeededRng(message.author.id);

  return {
    additionalHalfTone: rng.range(-4, 3),
    speechSpeedRate: rng.range(1.2, 0.3, 3),
    weightOfGvForLogF0: Math.exp(rng.range(0, 1, 3)),
  };
}
