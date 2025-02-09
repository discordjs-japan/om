import assert from "node:assert";
import test from "node:test";
import SeededRng from "./seeded-rng";

void test("SeededRng generates same value", () => {
  const rng = new SeededRng("391390986770710528"); // guild id
  assert.strictEqual(rng.range(0, 1), 0.06029782586744892);
  assert.strictEqual(rng.range(0, 1), 0.6363524476235511);
  assert.strictEqual(rng.range(0, 1), -0.6310007635648366);
});

void test("SeededRng.range exponent can change distribution", () => {
  for (const seed of [
    "391392503955324928", // vc#1 id
    "395747236186685441", // vc#2 id
    "942069957901029436", // vc#3 id
    "1105119413394489364", // vc#4 id
  ]) {
    const rng = new SeededRng(seed);
    let mids = 0;
    for (const _ of Array(10000)) {
      const value = rng.range(0, 1, 3);
      if (Math.abs(value) < 0.5) mids++;
    }
    assert.ok(mids > 7500, "mids should be greater than 7500");
  }
});
