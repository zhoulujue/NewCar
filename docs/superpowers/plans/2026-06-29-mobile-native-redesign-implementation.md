# Mobile Native Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved native-app-like mobile redesign while preserving the existing desktop NewCar workbench.

**Architecture:** Keep the current single-page app structure and add mobile-only composition layers in `index.html`, `app.js`, and `styles.css`. Desktop rendering stays intact; mobile gets dedicated containers for Today, Candidates, Capture, and Detail segments, activated by the `max-width: 820px` media layer and small JS state variables.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, localStorage state, existing image compression and evidence helpers, Node test runner static tests, in-app browser verification.

---

## File Structure

- Modify `index.html`
  - Add cache-busted asset version.
  - Add mobile capture nav button.
  - Add `#mobileToday`, `#mobileGarageStageChips`, `#mobileCarFeed`, `#mobileDetailSegments`, and `#mobileCaptureSheet`.
- Modify `app.js`
  - Add mobile state: `mobileGarageStage`, `captureSheetOpen`, `lastViewedCarId`, `mobileDetailSegment`.
  - Add renderers: `renderMobileToday`, `renderMobileGarage`, `renderMobileDetailSegments`, `renderMobileCaptureSheet`.
  - Add handlers: `openMobileCaptureSheet`, `closeMobileCaptureSheet`, `saveMobileCaptureEntry`, `setMobileGarageStage`, `scrollToMobileDetailSegment`.
  - Reuse existing helpers: `filesToInfoAttachments`, `collectAttachmentPayloadStats`, `inferEvidenceType`, `addDecisionLog`, `analyzeCurrentCarWithGemini`, `getWorkflowForCar`, `getDashboardWorkflowActions`.
- Modify `styles.css`
  - Add mobile design tokens.
  - Add native-style mobile shell, bottom nav, dark Today scene, candidate cards, capture sheet, detail segment chips, and safe-area spacing.
  - Preserve desktop behavior outside the mobile media block.
- Modify `scripts/tests/ui-static.test.mjs`
  - Add static tests for mobile native nav, capture sheet, Today, Candidates, and Detail segments.

---

### Task 1: Mobile Native Shell Markup And Static Tests

**Files:**
- Modify: `/Users/michael/Documents/NewCar/index.html`
- Modify: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`
- Modify: `/Users/michael/Documents/NewCar/styles.css`

- [ ] **Step 1: Write failing static tests**

Append these tests to `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: FAIL with missing `data-mobile-capture`, `mobileToday`, `mobileCaptureSheet`, and CSS selectors.

- [ ] **Step 3: Add minimal mobile shell markup**

Update `/Users/michael/Documents/NewCar/index.html`:

```html
<link rel="stylesheet" href="./styles.css?v=20260629-v27-mobile-native">
```

Change the nav labels and add the capture button:

```html
<button class="nav-button active" data-view="dashboard" data-mobile-label="今日" type="button">总览</button>
<button class="nav-button" data-view="discover" data-mobile-label="发现" type="button">发现</button>
<button class="nav-button" data-view="garage" data-mobile-label="候选" type="button">候选尽调</button>
<button class="nav-button capture-nav-button" data-mobile-capture type="button" aria-label="记录新信息">+</button>
<button class="nav-button" data-view="compare" data-mobile-label="对比" type="button">对比</button>
<button class="nav-button" data-view="drives" data-mobile-label="试驾" type="button">试驾</button>
<button class="nav-button" data-view="sellers" data-mobile-label="商家" type="button">商家</button>
<button class="nav-button" data-view="report" data-mobile-label="更多" type="button">报告</button>
```

Inside `#dashboardView`, before `#requirementPanel`, add:

```html
<section id="mobileToday" class="mobile-today" aria-label="今日决策"></section>
```

Inside `#garageView`, after `#garageListHeader`, add:

```html
<div id="mobileGarageStageChips" class="mobile-stage-chips" aria-label="候选阶段"></div>
<div id="mobileCarFeed" class="mobile-car-feed"></div>
```

Inside `#detailView`, after `.detail-topline`, add:

```html
<nav id="mobileDetailSegments" class="mobile-detail-segments" aria-label="详情分段"></nav>
```

Before `<dialog id="carDialog"...>`, add:

