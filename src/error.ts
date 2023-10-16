import { InteractionReplyOptions } from "discord.js";

export class ReplyableError extends Error {
  public static from(e: unknown) {
    if (e instanceof ReplyableError) return e;
    if (e instanceof Error) return new ReplyableError(e.message);
    return new ReplyableError(String(e));
  }

  constructor(message: string) {
    super(message);
  }

  public toReply(): InteractionReplyOptions {
    return {
      content: this.message,
      ephemeral: true,
    };
  }
}
