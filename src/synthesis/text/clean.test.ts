import assert from "node:assert";
import { Collection, type Guild, type Message } from "discord.js";
import { beforeEach, describe, test, vi } from "vitest";
import { cleanMarkdown, cleanTwemojis } from "./clean";

type PartialRecursive<T> = {
  [P in keyof T]?: PartialRecursive<T[P]>;
};

function singleCacheManager<T>(key: string, value: T) {
  return {
    cache: new Collection<string, T>([[key, value]]),
  };
}

const guild = {
  id: "391390986770710528",
  channels: singleCacheManager("391394853268750337", { name: "雑談" }),
  members: singleCacheManager("351992405831974915", { displayName: "InkoHX" }),
  roles: singleCacheManager("705393852147826730", { name: "MAID[メイド]" }),
  emojis: singleCacheManager("1068113836965642280", { name: "inkohx_dancing" }),
} satisfies PartialRecursive<Guild>;

function mockMessage(content: string) {
  return { content, guild } as Message;
}

test("cleanMarkdown works fine with simple rules", () => {
  assert.strictEqual(
    cleanMarkdown(mockMessage("[link text](https://example.com)")),
    "link text",
  );
  assert.strictEqual(cleanMarkdown(mockMessage("> blockquote")), "blockquote");
  assert.strictEqual(cleanMarkdown(mockMessage("*em*")), "em");
  assert.strictEqual(cleanMarkdown(mockMessage("**strong**")), "strong");
  assert.strictEqual(cleanMarkdown(mockMessage("__underline__")), "underline");
  assert.strictEqual(
    cleanMarkdown(mockMessage("~~strikethrough~~")),
    "strikethrough",
  );

  assert.strictEqual(cleanMarkdown(mockMessage("text")), "text");
  assert.strictEqual(cleanMarkdown(mockMessage("\\\\escape")), "\\escape");
  assert.strictEqual(cleanMarkdown(mockMessage("`inlineCode`")), "inlineCode");

  assert.strictEqual(
    cleanMarkdown(mockMessage("<https://example.com>")),
    " URL省略 ",
  );
  assert.strictEqual(cleanMarkdown(mockMessage("||spoiler||")), " 伏字 ");

  assert.strictEqual(cleanMarkdown(mockMessage("\n")), "\n");
  assert.strictEqual(cleanMarkdown(mockMessage("\r")), "\n");
  assert.strictEqual(cleanMarkdown(mockMessage("\r\n")), "\n");

  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`\
\`\`\`
hello world!
\`\`\``),
    ),
    " コード ",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`\
\`\`\`js
console.log("hello world!");
\`\`\``),
    ),
    " jsのコード ",
  );
});

test("cleanMarkdown works fine with url", () => {
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://www.example.com")),
    " URL省略 ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://discord.com/developers/docs/intro")),
    " URL省略 ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://discord.com/channels/0/0")),
    " 外部サーバーのチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://ptb.discord.com/channels/0/0")),
    " 外部サーバーのチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://canary.discord.com/channels/0/0")),
    " 外部サーバーのチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://discordapp.com/channels/0/0")),
    " 外部サーバーのチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://ptb.discordapp.com/channels/0/0")),
    " 外部サーバーのチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://canary.discordapp.com/channels/0/0")),
    " 外部サーバーのチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("https://discord.com/channels/0/0/0")),
    " 外部サーバーのメッセージ ",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage("https://discord.com/channels/391390986770710528/0"),
    ),
    " 不明なチャンネル ",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage("https://discord.com/channels/391390986770710528/0/0"),
    ),
    " 不明なメッセージ ",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://discord.com/channels/391390986770710528/391394853268750337",
      ),
    ),
    "雑談",
  );
  // Discord creates URL a message mention even if unknown message id is given.
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://discord.com/channels/391390986770710528/391394853268750337/0",
      ),
    ),
    "雑談のメッセージ",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://discord.com/channels/391390986770710528/391394853268750337/392587826186944512",
      ),
    ),
    "雑談のメッセージ",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://media.discordapp.net/attachments/1234567890123456789/1234567890123456789/123.jpg",
      ),
    ),
    "123.jpg",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://images.discordapp.net/attachments/1234567890123456789/1234567890123456789/123.jpg",
      ),
    ),
    "123.jpg",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://cdn.discordapp.com/attachments/1234567890123456789/1234567890123456789/123.jpg",
      ),
    ),
    "123.jpg",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://media.discordapp.net/ephemeral-attachments/1234567890123456789/1234567890123456789/123.jpg",
      ),
    ),
    "123.jpg",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(
        "https://media.discordapp.net/attachments/1234567890123456789/1234567890123456789/123.jpg?ex=12345678&is=1234abcd&hm=0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqr",
      ),
    ),
    "123.jpg",
  );
});