```html
<div id="mobileCaptureSheet" class="mobile-capture-sheet" hidden>
  <div class="mobile-capture-backdrop" data-close-mobile-capture></div>
  <section class="mobile-capture-panel" role="dialog" aria-modal="true" aria-labelledby="mobileCaptureTitle">
    <button class="mobile-sheet-handle" data-close-mobile-capture type="button" aria-label="关闭记录面板"></button>
    <div class="mobile-capture-head">
      <div>
        <h2 id="mobileCaptureTitle">记录新信息</h2>
        <p>先保存，AI 再帮你归档和分析。</p>
      </div>
    </div>
    <div class="mobile-capture-actions" role="group" aria-label="记录类型">
      <button data-capture-mode="photo" type="button">拍照</button>
      <button data-capture-mode="image" type="button">截图</button>
      <button data-capture-mode="link" type="button">贴链接</button>
      <button data-capture-mode="note" type="button">写备注</button>
    </div>
    <form id="mobileCaptureForm" class="mobile-capture-form">
      <label>关联候选<select id="mobileCaptureCandidate" class="input"></select></label>
      <input id="mobileCaptureTitleInput" class="input" placeholder="标题，可留空">
      <input id="mobileCaptureUrl" class="input" placeholder="链接，可留空">
      <textarea id="mobileCaptureNotes" class="input" rows="4" placeholder="聊天承诺、检测结论、自己的判断..."></textarea>
      <label class="upload-zone mobile-capture-upload">
        <span>上传照片/截图</span>
        <small>支持多张手机照片、聊天截图、车源截图</small>
        <input id="mobileCaptureFiles" type="file" accept="image/*" multiple>
      </label>
      <button class="primary-button" type="submit">保存到信息墙</button>
    </form>
  </section>
</div>
```

Update script version:

```html
<script src="./app.js?v=20260629-v27-mobile-native"></script>
```

- [ ] **Step 4: Add minimal CSS selectors to satisfy shell tests**

Add to `/Users/michael/Documents/NewCar/styles.css` before the current `@media (max-width: 820px)` block:

```css
.mobile-today,
.mobile-stage-chips,
.mobile-car-feed,
.mobile-detail-segments,
.mobile-capture-sheet,
.capture-nav-button {
  display: none;
}
```

Inside `@media (max-width: 820px)`, add:

