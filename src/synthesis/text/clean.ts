import { rulesExtended, SimpleMarkdown } from "discord-markdown-parser";
import type { Guild, Message } from "discord.js";
import { logger } from "../../logger";

const timestampStyles = ["R", "t", "T", "d", "D", "f", "F", "s", "S"] as const;
type TimestampStyle = (typeof timestampStyles)[number] | "";

// Accept any alphabet character as a style so that unknown styles
// are still read aloud.
const timestampRegex = /^<t:(-?\d+)(?::([a-zA-Z]))?>/;

const parser = SimpleMarkdown.parserFor(
  {
    ...rulesExtended,
    command: {
      order: rulesExtended.strong.order,
      match: (source: string) =>
        /^<\/([\w-]+(?: [\w-]+)?(?: [\w-]+)?):(\d{17,20})>/.exec(source),
      parse: (capture) => ({
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
      parse: (capture) => ({
        filename: capture[1],
        type: "attachmentLink",
      }),
    },
    // We need to handle s/S and unknown styles as well, so the
    // matcher is replaced with timestampRegex.
    timestamp: {
      ...rulesExtended.timestamp,
      match: (source: string) => timestampRegex.exec(source),
    },
  },
  { inline: true },
);

type SingleASTNode = ReturnType<typeof parser>[number];
type ASTNode = SingleASTNode | SingleASTNode[];

export function cleanMarkdown(message: Message) {
  const ast = parser(message.content);
  return text(ast, message.guild);
}

const dateFormats = {
  // long date, e.g. 2017年12月17日
  long: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "long",
  }),
  // full date with weekday, e.g. 2017年12月17日日曜日
  full: new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "full",
  }),
};

// hour/minute/second values in Asia/Tokyo (24-hour clock), used as
// components for Japanese time text built in timeText.
const timeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
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
    case "timestamp":
      return timestampText(ast.timestamp, ast.format);

    case "attachmentLink":
      return stringOrEmpty(ast.filename);
  }

  return "";
}

function timestampText(timestamp: unknown, format: unknown): string {
  const style = toTimestampStyle(format);
  const date = Number(stringOrEmpty(timestamp)) * 1000;
  if (!Number.isInteger(date) || Math.abs(date) > 8640000000000000)
    return " 不明な日付 ";

  switch (style) {
    case undefined:
      logger.warn(
        { style: stringOrEmpty(format) },
        "Unknown timestamp style, reading as f format",
      );
      return dateTimeText(date, dateFormats.long, false);
    case "R":
      return relativeTimeText(date);
    case "t":
      return timeText(date, false);
    case "T":
      return timeText(date, true);
    case "":
    case "f":
      return dateTimeText(date, dateFormats.long, false);
    case "F":
      return dateTimeText(date, dateFormats.full, false);
    case "s":
      return dateTimeText(date, dateFormats.long, false);
    case "S":
      return dateTimeText(date, dateFormats.long, true);
    case "d":
    case "D":
      return dateText(date, dateFormats.long);
  }
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

function toTimestampStyle(format: unknown): TimestampStyle | undefined {
  const str = stringOrEmpty(format);
  if (str === "") return "";
  return timestampStyles.find((style) => style === str);
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

// Discord's R renders the same as moment's humanize:
// 21 hours later -> "21時間後", 22 hours later -> "1日後",
// 26 days later -> "1ヶ月後", 45 days later (1.5 months) -> "1ヶ月後",
// 364 days later -> "1年後".
// Reproduces moment's algorithm as-is:
// - each unit is rounded; thresholds (44s / 45m / 22h / 26d / 11mo)
//   are checked from the smallest unit
// - weeks (w) are invalid in moment
// - months are converted as 400 years = 146097 days
//   (30.436875 days/month); years are rounded months/12
function relativeTimeText(date: number): string {
  const diff = date - Date.now();
  const abs = Math.abs(diff);
  const seconds = Math.round(abs / 1000);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const months = Math.round(((abs / 86400000) * 4800) / 146097);
  const years = Math.round(((abs / 86400000) * 4800) / 146097 / 12);
  const suffix = diff > 0 ? "後" : "前";

  if (seconds <= 44) return `数秒${suffix}`;
  if (minutes <= 1) return `1分${suffix}`;
  if (minutes < 45) return `${minutes}分${suffix}`;
  if (hours <= 1) return `1時間${suffix}`;
  if (hours < 22) return `${hours}時間${suffix}`;
  if (days <= 1) return `1日${suffix}`;
  if (days < 26) return `${days}日${suffix}`;
  if (months <= 1) return `1ヶ月${suffix}`;
  if (months < 11) return `${months}ヶ月${suffix}`;
  if (years <= 1) return `1年${suffix}`;
  return `${years}年${suffix}`;
}

function dateText(date: number, format: Intl.DateTimeFormat): string {
  return dateSegments(format.formatToParts(date)).join("");
}

function dateSegments(parts: Intl.DateTimeFormatPart[]) {
  const segments = parts.reduce<string[]>((accumulator, { type, value }) => {
    switch (type) {
      case "year":
      case "month":
      case "day": {
        accumulator.push(stripLeadingZero(value));
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
  return segments;
}

// remove leading 0
function stripLeadingZero(value: string): string {
  const val = +value;
  return Number.isNaN(val) ? value : `${val}`;
}

function timeValues(date: number): Record<string, string> {
  const values: Record<string, string> = {};
  for (const { type, value } of timeFormat.formatToParts(date)) {
    if (type !== "literal") values[type] = stripLeadingZero(value);
  }
  return values;
}

function timeText(date: number, withSeconds: boolean): string {
  const { hour, minute, second } = timeValues(date);
  return withSeconds
    ? `${hour}時${minute}分${second}秒`
    : `${hour}時${minute}分`;
}

function dateTimeText(
  date: number,
  dateFormat: Intl.DateTimeFormat,
  withSeconds: boolean,
): string {
  return `${dateText(date, dateFormat)} ${timeText(date, withSeconds)}`;
}
