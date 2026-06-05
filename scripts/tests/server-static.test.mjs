import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);

test("AI provider fallback preserves provider priority instead of racing", async () => {
  const server = await readFile(new URL("scripts/gemini-analyzer-server.mjs", root), "utf8");

  assert.match(server, /async function firstSuccessfulProvider/);
  assert.match(server, /for \(const task of tasks\)/);
  assert.doesNotMatch(server, /tasks\.forEach\(\(task\)/);
});
