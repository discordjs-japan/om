import { Collection, type Guild, type Message } from "discord.js";
import { test, expect, vi } from "vitest";
import { cleanMarkdown } from "./clean";

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
  expect(cleanMarkdown(mockMessage("[link text](https://example.com)"))).toBe(
    "link text",
  );
  expect(cleanMarkdown(mockMessage("> blockquote"))).toBe("blockquote");
  expect(cleanMarkdown(mockMessage("*em*"))).toBe("em");
  expect(cleanMarkdown(mockMessage("**strong**"))).toBe("strong");
  expect(cleanMarkdown(mockMessage("__underline__"))).toBe("underline");
  expect(cleanMarkdown(mockMessage("~~strikethrough~~"))).toBe("strikethrough");

  expect(cleanMarkdown(mockMessage("text"))).toBe("text");
  expect(cleanMarkdown(mockMessage("\\\\escape"))).toBe("\\escape");
  expect(cleanMarkdown(mockMessage("`inlineCode`"))).toBe("inlineCode");

  expect(cleanMarkdown(mockMessage("<https://example.com>"))).toBe(" URL省略 ");
  expect(cleanMarkdown(mockMessage("||spoiler||"))).toBe(" 伏字 ");

  expect(cleanMarkdown(mockMessage("\n"))).toBe("\n");
  expect(cleanMarkdown(mockMessage("\r"))).toBe("\n");
  expect(cleanMarkdown(mockMessage("\r\n"))).toBe("\n");

  expect(
    cleanMarkdown(
      mockMessage(`\
\`\`\`
hello world!
\`\`\``),
    ),
  ).toBe(" コード ");
  expect(
    cleanMarkdown(
      mockMessage(`\
\`\`\`js
console.log("hello world!");
\`\`\``),
    ),
  ).toBe(" jsのコード ");
});

test("cleanMarkdown works fine with url", () => {
  expect(cleanMarkdown(mockMessage("https://www.example.com"))).toBe(
    " URL省略 ",
  );
  expect(cleanMarkdown(mockMessage("https://discord.com/channels/0/0"))).toBe(
    " 外部サーバーのチャンネル ",
  );
  expect(cleanMarkdown(mockMessage("https://discord.com/channels/0/0/0"))).toBe(
    " 外部サーバーのメッセージ ",
  );
  expect(
    cleanMarkdown(
      mockMessage("https://discord.com/channels/391390986770710528/0"),
    ),
  ).toBe(" 不明なチャンネル ");
  expect(
    cleanMarkdown(
      mockMessage("https://discord.com/channels/391390986770710528/0/0"),
    ),
  ).toBe(" 不明なメッセージ ");
  expect(
    cleanMarkdown(
      mockMessage(
        "https://discord.com/channels/391390986770710528/391394853268750337",
      ),
    ),
  ).toBe("雑談");
  // Discord creates URL a message mention even if unknown message id is given.
  expect(
    cleanMarkdown(
      mockMessage(
        "https://discord.com/channels/391390986770710528/391394853268750337/0",
      ),
    ),
  ).toBe("雑談のメッセージ");
  expect(
    cleanMarkdown(
      mockMessage(
        "https://discord.com/channels/391390986770710528/391394853268750337/392587826186944512",
      ),
    ),
  ).toBe("雑談のメッセージ");
});

test("cleanMarkdown works fine with several mentions", () => {
  expect(cleanMarkdown(mockMessage("<@!351992405831974915>")).trim()).toBe(
    "InkoHX",
  );
  expect(cleanMarkdown(mockMessage("<@!00000000000000000>"))).toBe(
    " 不明なユーザー ",
  );
  expect(cleanMarkdown(mockMessage("<@&705393852147826730>"))).toBe(
    "MAID[メイド]",
  );
  expect(cleanMarkdown(mockMessage("<@&00000000000000000>"))).toBe(
    " 不明なロール ",
  );
  expect(
    cleanMarkdown(mockMessage("<:inkohx_dancing:1068113836965642280>")),
  ).toBe("inkohx_dancing");
  expect(
    cleanMarkdown(mockMessage("<a:inkohx_dancing:1068113836965642280>")),
  ).toBe("inkohx_dancing");
  expect(cleanMarkdown(mockMessage("<:unknown:000000000000000000>"))).toBe(
    " 不明な絵文字 ",
  );
  expect(cleanMarkdown(mockMessage("<a:unknown:000000000000000000>"))).toBe(
    " 不明な絵文字 ",
  );
  expect(cleanMarkdown(mockMessage("</join:000000000000000000>"))).toBe(
    " joinコマンド ",
  );
  expect(cleanMarkdown(mockMessage("@everyone"))).toBe(" @エブリワン ");
  expect(cleanMarkdown(mockMessage("@here"))).toBe(" @ヒア ");
});

test("cleanMarkdown works fine with twemoji", () => {
  expect(cleanMarkdown(mockMessage("👍"))).toBe("👍");
});

function timestamp(s: string) {
  return Math.floor(Date.parse(s) / 1000);
}

test("cleanMarkdown works fine with timestamp", () => {
  vi.setSystemTime(new Date("2017-12-16T21:48:02.939+0900"));

  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T21:48:02.000+0900")}>`),
    ),
  ).toBe("今");
  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T21:48:04.000+0900")}>`),
    ),
  ).toBe("4秒"); // ほんまか？
  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T21:49:00.000+0900")}>`),
    ),
  ).toBe("49分0秒");
  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T22:00:00.000+0900")}>`),
    ),
  ).toBe("22時0分0秒");
  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-17T00:00:00.000+0900")}>`),
    ),
  ).toBe("17日日曜日 0時0分0秒");
  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-11-01T00:00:00.000+0900")}>`),
    ),
  ).toBe("11月1日水曜日 0時0分0秒");
  expect(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2018-01-01T00:00:00.000+0900")}>`),
    ),
  ).toBe("2018年1月1日月曜日 0時0分0秒");
});
