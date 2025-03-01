import { MessageReferenceType, type Message } from "discord.js";
import { cleanMarkdown, cleanTwemojis } from "./clean";
import { ignoreParenContent } from "./ignore";

function getPrefixFromReference(message: Message) {
  switch (message.reference?.type) {
    case MessageReferenceType.Default: {
      if (!message.mentions.repliedUser) return "";
      return cleanTwemojis(message.mentions.repliedUser.displayName);
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
  const ignoredText = ignoreParenContent(`${prefix} ${cleanText}`);
  return truncateText(ignoredText);
}
