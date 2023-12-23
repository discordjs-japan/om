import { test, expect } from "vitest";
import { ReplyableError } from "./error";

test("ReplyableError works fine", () => {
  const error = new ReplyableError("This is a replyable error");
  expect(error.message).toBe("This is a replyable error");
  expect(error.toReply()).toEqual({
    content: "This is a replyable error",
    ephemeral: true,
  });
});

test("ReplyableError.from works fine", () => {
  const replyableError = new ReplyableError("This is a ReplyableError");
  expect(ReplyableError.from(replyableError)).toBe(replyableError);

  const error = new Error("This is an Error");
  expect(ReplyableError.from(error)).toBeInstanceOf(ReplyableError);
  expect(ReplyableError.from(error).message).toBe("This is an Error");

  const string = "This is a string";
  expect(ReplyableError.from(string).message).toBe("This is a string");
});
