import { parse } from "discord-markdown-parser";
import type { Message } from "discord.js";
import type { SingleASTNode, ASTNode } from "simple-markdown";

export function cleanMarkdown(message: Message) {
  const ast = parse(message.content, "extended");
  return text(ast, message);
}

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
  timeStyle: "full",
});

function text(ast: ASTNode, message: Message): string {
  if (Array.isArray(ast)) {
    return ast.map((node) => text(node, message)).join("");
  }

  switch (ast.type) {
    case "link":
    case "blockQuote":
    case "em":
    case "strong":
    case "underline":
    case "strikethrough":
    case "spoiler":
      return text(astNodeOrEmpty(ast.content), message);

    case "text":
    case "escape":
    case "inlineCode":
      return stringOrEmpty(ast.content);

    case "url":
    case "autolink":
      return " URL省略 ";

    case "newline":
    case "br":
      return "\n";

    case "codeBlock": {
      const lang = stringOrEmpty(ast.lang);
      return lang ? ` ${lang}のコード ` : " コード ";
    }

    case "user": {
      const id = stringOrEmpty(ast.id);
      const member = message.guild?.members.cache.get(id);
      return member?.displayName ?? " 不明なユーザー ";
    }
    case "channel": {
      const id = stringOrEmpty(ast.id);
      const channel = message.guild?.channels.cache.get(id);
      return channel?.name ?? " 不明なチャンネル ";
    }
    case "role": {
      const id = stringOrEmpty(ast.id);
      const role = message.guild?.roles.cache.get(id);
      return role?.name ?? " 不明なロール ";
    }
    case "emoji": {
      const id = stringOrEmpty(ast.id);
      const emoji = message.guild?.emojis.cache.get(id);
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
