import assert from "node:assert";
import test from "node:test";
import { Collection, type Attachment, type Message } from "discord.js";
import { getSuffixFromAttachments } from "./attachments";

function mockMessage(attachments: Partial<Attachment>[]): Message {
  return {
    attachments: new Collection(
      attachments.map((a, i) => [
        i.toString(),
        {
          name: "test",
          contentType: undefined,
          ...a,
        } as Attachment,
      ]),
    ),
  } as Message;
}

void test("getSuffixFromAttachments handles different attachment types correctly", () => {
  assert.strictEqual(
    getSuffixFromAttachments(mockMessage([{ contentType: "image/png" }])),
    "画像",
  );

  assert.strictEqual(
    getSuffixFromAttachments(mockMessage([{ contentType: "video/mp4" }])),
    "動画",
  );

  assert.strictEqual(
    getSuffixFromAttachments(mockMessage([{ contentType: "audio/mp3" }])),
    "音声",
  );

  assert.strictEqual(
    getSuffixFromAttachments(mockMessage([{ name: "test.pdf" }])),
    "pdfファイル",
  );

  assert.strictEqual(
    getSuffixFromAttachments(mockMessage([{ name: "test" }])),
    "testファイル",
  );
});

void test("getSuffixFromAttachments handles multiple attachments correctly", () => {
  assert.strictEqual(
    getSuffixFromAttachments(
      mockMessage([
        { contentType: "image/png" },
        { contentType: "image/jpeg" },
      ]),
    ),
    "2つの画像",
  );

  assert.strictEqual(
    getSuffixFromAttachments(
      mockMessage([
        { contentType: "image/png" },
        { contentType: "video/mp4" },
        { contentType: "audio/mp3" },
      ]),
    ),
    "画像 動画 音声",
  );

  assert.strictEqual(
    getSuffixFromAttachments(
      mockMessage([
        { contentType: "image/png" },
        { contentType: "image/jpeg" },
        { name: "doc.pdf" },
        { name: "doc2.pdf" },
      ]),
    ),
    "2つの画像 2つのpdfファイル",
  );
});

void test("getSuffixFromAttachments handles empty attachments", () => {
  assert.strictEqual(getSuffixFromAttachments(mockMessage([])), "");
});
