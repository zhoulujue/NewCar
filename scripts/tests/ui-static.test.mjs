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

test("V1.3 desktop navigation is consolidated around discovery and reports", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const nav = html.match(/<nav class="nav-list"[\s\S]*?<\/nav>/)?.[0] || "";

  for (const label of ["总览", "发现", "候选尽调", "对比", "试驾", "商家", "报告"]) {
    assert.match(nav, new RegExp(`>${label}<`));
  }

  assert.doesNotMatch(nav, /data-view="newcars"/);
  assert.doesNotMatch(nav, /data-view="usedcars"/);
  assert.doesNotMatch(nav, /data-view="risks"/);
  assert.match(html, /data-mobile-label="发现"/);
  assert.match(html, /data-mobile-label="候选"/);
  assert.match(html, /data-mobile-label="更多"/);
});

test("mobile bottom navigation is capped at five primary entries", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");
  const mobileBlock = css.match(/@media \(max-width: 820px\) \{([\s\S]*?)\n\}/)?.[0] || "";

  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(mobileBlock + css, /\.nav-button\[data-view="compare"\][\s\S]*?display: none/);
  assert.match(mobileBlock + css, /\.nav-button\[data-view="sellers"\][\s\S]*?display: none/);
});

test("mobile bottom navigation orders Today Candidates Capture Discover More", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 820px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  const mobileCss = css.slice(mobileStart, mobileEnd);

  assert.match(mobileCss, /\.nav-button\[data-view="dashboard"\]\s*\{[\s\S]*?order: 1;/);
  assert.match(mobileCss, /\.nav-button\[data-view="garage"\]\s*\{[\s\S]*?order: 2;/);
  assert.match(mobileCss, /\.capture-nav-button\s*\{[\s\S]*?order: 3;/);
  assert.match(mobileCss, /\.nav-button\[data-view="discover"\]\s*\{[\s\S]*?order: 4;/);
  assert.match(mobileCss, /\.nav-button\[data-view="report"\]\s*\{[\s\S]*?order: 5;/);
});

test("mobile capture nav button renders its plus label", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 820px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  const mobileCss = css.slice(mobileStart, mobileEnd);
  const genericLabelIndex = mobileCss.indexOf(".nav-button::after");
  const captureOverrideIndex = mobileCss.indexOf(".capture-nav-button", genericLabelIndex);
  const captureOverrideCss = mobileCss.slice(captureOverrideIndex);

  assert.ok(captureOverrideIndex > genericLabelIndex, "capture override should follow generic mobile nav label rules");
  assert.match(captureOverrideCss, /\.capture-nav-button\s*\{[\s\S]*?font-size:\s*(?!0\b)[^;]+;/);
  assert.match(captureOverrideCss, /\.capture-nav-button::after\s*\{[\s\S]*?(?:content:\s*none|display:\s*none)/);
});

test("discovery view contains new-car and used-car segmented panels", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");

  assert.match(html, /id="discoverView"/);
  assert.match(html, /class="discover-tabs"/);
  assert.match(html, /data-discover-tab="newcars"/);
  assert.match(html, /data-discover-tab="usedcars"/);
  assert.match(html, /id="discoverNewcarsPanel"/);
  assert.match(html, /id="discoverUsedcarsPanel"/);
});

test("candidate detail uses semantic main and decision rail containers", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(html, /id="candidateDetailMain"/);
  assert.match(html, /id="candidateDecisionRail"/);
  assert.match(html, /id="redlineGate"/);
  assert.match(css, /#candidateDetailMain/);
  assert.match(css, /#candidateDecisionRail/);
  assert.match(css, /\.panel\s*\{[\s\S]*?min-width: 0;/);
  assert.match(css, /\.panel-head > div\s*\{[\s\S]*?min-width: 0;/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?#candidateDecisionRail/);
});

test("browser quality cards classify missing, lead, verified, and conflict states", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /function classifyQualityEvidenceField/);
  assert.match(app, /function qualityEvidenceStateClass/);
  assert.match(app, /case "conflict"/);
  assert.match(app, /case "lead"/);
  assert.match(app, /case "missing"/);
  assert.match(app, /classifyQualityEvidenceField\(row\.type, row\.value/);
});

test("empty quality evidence renders an actionable acquisition panel instead of missing-only cards", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /function renderQualityEvidenceOverview/);
  assert.match(app, /function renderQualityStarterPanel/);
  assert.match(app, /function hasUsefulQualityEvidence/);
  assert.match(app, /质量取证起点/);
  assert.match(app, /公开质量线索/);
  assert.match(app, /单车必补证据/);
  assert.match(app, /data-quality-fetch-shortcut/);
  assert.match(css, /\.quality-starter-panel/);
  assert.match(css, /\.quality-task-grid/);
});

test("AI status copy exposes provider, failure reason, and fallback state", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /function aiJobStatusText/);
  assert.match(app, /function formatAiFailureMessage/);
  assert.match(app, /AI 分析失败：/);
  assert.match(app, /备用模型/);
  assert.match(app, /本地规则兜底/);
  assert.doesNotMatch(app, /AI 暂不可用，已先用本地规则给出候选。/);
});

test("information wall analysis preview is split into auditable sections", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /function renderInfoAnalysisSections/);
  assert.match(app, /识别事实/);
  assert.match(app, /待确认回填/);
  assert.match(app, /发现风险/);
  assert.match(app, /下一步问题/);
  assert.match(app, /info-analysis-sections/);
  assert.match(css, /\.info-analysis-sections/);
});

test("V1.4 evidence action cockpit turns gaps into copyable due-diligence scripts", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(html, /取证行动台/);
  assert.match(html, /id="evidenceActionPanel"/);
  assert.match(html, /id="copyEvidenceActionPack"/);
  assert.match(app, /function buildEvidenceActionPlan/);
  assert.match(app, /function renderEvidenceActionPanel/);
  assert.match(app, /function formatEvidenceActionPack/);
  assert.match(app, /async function copyEvidenceActionPack/);
  assert.match(app, /问商家清单/);
  assert.match(app, /检测机构清单/);
  assert.match(app, /合同备注/);
  assert.match(app, /data-copy-evidence-pack/);
  assert.match(css, /\.evidence-action-panel/);
  assert.match(css, /\.evidence-action-grid/);
  assert.match(css, /\.evidence-script-card/);
});