```css
body[data-view="dashboard"] .mobile-today {
  display: grid;
}

.capture-nav-button {
  display: grid;
}

.nav-button[data-view="compare"],
.nav-button[data-view="drives"],
.nav-button[data-view="sellers"] {
  display: none;
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: PASS for the new mobile shell tests and existing static tests.

- [ ] **Step 6: Commit**

Run:

```bash
git add index.html styles.css scripts/tests/ui-static.test.mjs
git commit -m "Add mobile native shell markup"
```

---

### Task 2: Mobile Today Decision Board

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Modify: `/Users/michael/Documents/NewCar/styles.css`
- Modify: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [ ] **Step 1: Write failing static tests**

Append:

```js
test("mobile Today has a dedicated decision-board renderer", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /function renderMobileToday/);
  assert.match(app, /mobile-today-hero/);
  assert.match(app, /mobile-today-focus/);
  assert.match(app, /mobile-today-tasks/);
  assert.match(app, /getDashboardWorkflowActions\(\)\.slice\(0, 3\)/);
  assert.match(css, /\.mobile-today-hero/);
  assert.match(css, /body\[data-view="dashboard"\][\s\S]*?background:\s*#101820/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: FAIL because `renderMobileToday` and CSS classes do not exist.

- [ ] **Step 3: Implement `renderMobileToday`**

In `/Users/michael/Documents/NewCar/app.js`, call `renderMobileToday()` from `render()` immediately after `renderDashboard()`:

```js
renderDashboard();
renderMobileToday();
```

Add after `renderDashboard()`:

```js
function renderMobileToday() {
  const container = document.querySelector("#mobileToday");
  if (!container) return;
  const activeCars = state.cars.filter((car) => !["rejected", "purchased"].includes(car.stage));
  const best = [...activeCars].sort((a, b) => fitScore(b) - fitScore(a))[0] || state.cars[0];
  const actions = getDashboardWorkflowActions().slice(0, 3);
  const decision = best ? deriveRecommendation(best) : "";
  const decisionTitle = best ? mobileDecisionTitle(best, decision) : "先添加一台候选";
  const decisionCopy = best
    ? best.nextAction || getWorkflowForCar(best).decision.detail || "先补齐信息、成本和试驾记录。"
    : "添加候选后，NewCar 会生成今天最该推进的动作。";

  container.innerHTML = `
    <div class="mobile-today-head">
      <div>
        <span>NewCar</span>
        <h2>今天怎么选</h2>
        <p>距指标到期 ${daysUntilDeadline()} 天</p>
      </div>
      <button class="mobile-profile-pill" data-view-link="report" type="button">更多</button>
    </div>
    <section class="mobile-today-hero">
      <span>当前建议</span>
      <h3>${escapeHtml(decisionTitle)}</h3>
      <p>${escapeHtml(decisionCopy)}</p>
      ${best ? `<button data-detail="${escapeAttr(best.id)}" type="button">查看重点候选</button>` : `<button id="mobileTodayAddCar" type="button">新增候选</button>`}
    </section>
    ${best ? renderMobileTodayFocus(best) : ""}
    <section class="mobile-today-card mobile-today-tasks">
      <div class="mobile-section-head">
        <h3>今日 3 件事</h3>
        <span>${actions.length} 项</span>
      </div>
      ${actions.map(({ car, task, workflow }) => `
        <button class="mobile-task-row ${task.level}" data-detail="${escapeAttr(car.id)}" type="button">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(car.name)} · ${escapeHtml(workflow.decision.label)}</span>
        </button>
      `).join("") || `<p class="mobile-empty-copy">暂无紧急待办，适合继续观察价格。</p>`}
    </section>
  `;
}

function mobileDecisionTitle(car, recommendation) {
  if (!car) return "先添加候选";
  if (recommendation === "worthViewing") return `${car.name}：值得继续看`;
  if (recommendation === "waitDrop") return `${car.name}：等价格`;
  if (recommendation === "bargainOnly") return `${car.name}：只适合压价`;
  if (recommendation === "reject") return `${car.name}：先排除`;
  return `${car.name}：继续取证`;
}

function renderMobileTodayFocus(car) {
  const risk = analyzeCar(car);
  const workflow = getWorkflowForCar(car);
  return `
    <button class="mobile-today-focus" data-detail="${escapeAttr(car.id)}" type="button">
      <div class="mobile-focus-image">${car.image ? `<img src="${escapeAttr(car.image)}" alt="${escapeAttr(car.name)}">` : `<span>${escapeHtml(car.name)}</span>`}</div>
      <div>
        <span>最该关注</span>
        <h3>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</h3>
        <p>${escapeHtml(car.city || "未知城市")} · ${escapeHtml(car.source || "未知来源")}</p>
        <div class="mobile-pill-row">
          <span>匹配 ${fitScore(car)}</span>
          <span>${riskLabel(risk.level)} ${risk.score}</span>
          <span>${escapeHtml(workflow.decision.label)}</span>
        </div>
      </div>
    </button>
  `;
}
```

In the body click handler, support `#mobileTodayAddCar`:

```js
if (event.target.closest("#mobileTodayAddCar")) openCarDialog();
```

- [ ] **Step 4: Add high-fidelity Today CSS**

Inside `@media (max-width: 820px)`:

```css
body[data-view="dashboard"] {
  background: #101820;
}

body[data-view="dashboard"] .topbar,
body[data-view="dashboard"] #requirementPanel,
body[data-view="dashboard"] #decisionSummary,
body[data-view="dashboard"] #metricsGrid,
body[data-view="dashboard"] .dashboard-grid {
  display: none;
}

.mobile-today {
  min-height: calc(100dvh - var(--mobile-nav-height));
  gap: 14px;
  color: #fff;
}

.mobile-today-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
}

.mobile-today-head span,
.mobile-today-head p {
  color: rgba(255, 255, 255, 0.64);
  font-size: 12px;
}

.mobile-today-head h2 {
  margin-top: 4px;
  font-size: 28px;
  line-height: 1.08;
}

.mobile-profile-pill,
.mobile-today-hero button {
  min-height: 38px;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
}

.mobile-today-hero {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 22px;
  background: #0f766e;
  box-shadow: 0 18px 42px rgba(15, 118, 110, 0.22);
}

.mobile-today-hero span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 800;
}

.mobile-today-hero h3 {
  color: #fff;
  font-size: 25px;
  line-height: 1.16;
}

.mobile-today-hero p {
  color: rgba(255, 255, 255, 0.82);
}

.mobile-today-card,
.mobile-today-focus {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background: #fff;
  color: var(--text);
}

.mobile-today-focus {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 12px;
  text-align: left;
}

.mobile-focus-image {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 16px;
  background: #eaf0f5;
}

.mobile-focus-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mobile-today-tasks {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.mobile-task-row {
  display: grid;
  gap: 4px;
  width: 100%;
  min-height: 54px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #f8fafc;
  text-align: left;
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
node --check app.js
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add app.js styles.css scripts/tests/ui-static.test.mjs
git commit -m "Build mobile Today decision board"
```

---

### Task 3: Mobile Candidate Feed And Stage Chips

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Modify: `/Users/michael/Documents/NewCar/styles.css`
- Modify: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [ ] **Step 1: Write failing static tests**

Append:

```js
test("mobile candidate feed has stage chips and focused card renderer", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /let mobileGarageStage = "all"/);
  assert.match(app, /function renderMobileGarage/);
  assert.match(app, /function renderMobileGarageCard/);
  assert.match(app, /function setMobileGarageStage/);
  assert.match(app, /data-mobile-stage/);
  assert.match(app, /mobile-card-next-action/);
  assert.match(css, /\.mobile-stage-chips/);
  assert.match(css, /\.mobile-car-feed/);
  assert.match(css, /body\[data-view="garage"\][\s\S]*?#carGrid[\s\S]*?display: none/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: FAIL because mobile garage functions and selectors do not exist.

- [ ] **Step 3: Implement mobile garage state and renderer**

Near existing view state variables in `app.js`:

```js
let mobileGarageStage = "all";
```

Call `renderMobileGarage()` from `render()` after `renderGarage()`:

```js
renderGarage();
renderMobileGarage();
```

Add after `renderGarage()`:

```js
function renderMobileGarage() {
  const chips = document.querySelector("#mobileGarageStageChips");
  const feed = document.querySelector("#mobileCarFeed");
  if (!chips || !feed) return;
  const stages = [
    ["all", "全部"],
    ["watching", "观察"],
    ["waiting-docs", "补证"],
    ["test-drive", "试驾"],
    ["negotiating", "谈价"],
    ["rejected", "排除"]
  ];
  chips.innerHTML = stages.map(([stage, label]) => {
    const count = stage === "all" ? state.cars.length : state.cars.filter((car) => car.stage === stage).length;
    return `<button class="${mobileGarageStage === stage ? "active" : ""}" data-mobile-stage="${escapeAttr(stage)}" type="button">${escapeHtml(label)}<span>${count}</span></button>`;
  }).join("");

  const cars = [...state.cars]
    .filter((car) => mobileGarageStage === "all" || car.stage === mobileGarageStage)
    .sort((a, b) => {
      if (a.stage === "rejected" && b.stage !== "rejected") return 1;
      if (b.stage === "rejected" && a.stage !== "rejected") return -1;
      return fitScore(b) - fitScore(a);
    });

  feed.innerHTML = cars.map(renderMobileGarageCard).join("") || `<div class="mobile-empty-copy">没有符合阶段的候选。</div>`;
}

function renderMobileGarageCard(car) {
  const risk = analyzeCar(car);
  const rec = deriveRecommendation(car);
  const progress = getInvestigationProgress(car);
  const riskSummary = riskCompletionSummary(car);
  const workflow = getWorkflowForCar(car);
  return `
    <article class="mobile-car-card" data-detail="${escapeAttr(car.id)}">
      <button class="mobile-card-main" data-detail="${escapeAttr(car.id)}" type="button">
        <div class="mobile-card-photo">${car.image ? `<img src="${escapeAttr(car.image)}" alt="${escapeAttr(car.name)}">` : `<span>${escapeHtml(car.name)}</span>`}</div>
        <div class="mobile-card-body">
          <div class="mobile-card-title">
            <div>
              <h3>${escapeHtml(car.name)}</h3>
              <p>${escapeHtml(car.trim || "")}</p>
            </div>
            <strong>${formatWan(car.price)}</strong>
          </div>
          <p class="mobile-card-source">${escapeHtml([car.city, car.source, car.mileage ? `${car.mileage}万公里` : ""].filter(Boolean).join(" · ") || "来源待补")}</p>
          <div class="mobile-pill-row">
            <span>${recommendationLabel(rec)}</span>
            <span>${stageLabel(car.stage)}</span>
            <span>${riskSummary.open ? `${riskSummary.open} 风险` : riskLabel(risk.level)}</span>
          </div>
          <div class="mobile-card-progress"><span style="width:${progress.percent}%"></span></div>
          <p class="mobile-card-next-action">${escapeHtml(workflow.tasks[0]?.detail || car.nextAction || "补齐车源信息后再判断。")}</p>
        </div>
      </button>
      <div class="mobile-card-actions">
        <button data-edit="${escapeAttr(car.id)}" type="button">编辑</button>
        ${car.url ? `<button data-open-source-app="${escapeAttr(car.id)}" type="button">车源</button>` : ""}
      </div>
    </article>
  `;
}

function setMobileGarageStage(stage) {
  mobileGarageStage = stage || "all";
  renderMobileGarage();
}
```

In body click handler:

```js
const mobileStage = event.target.closest("[data-mobile-stage]")?.dataset.mobileStage;
if (mobileStage) setMobileGarageStage(mobileStage);
```

- [ ] **Step 4: Add mobile candidate CSS**

Inside `@media (max-width: 820px)`:

```css
body[data-view="garage"] .topbar {
  display: none;
}

body[data-view="garage"] #carGrid {
  display: none;
}

