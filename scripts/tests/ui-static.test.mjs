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

test("user requirement text fields can be intentionally cleared", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.doesNotMatch(app, /purchaseTiming:\s*merged\.purchaseTiming\s*\|\|\s*seedRequirement\.purchaseTiming/);
  assert.doesNotMatch(app, /mustHaves:\s*merged\.mustHaves\s*\|\|\s*seedRequirement\.mustHaves/);
  assert.doesNotMatch(app, /dealBreakers:\s*merged\.dealBreakers\s*\|\|\s*seedRequirement\.dealBreakers/);
  assert.doesNotMatch(app, /notes:\s*merged\.notes\s*\|\|\s*seedRequirement\.notes/);
});

test("static buttons declare their button type", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const buttonsWithoutType = [...html.matchAll(/<button\b(?![^>]*\btype=)[^>]*>/g)].map((match) => match[0]);
  const dynamicButtonsWithoutType = [...app.matchAll(/<button\b(?![^>]*\btype=)[^>]*>/g)].map((match) => match[0]);

  assert.deepEqual(buttonsWithoutType, []);
  assert.deepEqual(dynamicButtonsWithoutType, []);
});

test("AI numeric patches do not coerce blank values to zero", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.doesNotMatch(app, /Number\.isFinite\(Number\(patch\[field\]\)\)/);
  assert.doesNotMatch(app, /Number\(patch\.experience\[key\]\)/);
  assert.match(app, /const value = numberOrBlank\(patch\[field\]\)/);
});

test("external links and images are normalized before rendering or opening", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /function normalizeWebUrl/);
  assert.match(app, /url:\s*normalizeWebUrl\(car\.url\)/);
  assert.match(app, /image:\s*normalizeImageUrl\(car\.image\)/);
  assert.doesNotMatch(app, /return source\.url\s*(?:;|\|\|)/);
  assert.doesNotMatch(app, /window\.open\(car\.url/);
  assert.doesNotMatch(app, /href="\$\{escapeAttr\(source\.url \|\| "#"\)\}"/);
});
