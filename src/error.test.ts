import assert from "node:assert";
import test from "node:test";
import { MessageFlags } from "discord.js";
import { ReplyableError } from "./error";

void test("ReplyableError works fine", () => {
  const error = new ReplyableError("This is a replyable error");
  assert.strictEqual(error.message, "This is a replyable error");
  assert.deepStrictEqual(error.toReply(), {
    content: "This is a replyable error",
    flags: MessageFlags.Ephemeral,
  });
});

void test("ReplyableError.from works fine", () => {
  const replyableError = new ReplyableError("This is a ReplyableError");
  assert.strictEqual(ReplyableError.from(replyableError), replyableError);

  const error = new Error("This is an Error");
  assert.ok(ReplyableError.from(error) instanceof ReplyableError);
  assert.strictEqual(ReplyableError.from(error).message, "This is an Error");

  const string = "This is a string";
  assert.strictEqual(ReplyableError.from(string).message, "This is a string");
});
