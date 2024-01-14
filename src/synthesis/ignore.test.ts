import { test, expect } from "vitest";
import { ignoreParenContent } from "./ignore";

test("ignoreParenContent works fine", () => {
  expect(ignoreParenContent("hello (world)")).toBe("hello ");
  expect(ignoreParenContent("hello (world(foo))")).toBe("hello ");
  expect(ignoreParenContent("（hello) (world）")).toBe(" ");
  expect(ignoreParenContent("（hello (world")).toBe("");
  expect(ignoreParenContent("（hello\nworld）")).toBe("");
});