test("single candidate detail exposes a market feedback fast-scan module", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(html, /市场反馈速览/);
  assert.match(html, /id="marketFeedbackPanel"/);
  assert.match(html, /id="refreshMarketFeedback"/);
  assert.match(app, /GEMINI_FEEDBACK_URL/);
  assert.match(app, /function normalizeMarketFeedback/);
  assert.match(app, /function buildLocalMarketFeedback/);
  assert.match(app, /function renderMarketFeedbackPanel/);
  assert.match(app, /async function fetchMarketFeedbackWithAi/);
  assert.match(app, /function applyMarketFeedbackResult/);
  assert.match(app, /市场反馈速览/);
  assert.match(app, /好评集中/);
  assert.match(app, /槽点集中/);
  assert.match(css, /\.market-feedback-panel/);
  assert.match(css, /\.market-feedback-grid/);
  assert.match(css, /\.market-feedback-source-list/);
});

test("market feedback local fallback note does not accumulate after repeated AI failures", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /function stripMarketFeedbackFallbackNote/);
  assert.match(app, /stripMarketFeedbackFallbackNote\(stored\.summary\)/);
  assert.match(app, /summary:\s*`\$\{stripMarketFeedbackFallbackNote\(local\.summary\)\}（AI 暂时失败，当前为本地速览。）`/);
  assert.doesNotMatch(app, /summary:\s*`\$\{local\.summary\}（AI 暂时失败，当前为本地速览。）`/);
});

test("profile snapshots trace requirement-dependent decisions", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /profileSnapshots/);
  assert.match(app, /profileVersion/);
  assert.match(app, /profileSnapshotId/);
  assert.match(app, /function createProfileSnapshot/);
  assert.match(app, /function ensureCurrentProfileSnapshot/);
  assert.match(app, /recordCandidateProfileSnapshot/);
  assert.match(app, /profileSnapshotId:\s*ensureCurrentProfileSnapshot\(\)\.id/);
  assert.match(app, /画像版本/);
});

