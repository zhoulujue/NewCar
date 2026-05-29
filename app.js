const STORAGE_KEY = "newcar-workbench-v1";

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `car-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const seedCars = [
  {
    id: makeId(),
    name: "蔚来 ES6",
    trim: "2026款 四驱 原厂定制版",
    stage: "contacted",
    url: "https://www.dongchedi.com/usedcar/23944721",
    price: 25.49,
    newPrice: 36.37,
    landing: 26.5,
    battery: "buyout",
    batteryMonthly: 0,
    batterySize: 100,
    range: 650,
    mileage: 0.02,
    plateDate: "2026-05",
    transfers: 1,
    city: "深圳",
    source: "懂车帝自营",
    seller: "懂车帝汽车商城·深圳仓",
    exterior: "浅色车身/黑顶",
    interior: "浅色",
    nop: "unknown",
    report: "basic",
    image: "http://p9-dcd.byteimg.com/tos-cn-i-dcdx/feffe1ceb54d462ab4c050ad15104810~tplv-f042mdwyw7-original:480:0.image?psm=motor.pc_sh.api",
    options: "主驾零重力座椅、女王副驾、NOMI Mate 3.0，合计约2.57万选装。",
    issues: "准新车1次过户；电池买断和首任权益需要蔚来系统截图确认；公开页是基础检测。",
    notes: "重点核验电池产权、过户原因、NOP+、完整检测和底盘电池包。"
  },
  {
    id: makeId(),
    name: "蔚来 ES8",
    trim: "2026款 六座行政豪华版 BaaS",
    stage: "watching",
    url: "https://www.dongchedi.com/usedcar/23939227",
    price: 26.89,
    newPrice: 30.67,
    landing: 28.2,
    battery: "baas",
    batteryMonthly: 1128,
    batterySize: 102,
    range: 635,
    mileage: 0.05,
    plateDate: "2026-05",
    transfers: 0,
    city: "重庆",
    source: "懂车帝自营",
    seller: "懂车帝汽车商城·重庆店",
    exterior: "极夜黑/车衣",
    interior: "浅色",
    nop: "unknown",
    report: "basic",
    image: "http://p3-dcd.byteimg.com/tos-cn-i-dcdx/3ee6d8e17f414ad9b5a4546607ec9877~tplv-f042mdwyw7-original:480:0.image?psm=motor.pc_sh.api",
    options: "车顶行李架导轨、NOMI Mate 3.0，合计约0.79万选装。",
    issues: "BaaS月租长期成本高；车衣和颜色变更需看膜下漆面；NOP+大概率不随车。",
    notes: "车很舒服但对两人用车偏大。按3-5年持有成本看。"
  },
  {
    id: makeId(),
    name: "理想 i6",
    trim: "2025款 两驱标准版",
    stage: "watching",
    url: "",
    price: 22.46,
    newPrice: 24.98,
    landing: 23.3,
    battery: "buyout",
    batteryMonthly: 0,
    batterySize: 87,
    range: 720,
    mileage: 0.25,
    plateDate: "2025-09",
    transfers: 1,
    city: "重庆",
    source: "懂车帝自营",
    seller: "懂车帝汽车商城·重庆店",
    exterior: "黑色",
    interior: "深色",
    nop: "included",
    report: "basic",
    image: "",
    options: "两驱标准版。",
    issues: "价格接近新车权益后成交价；你已观察到疑似修复项较多。",
    notes: "只有干净车况且压到21万左右才值得继续看。"
  },
  {
    id: makeId(),
    name: "小鹏 G7",
    trim: "2025款 702 Ultra",
    stage: "watching",
    url: "",
    price: 17.19,
    newPrice: 22.58,
    landing: 18.0,
    battery: "buyout",
    batteryMonthly: 0,
    batterySize: 80,
    range: 702,
    mileage: 0.18,
    plateDate: "2025-08",
    transfers: 0,
    city: "武汉",
    source: "懂车帝自营",
    seller: "懂车帝汽车商城·武汉店",
    exterior: "深灰",
    interior: "浅色",
    nop: "included",
    report: "basic",
    image: "",
    options: "Ultra智驾版本。",
    issues: "舒适、静谧和内饰高级感弱于理想/蔚来。",
    notes: "作为性价比和智驾备选很强。"
  }
];

let state = loadState();
let activeView = "dashboard";
let selectedCompare = new Set(state.cars.slice(0, 3).map((car) => car.id));

const viewMeta = {
  dashboard: ["总览", "北京纯电指标，围绕舒适、续航、智能和车况风险筛车。"],
  garage: ["车库", "记录备选车、车源、价格、权益和检测信息。"],
  compare: ["对比", "把候选车放在同一张表里看真实取舍。"],
  drives: ["试驾", "记录前排舒适、静谧、底盘、车机和智驾体验。"],
  risks: ["风险", "按车源信息自动提示可能存在的坑。"]
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { cars: seedCars, drives: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      cars: Array.isArray(parsed.cars) ? parsed.cars : seedCars,
      drives: Array.isArray(parsed.drives) ? parsed.drives : []
    };
  } catch {
    return { cars: seedCars, drives: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
}

function formatWan(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value).toFixed(2)}万`;
}