test("cleanMarkdown works fine with several mentions", () => {
  assert.strictEqual(
    cleanMarkdown(mockMessage("<@!351992405831974915>")).trim(),
    "InkoHX",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("<@!00000000000000000>")),
    " 不明なユーザー ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("<@&705393852147826730>")),
    "MAID[メイド]",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("<@&00000000000000000>")),
    " 不明なロール ",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("<:inkohx_dancing:1068113836965642280>")),
    "inkohx_dancing",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("<a:inkohx_dancing:1068113836965642280>")),
    "inkohx_dancing",
  );
  assert.strictEqual(
    cleanMarkdown(mockMessage("</join:000000000000000000>")),
    " joinコマンド ",
  );
  assert.strictEqual(cleanMarkdown(mockMessage("@everyone")), " @エブリワン ");
  assert.strictEqual(cleanMarkdown(mockMessage("@here")), " @ヒア ");
});

test("cleanMarkdown works fine with twemoji", () => {
  assert.strictEqual(cleanMarkdown(mockMessage("👍")), "👍");
});

test("cleanTwemojis preserves emojis and literal markup in names", () => {
  for (const name of [
    "",
    "雑談 👍",
    "👍🏽 👨‍👩‍👧‍👦 ❤️ 🇯🇵",
    "**名前** _name_ ~~text~~ ||spoiler||",
    "[名前](https://example.com)",
    "<@351992405831974915> <:emoji:1068113836965642280>",
  ]) {
    assert.strictEqual(cleanTwemojis(name), name);
  }
});

function timestamp(s: string) {
  return Math.floor(Date.parse(s) / 1000);
}

