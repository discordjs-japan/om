import assert from "node:assert";
import test from "node:test";
import { ignoreParenContent } from "./ignore";

void test("ignoreParenContent works fine", () => {
  assert.strictEqual(ignoreParenContent("hello (world)"), "hello ");
  assert.strictEqual(ignoreParenContent("hello (world(foo))"), "hello ");
  assert.strictEqual(ignoreParenContent("（hello) (world）"), " ");
  assert.strictEqual(ignoreParenContent("（hello (world"), "");
  assert.strictEqual(ignoreParenContent("（hello\nworld）"), "");
});