function formatNumber(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value).toLocaleString("zh-CN")}${suffix}`;
}

function monthsSince(plateDate) {
  if (!plateDate) return null;
  const date = new Date(`${plateDate}-01`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
}

function getDiscountPct(car) {
  if (!car.newPrice || !car.price) return null;
  return Math.max(0, ((car.newPrice - car.price) / car.newPrice) * 100);
}

function riskLevelFromScore(score) {
  if (score >= 70) return "high";
  if (score >= 38) return "medium";
  return "low";
}

function riskLabel(level) {
  return { low: "低风险", medium: "中风险", high: "高风险" }[level] || "-";
}

function stageLabel(stage) {
  return {
    watching: "观察",
    contacted: "已联系",
    "test-drive": "已试驾",
    negotiating: "谈价",
    rejected: "排除"
  }[stage] || "观察";
}

function batteryLabel(type) {
  return { buyout: "买断", baas: "租电", unknown: "待确认" }[type] || "待确认";
}

function nopLabel(nop) {
  return {
    unknown: "待确认",
    included: "确认随车",
    "not-included": "不随车",
    subscription: "需订阅"
  }[nop] || "待确认";
}

function reportLabel(report) {
  return {
    basic: "基础检测",
    full: "完整检测",
    none: "暂无检测"
  }[report] || "待确认";
}

function analyzeCar(car) {
  const risks = [];
  const ageMonths = monthsSince(car.plateDate);
  const discount = getDiscountPct(car);
  const isNio = /蔚来|ES6|ES8|EC6|ET5/i.test(`${car.name} ${car.trim}`);

  if (car.battery === "unknown") {
    risks.push({ level: "high", title: "电池产权未确认", detail: "蔚来/新能源二手车必须先确认买断、BaaS、月租和是否欠费。" });
  }

  if (isNio && car.battery === "buyout" && car.price && car.newPrice && discount > 24 && ageMonths !== null && ageMonths <= 3) {
    risks.push({ level: "high", title: "准新买断车折价异常", detail: "刚上牌、低里程、买断电池却大幅折价，需解释来源和过户原因。" });
  }

  if (car.transfers > 0 && ageMonths !== null && ageMonths <= 6) {
    risks.push({ level: "high", title: "准新车已有过户", detail: "需要确认是否展车、试驾车、公司户、渠道车、退订车、抵押或手续流转车。" });
  }

  if (car.report !== "full") {
    risks.push({ level: car.report === "none" ? "high" : "medium", title: "检测颗粒度不足", detail: "基础检测不足以判断钣喷、拆装、底盘、电池包和维修细节。" });
  }

  if (isNio && car.nop === "unknown") {
    risks.push({ level: "medium", title: "NOP+权益待确认", detail: "二手蔚来不要默认继承NOP+。按需订阅会增加长期成本。" });
  }

  if (isNio && car.nop === "not-included") {
    risks.push({ level: "medium", title: "首任智驾权益缺失", detail: "NOP+若不随车，可按未来订阅成本压价。" });
  }

  if (car.battery === "baas") {
    risks.push({ level: "medium", title: "BaaS长期成本", detail: `月租${formatNumber(car.batteryMonthly || 0, "元")}会影响3-5年持有成本和二手流通。` });
  }

  if (car.exterior && /其他|改色|车衣|贴膜|变更/.test(car.exterior + car.issues + car.notes)) {
    risks.push({ level: "medium", title: "外观颜色或车衣需复核", detail: "检查登记证颜色、膜下漆面、边角包覆、拆装和局部补漆。" });
  }

  if (car.city && !/北京/.test(car.city)) {
    risks.push({ level: "low", title: "异地车源", detail: "确认电子转籍、北京上牌、运输、临牌和补贴领取条件。" });
  }

  if (!car.url) {
    risks.push({ level: "low", title: "车源链接缺失", detail: "补充链接后便于追踪价格变化、收藏状态和报告。" });
  }

  const score = risks.reduce((sum, item) => {
    return sum + ({ high: 34, medium: 18, low: 8 }[item.level] || 0);
  }, 0);
  const cappedScore = Math.min(100, score);
  return { risks, score: cappedScore, level: riskLevelFromScore(cappedScore) };
}

function fitScore(car) {
  const risk = analyzeCar(car).score;
  const rangeScore = Math.min(20, ((car.range || 0) / 720) * 20);
  const comfortScore = /理想|蔚来|奥迪/i.test(car.name) ? 22 : /小鹏|极氪/i.test(car.name) ? 16 : 14;
  const cityScore = /ES8|L80|大型/i.test(`${car.name} ${car.trim}`) ? 10 : 18;
  const valueScore = Math.min(20, (getDiscountPct(car) || 0) * 0.8);
  const ownershipScore = car.battery === "buyout" ? 12 : car.battery === "baas" ? 6 : 0;
  return Math.round(Math.max(0, rangeScore + comfortScore + cityScore + valueScore + ownershipScore - risk * 0.28));
}

function render() {
  renderNav();
  renderDashboard();
  renderGarage();
  renderCompare();
  renderDrives();
  renderRisks();
  saveState();
}

function renderNav() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === activeView);
  });
  const [title, subtitle] = viewMeta[activeView];
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewSubtitle").textContent = subtitle;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${activeView}View`).classList.add("active");
}