describe("cleanMarkdown works fine with timestamps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2017-12-16T21:48:02.939+0900"));
    return () => {
      vi.useRealTimers();
    };
  });

  test.for([
    {
      name: "same moment",
      content: `<t:${timestamp("2017-12-16T21:48:02.000+0900")}>`,
      expected: "2017年12月16日 21時48分",
    },
    {
      name: "different second (same minute)",
      content: `<t:${timestamp("2017-12-16T21:48:04.000+0900")}>`,
      expected: "2017年12月16日 21時48分",
    },
    {
      name: "different minute",
      content: `<t:${timestamp("2017-12-16T21:49:00.000+0900")}>`,
      expected: "2017年12月16日 21時49分",
    },
    {
      name: "different hour",
      content: `<t:${timestamp("2017-12-16T22:00:00.000+0900")}>`,
      expected: "2017年12月16日 22時0分",
    },
    {
      name: "different day",
      content: `<t:${timestamp("2017-12-17T00:00:00.000+0900")}>`,
      expected: "2017年12月17日 0時0分",
    },
    {
      name: "different month",
      content: `<t:${timestamp("2017-11-01T00:00:00.000+0900")}>`,
      expected: "2017年11月1日 0時0分",
    },
    {
      name: "different year",
      content: `<t:${timestamp("2018-01-01T00:00:00.000+0900")}>`,
      expected: "2018年1月1日 0時0分",
    },
    {
      name: "4-digit year limit (year 10000 in JST)",
      content: `<t:${timestamp("+010000-01-01T08:59:00.000+0900")}>`,
      expected: "10000年1月1日 8時59分",
    },
    {
      name: "maximum value (year 275760)",
      content: `<t:${timestamp("+275760-09-13T09:00:00.000+0900")}>`,
      expected: "275760年9月13日 9時0分",
    },
    {
      name: "f style",
      content: `<t:${timestamp("2017-12-17T00:00:00.000+0900")}:f>`,
      expected: "2017年12月17日 0時0分",
    },
    {
      name: "negative timestamp",
      content: "<t:-1>",
      expected: "1970年1月1日 8時59分",
    },
    {
      name: "out of range (unknown date)",
      // Exceeds 8.64e15 ms (the ECMAScript limit)
      content: "<t:8640000000001>",
      expected: " 不明な日付 ",
    },
  ])("$name", ({ content, expected }) => {
    assert.strictEqual(cleanMarkdown(mockMessage(content)), expected);
  });

  // Discord spec: F = Full Date+Short Time, d/D = Short/Long Date,
  // s/S = Short Date+Short/Medium Time, t/T = Short/Medium Time.
  // d is treated the same as D so that it reads aloud properly.
  test.for([
    {
      style: "F",
      content: `<t:${timestamp("2017-12-17T00:00:00.000+0900")}:F>`,
      expected: "2017年12月17日日曜日 0時0分",
    },
    {
      style: "d",
      content: `<t:${timestamp("2017-12-17T00:00:00.000+0900")}:d>`,
      expected: "2017年12月17日",
    },
    {
      style: "D",
      content: `<t:${timestamp("2017-12-17T00:00:00.000+0900")}:D>`,
      expected: "2017年12月17日",
    },
    {
      style: "t",
      content: `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:t>`,
      expected: "21時49分",
    },
    {
      style: "T",
      content: `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:T>`,
      expected: "21時49分0秒",
    },
    {
      style: "s",
      content: `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:s>`,
      expected: "2017年12月16日 21時49分",
    },
    {
      style: "S",
      content: `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:S>`,
      expected: "2017年12月16日 21時49分0秒",
    },
  ])("style $style", ({ content, expected }) => {
    assert.strictEqual(cleanMarkdown(mockMessage(content)), expected);
  });

  test.for([
    {
      name: "alphabet",
      content: `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:x>`,
      expected: "2017年12月16日 21時49分",
    },
  ])("unknown style $name", ({ content, expected }) => {
    assert.strictEqual(cleanMarkdown(mockMessage(content)), expected);
  });

  test("anything other than a single alphabet character is not recognized as a style", () => {
    for (const content of [
      `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:xx>`,
      `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:>`,
      `<t:${timestamp("2017-12-16T21:49:00.000+0900")}:%>`,
    ]) {
      assert.strictEqual(cleanMarkdown(mockMessage(content)), content);
    }
  });

  // Discord's R is the same as moment's humanize (verified by probing
  // real clients: 21 hours later -> "21時間後", 22 hours later -> "1日後",
  // 26 days later -> "1ヶ月後", 45 days later (1.5 months) -> "1ヶ月後",
  // 364 days later -> "1年後").
  // Thresholds: seconds<=44 -> a few seconds / minutes<45 / hours<22
  // (22h or more is a day) / days<26 (26 days or more is a month) /
  // months<11, otherwise years.
  // Each unit is rounded; weeks are invalid in moment.
  // Months are days/30.436875, years are rounded months/12.
  test.for([
    {
      name: "now (less than 1 second)",
      content: `<t:${timestamp("2017-12-16T21:48:02.000+0900")}:R>`,
      expected: "数秒前",
    },
    {
      name: "2 seconds later (44 seconds or less is a few seconds)",
      content: `<t:${timestamp("2017-12-16T21:48:05.000+0900")}:R>`,
      expected: "数秒後",
    },
    {
      name: "46 seconds later (45 seconds or more is 1 minute)",
      content: `<t:${timestamp("2017-12-16T21:48:49.000+0900")}:R>`,
      expected: "1分後",
    },
    {
      name: "minutes ago",
      content: `<t:${timestamp("2017-12-16T21:43:01.000+0900")}:R>`,
      expected: "5分前",
    },
    {
      name: "minutes later",
      content: `<t:${timestamp("2017-12-16T21:53:03.000+0900")}:R>`,
      expected: "5分後",
    },
    {
      name: "hours ago",
      content: `<t:${timestamp("2017-12-16T16:48:02.000+0900")}:R>`,
      expected: "5時間前",
    },
    {
      name: "hours later",
      content: `<t:${timestamp("2017-12-16T23:48:03.000+0900")}:R>`,
      expected: "2時間後",
    },
    {
      name: "21 hours later (less than 22 hours stays in hours)",
      content: `<t:${timestamp("2017-12-17T18:48:03.000+0900")}:R>`,
      expected: "21時間後",
    },
    {
      name: "22 hours later (22 hours or more is 1 day)",
      content: `<t:${timestamp("2017-12-17T19:48:03.000+0900")}:R>`,
      expected: "1日後",
    },
    {
      // 86401.9 seconds ago = 1 day and 1 second ago
      // (round gives days=1 -> "1日前")
      name: "1 day and 1 second ago",
      content: `<t:${timestamp("2017-12-15T21:48:01.000+0900")}:R>`,
      expected: "1日前",
    },
    {
      name: "almost 1 day later (in the 23-hour range)",
      content: `<t:${timestamp("2017-12-17T21:48:02.000+0900")}:R>`,
      expected: "1日後",
    },
    {
      name: "1 day 12 hours later (1.5 days rounds to 2 days)",
      content: `<t:${timestamp("2017-12-18T09:48:03.000+0900")}:R>`,
      expected: "2日後",
    },
    {
      name: "5 days ago",
      content: `<t:${timestamp("2017-12-11T21:48:02.000+0900")}:R>`,
      expected: "5日前",
    },
    {
      name: "25 days later (less than 26 days stays in days)",
      content: `<t:${timestamp("2018-01-10T21:48:03.000+0900")}:R>`,
      expected: "25日後",
    },
    {
      name: "26 days later (26 days or more is 1 month)",
      content: `<t:${timestamp("2018-01-11T21:48:03.000+0900")}:R>`,
      expected: "1ヶ月後",
    },
    {
      name: "45 days later (1.5 months is 1 month)",
      content: `<t:${timestamp("2018-01-30T21:48:03.000+0900")}:R>`,
      expected: "1ヶ月後",
    },
    {
      name: "46 days later (over 1.5 months is 2 months)",
      content: `<t:${timestamp("2018-01-31T21:48:03.000+0900")}:R>`,
      expected: "2ヶ月後",
    },
    {
      name: "300 days later (10 months)",
      content: `<t:${timestamp("2018-10-12T21:48:03.000+0900")}:R>`,
      expected: "10ヶ月後",
    },
    {
      name: "364 days later (rounds to 1 year despite being less than a year)",
      content: `<t:${timestamp("2018-12-15T21:48:03.000+0900")}:R>`,
      expected: "1年後",
    },
    {
      name: "exactly 365 days later",
      content: `<t:${timestamp("2018-12-16T21:48:03.000+0900")}:R>`,
      expected: "1年後",
    },
    {
      name: "exactly 365 days ago (366 days across a leap year)",
      content: `<t:${timestamp("2016-12-16T21:48:01.000+0900")}:R>`,
      expected: "1年前",
    },
    {
      name: "2 years ago",
      content: `<t:${timestamp("2015-12-16T21:48:01.000+0900")}:R>`,
      expected: "2年前",
    },
  ])("R: $name -> $expected", ({ content, expected }) => {
    assert.strictEqual(cleanMarkdown(mockMessage(content)), expected);
  });
});