test("AI field patches record and render field-level evidence provenance", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /fieldSources/);
  assert.match(app, /function normalizeFieldSource/);
  assert.match(app, /function recordFieldSource/);
  assert.match(app, /function renderFieldSourceBadges/);
  assert.match(app, /applyCarPatch\(car, result\.carPatch \|\| \{\},/);
  assert.match(app, /recordFieldSource\(car, field,/);
  assert.match(app, /字段来源/);
  assert.match(app, /来源证据/);
});

test("evidence action scripts become trackable due-diligence tasks", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /evidenceActionTasks/);
  assert.match(app, /function normalizeEvidenceActionTask/);
  assert.match(app, /function getEvidenceActionTask/);
  assert.match(app, /function updateEvidenceActionTaskStatus/);
  assert.match(app, /data-evidence-action-status/);
  assert.match(app, /已发送/);
  assert.match(app, /已回复/);
  assert.match(app, /已上传证据/);
  assert.match(app, /已关闭风险/);
});

test("blocked purchase reports use hard redline gate language", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.doesNotMatch(app, /可继续谈，但暂不建议下订/);
  assert.match(app, /只适合取证\/复检\/排除/);
  assert.match(app, /红线未闭环/);
});

test("i6 benchmark matrix has mobile scan cards", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /function renderI6BenchmarkCards/);
  assert.match(app, /i6-matrix-table-wrap/);
  assert.match(app, /i6-card-list/);
  assert.match(app, /i6-benchmark-card/);
  assert.match(css, /\.i6-card-list/);
  assert.match(css, /\.i6-benchmark-card/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.i6-matrix-table-wrap[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.i6-card-list[\s\S]*?display: grid/);
});

test("candidate detail has a persistent action cockpit for desktop and mobile", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(html, /id="detailActionDock"/);
  assert.match(html, /id="mobileDetailActions"/);
  assert.match(app, /function renderDetailActionDock/);
  assert.match(app, /function renderMobileDetailActions/);
  assert.match(app, /function handleDetailQuickAction/);
  assert.match(app, /data-detail-quick-action="feedback"/);
  assert.match(app, /data-detail-quick-action="quality"/);
  assert.match(css, /\.detail-action-card/);
  assert.match(css, /\.mobile-detail-actions/);
  assert.match(css, /body\[data-view="detail"\][\s\S]*?\.mobile-detail-actions[\s\S]*?display: grid/);
  assert.match(css, /@media \(min-width: 821px\)[\s\S]*?\.mobile-detail-actions[\s\S]*?display: none/);
});

test("PC and mobile detail layouts keep action surfaces readable", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(css, /\.decision-rail[\s\S]*?top: 88px;/);
  assert.match(css, /\.detail-topline[\s\S]*?top: 16px;/);
  assert.match(css, /\.detail-action-grid[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /body\[data-view="detail"\] \.main[\s\S]*?padding-bottom: calc\(118px \+ var\(--mobile-nav-height\)/);
  assert.match(css, /\.mobile-detail-actions[\s\S]*?env\(safe-area-inset-bottom\)/);
});

test("mobile native shell exposes Today Candidates Capture Discover More", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(html, /data-mobile-label="今日"/);
  assert.match(html, /data-mobile-label="候选"/);
  assert.match(html, /data-mobile-label="发现"/);
  assert.match(html, /data-mobile-label="更多"/);
  assert.match(html, /data-mobile-capture/);
  assert.match(html, /id="mobileCaptureSheet"/);
  assert.match(css, /\.capture-nav-button/);
  assert.match(css, /body\[data-view="dashboard"\][\s\S]*?\.mobile-today/);
  assert.match(css, /\.nav-button\[data-view="drives"\][\s\S]*?display: none/);
});