function renderDashboard() {
  const risks = state.cars.map(analyzeCar);
  const highCount = risks.filter((risk) => risk.level === "high").length;
  const avgRisk = risks.length ? Math.round(risks.reduce((sum, item) => sum + item.score, 0) / risks.length) : 0;
  const best = [...state.cars].sort((a, b) => fitScore(b) - fitScore(a))[0];
  const monthly = state.cars.reduce((sum, car) => sum + Number(car.batteryMonthly || 0), 0);

  document.querySelector("#metricsGrid").innerHTML = [
    metric("候选车", state.cars.length, "当前车库数量"),
    metric("高风险", highCount, "需要先问清楚"),
    metric("平均风险", avgRisk, "0低 100高"),
    metric("月固定成本", `${monthly.toLocaleString("zh-CN")}元`, "所有租电候选合计")
  ].join("");

  const mode = document.querySelector("#rankMode").value;
  const ranked = [...state.cars].sort((a, b) => {
    if (mode === "risk") return analyzeCar(a).score - analyzeCar(b).score;
    if (mode === "value") return (getDiscountPct(b) || 0) - (getDiscountPct(a) || 0);
    return fitScore(b) - fitScore(a);
  });
  document.querySelector("#rankedCars").innerHTML = ranked.map((car, index) => {
    const risk = analyzeCar(car);
    return `
      <div class="rank-item">
        <div class="rank-index">${index + 1}</div>
        <div>
          <div class="car-name">${escapeHtml(car.name)}</div>
          <div class="car-trim">${escapeHtml(car.trim || "")}</div>
        </div>
        <div class="fit-score">${mode === "risk" ? risk.score : fitScore(car)}</div>
      </div>
    `;
  }).join("");

  const actions = state.cars.flatMap((car) => analyzeCar(car).risks.slice(0, 2).map((risk) => ({ car, risk })));
  document.querySelector("#actionList").innerHTML = actions.slice(0, 8).map(({ car, risk }) => `
    <div class="action-item ${risk.level}">
      <strong>${escapeHtml(car.name)}</strong>
      <div>${escapeHtml(risk.title)}</div>
      <div class="muted">${escapeHtml(risk.detail)}</div>
    </div>
  `).join("") || `<div class="muted">暂无风险项。</div>`;

  if (best) {
    document.querySelector(".metric-card:nth-child(1) .metric-foot").textContent = `当前最高匹配：${best.name}`;
  }
}

