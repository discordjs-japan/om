import assert from "node:assert";
import { test } from "vitest";
import { ignoreParenContent } from "./ignore";

test("ignoreParenContent works fine", () => {
  assert.strictEqual(ignoreParenContent("hello (world)"), "hello ");
  assert.strictEqual(ignoreParenContent("hello (world(foo))"), "hello ");
  assert.strictEqual(ignoreParenContent("（hello) (world）"), " ");
  assert.strictEqual(ignoreParenContent("（hello (world"), "");
  assert.strictEqual(ignoreParenContent("（hello\nworld）"), "");
});
