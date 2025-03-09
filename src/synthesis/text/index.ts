import { MessageReferenceType, type Message } from "discord.js";
import { getSuffixFromAttachments } from "./attachments";
import { cleanMarkdown, cleanTwemojis } from "./clean";
import { ignoreParenContent } from "./ignore";

function getPrefixFromReference(message: Message) {
  switch (message.reference?.type) {
    case MessageReferenceType.Default: {
      if (!message.mentions.repliedUser) return "";
      // The message_reference does not contain member information, so it may not be resolvable
      const member =
        message.guild?.members.resolve(message.mentions.repliedUser) ??
        message.mentions.repliedUser;
      return cleanTwemojis(member.displayName);
    }

    case MessageReferenceType.Forward:
      return "転送されたメッセージ";

    default:
      return "";
  }
}

function truncateText(text: string) {
  return text.length > 200 ? `${text.slice(0, 196)} 以下略` : text;
}

export function getInputText(message: Message) {
  const prefix = getPrefixFromReference(message);
  const cleanText = cleanMarkdown(message);
  const suffix = getSuffixFromAttachments(message);
  const ignoredText = ignoreParenContent(`${prefix} ${cleanText} ${suffix}`);
  return truncateText(ignoredText);
}
