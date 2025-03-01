import type { Message } from "discord.js";
import { cleanMarkdown } from "./clean";
import { ignoreParenContent } from "./ignore";

function truncateText(text: string) {
  return text.length > 200 ? `${text.slice(0, 196)} 以下略` : text;
}

export function getInputText(message: Message) {
  const cleanText = cleanMarkdown(message);
  const ignoredText = ignoreParenContent(cleanText);
  return truncateText(ignoredText);
}