body[data-view="garage"] .toolbar {
  display: none;
}

.mobile-stage-chips {
  display: flex;
  gap: 8px;
  margin: 0 -14px 12px;
  padding: 4px 14px 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.mobile-stage-chips button {
  flex: 0 0 auto;
  min-height: 38px;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: #e7edf3;
  color: #334155;
  font-weight: 780;
}

.mobile-stage-chips button.active {
  background: #101820;
  color: #fff;
}

.mobile-stage-chips span {
  margin-left: 6px;
  opacity: 0.7;
}

.mobile-car-feed {
  display: grid;
  gap: 12px;
}

.mobile-car-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
}

.mobile-card-main {
  display: grid;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.mobile-card-photo {
  height: 148px;
  display: grid;
  place-items: center;
  background: #eaf0f5;
}

.mobile-card-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.mobile-card-body {
  display: grid;
  gap: 9px;
  padding: 12px;
}

.mobile-card-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.mobile-card-title h3 {
  font-size: 17px;
  line-height: 1.22;
}

.mobile-card-title strong {
  color: var(--primary);
  font-size: 17px;
}

.mobile-card-source,
.mobile-card-next-action {
  color: var(--muted);
  font-size: 12px;
}

.mobile-card-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.mobile-card-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.mobile-card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 12px 12px;
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
node --check app.js
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add app.js styles.css scripts/tests/ui-static.test.mjs
git commit -m "Add mobile candidate feed"
```

---

### Task 4: Mobile Capture Bottom Sheet

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Modify: `/Users/michael/Documents/NewCar/styles.css`
- Modify: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [ ] **Step 1: Write failing static tests**

Append:

```js
test("mobile capture sheet saves information through the existing evidence pipeline", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /let captureSheetOpen = false/);
  assert.match(app, /function openMobileCaptureSheet/);
  assert.match(app, /function closeMobileCaptureSheet/);
  assert.match(app, /async function saveMobileCaptureEntry/);
  assert.match(app, /filesToInfoAttachments\(files\)/);
  assert.match(app, /inferEvidenceType\(title, notes, url\)/);
  assert.match(app, /analyzeCurrentCarWithGemini\(\{ auto: true, focusInfoId: item\.id \}\)/);
  assert.match(css, /\.mobile-capture-sheet\.open/);
  assert.match(css, /\.mobile-capture-panel/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: FAIL because capture functions and CSS are missing.

- [ ] **Step 3: Implement capture state and renderer**

Near existing state variables in `app.js`:

```js
let captureSheetOpen = false;
let lastViewedCarId = selectedCarId || "";
```

Call `renderMobileCaptureSheet()` from `render()` after `renderNav()`:

```js
renderNav();
renderMobileCaptureSheet();
```

Add:

```js
function renderMobileCaptureSheet() {
  const sheet = document.querySelector("#mobileCaptureSheet");
  const select = document.querySelector("#mobileCaptureCandidate");
  if (!sheet || !select) return;
  sheet.hidden = !captureSheetOpen;
  sheet.classList.toggle("open", captureSheetOpen);
  const preferredId = getDefaultCaptureCandidateId();
  select.innerHTML = state.cars.map((car) => `<option value="${escapeAttr(car.id)}">${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</option>`).join("");
  if (preferredId && state.cars.some((car) => car.id === preferredId)) select.value = preferredId;
}

function getDefaultCaptureCandidateId() {
  if (selectedCarId && state.cars.some((car) => car.id === selectedCarId)) return selectedCarId;
  if (lastViewedCarId && state.cars.some((car) => car.id === lastViewedCarId)) return lastViewedCarId;
  return [...state.cars].sort((a, b) => fitScore(b) - fitScore(a))[0]?.id || "";
}

function openMobileCaptureSheet() {
  captureSheetOpen = true;
  renderMobileCaptureSheet();
  requestAnimationFrame(() => document.querySelector("#mobileCaptureNotes")?.focus({ preventScroll: true }));
}

function closeMobileCaptureSheet() {
  captureSheetOpen = false;
  renderMobileCaptureSheet();
}

async function saveMobileCaptureEntry() {
  const carId = getValue("#mobileCaptureCandidate") || getDefaultCaptureCandidateId();
  const car = state.cars.find((candidate) => candidate.id === carId);
  if (!car) {
    showToast("先选择一台关联候选。", "warn");
    return;
  }
  const title = getValue("#mobileCaptureTitleInput");
  const url = getValue("#mobileCaptureUrl");
  const notes = getValue("#mobileCaptureNotes");
  const files = document.querySelector("#mobileCaptureFiles")?.files;
  let attachments = [];
  try {
    attachments = await filesToInfoAttachments(files);
  } catch {
    showToast("图片读取失败，换一张截图或保存为 JPG/PNG 后再试。", "danger");
    return;
  }
  if (!title && !url && !notes && !attachments.length) {
    showToast("先写一点信息，或上传照片/截图。", "warn");
    return;
  }
  const attachmentStats = collectAttachmentPayloadStats([{ attachments }], {
    warningBytes: INFO_ATTACHMENT_WARNING_BYTES,
    hardLimitBytes: INFO_ATTACHMENT_HARD_BYTES
  });
  if (attachmentStats.tooLarge) {
    showToast(`图片合计 ${formatBytes(attachmentStats.totalBytes)}，请分批添加。`, "danger");
    return;
  }
  const fallbackTitle = title || notes.slice(0, 24) || attachments[0]?.name || url || "手机记录";
  const item = {
    id: makeId("ev"),
    carId: car.id,
    title: fallbackTitle,
    type: inferEvidenceType(fallbackTitle, notes, url),
    status: "valid",
    url,
    notes,
    attachments,
    createdAt: new Date().toISOString().slice(0, 10),
    analysisStatus: "queued",
    analysisError: "",
    analysisResult: null,
    linkedRiskIds: [],
    appliedAt: ""
  };
  state.evidence.unshift(item);
  addDecisionLog(car, {
    type: "mobile-capture",
    title: `手机记录：${item.title}`,
    detail: notes || url || `${attachments.length} 张图片`,
    level: "info",
    relatedIds: [item.id]
  });
  selectedCarId = car.id;
  lastViewedCarId = car.id;
  ["#mobileCaptureTitleInput", "#mobileCaptureUrl", "#mobileCaptureNotes"].forEach((selector) => setValue(selector, ""));
  const input = document.querySelector("#mobileCaptureFiles");
  if (input) input.value = "";
  closeMobileCaptureSheet();
  render();
  showToast("已保存到信息墙。", "ok");
  if (!attachmentStats.shouldWarn) analyzeCurrentCarWithGemini({ auto: true, focusInfoId: item.id });
}
```

In `switchToDetail(carId)` add:

```js
lastViewedCarId = carId;
```

In body click handler:

```js
if (event.target.closest("[data-mobile-capture]")) openMobileCaptureSheet();
if (event.target.closest("[data-close-mobile-capture]")) closeMobileCaptureSheet();
```

Add form submit listener:

```js
document.querySelector("#mobileCaptureForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveMobileCaptureEntry();
});
```

- [ ] **Step 4: Add capture sheet CSS**

Inside `@media (max-width: 820px)`:

```css
.mobile-capture-sheet.open {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: block;
}

.mobile-capture-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(16, 24, 32, 0.56);
}

.mobile-capture-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  gap: 14px;
  max-height: min(86dvh, 720px);
  overflow-y: auto;
  padding: 10px 14px calc(18px + env(safe-area-inset-bottom));
  border-radius: 26px 26px 0 0;
  background: #fff;
  box-shadow: 0 -24px 60px rgba(16, 24, 32, 0.28);
}

.mobile-sheet-handle {
  width: 48px;
  height: 5px;
  justify-self: center;
  min-height: 5px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #cbd5e1;
}

.mobile-capture-head h2 {
  font-size: 22px;
}

.mobile-capture-head p {
  margin-top: 4px;
  color: var(--muted);
}

.mobile-capture-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mobile-capture-actions button {
  min-height: 58px;
  border: 0;
  border-radius: 16px;
  background: #e8f5f2;
  color: var(--primary);
  font-weight: 850;
}

.mobile-capture-form {
  display: grid;
  gap: 10px;
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
node --check app.js
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add app.js styles.css scripts/tests/ui-static.test.mjs
git commit -m "Add mobile capture sheet"
```

---

### Task 5: Mobile Candidate Detail Segments

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Modify: `/Users/michael/Documents/NewCar/styles.css`
- Modify: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [ ] **Step 1: Write failing static tests**

Append:

```js
test("mobile candidate detail has segment anchors and native detail styling", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /let mobileDetailSegment = "overview"/);
  assert.match(app, /function renderMobileDetailSegments/);
  assert.match(app, /function scrollToMobileDetailSegment/);
  assert.match(app, /data-mobile-detail-segment="quality"/);
  assert.match(app, /mobile-detail-gate/);
  assert.match(css, /\.mobile-detail-segments/);
  assert.match(css, /body\[data-view="detail"\][\s\S]*?\.detail-topline[\s\S]*?display: none/);
  assert.match(css, /\.mobile-detail-gate/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: FAIL because mobile detail segment logic and styles do not exist.

- [ ] **Step 3: Implement segment rendering**

Near mobile state variables:

```js
let mobileDetailSegment = "overview";
```

Call `renderMobileDetailSegments(car, risk, workflow)` inside `renderDetail()` after `document.querySelector("#mobileDetailActions").innerHTML = ...`:

```js
renderMobileDetailSegments(car, risk, workflow);
```

In the no-car branch:

```js
document.querySelector("#mobileDetailSegments").innerHTML = "";
```

Add:

```js
function renderMobileDetailSegments(car, risk, workflow) {
  const container = document.querySelector("#mobileDetailSegments");
  if (!container || !car) return;
  const segments = [
    ["overview", "总览"],
    ["quality", "质量"],
    ["info", "信息"],
    ["cost", "成本"],
    ["drive", "试驾"]
  ];
  container.innerHTML = `
    <div class="mobile-detail-gate ${risk.level}">
      <span>当前门槛</span>
      <strong>${escapeHtml(workflow.decision.label)}</strong>
      <p>${escapeHtml(workflow.decision.detail)}</p>
    </div>
    <div class="mobile-detail-segment-row">
      ${segments.map(([key, label]) => `<button class="${mobileDetailSegment === key ? "active" : ""}" data-mobile-detail-segment="${escapeAttr(key)}" type="button">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
}

function scrollToMobileDetailSegment(segment) {
  mobileDetailSegment = segment || "overview";
  renderDetail();
  const target = {
    overview: "#detailHero",
    quality: "#qualityPanel",
    info: "#evidenceWall",
    cost: "#costPanel",
    drive: "#i6Matrix"
  }[mobileDetailSegment] || "#detailHero";
  requestAnimationFrame(() => {
    document.querySelector(target)?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}
```

In body click handler:

```js
const mobileDetailSegment = event.target.closest("[data-mobile-detail-segment]")?.dataset.mobileDetailSegment;
if (mobileDetailSegment) scrollToMobileDetailSegment(mobileDetailSegment);
```

- [ ] **Step 4: Add mobile detail CSS**

Inside `@media (max-width: 820px)`:

```css
body[data-view="detail"] .topbar,
body[data-view="detail"] .detail-topline {
  display: none;
}

.mobile-detail-segments {
  position: sticky;
  top: 0;
  z-index: 22;
  display: grid;
  gap: 10px;
  margin: -14px -14px 12px;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  background: rgba(245, 247, 249, 0.96);
  backdrop-filter: blur(18px);
}

.mobile-detail-gate {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
}

.mobile-detail-gate.high {
  border-color: rgba(180, 35, 24, 0.28);
  background: #fff7f6;
}

.mobile-detail-gate span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
}

.mobile-detail-gate strong {
  font-size: 18px;
}

.mobile-detail-gate p {
  color: var(--muted);
  font-size: 12px;
}

.mobile-detail-segment-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.mobile-detail-segment-row button {
  flex: 0 0 auto;
  min-height: 36px;
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  background: #e2e8f0;
  color: #334155;
  font-weight: 780;
}

.mobile-detail-segment-row button.active {
  background: #101820;
  color: #fff;
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
node --check app.js
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add app.js styles.css scripts/tests/ui-static.test.mjs
git commit -m "Add mobile detail segments"
```

---

### Task 6: Mobile Polish, Viewport Verification, And Deployment

**Files:**
- Modify: `/Users/michael/Documents/NewCar/styles.css`
- Modify: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [ ] **Step 1: Write final mobile guard tests**

Append:

```js
test("mobile native polish keeps safe areas and desktop boundaries explicit", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");

  assert.match(css, /--mobile-nav-height:\s*82px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.mobile-pill-row/);
  assert.match(css, /\.mobile-empty-copy/);
  assert.match(css, /@media \(min-width: 821px\)[\s\S]*?\.mobile-today[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?overflow-x: hidden/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/tests/ui-static.test.mjs
```

Expected: FAIL until final CSS guard styles exist.

- [ ] **Step 3: Add final polish CSS**

Inside `@media (max-width: 820px)` adjust:

```css
:root {
  --mobile-nav-height: 82px;
  --mobile-top-height: 64px;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

.main {
  padding: 14px 14px calc(22px + var(--mobile-nav-height) + env(safe-area-inset-bottom));
}

.nav-list {
  grid-template-columns: 1fr 1fr 76px 1fr 1fr;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
}

.capture-nav-button {
  min-height: 58px;
  border-radius: 22px;
  background: var(--primary);
  color: #fff;
  font-size: 28px;
  font-weight: 850;
  box-shadow: 0 12px 28px rgba(15, 118, 110, 0.28);
}

.capture-nav-button::before,
.capture-nav-button::after {
  content: none;
}

.mobile-pill-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mobile-pill-row span {
  min-width: 0;
  padding: 5px 8px;
  border-radius: 999px;
  background: #e8f5f2;
  color: var(--primary);
  font-size: 11px;
  font-weight: 780;
}

.mobile-empty-copy {
  padding: 12px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.68);
}
```

Add desktop guard:

```css
@media (min-width: 821px) {
  .mobile-today,
  .mobile-stage-chips,
  .mobile-car-feed,
  .mobile-detail-segments,
  .mobile-capture-sheet,
  .capture-nav-button {
    display: none;
  }
}
```

- [ ] **Step 4: Run all local checks**

Run:

```bash
node --check app.js
node --test scripts/tests/*.test.mjs
git diff --check
```

Expected: all pass, no whitespace errors.

- [ ] **Step 5: Browser verify desktop and mobile**

Start local server:

```bash
python3 -m http.server 4173
```

Use the in-app browser:

- Desktop width:
  - Open `http://127.0.0.1:4173/?verify-mobile-native=1`.
  - Verify desktop dashboard, garage, and detail still render without horizontal overflow.
- Mobile 390x844:
  - Set viewport to 390x844.
  - Verify dashboard shows dark Today scene and no dense desktop dashboard modules.
  - Verify bottom nav shows Today, Candidates, central plus, Discover, More.
  - Tap Candidates and verify mobile stage chips and cards.
  - Open a candidate and verify detail gate, segment chips, and bottom action bar.
  - Tap central plus and verify capture sheet opens and closes.
  - Verify `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`.
  - Read browser console errors and confirm none.

Stop local server after verification.

- [ ] **Step 6: Commit final polish**

Run:

```bash
git add styles.css scripts/tests/ui-static.test.mjs
git commit -m "Polish mobile native experience"
```

- [ ] **Step 7: Push and deploy**

Run:

```bash
git push origin main
rsync -az --delete --exclude '.git' ./ huoshan-johor:/srv/newcar/
ssh huoshan-johor 'systemctl restart newcar-gemini-analyzer.service newcar-dongchedi.service && sleep 2 && systemctl is-active newcar-gemini-analyzer.service newcar-dongchedi.service caddy'
curl -fsS https://car.zhoulujue.com/ | rg -n "20260629-v27-mobile-native|mobileCaptureSheet|mobileToday"
```

Expected:

- Push succeeds.
- Remote services print `active` for all three services.
- Production HTML contains the mobile native asset version and new mobile containers.

---

## Self-Review

### Spec Coverage

- Mobile nav Today/Candidates/Capture/Discover/More: Task 1 and Task 6.
- Today dark decision board: Task 2.
- Candidate feed and stage chips: Task 3.
- Capture bottom sheet: Task 4.
- Candidate detail segments and bottom actions: Task 5.
- Mobile visual system and safe areas: Task 6.
- Desktop preservation: Tasks 1-6 keep desktop markup and test both widths.

### Placeholder Scan

The plan contains no unresolved placeholder markers. Deferred scope is explicitly listed in the design spec, not left as implementation gaps.

### Type And Name Consistency

State names are consistent across tasks:

- `mobileGarageStage`
- `captureSheetOpen`
- `lastViewedCarId`
- `mobileDetailSegment`

Renderer and handler names are consistent:

- `renderMobileToday`
- `renderMobileGarage`
- `renderMobileGarageCard`
- `renderMobileCaptureSheet`
- `renderMobileDetailSegments`
- `openMobileCaptureSheet`
- `closeMobileCaptureSheet`
- `saveMobileCaptureEntry`
- `setMobileGarageStage`
- `scrollToMobileDetailSegment`
