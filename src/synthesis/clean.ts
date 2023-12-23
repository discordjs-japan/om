import { parse, rules } from "discord-markdown-parser";
import type { Guild, Message } from "discord.js";
import { parserFor } from "simple-markdown";
import type { SingleASTNode, ASTNode } from "simple-markdown";

export function cleanMarkdown(message: Message) {
  const ast = parse(message.content, "extended");
  return text(ast, message.guild);
}

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
  timeStyle: "full",
});

function text(ast: ASTNode, guild: Guild | null): string {
  if (Array.isArray(ast)) {
    return ast.map((node) => text(node, guild)).join("");
  }

  switch (ast.type) {
    case "link":
    case "blockQuote":
    case "em":
    case "strong":
    case "underline":
    case "strikethrough":
      return text(astNodeOrEmpty(ast.content), guild);

    case "text":
    case "escape":
    case "inlineCode":
      return stringOrEmpty(ast.content);

    case "url": {
      const url = stringOrEmpty(ast.url);
      const discordUrl = parseDiscordUrl(url);
      if (!discordUrl) return " URL省略 ";
      if (guild?.id !== discordUrl.guildId) return " 外部サーバーのURL ";

      const channel = guild.channels.cache.get(discordUrl.channelId);
      if (!channel) return " 不明なチャンネル ";

      const name = cleanTwemojis(channel.name);
      if (discordUrl.messageId) {
        return `${name}のメッセージ`;
      } else {
        return name;
      }
    }
    case "autolink":
      return " URL省略 ";

    case "spoiler":
      return " 伏字 ";

    case "newline":
    case "br":
      return "\n";

    case "codeBlock": {
      const lang = stringOrEmpty(ast.lang);
      return lang ? ` ${lang}のコード ` : " コード ";
    }

    case "user": {
      const id = stringOrEmpty(ast.id);
      const member = guild?.members.cache.get(id);
      return member ? cleanTwemojis(member.displayName) : " 不明なユーザー ";
    }
    case "channel": {
      const id = stringOrEmpty(ast.id);
      const channel = guild?.channels.cache.get(id);
      return channel ? cleanTwemojis(channel.name) : " 不明なチャンネル ";
    }
    case "role": {
      const id = stringOrEmpty(ast.id);
      const role = guild?.roles.cache.get(id);
      return role ? cleanTwemojis(role.name) : " 不明なロール ";
    }
    case "emoji": {
      const id = stringOrEmpty(ast.id);
      const emoji = guild?.emojis.cache.get(id);
      return emoji?.name ?? " 不明な絵文字 ";
    }
    case "everyone": {
      return " @エブリワン ";
    }
    case "here": {
      return " @ヒア ";
    }
    case "twemoji": {
      // TODO: proper text to read aloud
      return stringOrEmpty(ast.name);
    }
    case "timestamp": {
      const timestamp = stringOrEmpty(ast.timestamp);
      const date = Number(timestamp) * 1000;
      if (Number.isInteger(date) && date >= 0) {
        const full = dateTimeFormat.format(date).replace(/\s+日本標準時/, "");
        const now = dateTimeFormat
          .format(Date.now())
          .replace(/\s+日本標準時/, "");
        for (let i = 0; i < full.length; i++) {
          if (full[i] !== now[i]) return full.slice(i);
        }
        return "今";
      } else {
        return " 不明な日付 ";
      }
    }
  }

  return "";
}

function astNodeOrEmpty(ast: unknown): ASTNode {
  if (Array.isArray(ast)) {
    return ast.every(isSingleASTNode) ? ast : [];
  } else {
    return isSingleASTNode(ast) ? ast : [];
  }
}

function isSingleASTNode(ast: unknown): ast is SingleASTNode {
  return (
    typeof ast === "object" &&
    ast !== null &&
    "type" in ast &&
    typeof ast.type === "string"
  );
}

function stringOrEmpty(str: unknown): string {
  return typeof str === "string" ? str : "";
}

interface DiscordUrl {
  guildId: string;
  channelId: string;
  messageId?: string | undefined;
}

function parseDiscordUrl(url: string): DiscordUrl | undefined {
  const { protocol, host, pathname } = new URL(url);
  if (protocol !== "https:") return;
  if (!["discord.com", "canary.discord.com"].includes(host)) return;

  const [, guildId, channelId, messageId] = pathname.split("/");
  if (!guildId || !channelId) return;

  return { guildId, channelId, messageId };
}

const twemojiParser = parserFor({
  twemoji: rules.twemoji,
  text: rules.text,
});

function cleanTwemojis(s: string) {
  const ast = twemojiParser(s);
  return text(ast, null); // should be only twemoji and text, so no problem with null
}
