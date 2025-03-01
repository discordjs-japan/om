import assert from "node:assert";
import test from "node:test";
import { Collection, type Guild, type Message } from "discord.js";
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

void test("cleanMarkdown works fine with simple rules", () => {
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

void test("cleanMarkdown works fine with url", () => {
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

void test("cleanMarkdown works fine with several mentions", () => {
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

void test("cleanMarkdown works fine with twemoji", () => {
  assert.strictEqual(cleanMarkdown(mockMessage("👍")), "👍");
});

function timestamp(s: string) {
  return Math.floor(Date.parse(s) / 1000);
}

void test("cleanMarkdown works fine with timestamp", () => {
  test.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2017-12-16T21:48:02.939+0900"),
  });

  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T21:48:02.000+0900")}>`),
    ),
    "今",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T21:48:04.000+0900")}>`),
    ),
    "4秒",
  ); // ほんまか？
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T21:49:00.000+0900")}>`),
    ),
    "49分0秒",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-16T22:00:00.000+0900")}>`),
    ),
    "22時0分0秒",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-12-17T00:00:00.000+0900")}>`),
    ),
    "17日日曜日 0時0分0秒",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2017-11-01T00:00:00.000+0900")}>`),
    ),
    "11月1日水曜日 0時0分0秒",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("2018-01-01T00:00:00.000+0900")}>`),
    ),
    "2018年1月1日月曜日 0時0分0秒",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("+010000-01-01T08:59:00.000+0900")}>`),
    ),
    "10000年1月1日土曜日 8時59分0秒",
  );
  assert.strictEqual(
    cleanMarkdown(
      mockMessage(`<t:${timestamp("+275760-09-13T09:00:00.000+0900")}>`),
    ),
    "275760年9月13日土曜日 9時0分0秒",
  );
});
