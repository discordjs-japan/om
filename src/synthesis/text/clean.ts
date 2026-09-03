import { rulesExtended } from "discord-markdown-parser";
import type { Guild, Message } from "discord.js";
import SimpleMarkdown from "simple-markdown";
import type { SingleASTNode, ASTNode, Capture } from "simple-markdown";

const parser = SimpleMarkdown.parserFor(
  {
    ...rulesExtended,
    command: {
      order: rulesExtended.strong.order,
      match: (source: string) =>
        /^<\/([\w-]+(?: [\w-]+)?(?: [\w-]+)?):(\d{17,20})>/.exec(source),
      parse: (capture: Capture) => ({
        name: capture[1],
        id: capture[2],
        type: "command",
      }),
    },
    attachmentLink: {
      order: rulesExtended.url.order - 0.5,
      match: (source: string) =>
        /^https:\/\/(?:(?:media|images)\.discordapp\.net|cdn\.discordapp\.com)\/(?:attachments|ephemeral-attachments)\/\d+\/\d+\/([\w.-]*[\w-])(?:\?[\w?&=-]*)?/.exec(
          source,
        ),
      parse: (capture: Capture) => ({
        filename: capture[1],
        type: "attachmentLink",
      }),
    },
  },
  { inline: true },
);

export function cleanMarkdown(message: Message) {
  const ast = parser(message.content);
  return text(ast, message.guild);
}

const dateTimeFormats: Record<string, Intl.DateTimeFormat> = {
  // full date and time, e.g. 2018年1月1日月曜日 21時30分10秒
  "": new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "full",
    timeStyle: "full",
  }),
  // full date and time, e.g. 2018年1月1日月曜日 21時30分10秒
  f: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "full",
    timeStyle: "full",
  }),
  // full date, e.g. 2018年1月1日月曜日
  F: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "full",
  }),
  // date, e.g. 2018年1月1日
  d: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "long",
  }),
  // short date with weekday, e.g. 2018年1月1日月曜日
  D: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "full",
  }),
  // time, e.g. 21時30分
  t: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "numeric",
  }),
  // longer time, e.g. 21時30分10秒
  T: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }),
};

const relativeTimeFormat = new Intl.RelativeTimeFormat("ja-JP", {
  numeric: "auto",
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
      const url = stringOrEmpty(ast.target);
      const discordUrl = parseDiscordUrl(url);
      if (!discordUrl) return " URL省略 ";
      if (guild?.id !== discordUrl.guildId) {
        return ` 外部サーバーの${
          discordUrl.messageId ? "メッセージ" : "チャンネル"
        } `;
      }

      const channel = guild.channels.cache.get(discordUrl.channelId);
      if (!channel) {
        return ` 不明な${discordUrl.messageId ? "メッセージ" : "チャンネル"} `;
      }

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
      return stringOrEmpty(ast.name);
    }
    case "command": {
      const name = stringOrEmpty(ast.name);
      return ` ${name}コマンド `;
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
      const format = stringOrEmpty(ast.format);
      const date = Number(timestamp) * 1000;
      if (!Number.isInteger(date) || Math.abs(date) > 8640000000000000)
        return " 不明な日付 ";

      if (format === "R") return relativeTimeText(date);
      if (format === "t" || format === "T")
        return timeText(date, format === "T");
      const formatter = dateTimeFormats[format] ?? dateTimeFormats[""];
      if (format === "" || format === "f") {
        // read only different segments from now
        const full = dateSegments(date, formatter);
        const now = dateSegments(Date.now(), formatter);
        for (let i = 0; i < full.length; i++) {
          if (full[i] !== now[i]) return full.slice(i).join("");
        }

        return "今";
      }

      return dateSegments(date, formatter).join("");
    }

    case "attachmentLink":
      return stringOrEmpty(ast.filename);
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
  try {
    const { protocol, host, pathname } = new URL(url);
    if (protocol !== "https:") return;
    if (
      ![
        "discord.com",
        "ptb.discord.com",
        "canary.discord.com",
        "discordapp.com",
        "ptb.discordapp.com",
        "canary.discordapp.com",
      ].includes(host)
    )
      return;

    const [, channels, guildId, channelId, messageId] = pathname.split("/");
    if (channels !== "channels" || !guildId || !channelId) return;

    return { guildId, channelId, messageId };
    // eslint-disable-next-line no-empty
  } catch {}
}

const twemojiParser = SimpleMarkdown.parserFor(
  { twemoji: rulesExtended.twemoji, text: rulesExtended.text },
  { inline: true },
);

export function cleanTwemojis(s: string) {
  const ast = twemojiParser(s);
  return text(ast, null); // should be only twemoji and text, so no problem with null
}

function relativeTimeText(date: number): string {
  const seconds = Math.trunc((date - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relativeTimeFormat.format(seconds, "second");
  if (abs < 3600)
    return relativeTimeFormat.format(Math.trunc(seconds / 60), "minute");
  if (abs < 86400)
    return relativeTimeFormat.format(Math.trunc(seconds / 3600), "hour");
  if (abs < 365 * 86400)
    return relativeTimeFormat.format(Math.trunc(seconds / 86400), "day");

  return relativeTimeFormat.format(Math.trunc(seconds / (365 * 86400)), "year");
}

function dateSegments(date: number | Date, format: Intl.DateTimeFormat) {
  const segments = format
    .formatToParts(date)
    .reduce<string[]>((accumulator, { type, value }) => {
      switch (type) {
        case "year":
        case "month":
        case "day":
        case "hour":
        case "minute":
        case "second": {
          // remove leading 0
          const val = +value;
          accumulator.push(Number.isNaN(val) ? value : `${val}`);
          break;
        }
        case "weekday":
        case "literal":
          if (accumulator.length === 0) {
            accumulator.push(value);
          } else {
            // string-concatenatation
            accumulator[accumulator.length - 1] += value;
          }
          break;
      }
      return accumulator;
    }, []);
  segments[segments.length - 1] = segments[segments.length - 1].trimEnd();
  return segments;
}

function timeText(date: number, withSeconds: boolean): string {
  const parts = dateTimeFormats[withSeconds ? "T" : "t"].formatToParts(date);
  const values: Record<string, string> = {};
  for (const { type, value } of parts) {
    if (type !== "literal") values[type] = value;
  }
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const second = Number(values.second);

  return withSeconds
    ? `${hour}時${minute}分${second}秒`
    : `${hour}時${minute}分`;
}
