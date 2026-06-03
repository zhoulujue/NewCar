import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);

test("quality action uses lead wording instead of verified data wording", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(html, /AI 检索质量线索/);
  assert.match(app, /AI 检索质量线索/);
  assert.doesNotMatch(html, /AI 获取质量数据/);
});

test("mobile topbar actions can shrink inside the viewport", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(css, /\.topbar-right[\s\S]*?width: 100%;[\s\S]*?min-width: 0;/);
  assert.match(css, /\.topbar-actions[\s\S]*?width: 100%;[\s\S]*?min-width: 0;/);
  assert.match(css, /\.topbar-actions \.primary-button,[\s\S]*?white-space: normal;/);
});

test("quality source cards use a readable responsive grid", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");
  const match = css.match(/\.quality-source-grid\s*\{([\s\S]*?)\n\}/);

  assert.ok(match, "quality-source-grid rule should exist");
  assert.doesNotMatch(match[1], /repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(match[1], /repeat\(auto-fit,/);
});

test("quality source cards do not mark AI-only searches as verified data", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /入口待核验/);
  assert.doesNotMatch(app, /有数据\|有证据\|有线索\|AI已检索/);
  assert.match(app, /isVerifiedQualitySourceStatus/);
});