test("mobile Today decision board renders top focus and tasks", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 820px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  const mobileCss = css.slice(mobileStart, mobileEnd);

  assert.match(app, /function renderMobileToday/);
  assert.match(app, /function mobileDecisionTitle/);
  assert.match(app, /function renderMobileTodayFocus/);
  assert.match(app, /renderDashboard\(\);\s*renderMobileToday\(\);/);
  assert.match(app, /getDashboardWorkflowActions\(\)\.slice\(0,\s*3\)/);
  assert.match(app, /filter\(\(car\) => !\["rejected", "purchased"\]\.includes\(car\.stage\)\)[\s\S]*?sort\(\(a, b\) => fitScore\(b\) - fitScore\(a\)\)\[0\]/);
  assert.match(app, /class="mobile-today-task \$\{task\.level\}" data-detail="\$\{escapeAttr\(car\.id\)\}"/);
  assert.match(app, /class="mobile-today-focus" data-detail="\$\{escapeAttr\(car\.id\)\}"/);
  assert.match(app, /id="mobileTodayAddCar"/);
  assert.match(app, /mobileTodayAddCar[\s\S]*?addRequirementCandidateToGarage/);
  assert.match(css, /\.mobile-today-hero/);
  assert.match(css, /\.mobile-today-focus/);
  assert.match(css, /\.mobile-today-tasks/);
  assert.match(mobileCss, /body\[data-view="dashboard"\]\s*\{[\s\S]*?background:\s*#[0-9a-fA-F]{3,6}/);
  assert.match(mobileCss, /body\[data-view="dashboard"\]\s+\.main\s*\{[\s\S]*?background:\s*#[0-9a-fA-F]{3,6}/);
});

test("mobile garage candidate feed renders stage chips and detail cards", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 820px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  const mobileCss = css.slice(mobileStart, mobileEnd);

  assert.match(app, /let mobileGarageStage = "all"/);
  assert.match(app, /function renderMobileGarage\(/);
  assert.match(app, /function renderMobileGarageCard\(/);
  assert.match(app, /function setMobileGarageStage\(/);
  assert.match(app, /function normalizeGarageStage\(/);
  assert.match(app, /renderGarage\(\);\s*renderMobileGarage\(\);/);
  assert.match(app, /event\.target\.closest\("\[data-mobile-stage\]"\)/);
  assert.match(app, /setMobileGarageStage\(mobileStageButton\.dataset\.mobileStage\)/);
  assert.match(app, /<div class="mobile-car-card-main" data-detail="\$\{escapeAttr\(car\.id\)\}" role="button" tabindex="0">/);
  assert.match(app, /document\.body\.addEventListener\("keydown", \(event\) => \{/);
  assert.match(app, /event\.target\.closest\("\.mobile-car-card-main\[role=\\"button\\"\]\[data-detail\]"\)/);
  assert.match(app, /if \(!\["Enter", " "\]\.includes\(event\.key\)\) return;/);
  assert.match(app, /switchToDetail\(mobileDetailButton\.dataset\.detail\)/);
  assert.match(app, /data-mobile-stage="\$\{escapeAttr\(stage\)\}"/);
  assert.match(app, /const normalizedStage = normalizeGarageStage\(car\.stage\)/);
  assert.match(app, /normalizeGarageStage\(car\.stage\) === stage/);
  assert.match(app, /normalizeGarageStage\(a\.stage\)/);
  assert.match(app, /stageLabel\(normalizedStage\)/);
  assert.match(app, /const displayName = car\.name \|\| "未命名候选"/);
  assert.match(app, /const mobileImage = getVehicleImages\(car\)\[0\]/);
  assert.match(app, /class="mobile-car-visual \$\{mobileImage \? "" : "is-empty"\}"/);
  assert.match(app, /<img src="\$\{escapeAttr\(mobileImage\.src\)\}" alt="\$\{escapeAttr\(mobileImage\.name \|\| displayName\)\}">/);
  assert.match(app, /mobile-card-next-action/);
  assert.match(app, /class="mobile-card-actions"/);
  assert.match(app, /getExternalSourceUrl\(car\)/);
  assert.match(app, /data-edit="\$\{escapeAttr\(car\.id\)\}"/);
  assert.match(app, /data-detail="\$\{escapeAttr\(car\.id\)\}"/);
  assert.match(mobileCss, /body\[data-view="garage"\]\s+#carGrid[\s\S]*?display: none/);
  assert.match(mobileCss, /body\[data-view="garage"\]\s+#garageView \.toolbar[\s\S]*?display: none/);
  assert.doesNotMatch(mobileCss, /body\[data-view="garage"\]\s+\.toolbar/);
  assert.match(mobileCss, /body\[data-view="garage"\]\s+\.garage-list-header[\s\S]*?display: none/);
  assert.match(mobileCss, /\.mobile-stage-chips[\s\S]*?display: flex/);
  assert.match(mobileCss, /\.mobile-car-feed[\s\S]*?display: grid/);
  assert.match(mobileCss, /\.mobile-car-card[\s\S]*?display: grid/);
  assert.match(mobileCss, /\.mobile-car-visual[\s\S]*?aspect-ratio:/);
  assert.match(mobileCss, /\.mobile-card-next-action/);
  assert.match(mobileCss, /\.mobile-card-actions[\s\S]*?display: flex/);
  assert.match(mobileCss, /\.mobile-card-actions a,[\s\S]*?flex: 1 1 92px/);
});

test("mobile native pages have dedicated containers instead of desktop-only compression", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");

  assert.match(html, /id="mobileToday"/);
  assert.match(html, /id="mobileGarageStageChips"/);
  assert.match(html, /id="mobileCarFeed"/);
  assert.match(html, /id="mobileDetailSegments"/);
  assert.match(html, /id="mobileCaptureCandidate"/);
  assert.match(html, /id="mobileCaptureFiles"/);
  assert.match(html, /id="mobileCaptureNotes"/);
});

test("mobile capture bottom sheet wires state render handlers and save path", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");

  assert.match(app, /let captureSheetOpen = false/);
  assert.match(app, /let lastViewedCarId/);
  assert.match(app, /function renderMobileCaptureSheet/);
  assert.match(app, /function getDefaultCaptureCandidateId/);
  assert.match(app, /function openMobileCaptureSheet/);
  assert.match(app, /function closeMobileCaptureSheet/);
  assert.match(app, /async function saveMobileCaptureEntry/);
  assert.match(app, /renderNav\(\);\s*renderMobileCaptureSheet\(\);/);
  assert.match(app, /function switchToDetail\(carId\) \{[\s\S]*?lastViewedCarId = carId;/);
  assert.match(app, /event\.target\.closest\("\[data-mobile-capture\]"\)/);
  assert.match(app, /event\.target\.closest\("\[data-close-mobile-capture\]"\)/);
  assert.match(app, /document\.querySelector\("#mobileCaptureForm"\)\?\.addEventListener\("submit",/);
  assert.match(app, /saveMobileCaptureEntry\(\)/);
  assert.match(app, /document\.querySelector\("#mobileCaptureCandidate"\)/);
  assert.match(app, /document\.querySelector\("#mobileCaptureFiles"\)\?\.files/);
  assert.match(app, /filesToInfoAttachments\(files\)/);
  assert.match(app, /collectAttachmentPayloadStats\(\[\{ attachments \}\]/);
  assert.match(app, /inferEvidenceType\(title, notes, url\)/);
  assert.match(app, /addDecisionLog\(car,/);
  assert.match(app, /analyzeCurrentCarWithGemini\(\{ auto: true, focusInfoId: item\.id \}\)/);
});

test("mobile capture bottom sheet has hidden desktop and open mobile sheet styling", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 820px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  const mobileCss = css.slice(mobileStart, mobileEnd);

  assert.match(css, /\.mobile-capture-sheet/);
  assert.match(css, /\.mobile-capture-panel/);
  assert.match(css, /\.mobile-capture-backdrop/);
  assert.match(css, /\.mobile-capture-sheet\s*\{[\s\S]*?display: none/);
  assert.match(mobileCss, /\.mobile-capture-sheet/);
  assert.match(mobileCss, /\.mobile-capture-sheet\.is-open/);
  assert.match(mobileCss, /\.mobile-capture-sheet\.is-open[\s\S]*?display: block/);
  assert.match(mobileCss, /\.mobile-capture-panel[\s\S]*?bottom: 0/);
  assert.match(mobileCss, /\.mobile-capture-panel[\s\S]*?max-height: calc\(100dvh/);
  assert.match(mobileCss, /\.mobile-capture-backdrop[\s\S]*?position: fixed/);
  assert.match(mobileCss, /\.mobile-capture-upload/);
  assert.match(mobileCss, /\.mobile-capture-actions/);
  assert.match(mobileCss, /env\(safe-area-inset-bottom\)/);
});
