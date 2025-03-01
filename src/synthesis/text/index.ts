import { MessageReferenceType, type Message } from "discord.js";
import { cleanMarkdown, cleanTwemojis } from "./clean";
import { ignoreParenContent } from "./ignore";
import { resolveChannel } from "./resolve";

function truncateText(text: string) {
  return text.length > 200 ? `${text.slice(0, 196)} 以下略` : text;
}

function getPrefixFromReference(message: Message) {
  if (!message.reference) return "";

  switch (message.reference.type) {
    case MessageReferenceType.Default: {
      const refMessage = message.channel.messages.cache.get(
        message.reference.messageId ?? "",
      );
      if (!refMessage?.member) return "";
      return cleanTwemojis(refMessage.member.displayName);
    }

    case MessageReferenceType.Forward: {
      const resolution = resolveChannel(message.reference, message.guild);
      if (resolution.type === "resolved")
        return `転送された${cleanTwemojis(resolution.channel.name)}のメッセージ`;
      else return "転送されたメッセージ";
    }
  }
}

export function getInputText(message: Message) {
  const cleanText = cleanMarkdown(message);
  const prefixText = getPrefixFromReference(message);
  const ignoredText = ignoreParenContent(prefixText + " " + cleanText);
  return truncateText(ignoredText);
}