function metric(label, value, foot) {
  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-foot">${foot}</div>
    </div>
  `;
}

function getFilteredCars() {
  const query = document.querySelector("#searchInput")?.value.trim().toLowerCase() || "";
  const stage = document.querySelector("#stageFilter")?.value || "all";
  const risk = document.querySelector("#riskFilter")?.value || "all";
  return state.cars.filter((car) => {
    const haystack = `${car.name} ${car.trim} ${car.city} ${car.seller} ${car.source}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStage = stage === "all" || car.stage === stage;
    const riskLevel = analyzeCar(car).level;
    const matchesRisk = risk === "all" || riskLevel === risk;
    return matchesQuery && matchesStage && matchesRisk;
  });
}

function renderGarage() {
  const cars = getFilteredCars();
  document.querySelector("#carGrid").innerHTML = cars.map((car) => {
    const risk = analyzeCar(car);
    const discount = getDiscountPct(car);
    return `
      <article class="car-card">
        <div class="car-photo">${car.image ? `<img src="${escapeAttr(car.image)}" alt="${escapeAttr(car.name)}">` : `<span>${escapeHtml(car.name)}</span>`}</div>
        <div class="car-body">
          <div class="car-title-line">
            <div>
              <div class="car-name">${escapeHtml(car.name)}</div>
              <div class="car-trim">${escapeHtml(car.trim || "")}</div>
            </div>
            <div class="price">${formatWan(car.price)}</div>
          </div>
          <div class="chip-row">
            <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
            <span class="chip">${stageLabel(car.stage)}</span>
            <span class="chip">${batteryLabel(car.battery)}</span>
            ${discount !== null ? `<span class="chip">折让 ${discount.toFixed(1)}%</span>` : ""}
          </div>
          <div class="car-meta">
            <div class="meta-cell"><div class="meta-label">里程</div><div class="meta-value">${formatNumber(car.mileage, "万km")}</div></div>
            <div class="meta-cell"><div class="meta-label">续航</div><div class="meta-value">${formatNumber(car.range, "km")}</div></div>
            <div class="meta-cell"><div class="meta-label">过户</div><div class="meta-value">${formatNumber(car.transfers, "次")}</div></div>
          </div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(car.city || "未知城市")}</span>
            <span class="chip">${escapeHtml(car.source || "未知车源")}</span>
            <span class="chip">${reportLabel(car.report)}</span>
          </div>
          <div class="card-actions">
            <button data-edit="${car.id}">编辑</button>
            <button data-risk="${car.id}">风险</button>
            <button data-compare="${car.id}">${selectedCompare.has(car.id) ? "移出对比" : "加入对比"}</button>
            ${car.url ? `<a href="${escapeAttr(car.url)}" target="_blank" rel="noreferrer">打开</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("") || `<div class="muted">没有符合条件的车源。</div>`;
}

function renderCompare() {
  const cars = state.cars.filter((car) => selectedCompare.has(car.id));
  document.querySelector("#compareHint").textContent = `已选 ${cars.length} 台`;
  if (!cars.length) {
    document.querySelector("#compareTableWrap").innerHTML = `<div class="muted">在车库中加入对比。</div>`;
    return;
  }
  const rows = [
    ["售价", (car) => formatWan(car.price)],
    ["新车同配置", (car) => formatWan(car.newPrice)],
    ["折让", (car) => getDiscountPct(car) === null ? "-" : `${getDiscountPct(car).toFixed(1)}%`],
    ["落地估算", (car) => formatWan(car.landing)],
    ["电池", (car) => `${batteryLabel(car.battery)}${car.batteryMonthly ? ` / ${car.batteryMonthly}元月` : ""}`],
    ["续航", (car) => formatNumber(car.range, "km")],
    ["里程", (car) => formatNumber(car.mileage, "万km")],
    ["过户", (car) => formatNumber(car.transfers, "次")],
    ["城市", (car) => car.city || "-"],
    ["内饰", (car) => car.interior || "-"],
    ["NOP/智驾", (car) => nopLabel(car.nop)],
    ["检测", (car) => reportLabel(car.report)],
    ["风险", (car) => `${riskLabel(analyzeCar(car).level)} ${analyzeCar(car).score}`],
    ["备注", (car) => car.notes || "-"]
  ];
  document.querySelector("#compareTableWrap").innerHTML = `
    <table>
      <thead>
        <tr><th>项目</th>${cars.map((car) => `<th>${escapeHtml(car.name)}<div class="muted">${escapeHtml(car.trim || "")}</div></th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map(([label, getter]) => `<tr><th>${label}</th>${cars.map((car) => `<td>${escapeHtml(String(getter(car)))}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderDrives() {
  const select = document.querySelector("#driveCar");
  select.innerHTML = state.cars.map((car) => `<option value="${car.id}">${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</option>`).join("");
  document.querySelector("#driveList").innerHTML = state.drives.map((drive) => {
    const car = state.cars.find((item) => item.id === drive.carId);
    const avg = Math.round((drive.seat + drive.nvh + drive.chassis + drive.cockpit + drive.adas + drive.parking) / 6);
    return `
      <article class="drive-card">
        <div class="panel-head">
          <h3>${escapeHtml(car ? car.name : "已删除车辆")}</h3>
          <span class="chip">${avg}/10</span>
        </div>
        <div class="muted">${escapeHtml(drive.date || "-")} · ${escapeHtml(drive.place || "-")}</div>
        <div class="chip-row">
          <span class="chip">座椅 ${drive.seat}</span>
          <span class="chip">静谧 ${drive.nvh}</span>
          <span class="chip">底盘 ${drive.chassis}</span>
          <span class="chip">车机 ${drive.cockpit}</span>
          <span class="chip">智驾 ${drive.adas}</span>
          <span class="chip">停车 ${drive.parking}</span>
        </div>
        <p class="drive-notes">${escapeHtml(drive.notes || "")}</p>
      </article>
    `;
  }).join("") || `<div class="muted">暂无试驾记录。</div>`;
}

function renderRisks() {
  const select = document.querySelector("#riskCarSelect");
  const current = select.value || state.cars[0]?.id;
  select.innerHTML = state.cars.map((car) => `<option value="${car.id}">${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</option>`).join("");
  if (current && state.cars.some((car) => car.id === current)) select.value = current;
  const car = state.cars.find((item) => item.id === select.value) || state.cars[0];
  if (!car) {
    document.querySelector("#riskDetail").innerHTML = `<div class="muted">暂无车辆。</div>`;
    document.querySelector("#checklist").innerHTML = "";
    return;
  }
  const result = analyzeCar(car);
  document.querySelector("#riskDetail").innerHTML = `
    <div class="risk-summary">
      <div class="risk-dial ${result.level}">${result.score}</div>
      <div>
        <h3>${escapeHtml(car.name)}</h3>
        <div class="muted">${escapeHtml(car.trim || "")}</div>
        <div class="chip-row">
          <span class="chip ${result.level}">${riskLabel(result.level)}</span>
          <span class="chip">${batteryLabel(car.battery)}</span>
          <span class="chip">${nopLabel(car.nop)}</span>
        </div>
      </div>
    </div>
    <div class="risk-list">
      ${result.risks.map((risk) => `
        <article class="risk-card ${risk.level}">
          <div class="chip-row"><span class="chip ${risk.level}">${riskLabel(risk.level)}</span></div>
          <h3>${escapeHtml(risk.title)}</h3>
          <p class="muted">${escapeHtml(risk.detail)}</p>
        </article>
      `).join("") || `<div class="muted">暂无自动风险项。</div>`}
    </div>
  `;
  document.querySelector("#checklist").innerHTML = getChecklist(car).map((item) => `
    <div class="check-item">
      <div class="check-dot"></div>
      <div>${escapeHtml(item)}</div>
    </div>
  `).join("");
}

function getChecklist(car) {
  const isNio = /蔚来|ES6|ES8|EC6|ET5/i.test(`${car.name} ${car.trim}`);
  const items = [
    "完整出险记录、维保记录、第三方检测报告",
    "漆膜检测，重点看前后杠、四门、翼子板、后围板",
    "举升检查底盘、电池包外壳、悬架、轮毂和轮胎",
    "确认发票、登记证、是否抵押、是否营运、是否可正常迁入北京"
  ];
  if (isNio) {
    items.unshift("蔚来系统截图：电池产权、是否BaaS、是否欠费、是否可过户");
    items.push("蔚来系统截图：NOP+、车联网、质保、道路救援剩余权益");
  }
  if (car.transfers > 0) {
    items.push("解释准新车过户原因，并写入合同附件");
  }
  if (car.battery === "baas") {
    items.push("核实BaaS月租、租约转移、后续买断规则和违约责任");
  }
  return items;
}

function openCarDialog(carId = null) {
  const car = carId ? state.cars.find((item) => item.id === carId) : null;
  document.querySelector("#dialogTitle").textContent = car ? "编辑车源" : "新增车源";
  document.querySelector("#deleteCar").style.display = car ? "inline-block" : "none";
  const defaults = {
    id: "",
    name: "",
    trim: "",
    stage: "watching",
    url: "",
    price: "",
    newPrice: "",
    landing: "",
    battery: "unknown",
    batteryMonthly: "",
    batterySize: "",
    range: "",
    mileage: "",
    plateDate: "",
    transfers: 0,
    city: "",
    source: "",
    seller: "",
    exterior: "",
    interior: "",
    nop: "unknown",
    report: "basic",
    image: "",
    options: "",
    issues: "",
    notes: ""
  };
  const data = { ...defaults, ...(car || {}) };
  setValue("#carId", data.id);
  setValue("#carName", data.name);
  setValue("#carTrim", data.trim);
  setValue("#carStage", data.stage);
  setValue("#carUrl", data.url);
  setValue("#carPrice", data.price);
  setValue("#carNewPrice", data.newPrice);
  setValue("#carLanding", data.landing);
  setValue("#carBattery", data.battery);
  setValue("#carBatteryMonthly", data.batteryMonthly);
  setValue("#carBatterySize", data.batterySize);
  setValue("#carRange", data.range);
  setValue("#carMileage", data.mileage);
  setValue("#carPlateDate", data.plateDate);
  setValue("#carTransfers", data.transfers);
  setValue("#carCity", data.city);
  setValue("#carSource", data.source);
  setValue("#carSeller", data.seller);
  setValue("#carExterior", data.exterior);
  setValue("#carInterior", data.interior);
  setValue("#carNop", data.nop);
  setValue("#carReport", data.report);
  setValue("#carImage", data.image);
  setValue("#carOptions", data.options);
  setValue("#carIssues", data.issues);
  setValue("#carNotes", data.notes);
  document.querySelector("#carDialog").showModal();
}

function setValue(selector, value) {
  document.querySelector(selector).value = value ?? "";
}

function getValue(selector) {
  return document.querySelector(selector).value.trim();
}

function numberValue(selector) {
  const value = getValue(selector);
  return value === "" ? "" : Number(value);
}

function saveCarFromForm() {
  const id = getValue("#carId") || makeId();
  const car = {
    id,
    name: getValue("#carName"),
    trim: getValue("#carTrim"),
    stage: getValue("#carStage"),
    url: getValue("#carUrl"),
    price: numberValue("#carPrice"),
    newPrice: numberValue("#carNewPrice"),
    landing: numberValue("#carLanding"),
    battery: getValue("#carBattery"),
    batteryMonthly: numberValue("#carBatteryMonthly"),
    batterySize: numberValue("#carBatterySize"),
    range: numberValue("#carRange"),
    mileage: numberValue("#carMileage"),
    plateDate: getValue("#carPlateDate"),
    transfers: numberValue("#carTransfers"),
    city: getValue("#carCity"),
    source: getValue("#carSource"),
    seller: getValue("#carSeller"),
    exterior: getValue("#carExterior"),
    interior: getValue("#carInterior"),
    nop: getValue("#carNop"),
    report: getValue("#carReport"),
    image: getValue("#carImage"),
    options: getValue("#carOptions"),
    issues: getValue("#carIssues"),
    notes: getValue("#carNotes")
  };
  const index = state.cars.findIndex((item) => item.id === id);
  if (index >= 0) state.cars[index] = car;
  else state.cars.unshift(car);
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    render();
  });
});

document.querySelectorAll("[data-view-link]").forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.viewLink;
    render();
  });
});

document.querySelector("#addCar").addEventListener("click", () => openCarDialog());
document.querySelector("#closeDialog").addEventListener("click", () => document.querySelector("#carDialog").close());
document.querySelector("#cancelCar").addEventListener("click", () => document.querySelector("#carDialog").close());
document.querySelector("#carForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveCarFromForm();
  document.querySelector("#carDialog").close();
});

document.querySelector("#deleteCar").addEventListener("click", () => {
  const id = getValue("#carId");
  state.cars = state.cars.filter((car) => car.id !== id);
  selectedCompare.delete(id);
  document.querySelector("#carDialog").close();
  render();
});

document.querySelector("#carGrid").addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const riskId = event.target.dataset.risk;
  const compareId = event.target.dataset.compare;
  if (editId) openCarDialog(editId);
  if (riskId) {
    activeView = "risks";
    render();
    document.querySelector("#riskCarSelect").value = riskId;
    renderRisks();
  }
  if (compareId) {
    if (selectedCompare.has(compareId)) selectedCompare.delete(compareId);
    else selectedCompare.add(compareId);
    render();
  }
});

["#searchInput", "#stageFilter", "#riskFilter", "#rankMode", "#riskCarSelect"].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("input", render);
});

document.querySelector("#driveForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.drives.unshift({
    id: makeId(),
    carId: getValue("#driveCar"),
    date: getValue("#driveDate"),
    place: getValue("#drivePlace"),
    seat: Number(document.querySelector("#scoreSeat").value),
    nvh: Number(document.querySelector("#scoreNvh").value),
    chassis: Number(document.querySelector("#scoreChassis").value),
    cockpit: Number(document.querySelector("#scoreCockpit").value),
    adas: Number(document.querySelector("#scoreAdas").value),
    parking: Number(document.querySelector("#scoreParking").value),
    notes: getValue("#driveNotes")
  });
  document.querySelector("#driveNotes").value = "";
  render();
});

document.querySelector("#exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `newcar-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#importData").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = JSON.parse(text);
  state = {
    cars: Array.isArray(parsed.cars) ? parsed.cars : [],
    drives: Array.isArray(parsed.drives) ? parsed.drives : []
  };
  selectedCompare = new Set(state.cars.slice(0, 3).map((car) => car.id));
  render();
});

document.querySelector("#resetSeed").addEventListener("click", () => {
  state = { cars: seedCars.map((car) => ({ ...car, id: makeId() })), drives: [] };
  selectedCompare = new Set(state.cars.slice(0, 3).map((car) => car.id));
  render();
});

render();
