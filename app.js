const BASE_STORAGE_KEY = "newcar-workbench-v1";
const AUTH_PROFILE_KEY = "newcar-auth-profile";
const INDICATOR_DEADLINE = new Date("2027-05-26T23:59:59+08:00");
const INFO_IMAGE_MAX_EDGE = 1280;
const INFO_IMAGE_QUALITY = 0.72;
const INFO_ATTACHMENT_WARNING_BYTES = 4 * 1024 * 1024;
const INFO_ATTACHMENT_HARD_BYTES = 9 * 1024 * 1024;
const AI_ATTACHMENT_WARNING_BYTES = 18 * 1024 * 1024;
const AI_ATTACHMENT_HARD_BYTES = 26 * 1024 * 1024;
const GEMINI_ANALYZER_URL = window.NEWCAR_AI_CONFIG?.geminiAnalyzerUrl || "/api/analyze";
const LOCAL_GEMINI_ANALYZER_URL = window.NEWCAR_AI_CONFIG?.localGeminiAnalyzerUrl || "http://127.0.0.1:8787/analyze";
const GEMINI_RECOMMENDER_URL = window.NEWCAR_AI_CONFIG?.geminiRecommenderUrl || "/api/recommend";
const LOCAL_GEMINI_RECOMMENDER_URL = window.NEWCAR_AI_CONFIG?.localGeminiRecommenderUrl || "http://127.0.0.1:8787/recommend";
const GEMINI_QUALITY_URL = window.NEWCAR_AI_CONFIG?.geminiQualityUrl || "/api/quality";
const LOCAL_GEMINI_QUALITY_URL = window.NEWCAR_AI_CONFIG?.localGeminiQualityUrl || "http://127.0.0.1:8787/quality";
const DONGCHEDI_NEWCAR_URL = window.NEWCAR_DATA_CONFIG?.dongchediNewcarUrl || "/api/dongchedi/recent-models";
const LOCAL_DONGCHEDI_NEWCAR_URL = window.NEWCAR_DATA_CONFIG?.localDongchediNewcarUrl || "http://127.0.0.1:8788/dongchedi/recent-models";
const DONGCHEDI_USEDCAR_URL = window.NEWCAR_DATA_CONFIG?.dongchediUsedcarUrl || "/api/dongchedi/official-usedcars";
const LOCAL_DONGCHEDI_USEDCAR_URL = window.NEWCAR_DATA_CONFIG?.localDongchediUsedcarUrl || "http://127.0.0.1:8788/dongchedi/official-usedcars";
const AI_ANALYZE_TIMEOUT_MS = 90000;
const REQUIREMENT_RECOMMEND_TIMEOUT_MS = 70000;
const REQUIREMENT_MARKET_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const INVESTIGATION_STEP_DEFINITIONS = [
  ["price", "价格", "报价、目标价、权益和真实落地成本"],
  ["condition", "车况", "检测报告、照片、底盘和电池包"],
  ["quality", "质量", "SOH、维保、故障码、三电质保和车系质量口碑"],
  ["rights", "权益", "电池、智驾、质保、官方认证"],
  ["seller", "商家", "身份、承诺、背调和担保"],
  ["drive", "试驾", "前排舒适、静谧、底盘和车机"],
  ["contract", "合同", "关键承诺写入订单或附件"],
  ["recheck", "复检", "付款前第三方复检和手续核验"]
];
const INVESTIGATION_STEP_IDS = INVESTIGATION_STEP_DEFINITIONS.map(([id]) => id);
const RISK_STATUS_OPTIONS = ["pending", "confirmed", "cleared", "contracted", "accepted"];
const INFO_ANALYSIS_STATUS_OPTIONS = ["idle", "queued", "running", "ready", "applied", "failed"];
const QUALITY_STATUS_OPTIONS = ["unknown", "missing", "pending", "partial", "complete", "clean", "issue", "active", "expired", "not-transferable", "none", "repaired", "processed"];
const QUALITY_SOURCE_GRADES = {
  single: "单车证据",
  official: "A 级",
  complaint: "B 级",
  study: "C 级",
  reputation: "D 级"
};

let geminiAnalysisRunning = false;
let qualityAnalysisRunning = false;
let geminiUnavailableNotified = false;
let requirementAnalysisRunning = false;
let requirementEditMode = false;
let newCarRefreshRunning = false;
let usedCarRefreshRunning = false;
let lastSaveFailed = false;
let lastSaveError = "";

function makeId(prefix = "id") {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const seedIds = {
  es6: makeId("car"),
  es8: makeId("car"),
  i6: makeId("car"),
  g7: makeId("car")
};

const seedCars = [
  {
    id: seedIds.es6,
    name: "蔚来 ES6",
    trim: "2026款 四驱 原厂定制版",
    stage: "contacted",
    recommendation: "worthViewing",
    url: "https://www.dongchedi.com/usedcar/23944721",
    price: 25.49,
    newPrice: 36.37,
    targetPrice: 24.3,
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
    certified: "unknown",
    image: "https://p9-dcd.byteimg.com/tos-cn-i-dcdx/feffe1ceb54d462ab4c050ad15104810~tplv-f042mdwyw7-original:480:0.image?psm=motor.pc_sh.api",
    costs: { insurance: 0.75, transport: 0.18, inspection: 0.18, reconditioning: 0.25, adasMonthly: 0, subscriptionMonthly: 0 },
    experience: { seat: 9, nvh: 8, chassis: 8, cockpit: 7, adas: 7, highway: 8, exterior: 8, interior: 9 },
    options: "主驾零重力座椅、女王副驾、NOMI Mate 3.0，合计约2.57万选装。",
    issues: "准新车1次过户；电池买断和首任权益需要蔚来系统截图确认；公开页是基础检测。",
    rightsNotes: "重点确认电池产权、NOP+、质保和官方认证状态。",
    sellerNotes: "懂车帝自营，仍需看完整检测和合同保障条款。",
    nextAction: "索要电池产权截图、NOP+权益截图、完整检测报告，约第三方复检。",
    notes: "目前最接近“舒适 + 价格 + 二手可控”的方向，但不能只看放心检分数。"
  },
  {
    id: seedIds.es8,
    name: "蔚来 ES8",
    trim: "2026款 六座行政豪华版 BaaS",
    stage: "watching",
    recommendation: "bargainOnly",
    url: "https://www.dongchedi.com/usedcar/23939227",
    price: 26.89,
    newPrice: 30.67,
    targetPrice: 25.5,
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
    certified: "unknown",
    image: "https://p3-dcd.byteimg.com/tos-cn-i-dcdx/3ee6d8e17f414ad9b5a4546607ec9877~tplv-f042mdwyw7-original:480:0.image?psm=motor.pc_sh.api",
    costs: { insurance: 0.9, transport: 0.18, inspection: 0.18, reconditioning: 0.3, adasMonthly: 0, subscriptionMonthly: 0 },
    experience: { seat: 9, nvh: 9, chassis: 9, cockpit: 7, adas: 7, highway: 9, exterior: 7, interior: 9 },
    options: "车顶行李架导轨、NOMI Mate 3.0，合计约0.79万选装。",
    issues: "BaaS月租长期成本高；车衣和颜色变更需看膜下漆面；NOP+大概率不随车。",
    rightsNotes: "租电合同、换电权益、NOP+和二手车主权益必须逐条确认。",
    sellerNotes: "懂车帝自营，关注预售车合同、平台担保和退换承诺是否写入订单。",
    nextAction: "按3/5年成本压价，不把26.89万当真实价格。",
    notes: "很舒服，但两人用车偏大，适合价格足够低时捡漏。"
  },
  {
    id: seedIds.i6,
    name: "理想 i6",
    trim: "2025款 两驱标准版",
    stage: "watching",
    recommendation: "waitDrop",
    url: "",
    price: 22.46,
    newPrice: 24.98,
    targetPrice: 21.3,
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
    certified: "unknown",
    image: "",
    costs: { insurance: 0.7, transport: 0.18, inspection: 0.18, reconditioning: 0.25, adasMonthly: 0, subscriptionMonthly: 0 },
    experience: { seat: 10, nvh: 10, chassis: 10, cockpit: 10, adas: 9, highway: 9, exterior: 8, interior: 9 },
    options: "两驱标准版。",
    issues: "价格接近新车权益后成交价；你已观察到疑似修复项较多。",
    rightsNotes: "理想辅助驾驶随车状态较清晰，但仍要确认官方认证、质保和维修记录。",
    sellerNotes: "懂车帝自营，重点看修复项目明细和复检结果。",
    nextAction: "除非价格到21万附近且复检干净，否则继续等。",
    notes: "体感标尺车。作为 benchmark，而不是急着买。"
  },
  {
    id: seedIds.g7,
    name: "小鹏 G7",
    trim: "2025款 702 Ultra",
    stage: "watching",
    recommendation: "watch",
    url: "",
    price: 17.19,
    newPrice: 22.58,
    targetPrice: 16.5,
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
    certified: "unknown",
    image: "",
    costs: { insurance: 0.58, transport: 0.2, inspection: 0.18, reconditioning: 0.2, adasMonthly: 0, subscriptionMonthly: 0 },
    experience: { seat: 7, nvh: 7, chassis: 7, cockpit: 8, adas: 9, highway: 8, exterior: 7, interior: 7 },
    options: "Ultra智驾版本。",
    issues: "舒适、静谧和内饰高级感弱于理想/蔚来。",
    rightsNotes: "智驾能力强，但要确认二手权益和官方质保。",
    sellerNotes: "懂车帝自营武汉店，可作为性价比对照样本。",
    nextAction: "只在预算明显收紧或智驾优先时继续看。",
    notes: "性价比强，但不是最贴近你偏好的舒适取向。"
  }
];

const seedEvidence = [
  {
    id: makeId("ev"),
    carId: seedIds.es6,
    title: "懂车帝车源页截图",
    type: "listing",
    status: "valid",
    url: "https://www.dongchedi.com/usedcar/23944721",
    notes: "25.49万，2026款 ES6 买断，1次过户，基础检测。",
    createdAt: "2026-05-29"
  },
  {
    id: makeId("ev"),
    carId: seedIds.es6,
    title: "NOP+权益待确认",
    type: "rights",
    status: "pending",
    url: "",
    notes: "需要蔚来官方 App 或客服书面确认。",
    createdAt: "2026-05-29"
  },
  {
    id: makeId("ev"),
    carId: seedIds.i6,
    title: "重庆 i6 疑似修复项",
    type: "report",
    status: "conflict",
    url: "",
    notes: "用户主观判断修复地方较多，需要完整检测和复检。",
    createdAt: "2026-05-29"
  }
];

const seedRequirement = {
  city: "北京",
  people: "2",
  scenes: ["city", "highway", "holiday"],
  budgetMinWan: 24,
  budgetMaxWan: 31,
  energyTypes: ["ev", "erev", "phev"],
  minRangeKm: 650,
  minPhevRangeKm: 300,
  priorities: ["comfort", "range", "cockpit", "adas", "interior", "appearance"],
  seatFocus: "front",
  bodyPreference: "suv_sedan",
  purchaseTiming: "2027-05-26 前上牌，7-8月也可阶段性决策",
  mustHaves: "北京可正常上牌；长续航；车机流畅；高速 NOA 好用；前排座椅舒适；静谧和底盘滤震优秀。",
  dealBreakers: "外观不能浮夸；方向盘造型不能太小太方；不喜欢智界 R7 外观；二手车事故修复太多不接受。",
  referenceCar: "理想 i6：用户开过一个月，认为驾驶和乘坐体验非常好，希望找到类似体验。",
  notes: "2人用车，没有小孩老人，后排需求弱；预算落地价30万左右，性能不是重点，平顺好开即可。"
};

let currentUser = loadAuthProfile();
let googleAuthReady = false;
let googleAuthAttempts = 0;
let state = normalizeState(loadState());
let activeView = "dashboard";
let activeDiscoverTab = "newcars";
let selectedCarId = state.selectedCarId || state.cars[0]?.id || "";
let selectedCompare = new Set(state.selectedCompare?.length ? state.selectedCompare : state.cars.slice(0, 3).map((car) => car.id));
const viewScrollPositions = {};

const viewMeta = {
  dashboard: ["总览", "一眼看到当前最值得看的车、关键风险和今天该做什么。"],
  discover: ["发现", "新车看车型和节奏，二手看具体车源和交易风险。"],
  garage: ["候选尽调", "按阶段、完成度和未关闭风险管理候选，避免新车车型和二手车源混在一起。"],
  detail: ["候选详情", "集中看配置、车况、成本、风险闭环、信息墙和下一步核验。"],
  compare: ["对比", "按真实成本、i6体感、权益明确度和风险做取舍。"],
  drives: ["试驾", "记录前排舒适、静谧、底盘、车机、智驾和相对 i6 结论。"],
  risks: ["待关闭风险", "把每条风险标记为已证实、已排除、写入合同或接受风险。"],
  sellers: ["商家", "聚合卖家身份、承诺、保障和车源风险。"],
  report: ["报告", "成交前检查红线、证据完整度、成本和下一步动作。"]
};

function loadState() {
  const raw = localStorage.getItem(getStorageKey());
  if (!raw) {
    return { cars: seedCars, evidence: seedEvidence, drives: [] };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { cars: seedCars, evidence: seedEvidence, drives: [] };
  }
}

function normalizeState(rawState) {
  const cars = Array.isArray(rawState.cars) && rawState.cars.length ? rawState.cars.map(normalizeCar) : seedCars.map(normalizeCar);
  const carIds = new Set(cars.map((car) => car.id));
  const evidence = Array.isArray(rawState.evidence)
    ? rawState.evidence.filter((item) => carIds.has(item.carId)).map(normalizeEvidence)
    : seedEvidence.filter((item) => carIds.has(item.carId)).map(normalizeEvidence);
  const drives = Array.isArray(rawState.drives) ? rawState.drives.map(normalizeDrive) : [];
  return {
    cars,
    evidence,
    drives,
    userRequirement: normalizeUserRequirement(rawState.userRequirement),
    requirementAnalysis: normalizeRequirementAnalysis(rawState.requirementAnalysis),
    market: normalizeMarket(rawState.market),
    usedMarket: normalizeUsedMarket(rawState.usedMarket),
    selectedCarId: rawState.selectedCarId || cars[0]?.id || "",
    selectedCompare: Array.isArray(rawState.selectedCompare) ? rawState.selectedCompare.filter((id) => carIds.has(id)) : []
  };
}

function normalizeUserRequirement(requirement = {}) {
  const source = requirement || {};
  const hasField = (field) => Object.prototype.hasOwnProperty.call(source, field);
  const fieldValue = (field, fallback) => (hasField(field) ? source[field] : fallback);
  const arrayValue = (field) => (hasField(field) ? normalizeStringArray(source[field]) : [...seedRequirement[field]]);
  const textValue = (field, fallback = "") => String(fieldValue(field, fallback) ?? "");
  return {
    city: textValue("city", "北京") || "北京",
    people: textValue("people", "2") || "2",
    scenes: arrayValue("scenes"),
    budgetMinWan: numberOrDefault(fieldValue("budgetMinWan", seedRequirement.budgetMinWan), seedRequirement.budgetMinWan),
    budgetMaxWan: numberOrDefault(fieldValue("budgetMaxWan", seedRequirement.budgetMaxWan), seedRequirement.budgetMaxWan),
    energyTypes: arrayValue("energyTypes"),
    minRangeKm: numberOrDefault(fieldValue("minRangeKm", seedRequirement.minRangeKm), seedRequirement.minRangeKm),
    minPhevRangeKm: numberOrDefault(fieldValue("minPhevRangeKm", seedRequirement.minPhevRangeKm), seedRequirement.minPhevRangeKm),
    priorities: arrayValue("priorities"),
    seatFocus: textValue("seatFocus", "front") || "front",
    bodyPreference: textValue("bodyPreference", "suv_sedan") || "suv_sedan",
    purchaseTiming: textValue("purchaseTiming", seedRequirement.purchaseTiming),
    mustHaves: textValue("mustHaves", seedRequirement.mustHaves),
    dealBreakers: textValue("dealBreakers", seedRequirement.dealBreakers),
    referenceCar: textValue("referenceCar", seedRequirement.referenceCar),
    notes: textValue("notes", seedRequirement.notes),
    updatedAt: textValue("updatedAt", "")
  };
}

function normalizeRequirementAnalysis(analysis = {}) {
  return {
    summary: normalizeAiDisplayCopy(analysis.summary),
    searchStrategy: normalizeAiDisplayCopy(analysis.searchStrategy),
    questions: normalizeStringArray(analysis.questions),
    source: analysis.source || "",
    lastAnalyzedAt: analysis.lastAnalyzedAt || "",
    error: normalizeAiDisplayCopy(analysis.error),
    candidates: Array.isArray(analysis.candidates) ? analysis.candidates.map(normalizeRequirementCandidate).filter(Boolean) : []
  };
}

function normalizeAiDisplayCopy(value = "") {
  return String(value || "")
    .replace(/Gemini/g, "AI")
    .replace(/DeepSeek/g, "AI")
    .replace(/LLM/g, "AI")
    .trim();
}

function normalizeRequirementCandidate(candidate) {
  if (!candidate?.name) return null;
  return {
    id: candidate.id || makeId("rec"),
    source: candidate.source || "manual",
    seriesId: candidate.seriesId === "" || candidate.seriesId === undefined ? "" : Number(candidate.seriesId),
    carId: candidate.carId || "",
    skuId: candidate.skuId === "" || candidate.skuId === undefined ? "" : Number(candidate.skuId),
    name: candidate.name || "",
    trim: candidate.trim || "",
    priceWan: numberOrBlank(candidate.priceWan),
    energyType: candidate.energyType || "unknown",
    rangeKm: numberOrBlank(candidate.rangeKm),
    fitScore: Math.max(0, Math.min(100, Math.round(numberOrDefault(candidate.fitScore, 0)))),
    confidence: candidate.confidence || "medium",
    why: candidate.why || "",
    nextAction: candidate.nextAction || "",
    tags: normalizeStringArray(candidate.tags),
    tradeoffs: normalizeStringArray(candidate.tradeoffs),
    sourceUrl: normalizeWebUrl(candidate.sourceUrl)
  };
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) return value.split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeCarKind(kind) {
  return ["new", "used", "manual"].includes(kind) ? kind : "manual";
}

function deriveCarKind(car = {}) {
  const text = `${car.source || ""} ${car.seller || ""} ${car.url || ""} ${car.notes || ""} ${car.trim || ""}`;
  if (car.sourceSkuId || car.skuId || /usedcar|二手|自营|直营|个人|车商|过户|上牌|里程|检测报告/i.test(text)) return "used";
  if (/新车|热门车型|近期发布|官方渠道|需求推荐|车型页/i.test(text)) return "new";
  if (car.mileage || car.plateDate || (car.transfers !== undefined && car.transfers !== "" && car.transfers !== null)) return "used";
  return "manual";
}

function carKind(car) {
  return normalizeCarKind(car?.kind || deriveCarKind(car));
}

function carKindLabel(kind) {
  return {
    new: "新车车型",
    used: "二手车源",
    manual: "手动记录"
  }[normalizeCarKind(kind)] || "手动记录";
}

function carKindClass(kind) {
  return {
    new: "info",
    used: "official",
    manual: "warn"
  }[normalizeCarKind(kind)] || "warn";
}

function normalizeCar(car) {
  const experience = car.experience || {};
  const costs = car.costs || {};
  const kind = normalizeCarKind(car.kind || deriveCarKind(car));
  const normalized = {
    id: car.id || makeId("car"),
    kind,
    name: car.name || "",
    trim: car.trim || "",
    stage: car.stage || "watching",
    recommendation: car.recommendation || "auto",
    url: normalizeWebUrl(car.url),
    sourceSkuId: car.sourceSkuId || car.skuId || "",
    price: numberOrBlank(car.price),
    newPrice: numberOrBlank(car.newPrice),
    targetPrice: numberOrBlank(car.targetPrice),
    landing: numberOrBlank(car.landing),
    battery: car.battery || "unknown",
    batteryMonthly: numberOrBlank(car.batteryMonthly),
    batterySize: numberOrBlank(car.batterySize),
    range: numberOrBlank(car.range),
    mileage: numberOrBlank(car.mileage),
    plateDate: car.plateDate || "",
    transfers: numberOrBlank(car.transfers),
    city: car.city || "",
    source: car.source || "",
    seller: car.seller || "",
    exterior: car.exterior || "",
    interior: car.interior || "",
    nop: car.nop || "unknown",
    report: car.report || "basic",
    certified: car.certified || "unknown",
    image: normalizeImageUrl(car.image),
    costs: {
      insurance: numberOrBlank(costs.insurance),
      transport: numberOrBlank(costs.transport),
      inspection: numberOrBlank(costs.inspection),
      reconditioning: numberOrBlank(costs.reconditioning),
      adasMonthly: numberOrBlank(costs.adasMonthly),
      subscriptionMonthly: numberOrBlank(costs.subscriptionMonthly)
    },
    experience: {
      seat: numberOrDefault(experience.seat, brandDefault(car, "seat")),
      nvh: numberOrDefault(experience.nvh, brandDefault(car, "nvh")),
      chassis: numberOrDefault(experience.chassis, brandDefault(car, "chassis")),
      cockpit: numberOrDefault(experience.cockpit, brandDefault(car, "cockpit")),
      adas: numberOrDefault(experience.adas, brandDefault(car, "adas")),
      highway: numberOrDefault(experience.highway, brandDefault(car, "highway")),
      exterior: numberOrDefault(experience.exterior, 8),
      interior: numberOrDefault(experience.interior, brandDefault(car, "interior"))
    },
    options: car.options || "",
    issues: car.issues || "",
    rightsNotes: car.rightsNotes || "",
    sellerNotes: car.sellerNotes || "",
    nextAction: car.nextAction || "",
    notes: car.notes || "",
    qualityProfile: normalizeQualityProfile(car.qualityProfile),
    riskItems: Array.isArray(car.riskItems) ? car.riskItems.map(normalizeRiskItem).filter(Boolean) : [],
    priceEvents: Array.isArray(car.priceEvents) ? car.priceEvents.map(normalizePriceEvent).filter(Boolean) : [],
    workflowTasks: Array.isArray(car.workflowTasks) ? car.workflowTasks.map(normalizeWorkflowTaskState).filter(Boolean) : [],
    decisionLog: Array.isArray(car.decisionLog) ? car.decisionLog.map(normalizeDecisionLogItem).filter(Boolean).slice(0, 80) : [],
    updatedAt: car.updatedAt || ""
  };
  normalized.investigation = normalizeInvestigation(car.investigation, normalized);
  return normalized;
}

function normalizeEvidence(item) {
  return {
    id: item.id || makeId("ev"),
    carId: item.carId,
    title: item.title || "未命名信息",
    type: item.type || "other",
    status: item.status || "pending",
    url: normalizeWebUrl(item.url),
    notes: item.notes || "",
    attachments: Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment).filter(Boolean) : [],
    createdAt: item.createdAt || new Date().toISOString().slice(0, 10),
    analysisStatus: normalizeInfoAnalysisStatus(item.analysisStatus),
    analysisError: item.analysisError || "",
    analysisResult: item.analysisResult && typeof item.analysisResult === "object" ? item.analysisResult : null,
    linkedRiskIds: normalizeStringArray(item.linkedRiskIds),
    appliedAt: item.appliedAt || ""
  };
}

function normalizeRiskItem(item) {
  if (!item) return null;
  const key = item.key || riskKey(item);
  if (!key) return null;
  const level = ["high", "medium", "low"].includes(item.level) ? item.level : "medium";
  const status = RISK_STATUS_OPTIONS.includes(item.status) ? item.status : "pending";
  return {
    key,
    title: item.title || "未命名风险",
    level,
    detail: item.detail || "",
    question: item.question || "",
    status,
    evidenceIds: normalizeStringArray(item.evidenceIds),
    note: item.note || "",
    updatedAt: item.updatedAt || ""
  };
}

function normalizeQualityProfile(profile = {}) {
  const sources = Array.isArray(profile.sources) ? profile.sources.map(normalizeQualitySource).filter(Boolean) : [];
  return {
    updatedAt: profile.updatedAt || "",
    complaintSalesRatio: numberOrBlank(profile.complaintSalesRatio),
    complaintRank: profile.complaintRank || "",
    complaintTrend: ["unknown", "rising", "stable", "falling"].includes(profile.complaintTrend) ? profile.complaintTrend : "unknown",
    threeElectricComplaintShare: numberOrBlank(profile.threeElectricComplaintShare),
    recallCount: numberOrBlank(profile.recallCount),
    recallNotes: profile.recallNotes || "",
    studySummary: profile.studySummary || "",
    ownerReputation: profile.ownerReputation || "",
    batterySoh: numberOrBlank(profile.batterySoh),
    sohDate: profile.sohDate || "",
    maintenanceStatus: normalizeQualityStatus(profile.maintenanceStatus),
    troubleCodeStatus: normalizeQualityStatus(profile.troubleCodeStatus),
    warrantyStatus: normalizeQualityStatus(profile.warrantyStatus),
    batteryRepairStatus: normalizeQualityStatus(profile.batteryRepairStatus),
    notes: profile.notes || "",
    sources
  };
}

function normalizeQualitySource(source = {}) {
  if (!source) return null;
  const type = ["official", "complaint", "study", "reputation", "single"].includes(source.type) ? source.type : "reputation";
  return {
    id: source.id || makeId("qs"),
    type,
    label: source.label || source.title || qualitySourceTypeLabel(type),
    grade: source.grade || QUALITY_SOURCE_GRADES[type] || "",
    status: source.status || "待补充",
    updatedAt: source.updatedAt || "",
    summary: source.summary || "",
    url: normalizeWebUrl(source.url)
  };
}

function normalizeQualityStatus(value) {
  return QUALITY_STATUS_OPTIONS.includes(value) ? value : "unknown";
}

function normalizePriceEvent(item) {
  if (!item) return null;
  return {
    id: item.id || makeId("price"),
    date: item.date || new Date().toISOString().slice(0, 10),
    field: item.field || "price",
    price: numberOrBlank(item.price),
    previousPrice: numberOrBlank(item.previousPrice),
    source: item.source || "",
    note: item.note || ""
  };
}

function normalizeWorkflowTaskState(item) {
  if (!item?.id) return null;
  return {
    id: item.id,
    status: item.status === "done" ? "done" : "open",
    completedAt: item.completedAt || "",
    evidenceIds: normalizeStringArray(item.evidenceIds),
    note: item.note || ""
  };
}

function normalizeDecisionLogItem(item) {
  if (!item) return null;
  return {
    id: item.id || makeId("log"),
    type: item.type || "note",
    title: item.title || "记录",
    detail: item.detail || "",
    level: ["ok", "low", "medium", "warn", "high", "danger", "info"].includes(item.level) ? item.level : "info",
    at: item.at || new Date().toISOString(),
    relatedIds: normalizeStringArray(item.relatedIds)
  };
}

function normalizeInvestigation(investigation = {}, car = {}) {
  const steps = {};
  const rawSteps = investigation.steps || {};
  INVESTIGATION_STEP_IDS.forEach((id) => {
    steps[id] = {
      done: Boolean(rawSteps[id]?.done),
      note: rawSteps[id]?.note || "",
      updatedAt: rawSteps[id]?.updatedAt || ""
    };
  });
  return {
    owner: investigation.owner || "",
    phase: investigation.phase || car.stage || "watching",
    steps,
    lastReviewedAt: investigation.lastReviewedAt || ""
  };
}

function normalizeInfoAnalysisStatus(status) {
  return INFO_ANALYSIS_STATUS_OPTIONS.includes(status) ? status : "idle";
}

function normalizeAttachment(attachment) {
  const dataUrl = normalizeImageUrl(attachment?.dataUrl);
  if (!dataUrl) return null;
  return {
    id: attachment.id || makeId("att"),
    name: attachment.name || "图片",
    type: attachment.type || "image/jpeg",
    size: numberOrBlank(attachment.size),
    dataUrl
  };
}

function normalizeDrive(drive) {
  return {
    id: drive.id || makeId("drive"),
    carId: drive.carId || "",
    date: drive.date || "",
    place: drive.place || "",
    seat: numberOrDefault(drive.seat, 8),
    nvh: numberOrDefault(drive.nvh, 8),
    chassis: numberOrDefault(drive.chassis, 8),
    cockpit: numberOrDefault(drive.cockpit, 8),
    adas: numberOrDefault(drive.adas, 8),
    highway: numberOrDefault(drive.highway ?? drive.parking, 8),
    relative: drive.relative || "similar",
    notes: drive.notes || ""
  };
}

function normalizeMarket(market = {}) {
  const releases = Array.isArray(market.releases) ? market.releases.map(normalizeRelease).filter(Boolean) : [];
  return {
    releases: mergeNormalizedReleases(releases),
    lastFetchedAt: market.lastFetchedAt || "",
    sourceUrl: market.sourceUrl || "",
    sourceLabel: market.sourceLabel || "懂车帝",
    profileSummary: market.profileSummary || "",
    error: market.error || ""
  };
}

function mergeNormalizedReleases(releases = []) {
  const map = new Map();
  for (const release of releases) {
    const key = releaseDedupKey(release);
    if (!key) continue;
    const existing = map.get(key);
    map.set(key, existing ? mergeReleaseRecord(existing, release) : release);
  }
  return [...map.values()];
}

function releaseDedupKey(release = {}) {
  const series = normalizeReleaseNameKey(release.seriesName);
  const brand = normalizeReleaseNameKey(release.brandName);
  const combined = normalizeReleaseNameKey(`${release.brandName || ""}${release.seriesName || ""}`);
  const alias = releaseAliasKey(series) || releaseAliasKey(combined);
  if (alias) return `alias:${alias}`;
  if (series && brand) return `name:${brand}:${series}`;
  if (series) return `name:${series}`;
  return release.seriesId ? `id:${release.seriesId}` : "";
}

function normalizeReleaseNameKey(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·_\-]/g, "")
    .replace(/汽车/g, "")
    .trim();
}

function releaseAliasKey(value = "") {
  const aliases = [
    ["xiaomiyu7", "yu7", "小米yu7", "小米y u7"],
    ["xiaomisu7", "su7", "小米su7"],
    ["xiaopenggx", "小鹏gx", "gxultrase"],
    ["xiaopengg7", "小鹏g7"],
    ["zeekr7x", "极氪7x"],
    ["zeekr007gt", "极氪007gt", "007gt"],
    ["li xiangi6", "lixiangi6", "理想i6"],
    ["nioes6", "蔚来es6"],
    ["nioes8", "蔚来es8"],
    ["audie7x", "奥迪e7x"],
    ["audiq6letron", "奥迪q6letron", "q6letron"],
    ["onvol80", "乐道l80"],
    ["luxeedr7", "智界r7"],
    ["imls6", "智己ls6"]
  ];
  const normalized = normalizeReleaseNameKey(value);
  const match = aliases.find((group) => group.map(normalizeReleaseNameKey).includes(normalized));
  return match ? normalizeReleaseNameKey(match[0]) : "";
}

function mergeReleaseRecord(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "sourceTypes" || key === "tags" || key === "highlights") {
      merged[key] = unique([...(existing[key] || []), ...(value || [])]);
    } else if (key === "models") {
      merged.models = mergeReleaseModels(existing.models, value);
    } else if (key === "news") {
      merged.news = mergeReleaseNews(existing.news, value);
    } else if (key === "score") {
      merged.score = { ...existing.score, ...Object.fromEntries(Object.entries(value || {}).filter(([, fieldValue]) => fieldValue !== "")) };
    } else if (key === "dimensions") {
      merged.dimensions = { ...existing.dimensions, ...Object.fromEntries(Object.entries(value || {}).filter(([, fieldValue]) => fieldValue !== "")) };
    } else if (isBlankValue(existing[key]) && !isBlankValue(value)) {
      merged[key] = value;
    }
  }
  return merged;
}

function mergeReleaseModels(existing = [], incoming = []) {
  const map = new Map();
  for (const model of [...existing, ...incoming]) {
    const key = model.id || `${model.year}-${model.name}`;
    if (!key) continue;
    const current = map.get(key);
    map.set(key, current ? { ...current, ...Object.fromEntries(Object.entries(model).filter(([, value]) => !isBlankValue(value))) } : model);
  }
  return [...map.values()];
}

function mergeReleaseNews(existing = [], incoming = []) {
  const map = new Map();
  for (const news of [...existing, ...incoming]) {
    const key = news.url || news.title;
    if (!key) continue;
    if (!map.has(key)) map.set(key, news);
  }
  return [...map.values()];
}

function normalizeUsedMarket(usedMarket = {}) {
  return {
    listings: Array.isArray(usedMarket.listings) ? usedMarket.listings.map(normalizeUsedListing).filter(Boolean) : [],
    lastFetchedAt: usedMarket.lastFetchedAt || "",
    sourceUrl: usedMarket.sourceUrl || "",
    sourceLabel: usedMarket.sourceLabel || "懂车帝官方二手车",
    city: usedMarket.city || "全国",
    profileSummary: usedMarket.profileSummary || "",
    error: usedMarket.error || ""
  };
}

function normalizeUsedListing(item) {
  if (!item || !item.skuId) return null;
  return {
    skuId: Number(item.skuId),
    spuId: numberOrBlank(item.spuId),
    brandId: numberOrBlank(item.brandId),
    brandName: item.brandName || "",
    seriesId: numberOrBlank(item.seriesId),
    seriesName: item.seriesName || "",
    title: item.title || "",
    trim: item.trim || "",
    year: numberOrBlank(item.year),
    ageText: item.ageText || "",
    mileageText: item.mileageText || "",
    mileageWan: numberOrBlank(item.mileageWan),
    priceText: item.priceText || "",
    priceWan: numberOrBlank(item.priceWan),
    officialPriceText: item.officialPriceText || "",
    officialPriceWan: numberOrBlank(item.officialPriceWan),
    city: item.city || "",
    sourceType: item.sourceType || "懂车帝车源",
    seller: item.seller || "",
    shopId: item.shopId || "",
    authentication: item.authentication || "",
    officialHint: item.officialHint || "",
    image: normalizeImageUrl(item.image),
    url: normalizeWebUrl(item.url) || buildDongchediUsedCarDetailUrl(item.skuId, item.city),
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean).map(String) : [],
    transferCount: numberOrBlank(item.transferCount),
    range: numberOrBlank(item.range),
    batterySize: numberOrBlank(item.batterySize),
    energyType: item.energyType || "unknown",
    fitScore: numberOrDefault(item.fitScore, 0),
    fitReasons: Array.isArray(item.fitReasons) ? item.fitReasons.filter(Boolean).map(String) : [],
    riskFlags: Array.isArray(item.riskFlags) ? item.riskFlags.filter(Boolean).map(String) : [],
    rawUpdatedAt: item.rawUpdatedAt || ""
  };
}

function normalizeRelease(item) {
  if (!item || !item.seriesId) return null;
  return {
    seriesId: Number(item.seriesId),
    seriesName: item.seriesName || "",
    brandName: item.brandName || "",
    carType: item.carType || "",
    energyType: item.energyType || "unknown",
    energyLabel: item.energyLabel || "待确认",
    sourceTypes: Array.isArray(item.sourceTypes) ? item.sourceTypes.filter(Boolean).map(String) : ["recent"],
    heatRank: numberOrBlank(item.heatRank),
    hotCategory: item.hotCategory || "",
    hotLabel: item.hotLabel || "",
    priceText: item.priceText || "",
    priceMinWan: numberOrBlank(item.priceMinWan),
    priceMaxWan: numberOrBlank(item.priceMaxWan),
    releaseDate: item.releaseDate || "",
    releaseTimestamp: numberOrBlank(item.releaseTimestamp),
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean).map(String) : [],
    coverUrl: normalizeImageUrl(item.coverUrl),
    dcdUrl: normalizeWebUrl(item.dcdUrl),
    articleUrl: normalizeWebUrl(item.articleUrl),
    articleTitle: item.articleTitle || "",
    communityText: item.communityText || "",
    score: normalizeReleaseScore(item.score),
    dimensions: normalizeReleaseDimensions(item.dimensions),
    models: Array.isArray(item.models) ? item.models.map(normalizeReleaseModel).filter(Boolean) : [],
    news: Array.isArray(item.news) ? item.news.map(normalizeReleaseNews).filter(Boolean) : [],
    highlights: Array.isArray(item.highlights) ? item.highlights.filter(Boolean).map(String) : [],
    rawUpdatedAt: item.rawUpdatedAt || ""
  };
}

function normalizeReleaseScore(score = {}) {
  return {
    total: numberOrBlank(score.total),
    comfort: numberOrBlank(score.comfort),
    interior: numberOrBlank(score.interior),
    appearance: numberOrBlank(score.appearance),
    configuration: numberOrBlank(score.configuration)
  };
}

function normalizeReleaseDimensions(dimensions = {}) {
  return {
    length: dimensions.length || "",
    width: dimensions.width || "",
    height: dimensions.height || "",
    wheelbase: dimensions.wheelbase || ""
  };
}

function normalizeReleaseModel(model) {
  if (!model?.id && !model?.name) return null;
  return {
    id: model.id ? Number(model.id) : "",
    year: model.year || "",
    name: model.name || "",
    price: model.price || "",
    officialPrice: model.officialPrice || "",
    dealerPrice: model.dealerPrice || "",
    ownerPrice: model.ownerPrice || "",
    saleStatus: model.saleStatus || "",
    groupKey: model.groupKey || "",
    baseConfig: Array.isArray(model.baseConfig) ? model.baseConfig.filter(Boolean).map(String) : [],
    highlightsConfig: Array.isArray(model.highlightsConfig) ? model.highlightsConfig.filter(Boolean).map(String) : [],
    battery: model.battery || "",
    range: model.range || "",
    power: model.power || "",
    drive: model.drive || "",
    link: normalizeWebUrl(model.link)
  };
}

function normalizeReleaseNews(news) {
  if (!news?.title) return null;
  return {
    title: news.title || "",
    url: normalizeWebUrl(news.url),
    source: news.source || "懂车帝",
    publishTime: news.publishTime || ""
  };
}

function saveState() {
  state.selectedCarId = selectedCarId;
  state.selectedCompare = [...selectedCompare];
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state, null, 2));
    lastSaveFailed = false;
    lastSaveError = "";
    return true;
  } catch (error) {
    lastSaveFailed = true;
    lastSaveError = error?.message || "本机存储空间不足。";
    showToast("本机存储空间不足，当前改动可能无法持久保存。请减少图片或先导出 JSON。", "danger");
    return false;
  }
}

function getStorageKey() {
  return currentUser?.sub ? `${BASE_STORAGE_KEY}:user:${currentUser.sub}` : BASE_STORAGE_KEY;
}

function loadAuthProfile() {
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuthProfile(profile) {
  if (profile) localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  else localStorage.removeItem(AUTH_PROFILE_KEY);
}

let toastTimer = null;

function showToast(message, tone = "ok") {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${tone}`;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function getGoogleClientId() {
  return (window.NEWCAR_AUTH_CONFIG?.googleClientId || "").trim();
}

function initGoogleAuth() {
  renderAuth();
  const clientId = getGoogleClientId();
  const buttonRoot = document.querySelector("#googleSignInButton");
  if (currentUser || !buttonRoot || !clientId) return;
  if (!window.google?.accounts?.id) {
    googleAuthAttempts += 1;
    if (googleAuthAttempts < 30) {
      window.setTimeout(initGoogleAuth, 300);
    } else {
      document.querySelector("#authSetupNotice").textContent = "Google 登录组件加载失败，请检查网络或脚本拦截。";
    }
    return;
  }
  if (googleAuthReady) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true
  });
  buttonRoot.innerHTML = "";
  window.google.accounts.id.renderButton(buttonRoot, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: "signin_with",
    width: 220
  });
  googleAuthReady = true;
  renderAuth();
}

function renderAuth() {
  const signedOut = document.querySelector("#authSignedOut");
  const signedIn = document.querySelector("#authSignedIn");
  const setupNotice = document.querySelector("#authSetupNotice");
  if (!signedOut || !signedIn || !setupNotice) return;
  const clientId = getGoogleClientId();
  signedOut.hidden = Boolean(currentUser);
  signedIn.hidden = !currentUser;
  if (!currentUser) {
    setupNotice.textContent = clientId
      ? "Google 登录只用于本机数据分区；当前版本不会把数据同步到云端。"
      : "尚未配置 Google Client ID。请在 auth-config.js 中填入 OAuth Web Client ID。";
    return;
  }
  document.querySelector("#authName").textContent = currentUser.name || "Google 用户";
  document.querySelector("#authEmail").textContent = currentUser.email || "";
  document.querySelector("#authScope").textContent = "已启用本机账号数据分区";
  const avatar = document.querySelector("#authAvatar");
  avatar.src = currentUser.picture || "";
  avatar.hidden = !currentUser.picture;
}

function handleGoogleCredential(response) {
  try {
    const claims = decodeJwtPayload(response.credential);
    if (!claims.sub) throw new Error("missing sub");
    const previousState = state;
    currentUser = {
      sub: claims.sub,
      email: claims.email || "",
      name: claims.name || claims.given_name || claims.email || "Google 用户",
      picture: claims.picture || "",
      signedInAt: new Date().toISOString()
    };
    saveAuthProfile(currentUser);
    const existing = localStorage.getItem(getStorageKey());
    state = existing ? normalizeState(JSON.parse(existing)) : normalizeState(previousState);
    selectedCarId = state.selectedCarId || state.cars[0]?.id || "";
    selectedCompare = new Set(state.selectedCompare?.length ? state.selectedCompare : state.cars.slice(0, 3).map((car) => car.id));
    saveState();
    render();
    showToast(`已登录：${currentUser.email || currentUser.name}`, "ok");
  } catch {
    document.querySelector("#authSetupNotice").textContent = "Google 登录返回数据无法解析，请重试。";
    showToast("Google 登录失败，请重试。", "danger");
  }
}

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(atob(base64).split("").map((char) => {
    return `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`;
  }).join(""));
  return JSON.parse(json);
}

function signOut() {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  currentUser = null;
  saveAuthProfile(null);
  state = normalizeState(loadState());
  selectedCarId = state.selectedCarId || state.cars[0]?.id || "";
  selectedCompare = new Set(state.selectedCompare?.length ? state.selectedCompare : state.cars.slice(0, 3).map((car) => car.id));
  googleAuthReady = false;
  render();
  initGoogleAuth();
  showToast("已退出账号，切回本地数据。", "ok");
}

function numberOrBlank(value) {
  if (value === "" || value === undefined || value === null || Number.isNaN(Number(value))) return "";
  return Number(value);
}

function isBlankValue(value) {
  return value === "" || value === undefined || value === null || (Array.isArray(value) && value.length === 0);
}

function unique(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (isBlankValue(value)) continue;
    const key = String(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function numberOrDefault(value, fallback) {
  const parsed = numberOrBlank(value);
  return parsed === "" ? fallback : parsed;
}

function num(value) {
  return Number(value || 0);
}

function brandDefault(car, key) {
  const text = `${car.name || ""} ${car.trim || ""}`;
  const presets = {
    "理想": { seat: 10, nvh: 10, chassis: 10, cockpit: 10, adas: 9, highway: 9, interior: 9 },
    "蔚来": { seat: 9, nvh: 9, chassis: 9, cockpit: 7, adas: 7, highway: 9, interior: 9 },
    "小鹏": { seat: 7, nvh: 7, chassis: 7, cockpit: 8, adas: 9, highway: 8, interior: 7 },
    "极氪": { seat: 8, nvh: 8, chassis: 8, cockpit: 7, adas: 7, highway: 8, interior: 8 },
    "智己": { seat: 8, nvh: 8, chassis: 8, cockpit: 7, adas: 7, highway: 8, interior: 8 },
    "奥迪": { seat: 8, nvh: 9, chassis: 9, cockpit: 7, adas: 7, highway: 9, interior: 9 }
  };
  const matched = Object.keys(presets).find((brand) => text.includes(brand));
  return matched ? presets[matched][key] || 8 : 8;
}

function formatWan(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value).toFixed(2)}万`;
}

function formatNumber(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value).toLocaleString("zh-CN")}${suffix}`;
}

function formatPct(value) {
  return value === null || value === undefined ? "-" : `${value.toFixed(1)}%`;
}

function monthsSince(plateDate) {
  if (!plateDate) return null;
  const date = new Date(`${plateDate}-01T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
}

function daysUntilDeadline() {
  return Math.max(0, Math.ceil((INDICATOR_DEADLINE.getTime() - Date.now()) / 86400000));
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
    recheck: "待复检",
    "waiting-docs": "等材料",
    rejected: "排除",
    purchased: "已成交"
  }[stage] || "观察";
}

function investigationStepLabel(id) {
  return Object.fromEntries(INVESTIGATION_STEP_DEFINITIONS.map(([stepId, label]) => [stepId, label]))[id] || id;
}

function investigationStepHint(id) {
  return Object.fromEntries(INVESTIGATION_STEP_DEFINITIONS.map(([stepId, , hint]) => [stepId, hint]))[id] || "";
}

function riskStatusLabel(status) {
  return {
    pending: "待关闭",
    confirmed: "已证实",
    cleared: "已排除",
    contracted: "写入合同",
    accepted: "接受风险"
  }[status] || "待关闭";
}

function riskStatusClass(status) {
  return {
    pending: "warn",
    confirmed: "danger",
    cleared: "ok",
    contracted: "info",
    accepted: "warn"
  }[status] || "warn";
}

function infoAnalysisStatusLabel(status) {
  return {
    idle: "未分析",
    queued: "待分析",
    running: "分析中",
    ready: "待应用",
    applied: "已回填",
    failed: "分析失败"
  }[status] || "未分析";
}

function infoAnalysisStatusClass(status) {
  return {
    idle: "",
    queued: "info",
    running: "warn",
    ready: "info",
    applied: "ok",
    failed: "danger"
  }[status] || "";
}

function batteryLabel(type) {
  return { buyout: "买断", baas: "租电/BaaS", unknown: "待确认" }[type] || "待确认";
}

function nopLabel(nop) {
  return {
    unknown: "待确认",
    included: "确认随车",
    none: "不随车",
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

function certifiedLabel(certified) {
  return {
    unknown: "认证待确认",
    yes: "官方认证",
    no: "非官方认证",
    official: "官方认证",
    platform: "平台认证",
    dealer: "车商认证"
  }[certified] || "认证待确认";
}

function recommendationLabel(value) {
  return {
    auto: "自动判断",
    worthViewing: "值得看",
    watch: "继续观察",
    waitDrop: "等降价",
    bargainOnly: "压价捡漏",
    reject: "排除"
  }[value] || "继续观察";
}

function recommendationClass(value) {
  return {
    worthViewing: "ok",
    watch: "info",
    waitDrop: "warn",
    bargainOnly: "warn",
    reject: "danger",
    auto: "info"
  }[value] || "info";
}

function evidenceTypeLabel(type) {
  return {
    note: "自由记录",
    analysis: "AI 分析",
    listing: "车源截图",
    config: "配置单",
    report: "检测报告",
    chat: "客服回复",
    contract: "合同条款",
    rights: "权益截图",
    quality: "三电质量",
    repair: "维修记录",
    other: "其他"
  }[type] || "其他";
}

function qualityLevelLabel(level) {
  return {
    high: "高",
    medium: "中",
    low: "低",
    unknown: "未知"
  }[level] || "未知";
}

function qualityRiskLabel(level) {
  return {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
    unknown: "待确认"
  }[level] || "待确认";
}

function qualityStatusLabel(status) {
  return {
    unknown: "待确认",
    missing: "缺失",
    pending: "待核验",
    partial: "部分具备",
    complete: "完整",
    clean: "无异常",
    issue: "有异常",
    active: "有效",
    expired: "已过期",
    "not-transferable": "不随车",
    none: "无记录",
    repaired: "有维修",
    processed: "已处理"
  }[status] || "待确认";
}

function qualityTrendLabel(trend) {
  return {
    rising: "上升",
    stable: "稳定",
    falling: "下降",
    unknown: "待确认"
  }[trend] || "待确认";
}

function qualitySourceTypeLabel(type) {
  return {
    official: "官方召回/缺陷",
    complaint: "投诉销量比",
    study: "第三方质量研究",
    reputation: "车主口碑",
    single: "单车证据"
  }[type] || "质量线索";
}

function evidenceStatusLabel(status) {
  return {
    pending: "待核验",
    valid: "有效",
    conflict: "有冲突",
    expired: "已过期"
  }[status] || "待核验";
}

function relativeLabel(value) {
  return {
    better: "优于 i6",
    similar: "接近 i6",
    worse: "弱于 i6",
    unknown: "还不确定"
  }[value] || "还不确定";
}

function sourceBucket(source) {
  const text = source || "";
  if (/自营|官方|认证|懂车帝/.test(text)) return "official";
  if (/个人/.test(text)) return "personal";
  if (/车商|专营|新能源|二手/.test(text)) return "dealer";
  return "dealer";
}

function garageSectionTitle(kind) {
  return {
    new: "新车车型候选",
    used: "二手具体车源",
    manual: "手动补充"
  }[normalizeCarKind(kind)] || "手动补充";
}

function garageSectionHint(kind, count) {
  return {
    new: `${count} 款车型。这里看版本、价格权益、交付节奏和试驾结论。`,
    used: `${count} 台车源。这里看车况、商家、检测、权益和成交风险。`,
    manual: `${count} 条记录。信息不足时先作为草稿，后续再归类。`
  }[normalizeCarKind(kind)] || `${count} 条记录。`;
}

function getCarEvidence(carId) {
  return state.evidence.filter((item) => item.carId === carId);
}

function hasInfoValue(item) {
  return Boolean(item.title || item.notes || item.url || item.attachments?.length || item.status === "valid");
}

const QUALITY_MISSING_TEXT_RE = /暂无|暂未|未见|未检索|未查询|未找到|未公开|未取得|未发现|无法|不能确认|缺失|缺少|不可得|没有|刚发布|尚未|不详|待核验|数据不足|无公开/;

function hasPositiveQualityNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function hasMeaningfulQualityText(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return Boolean(text) && !QUALITY_MISSING_TEXT_RE.test(text);
}

function isMissingQualityText(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return Boolean(text) && QUALITY_MISSING_TEXT_RE.test(text);
}

function isUnknownQualityStatus(value = "") {
  return /^(unknown|missing|pending)$/i.test(String(value).trim());
}

function qualityPositiveNumberText(value, suffix, fallback) {
  return hasPositiveQualityNumber(value) ? `${value}${suffix}` : fallback;
}

function assessCarQuality(car) {
  const profile = normalizeQualityProfile(car?.qualityProfile || {});
  const kind = carKind(car);
  const evidenceSignals = collectQualityEvidenceSignals(car);
  const sourceRows = buildQualitySourceRows(car, profile, evidenceSignals);
  const hasComplaintData = hasPositiveQualityNumber(profile.complaintSalesRatio) || hasMeaningfulQualityText(profile.complaintRank);
  const hasRecallData = hasPositiveQualityNumber(profile.recallCount) || hasMeaningfulQualityText(profile.recallNotes);
  const hasStudyData = hasMeaningfulQualityText(profile.studySummary);
  const hasReputationData = hasMeaningfulQualityText(profile.ownerReputation);
  const hasSoh = hasPositiveQualityNumber(profile.batterySoh) || evidenceSignals.soh.length > 0;
  const hasMaintenance = ["complete", "clean", "issue", "partial"].includes(profile.maintenanceStatus) || evidenceSignals.maintenance.length > 0;
  const hasTroubleCode = ["clean", "issue"].includes(profile.troubleCodeStatus) || evidenceSignals.troubleCode.length > 0;
  const hasWarranty = ["active", "expired", "not-transferable"].includes(profile.warrantyStatus) || evidenceSignals.warranty.length > 0;
  const hasBatteryRepair = ["none", "repaired"].includes(profile.batteryRepairStatus) || evidenceSignals.repair.length > 0;
  const isUsed = kind === "used";
  const missingItems = [];
  const warnings = [];
  const strengths = [];

  if (!hasComplaintData) missingItems.push("车质网投诉销量比");
  if (!hasRecallData) missingItems.push("官方召回/缺陷记录");
  if (isUsed && !hasSoh) missingItems.push("电池 SOH/健康度");
  if (isUsed && !hasMaintenance) missingItems.push("4S 维保/三电维修记录");
  if (isUsed && !hasTroubleCode) missingItems.push("故障码/电池一致性读取");
  if (isUsed && !hasWarranty) missingItems.push("三电质保是否随车");

  let score = 0;
  if (hasComplaintData) score += 16;
  if (hasRecallData) score += 14;
  if (hasStudyData) score += 10;
  if (hasReputationData) score += 6;
  if (hasSoh) score += isUsed ? 20 : 6;
  if (hasMaintenance) score += isUsed ? 16 : 6;
  if (hasTroubleCode) score += isUsed ? 12 : 4;
  if (hasWarranty) score += isUsed ? 12 : 6;
  if (hasBatteryRepair) score += isUsed ? 10 : 4;
  if (!isUsed) score += 20;
  score = Math.min(100, Math.round(score));

  const complaintRatio = numberOrBlank(profile.complaintSalesRatio);
  if (hasPositiveQualityNumber(complaintRatio)) {
    if (complaintRatio >= 80) warnings.push(`投诉销量比 ${complaintRatio} 偏高，需要看三电关键词和同级排名。`);
    else if (complaintRatio <= 20) strengths.push(`投诉销量比 ${complaintRatio} 较低，可作为车系口碑正向线索。`);
  }
  const threeElectricShare = numberOrBlank(profile.threeElectricComplaintShare);
  if (hasPositiveQualityNumber(threeElectricShare)) {
    if (threeElectricShare >= 35) warnings.push(`三电相关投诉占比 ${threeElectricShare}% 偏高。`);
    else strengths.push(`三电相关投诉占比 ${threeElectricShare}% 未见明显集中。`);
  }
  if (hasPositiveQualityNumber(profile.recallCount) && !/已处理|完成|覆盖/.test(profile.recallNotes)) {
    warnings.push(`存在 ${profile.recallCount} 条召回/缺陷线索，需确认是否覆盖目标车并已处理。`);
  }
  if (hasPositiveQualityNumber(profile.batterySoh) && Number(profile.batterySoh) < 92) warnings.push(`SOH ${profile.batterySoh}% 偏低，需复检电池一致性和快充/里程使用记录。`);
  if (profile.troubleCodeStatus === "issue") warnings.push("故障码或电池一致性读取存在异常。");
  if (profile.batteryRepairStatus === "repaired") warnings.push("存在电池包/电驱/电控维修记录，必须看维修明细。");
  if (profile.warrantyStatus === "not-transferable" || profile.warrantyStatus === "expired") warnings.push("三电质保不随车或已过期。");

  if (hasSoh) strengths.push("已有 SOH/电池健康度证据。");
  if (hasMaintenance) strengths.push("已有维保/维修记录线索。");
  if (hasWarranty) strengths.push("已有三电质保权益线索。");
  if (!strengths.length) strengths.push("还没有足够质量证据，先按未知风险处理。");

  let confidenceLevel = "unknown";
  if (score >= 76) confidenceLevel = "high";
  else if (score >= 52) confidenceLevel = "medium";
  else if (score >= 28) confidenceLevel = "low";

  let threeElectricRisk = "unknown";
  if (warnings.some((item) => /SOH|故障码|维修记录|质保不随车|三电相关投诉|偏高/.test(item)) || (isUsed && missingItems.length >= 4)) threeElectricRisk = "high";
  else if (warnings.length || (isUsed && missingItems.length >= 2)) threeElectricRisk = "medium";
  else if (confidenceLevel === "high" || confidenceLevel === "medium") threeElectricRisk = "low";

  const completenessChecks = isUsed
    ? [hasComplaintData, hasRecallData, hasSoh, hasMaintenance, hasTroubleCode, hasWarranty]
    : [hasComplaintData, hasRecallData, hasStudyData, hasReputationData];
  const evidenceCompleteness = Math.min(100, Math.round((completenessChecks.filter(Boolean).length / completenessChecks.length) * 100));

  const questions = buildQualityQuestions(car, missingItems, profile, warnings);
  const risks = buildQualityRisks(car, { missingItems, warnings, confidenceLevel, threeElectricRisk, hasSoh, hasMaintenance, hasTroubleCode, hasWarranty });

  return {
    profile,
    score,
    confidenceLevel,
    threeElectricRisk,
    evidenceCompleteness,
    missingItems,
    warnings,
    strengths,
    questions,
    risks,
    sourceRows,
    evidenceSignals,
    hasComplaintData,
    hasRecallData,
    hasStudyData,
    hasReputationData,
    hasSoh,
    hasMaintenance,
    hasTroubleCode,
    hasWarranty,
    hasBatteryRepair,
    updatedAt: profile.updatedAt || latestQualityEvidenceDate(evidenceSignals) || ""
  };
}

function collectQualityEvidenceSignals(car) {
  const groups = { soh: [], maintenance: [], troubleCode: [], warranty: [], repair: [], recall: [], complaint: [], study: [], reputation: [] };
  if (!car?.id) return groups;
  getCarEvidence(car.id).forEach((item) => {
    const text = `${item.title || ""} ${item.notes || ""} ${item.url || ""}`;
    const normalized = text.toLowerCase();
    const push = (key) => groups[key].push(item);
    if (/soh|电池健康|健康度|剩余容量|电池一致性|压差/.test(normalized)) push("soh");
    if (/维保|维修记录|4s|保养|出险|维修历史/.test(normalized)) push("maintenance");
    if (/故障码|obd|诊断|电池一致性|压差/.test(normalized)) push("troubleCode");
    if (/三电质保|质保|保修|随车|终身质保|首任/.test(normalized)) push("warranty");
    if (/电池包|电驱|电机|电控|换电池|维修|更换/.test(normalized)) push("repair");
    if (/召回|缺陷|国家市场监督|samr/.test(normalized)) push("recall");
    if (/车质网|投诉销量比|投诉排行|投诉量/.test(normalized)) push("complaint");
    if (/j\\.d\\. power|jd power|质量研究|iqs|pp100/.test(normalized)) push("study");
    if (/论坛|口碑|车友|懂车帝口碑|车主/.test(normalized)) push("reputation");
  });
  return groups;
}

function buildQualitySourceRows(car, profile, signals) {
  const rows = [];
  const sourceForType = (type) => {
    const sources = (profile.sources || []).filter((source) => source.type === type && (source.summary || source.url || source.label));
    return sources.find((source) => source.url && isVerifiedQualitySourceStatus(source.status)) || sources.find((source) => source.url) || sources[0];
  };
  const pushRow = (type, status, summary, meta = {}) => {
    const source = sourceForType(type);
    const sourceCanOverride = source && isVerifiedQualitySourceStatus(source.status) && isPositiveQualityStatus(status);
    rows.push({
      type,
      grade: source?.grade || QUALITY_SOURCE_GRADES[type] || "",
      label: qualitySourceTypeLabel(type),
      status: sourceCanOverride ? source.status || status : status,
      summary: sourceCanOverride ? source.summary || summary : summary,
      value: meta.value ?? "",
      updatedAt: source?.updatedAt || meta.updatedAt || "",
      url: source?.url || meta.url || "",
      count: meta.count || 0
    });
  };
  const hasComplaintData = hasPositiveQualityNumber(profile.complaintSalesRatio) || hasMeaningfulQualityText(profile.complaintRank);
  const hasRecallData = hasPositiveQualityNumber(profile.recallCount) || hasMeaningfulQualityText(profile.recallNotes);
  const hasStudyData = hasMeaningfulQualityText(profile.studySummary);
  const hasReputationData = hasMeaningfulQualityText(profile.ownerReputation);
  const officialSource = sourceForType("official");
  const complaintSource = sourceForType("complaint");
  const studySource = sourceForType("study");
  const reputationSource = sourceForType("reputation");
  pushRow("official",
    hasRecallData ? "有数据" : (officialSource?.url || signals.recall.length ? "入口待核验" : "待补充"),
    hasRecallData ? profile.recallNotes || `官方召回/缺陷 ${profile.recallCount} 条` : (signals.recall.length ? `${signals.recall.length} 条信息墙线索，需打开来源核验。` : "未取得可核验官方召回/缺陷结论，需打开市场监管总局或品牌公告核验。"),
    { count: signals.recall.length, updatedAt: profile.updatedAt, value: hasPositiveQualityNumber(profile.recallCount) ? profile.recallCount : profile.recallNotes }
  );
  pushRow("complaint",
    hasComplaintData ? "有数据" : (complaintSource?.url || signals.complaint.length ? "入口待核验" : "待补充"),
    hasComplaintData ? [
      hasPositiveQualityNumber(profile.complaintSalesRatio) ? `投诉销量比 ${profile.complaintSalesRatio}` : "",
      hasMeaningfulQualityText(profile.complaintRank) ? profile.complaintRank : ""
    ].filter(Boolean).join("，") : (signals.complaint.length ? `${signals.complaint.length} 条投诉口碑线索，需补车质网口径。` : "未取得可核验投诉销量比，不能按 0 处理。"),
    { count: signals.complaint.length, updatedAt: profile.updatedAt, value: hasPositiveQualityNumber(profile.complaintSalesRatio) ? profile.complaintSalesRatio : profile.complaintRank }
  );
  pushRow("study",
    hasStudyData ? "有线索" : (studySource?.url || signals.study.length ? "入口待核验" : "可选"),
    hasStudyData ? profile.studySummary : (signals.study.length ? `${signals.study.length} 条质量研究线索，需确认是否覆盖目标车型。` : "未取得 J.D. Power/长期测试等第三方质量结论。"),
    { count: signals.study.length, updatedAt: profile.updatedAt, value: profile.studySummary }
  );
  pushRow("reputation",
    hasReputationData ? "有线索" : (reputationSource?.url || signals.reputation.length ? "入口待核验" : "可选"),
    hasReputationData ? profile.ownerReputation : (signals.reputation.length ? `${signals.reputation.length} 条车主口碑线索，需看高频问题是否集中在三电。` : "未取得可复核车主口碑结论，论坛/口碑只作为问题发现线索。"),
    { count: signals.reputation.length, updatedAt: profile.updatedAt, value: profile.ownerReputation }
  );
  pushRow("single",
    signals.soh.length || signals.maintenance.length || signals.troubleCode.length || signals.warranty.length ? "有证据" : (carKind(car) === "used" ? "缺失" : "新车不强制"),
    buildSingleCarQualitySummary(profile, signals, car),
    { count: signals.soh.length + signals.maintenance.length + signals.troubleCode.length + signals.warranty.length, updatedAt: latestQualityEvidenceDate(signals), value: hasPositiveQualityNumber(profile.batterySoh) ? profile.batterySoh : (signals.soh.length || signals.maintenance.length || signals.troubleCode.length || signals.warranty.length ? "evidence-lead" : "") }
  );
  return rows;
}

function classifyQualityEvidenceField(field, value, meta = {}) {
  const normalizedValue = typeof value === "string" ? value.trim() : value;
  const sourceStatus = String(meta.sourceStatus || meta.status || "").trim();
  const sourceUrl = String(meta.sourceUrl || meta.url || "").trim();
  const expected = meta.expected;
  const hasSource = Boolean(sourceUrl);
  const isLead = /入口|待核验|AI|兜底|线索/.test(sourceStatus);
  const isVerified = /有数据|有证据|有线索|已核验|verified/i.test(sourceStatus) || hasSource;

  if (expected !== undefined && normalizedValue !== "" && normalizedValue !== null && normalizedValue !== undefined && String(normalizedValue) !== String(expected)) {
    return { state: "conflict", label: "证据冲突", verified: false };
  }

  if (typeof normalizedValue === "number" || (typeof normalizedValue === "string" && normalizedValue !== "" && !Number.isNaN(Number(normalizedValue)))) {
    const number = Number(normalizedValue);
    if (!Number.isFinite(number) || number <= 0) {
      if (isLead && field !== "batterySoh") return { state: "lead", label: "待核验", verified: false };
      return { state: "missing", label: "缺失", verified: false };
    }
    if (isVerified) return { state: "verified", label: "有证据", verified: true };
    return { state: "lead", label: "待核验", verified: false };
  }

  if (!normalizedValue || isUnknownQualityStatus(normalizedValue) || isMissingQualityText(normalizedValue)) {
    if (isLead) return { state: "lead", label: "待核验", verified: false };
    return { state: "missing", label: "缺失", verified: false };
  }

  if (isVerified) return { state: "verified", label: "有证据", verified: true };
  return { state: "lead", label: "待核验", verified: false };
}

function qualityEvidenceStateClass(state) {
  switch (state) {
    case "verified":
      return "ok";
    case "conflict":
      return "danger";
    case "lead":
      return "warn";
    case "missing":
      return "missing";
    default:
      return "info";
  }
}

function isVerifiedQualitySourceStatus(status = "") {
  return /有数据|有证据|有线索|已核验/.test(status) && !/待核验|兜底|入口|缺失|缺少|暂无|未取得/.test(status);
}

function isPositiveQualityStatus(status = "") {
  return /有数据|有证据|有线索|已核验/.test(status);
}

function buildSingleCarQualitySummary(profile, signals, car) {
  if (carKind(car) === "new") return "新车重点看车系质量数据、首批质量和官方召回。";
  const parts = [
    hasPositiveQualityNumber(profile.batterySoh) ? `SOH ${profile.batterySoh}%` : signals.soh.length ? "已有 SOH 线索" : "SOH 缺失",
    ["complete", "clean", "issue", "partial"].includes(profile.maintenanceStatus) ? `维保${qualityStatusLabel(profile.maintenanceStatus)}` : signals.maintenance.length ? "已有维保线索" : "维保缺失",
    ["clean", "issue"].includes(profile.troubleCodeStatus) ? `故障码${qualityStatusLabel(profile.troubleCodeStatus)}` : signals.troubleCode.length ? "已有故障码线索" : "故障码缺失",
    ["active", "expired", "not-transferable"].includes(profile.warrantyStatus) ? `三电质保${qualityStatusLabel(profile.warrantyStatus)}` : signals.warranty.length ? "已有质保线索" : "三电质保缺失"
  ];
  return parts.join(" / ");
}

function latestQualityEvidenceDate(signals) {
  const dates = Object.values(signals).flat().map((item) => item.createdAt).filter(Boolean).sort();
  return dates[dates.length - 1] || "";
}

function buildQualityQuestions(car, missingItems, profile, warnings) {
  const questions = [];
  const add = (text) => {
    if (text && !questions.includes(text)) questions.push(text);
  };
  if (missingItems.includes("电池 SOH/健康度")) add("请提供电池 SOH/健康度截图，最好包含检测日期、里程、电池一致性或压差信息。");
  if (missingItems.includes("4S 维保/三电维修记录")) add("请提供 4S 维保和三电维修记录，确认是否更换过电池包、电机或电控。");
  if (missingItems.includes("故障码/电池一致性读取")) add("复检时能否读取故障码、电池一致性和压差，并出具书面结果？");
  if (missingItems.includes("三电质保是否随车")) add("请提供官方系统截图，确认三电质保是否随车、剩余多久、是否受过户影响。");
  if (missingItems.includes("车质网投诉销量比")) add("请补充车质网投诉销量比、同级排名和三电投诉关键词。");
  if (missingItems.includes("官方召回/缺陷记录")) add("请核对官方召回/缺陷记录，确认目标 VIN 是否涉及且是否已处理。");
  if (hasPositiveQualityNumber(profile.recallCount)) add("这台车是否涉及相关召回？如果涉及，请提供已处理证明。");
  if (warnings.some((item) => /SOH/.test(item))) add("SOH 偏低的原因是什么？是否可用价格、质保或合同条款覆盖？");
  if (!questions.length) add(carKind(car) === "used" ? "付款前仍建议做三电专项复检，并把质保和故障码结果写入合同附件。" : "继续观察首批车质量、官方召回和车主长期口碑。");
  return questions;
}

function buildQualityRisks(car, assessment) {
  const risks = [];
  if (carKind(car) === "used") {
    const missingSingle = [];
    if (!assessment.hasSoh) missingSingle.push("SOH");
    if (!assessment.hasMaintenance) missingSingle.push("维保");
    if (!assessment.hasTroubleCode) missingSingle.push("故障码");
    if (!assessment.hasWarranty) missingSingle.push("三电质保");
    if (missingSingle.length) {
      risks.push({
        key: "quality-single-car-evidence",
        level: missingSingle.length >= 3 ? "high" : "medium",
        title: "三电单车证据缺失",
        detail: `二手电车缺少 ${missingSingle.join("、")} 证据，不能仅凭平台检测判断三电状态。`,
        question: "请补 SOH、电池一致性/故障码、4S 维保记录和三电质保随车截图。"
      });
    }
  }
  if (assessment.missingItems.includes("车质网投诉销量比") && assessment.missingItems.includes("官方召回/缺陷记录")) {
    risks.push({
      key: "quality-series-data-missing",
      level: "medium",
      title: "车系质量口碑数据缺失",
      detail: "缺少投诉销量比和官方召回/缺陷记录，无法判断车系级三电口碑。",
      question: "请补车质网投诉销量比、三电投诉关键词和官方召回查询结果。"
    });
  }
  if (assessment.warnings.length) {
    risks.push({
      key: "quality-warning-signals",
      level: assessment.threeElectricRisk === "high" ? "high" : "medium",
      title: "三电质量存在待解释信号",
      detail: assessment.warnings.slice(0, 2).join("；"),
      question: "请用官方记录、检测报告或合同条款解释这些质量信号。"
    });
  }
  return risks;
}

function riskKey(risk = {}) {
  const raw = `${risk.title || "risk"}-${risk.question || risk.detail || ""}`;
  return raw
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 90) || makeId("risk");
}

function getRiskItemsForCar(car) {
  if (!car) return [];
  const stored = new Map((car.riskItems || []).map((item) => [item.key, item]));
  const computed = analyzeCar(car).risks.map((risk) => {
    const key = risk.key || riskKey(risk);
    const saved = stored.get(key);
    return normalizeRiskItem({
      key,
      title: risk.title,
      level: risk.level,
      detail: risk.detail,
      question: risk.question,
      status: saved?.status || "pending",
      evidenceIds: saved?.evidenceIds || [],
      note: saved?.note || "",
      updatedAt: saved?.updatedAt || ""
    });
  }).filter(Boolean);
  const computedKeys = new Set(computed.map((item) => item.key));
  const manual = (car.riskItems || []).filter((item) => item && !computedKeys.has(item.key));
  return [...computed, ...manual];
}

function isRiskClosed(item) {
  return ["cleared", "contracted", "accepted"].includes(item.status);
}

function riskCompletionSummary(car) {
  const items = getRiskItemsForCar(car);
  const open = items.filter((item) => !isRiskClosed(item));
  const highOpen = open.filter((item) => item.level === "high");
  const closed = items.filter(isRiskClosed);
  return {
    total: items.length,
    open: open.length,
    highOpen: highOpen.length,
    closed: closed.length,
    items,
    percent: items.length ? Math.round((closed.length / items.length) * 100) : 100
  };
}

function getRedlineItems(car) {
  if (!car) return [];
  const redlines = [];
  const quality = assessCarQuality(car);
  const isUsed = carKind(car) === "used";
  const add = (key, title, detail, evidence) => {
    redlines.push({ key, title, detail, evidence: evidence || "待补证" });
  };

  if (isUsed && !quality.hasSoh) add("redline-soh", "SOH 缺失", "二手电车没有电池健康度或等效三电专项证据。", "上传 SOH/电池一致性/压差截图");
  if (isUsed && !quality.hasWarranty) add("redline-warranty", "三电质保不清", "未确认三电质保是否随车、剩余期限和过户影响。", "官方 App/客服截图");
  if (isUsed && car.report !== "full") add("redline-report", "检测报告不完整", "基础检测不足以判断结构件、底盘和电池包。", "查博士/第三方完整报告");
  if (isUsed && !quality.hasMaintenance) add("redline-maintenance", "维保/维修记录缺失", "无法确认是否存在三电维修、出险或异常维修。", "4S 维保/维修记录");
  if (car.nop === "unknown" && /蔚来|NIO|理想|小鹏|极氪|智己|阿维塔|问界|乐道/i.test(`${car.name} ${car.source}`)) add("redline-rights", "智驾/权益转移不清", "辅助驾驶、首任权益、官方认证或平台保障仍未固化。", "品牌官方截图或合同条款");
  if (car.battery === "unknown") add("redline-battery-owner", "电池产权不清", "买断、租电、欠费、BaaS 转移和后续买断规则未确认。", "电池产权/租赁状态截图");
  if (car.price && car.newPrice && car.targetPrice && car.price > car.targetPrice * 1.05) add("redline-price", "价格安全垫不足", "当前报价仍高于目标价，二手优势可能不足。", "目标价谈判记录");
  if (!car.url) add("redline-source-url", "原始车源无法复核", "缺少外部车源链接，不利于追踪状态、价格和平台保障。", "懂车帝/品牌官方车源链接");

  const existing = new Map((car.riskItems || []).map((risk) => [risk.key, risk]));
  return redlines.map((item) => {
    const saved = existing.get(item.key);
    return {
      ...item,
      status: saved?.status || "pending",
      evidenceIds: saved?.evidenceIds || [],
      updatedAt: saved?.updatedAt || ""
    };
  });
}

function getOpenRedlineItems(car) {
  return getRedlineItems(car).filter((item) => !isRiskClosed(item));
}

function renderRedlineGate(car) {
  const open = getOpenRedlineItems(car);
  const all = getRedlineItems(car);
  const quality = assessCarQuality(car);
  if (!all.length) {
    return `
      <div class="redline-gate ok">
        <div class="eyebrow">成交前红线</div>
        <h2>暂无阻断项</h2>
        <p class="muted">仍建议保留检测报告、合同承诺和付款记录作为成交证据。</p>
      </div>
    `;
  }
  return `
    <div class="redline-gate ${open.length ? "blocked" : "ok"}">
      <div class="eyebrow">成交前红线</div>
      <h2>${open.length ? "暂不建议下订" : "红线已关闭"}</h2>
      <p class="muted">${open.length ? `仍有 ${open.length} 项红线未关闭，质量可信度 ${qualityLevelLabel(quality.confidenceLevel)}，三电风险 ${qualityRiskLabel(quality.threeElectricRisk)}。` : "红线项均已关闭或接受，可以进入价格和合同复核。"}</p>
      <div class="redline-list">
        ${all.slice(0, 5).map((item) => `
          <article class="redline-item ${isRiskClosed(item) ? "closed" : "open"}">
            <span class="chip ${isRiskClosed(item) ? "ok" : "high"}">${isRiskClosed(item) ? "已关闭" : "红线"}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.detail)}</p>
            <small>${escapeHtml(item.evidence)}</small>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function getInvestigationProgress(car) {
  if (!car) return { total: INVESTIGATION_STEP_IDS.length, done: 0, percent: 0, items: [] };
  const savedSteps = car.investigation?.steps || {};
  const items = INVESTIGATION_STEP_DEFINITIONS.map(([id, label, hint]) => {
    const inferred = inferInvestigationStepDone(car, id);
    const saved = Boolean(savedSteps[id]?.done);
    const done = saved || inferred.done;
    return {
      id,
      label,
      hint,
      done,
      auto: !saved && inferred.done,
      reason: inferred.reason || savedSteps[id]?.note || hint,
      updatedAt: savedSteps[id]?.updatedAt || ""
    };
  });
  const done = items.filter((item) => item.done).length;
  return {
    total: items.length,
    done,
    percent: Math.round((done / Math.max(1, items.length)) * 100),
    items
  };
}

function inferInvestigationStepDone(car, stepId) {
  const evidence = getCarEvidence(car.id);
  const hasValidType = (types) => evidence.some((item) => types.includes(item.type) && (item.status === "valid" || item.analysisStatus === "applied"));
  if (stepId === "price") {
    return {
      done: Boolean(car.price && (car.targetPrice || car.landing || car.newPrice)),
      reason: "已记录报价和至少一个目标价/落地价/新车参考价"
    };
  }
  if (stepId === "condition") {
    return {
      done: carKind(car) === "new" || car.report === "full" || hasValidType(["report", "repair"]),
      reason: carKind(car) === "new" ? "新车车型无需二手车况检测" : "已有完整检测或车况类信息"
    };
  }
  if (stepId === "quality") {
    const quality = assessCarQuality(car);
    return {
      done: carKind(car) === "new"
        ? quality.hasComplaintData && quality.hasRecallData
        : quality.hasSoh && quality.hasMaintenance && quality.hasTroubleCode && quality.hasWarranty,
      reason: carKind(car) === "new"
        ? "已补车系投诉销量比和官方召回/缺陷记录"
        : "已补 SOH、维保、故障码和三电质保证据"
    };
  }
  if (stepId === "rights") {
    return {
      done: car.battery !== "unknown" && car.nop !== "unknown" && car.certified !== "unknown" || hasValidType(["rights", "config"]),
      reason: "电池/智驾/认证权益已有明确记录或截图"
    };
  }
  if (stepId === "seller") {
    return {
      done: Boolean(car.seller && (car.sellerNotes || car.source)),
      reason: "已记录商家身份和背调备注"
    };
  }
  if (stepId === "drive") {
    return {
      done: state.drives.some((drive) => drive.carId === car.id),
      reason: "已保存试驾记录"
    };
  }
  if (stepId === "contract") {
    return {
      done: getRiskItemsForCar(car).some((risk) => risk.status === "contracted") || hasValidType(["contract"]),
      reason: "已有合同条款或至少一条风险写入合同"
    };
  }
  if (stepId === "recheck") {
    return {
      done: ["recheck", "negotiating", "purchased"].includes(car.stage) && (car.report === "full" || hasValidType(["report", "repair"])),
      reason: "已进入复检/谈价阶段且有检测依据"
    };
  }
  return { done: false, reason: "" };
}

function openRiskSummaryText(car) {
  const summary = riskCompletionSummary(car);
  if (!summary.total) return "暂无风险项";
  if (!summary.open) return "风险已闭环";
  if (summary.highOpen) return `${summary.highOpen} 条高风险待处理`;
  return `${summary.open} 条风险待关闭`;
}

function getWorkflowForCar(car) {
  const progress = getInvestigationProgress(car);
  const riskSummary = riskCompletionSummary(car);
  const evidence = getCarEvidence(car.id);
  const quality = assessCarQuality(car);
  const openRisks = riskSummary.items.filter((risk) => !isRiskClosed(risk));
  const tasks = [];
  const questions = [];
  const blockers = [];
  const pushTask = (id, title, detail, level = "medium") => {
    if (!tasks.some((task) => task.id === id)) tasks.push({ id, title, detail, level });
  };
  const pushQuestion = (question) => {
    if (question && !questions.includes(question)) questions.push(question);
  };
  const pushBlocker = (blocker) => {
    if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
  };

  if (!car.url) pushTask("source-link", "补车源/车型链接", "没有外部链接会影响价格追踪、配置核验和后续复盘。", "low");
  if (!car.price) pushTask("price", "补当前报价", "先记录报价、目标价和落地价，后续才能判断是否值得推进。", "medium");
  if (car.price && car.targetPrice && car.price > car.targetPrice * 1.04) {
    pushTask("wait-or-bargain", "价格未到目标", `当前比目标价高 ${formatWan(car.price - car.targetPrice)}，适合继续观察或带风险压价。`, "medium");
  }
  if (!evidence.length) pushTask("info-wall", "补第一条信息", "上传车源截图、配置单、检测报告或聊天截图，让后续判断有依据。", "medium");
  if (quality.missingItems.length) {
    pushTask(
      "quality-evidence",
      "补三电质量证据",
      `缺少 ${quality.missingItems.slice(0, 4).join("、")}，先不要把质量风险视为已关闭。`,
      carKind(car) === "used" ? "high" : "medium"
    );
  }

  if (car.stage === "watching") {
    pushTask("contact", "联系卖家/门店拿基础材料", "先要车源页、配置单、报价单、权益口径和可看车时间。", "medium");
  }
  if (["contacted", "waiting-docs"].includes(car.stage)) {
    pushTask("docs", "收齐关键材料", "检测报告、出险维保、登记证、发票、电池/智驾/质保权益截图至少要有一轮。", "high");
  }
  if (car.stage === "test-drive") {
    pushTask("drive-note", "补试驾结论", "把座椅、静谧、底盘、车机、智驾和高速稳定按 i6 标尺记录下来。", "medium");
  }
  if (car.stage === "recheck") {
    pushTask("inspection", "安排第三方复检", "重点看漆膜、结构件、底盘、电池包、悬架、轮胎和维修痕迹。", "high");
  }
  if (car.stage === "negotiating") {
    pushTask("contract", "把风险写进谈价和合同", "未闭环风险要转成降价依据、退款条件、复检不过处理方式和合同附件。", "high");
  }

  progress.items.filter((step) => !step.done).slice(0, 3).forEach((step) => {
    pushTask(`step-${step.id}`, `完成${step.label}核验`, step.hint, step.id === "contract" || step.id === "recheck" ? "high" : "medium");
  });

  openRisks.slice(0, 5).forEach((risk) => {
    pushQuestion(risk.question || risk.detail);
    if (risk.level === "high") pushBlocker(risk.title);
  });
  if (car.battery === "unknown") pushQuestion("请提供电池买断/BaaS/租用状态的官方截图，确认是否有欠费或转移限制。");
  if (car.nop === "unknown") pushQuestion("请提供智驾/NOP/NOA权益是否随车的官方截图或客服书面回复。");
  if (car.report !== "full" && carKind(car) !== "new") pushQuestion("能否提供完整检测报告，并支持查博士/第三方复检和举升检查？");
  if (car.city && !/北京/.test(car.city)) pushQuestion("这台车是否可以正常迁入北京，运输、临牌、转籍和上牌费用分别是多少？");
  quality.questions.forEach(pushQuestion);
  quality.warnings.slice(0, 3).forEach(pushBlocker);

  const nextStages = getWorkflowStageActions(car, progress, riskSummary);
  const workflowTasks = mergeWorkflowTaskStates(car, tasks).slice(0, 8);
  const openTasks = workflowTasks.filter((task) => task.status !== "done");
  const decision = deriveWorkflowDecision(car, progress, riskSummary, openTasks);
  return {
    decision,
    progress,
    riskSummary,
    tasks: workflowTasks,
    questions: questions.slice(0, 8),
    blockers: blockers.slice(0, 4),
    nextStages
  };
}

function mergeWorkflowTaskStates(car, tasks) {
  const saved = new Map((car.workflowTasks || []).map((task) => [task.id, task]));
  const merged = tasks.map((task) => {
    const state = saved.get(task.id);
    return {
      ...task,
      status: state?.status || "open",
      completedAt: state?.completedAt || "",
      evidenceIds: state?.evidenceIds || [],
      note: state?.note || ""
    };
  });
  return merged.sort((a, b) => {
    if (a.status !== b.status) return a.status === "done" ? 1 : -1;
    return workflowTaskWeight(b.level) - workflowTaskWeight(a.level);
  });
}

function persistWorkflowTaskState(car, nextState) {
  const states = new Map((car.workflowTasks || []).map((task) => [task.id, task]));
  states.set(nextState.id, normalizeWorkflowTaskState(nextState));
  car.workflowTasks = [...states.values()].filter(Boolean);
}

function addDecisionLog(car, entry) {
  if (!car) return;
  const item = normalizeDecisionLogItem({
    ...entry,
    id: entry.id || makeId("log"),
    at: entry.at || new Date().toISOString()
  });
  if (!item) return;
  const exists = (car.decisionLog || []).some((log) => log.type === item.type && log.title === item.title && log.detail === item.detail && Math.abs(new Date(log.at).getTime() - new Date(item.at).getTime()) < 1000);
  if (exists) return;
  car.decisionLog = [item, ...(car.decisionLog || [])].slice(0, 80);
}

function toggleWorkflowTask(carId, taskId) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car) return;
  const workflow = getWorkflowForCar(car);
  const task = workflow.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const isDone = task.status === "done";
  const nextState = {
    id: task.id,
    status: isDone ? "open" : "done",
    completedAt: isDone ? "" : new Date().toISOString(),
    evidenceIds: task.evidenceIds || [],
    note: task.note || ""
  };
  persistWorkflowTaskState(car, nextState);
  addDecisionLog(car, {
    type: "task",
    title: `${isDone ? "恢复任务" : "完成任务"}：${task.title}`,
    detail: task.detail,
    level: isDone ? "warn" : "ok",
    relatedIds: task.evidenceIds || []
  });
  car.updatedAt = new Date().toISOString();
  render();
  showToast(isDone ? "任务已恢复为未完成。" : "任务已标记完成。", isDone ? "warn" : "ok");
}

function toggleWorkflowTaskEvidence(carId, taskId, evidenceId) {
  const car = state.cars.find((item) => item.id === carId);
  const evidence = state.evidence.find((item) => item.id === evidenceId);
  if (!car || !evidence || evidence.carId !== car.id) return;
  const workflow = getWorkflowForCar(car);
  const task = workflow.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const linked = new Set(task.evidenceIds || []);
  const isLinked = linked.has(evidenceId);
  if (isLinked) linked.delete(evidenceId);
  else linked.add(evidenceId);
  persistWorkflowTaskState(car, {
    id: task.id,
    status: task.status || "open",
    completedAt: task.completedAt || "",
    evidenceIds: [...linked],
    note: task.note || ""
  });
  if (!isLinked) {
    addDecisionLog(car, {
      type: "task-evidence",
      title: `任务关联信息：${task.title}`,
      detail: evidence.title,
      level: "info",
      relatedIds: [task.id, evidenceId]
    });
  }
  car.updatedAt = new Date().toISOString();
  render();
  showToast(isLinked ? "已取消任务证据关联。" : "已关联任务证据。", isLinked ? "warn" : "ok");
}

function getWorkflowStageActions(car, progress, riskSummary) {
  if (car.stage === "rejected" || car.stage === "purchased") return [];
  const actions = [];
  if (car.stage === "watching") actions.push(["contacted", "已联系"]);
  if (["watching", "contacted"].includes(car.stage)) actions.push(["waiting-docs", "等材料"]);
  if (["contacted", "waiting-docs"].includes(car.stage) && progress.done >= 3) actions.push(["test-drive", "已试驾"]);
  if (["test-drive", "waiting-docs", "contacted"].includes(car.stage) && progress.done >= 4) actions.push(["recheck", "待复检"]);
  if (["recheck", "test-drive"].includes(car.stage) && riskSummary.highOpen === 0) actions.push(["negotiating", "谈价"]);
  actions.push(["rejected", "排除"]);
  return actions;
}

function deriveWorkflowDecision(car, progress, riskSummary, tasks) {
  if (car.stage === "rejected") return { label: "已排除", level: "danger", detail: "这台车已排除，保留记录用于后续复盘。" };
  if (car.stage === "purchased") return { label: "已成交", level: "ok", detail: "这台车已成交，后续重点跟进上牌和交付材料。" };
  if (riskSummary.highOpen > 0) return { label: "先别付款", level: "danger", detail: `${riskSummary.highOpen} 条高风险未关闭，先拿材料或写进合同。` };
  if (tasks.some((task) => task.level === "high")) return { label: "等材料", level: "warn", detail: "关键材料还没齐，适合继续追问，不适合交大额定金。" };
  if (progress.percent >= 72 && riskSummary.open <= 2) return { label: "可谈价/复检", level: "ok", detail: "基础尽调较完整，可以进入复检、谈价或锁定条件。" };
  return { label: "继续观察", level: "medium", detail: "信息还不够完整，先补材料和试驾记录。" };
}

function persistRiskItems(car, items) {
  car.riskItems = items
    .filter((item) => item && (item.status !== "pending" || item.evidenceIds?.length || item.note))
    .map(normalizeRiskItem)
    .filter(Boolean);
}

function toggleInvestigationStep(carId, stepId) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car || !INVESTIGATION_STEP_IDS.includes(stepId)) return;
  car.investigation = normalizeInvestigation(car.investigation, car);
  const current = Boolean(car.investigation.steps[stepId]?.done);
  car.investigation.steps[stepId] = {
    ...(car.investigation.steps[stepId] || {}),
    done: !current,
    note: current ? "" : "手动确认",
    updatedAt: new Date().toISOString()
  };
  car.investigation.lastReviewedAt = new Date().toISOString();
  car.updatedAt = new Date().toISOString();
  addDecisionLog(car, {
    type: "investigation",
    title: `${current ? "取消尽调确认" : "完成尽调"}：${investigationStepLabel(stepId)}`,
    detail: investigationStepHint(stepId),
    level: current ? "warn" : "ok",
    relatedIds: [stepId]
  });
  render();
  showToast(`${investigationStepLabel(stepId)}已${current ? "取消确认" : "确认完成"}。`, current ? "warn" : "ok");
}

function addPriceEvent(car, { field = "price", price = car.price, previousPrice = "", source = "手动记录", note = "" } = {}) {
  if (!car || price === "" || price === undefined || price === null) return;
  const event = normalizePriceEvent({
    id: makeId("price"),
    date: new Date().toISOString().slice(0, 10),
    field,
    price,
    previousPrice,
    source,
    note
  });
  if (!event) return;
  car.priceEvents = [event, ...(car.priceEvents || [])].slice(0, 40);
  addDecisionLog(car, {
    type: "price",
    title: `记录${priceFieldLabel(field)}：${formatWan(price)}`,
    detail: note || source,
    level: "info",
    relatedIds: [event.id]
  });
}

function recordPriceChanges(previous, next, source = "编辑候选") {
  const fields = [
    ["price", "报价"],
    ["targetPrice", "目标价"],
    ["landing", "落地价"],
    ["newPrice", "新车参考价"]
  ];
  fields.forEach(([field, label]) => {
    const before = previous ? numberOrBlank(previous[field]) : "";
    const after = numberOrBlank(next[field]);
    if (after === "") return;
    if (!previous || before === "" || Number(before) !== Number(after)) {
      addPriceEvent(next, {
        field,
        price: after,
        previousPrice: before,
        source,
        note: previous ? `${label}从${formatWan(before)}调整为${formatWan(after)}` : `首次记录${label}`
      });
    }
  });
}

function addCurrentPriceEvent(carId) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car) return;
  if (!car.price) {
    showToast("这台车还没有报价，先编辑候选补充价格。", "warn");
    return;
  }
  addPriceEvent(car, {
    field: "price",
    price: car.price,
    source: "手动记录",
    note: `当前报价 ${formatWan(car.price)}`
  });
  car.updatedAt = new Date().toISOString();
  render();
  showToast("已记录当前报价。", "ok");
}

function costProfile(car) {
  const oneTime = num(car.costs.insurance) + num(car.costs.transport) + num(car.costs.inspection) + num(car.costs.reconditioning);
  const monthly = num(car.batteryMonthly) + num(car.costs.adasMonthly) + num(car.costs.subscriptionMonthly);
  const base = num(car.price);
  const totalForYears = (years) => base + oneTime + (monthly * 12 * years) / 10000;
  return {
    base,
    oneTime,
    monthly,
    year1: totalForYears(1),
    year3: totalForYears(3),
    year5: totalForYears(5)
  };
}

function i6Score(car) {
  const values = Object.values(car.experience || {}).map(Number).filter((value) => !Number.isNaN(value));
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10);
}

function fitScore(car) {
  const risk = analyzeCar(car).score;
  const rangeScore = Math.min(14, ((car.range || 0) / 720) * 14);
  const valueScore = Math.min(10, (getDiscountPct(car) || 0) * 0.45);
  const ownershipScore = car.battery === "buyout" ? 10 : car.battery === "baas" ? 3 : 0;
  const i6 = i6Score(car) * 0.55;
  const comfortBonus = /理想|蔚来|奥迪/i.test(car.name) ? 16 : /极氪|智己/i.test(car.name) ? 8 : 4;
  const sizeScore = /ES8|L80|大型|六座|七座/i.test(`${car.name} ${car.trim}`) ? 4 : 10;
  const evidenceScore = Math.min(8, getCarEvidence(car.id).filter(hasInfoValue).length * 3);
  const quality = assessCarQuality(car);
  const qualityBonus = quality.confidenceLevel === "high" ? 8 : quality.confidenceLevel === "medium" ? 4 : quality.confidenceLevel === "unknown" ? -4 : -8;
  const qualityRiskPenalty = quality.threeElectricRisk === "high" ? 14 : quality.threeElectricRisk === "medium" ? 7 : 0;
  return Math.round(Math.max(0, rangeScore + valueScore + ownershipScore + i6 + comfortBonus + sizeScore + evidenceScore + qualityBonus - qualityRiskPenalty - risk * 0.22));
}

function deriveRecommendation(car) {
  if (car.recommendation && car.recommendation !== "auto") return car.recommendation;
  if (car.stage === "rejected") return "reject";
  const risk = analyzeCar(car);
  const discount = getDiscountPct(car) || 0;
  if (risk.score >= 82) return "reject";
  if (risk.score >= 62) return "bargainOnly";
  if (assessCarQuality(car).threeElectricRisk === "high" && carKind(car) === "used") return "bargainOnly";
  if (car.targetPrice && car.price && car.price > car.targetPrice * 1.04) return "waitDrop";
  if (i6Score(car) >= 78 && risk.level !== "high" && discount >= 18) return "worthViewing";
  return "watch";
}

function analyzeCar(car) {
  const risks = [];
  const ageMonths = monthsSince(car.plateDate);
  const discount = getDiscountPct(car);
  const text = `${car.name} ${car.trim} ${car.issues} ${car.notes} ${car.rightsNotes}`;
  const isNio = /蔚来|ES6|ES8|EC6|ET5/i.test(text);
  const kind = carKind(car);
  const evidence = getCarEvidence(car.id);
  const validEvidenceCount = evidence.filter(hasInfoValue).length;
  const quality = assessCarQuality(car);

  if (kind === "new") {
    if (!car.price) {
      risks.push({
        level: "medium",
        title: "价格版本待确认",
        detail: "新车候选先确认推荐版本、指导价、权益价、金融/置换和预计落地价。",
        question: "请补充官方配置单、北京门店报价或懂车帝车型页。"
      });
    }
    if (/新车刚发布|首批|交付周期|刚发布/.test(`${car.issues} ${car.notes}`)) {
      risks.push({
        level: "medium",
        title: "首批车与交付节奏",
        detail: "刚发布车型要观察首批车质量、真实能耗、OTA稳定性和交付排产。",
        question: "北京试驾车何时到店？7-8月是否会有价格或权益调整？"
      });
    }
    if (car.nop === "unknown") {
      risks.push({
        level: "low",
        title: "智驾配置口径待确认",
        detail: "新车要确认高阶智驾是否标配、是否分版本、是否需要订阅。",
        question: "目标版本是否含高速/城区NOA、激光雷达或端到端能力？"
      });
    }
    if (validEvidenceCount === 0) {
      risks.push({
        level: "low",
        title: "缺少车型依据",
        detail: "新车候选需要车型页、配置表、权益截图或试驾记录支撑。",
        question: "先补一条车型页或门店报价，再决定是否进入试驾。"
      });
    }
    if (!car.url) {
      risks.push({
        level: "low",
        title: "车型链接缺失",
        detail: "补充官方或懂车帝车型页，便于后续刷新配置和价格。",
        question: "补充车型页链接。"
      });
    }
    risks.push(...quality.risks);
    const score = Math.min(100, risks.reduce((sum, item) => sum + ({ high: 34, medium: 18, low: 8 }[item.level] || 0), 0));
    return { risks, score, level: riskLevelFromScore(score) };
  }

  if (car.battery === "unknown") {
    risks.push({
      level: "high",
      title: "电池产权未确认",
      detail: "买断、BaaS、月租、欠费和转移规则必须在付款前确认。",
      question: "请提供官方 App 中电池产权/租用状态截图。"
    });
  }

  if (isNio && car.battery === "buyout" && car.price && car.newPrice && discount > 24 && ageMonths !== null && ageMonths <= 3) {
    risks.push({
      level: "high",
      title: "准新买断车折价异常",
      detail: "刚上牌、低里程、买断电池却大幅折价，需要解释来源和过户原因。",
      question: "这台车是展车、试驾车、退订车、公司户还是渠道流转车？"
    });
  }

  if (car.transfers > 0 && ageMonths !== null && ageMonths <= 8) {
    risks.push({
      level: "high",
      title: "准新车已有过户",
      detail: "准新车过户会影响来源判断、质保和后续流通。",
      question: "请把过户原因写入合同附件，并提供登记证流转页。"
    });
  }

  if (car.report !== "full") {
    risks.push({
      level: car.report === "none" ? "high" : "medium",
      title: "检测颗粒度不足",
      detail: "基础检测不足以判断钣喷、拆装、底盘、电池包和维修细节。",
      question: "是否支持查博士/第三方复检，能否举升检查底盘和电池包？"
    });
  }

  if (isNio && car.nop === "unknown") {
    risks.push({
      level: "medium",
      title: "NOP+权益待确认",
      detail: "二手蔚来不要默认继承 NOP+。若需订阅，会增加长期成本。",
      question: "请提供 NOP+ 是否随车的官方截图或客服书面回复。"
    });
  }

  if (car.nop === "not-included" || car.nop === "none" || car.nop === "subscription") {
    risks.push({
      level: "medium",
      title: "智驾权益会增加持有成本",
      detail: "智驾订阅或缺失应进入真实成本模型，也可作为压价依据。",
      question: "请确认订阅价格、可否按月购买、二手车主是否同价。"
    });
  }

  if (car.battery === "baas") {
    risks.push({
      level: "medium",
      title: "BaaS长期成本",
      detail: `月租${formatNumber(car.batteryMonthly || 0, "元")}会影响3/5年持有成本和二手流通。`,
      question: "请确认租约转移、后续买断规则、违约责任和月租优惠是否继承。"
    });
  }

  if (/车衣|贴膜|改色|颜色变更/.test(`${car.exterior} ${car.issues} ${car.notes}`)) {
    risks.push({
      level: "medium",
      title: "车衣或改色遮蔽漆面",
      detail: "需要检查膜下漆面、登记证颜色、边角包覆、拆装和局部补漆。",
      question: "能否揭开边角或用漆膜仪复核膜下漆面？"
    });
  }

  if (!["yes", "official"].includes(car.certified) && /官方认证/.test(`${car.source} ${car.seller} ${car.sellerNotes}`)) {
    risks.push({
      level: "medium",
      title: "官方认证表述待固化",
      detail: "图片或商家口径里的官方认证要落到品牌系统或合同条款。",
      question: "请提供品牌官方认证二手车页面、订单或合同条款。"
    });
  }

  if (car.city && !/北京/.test(car.city)) {
    risks.push({
      level: "low",
      title: "异地车源",
      detail: "需要确认电子转籍、北京上牌、运输、临牌和补贴领取条件。",
      question: "请确认是否可直接迁入北京，以及运输/临牌费用。"
    });
  }

  if (car.price && car.targetPrice && car.price > car.targetPrice * 1.05) {
    risks.push({
      level: "low",
      title: "未到目标成交价",
      detail: `当前报价比目标价高 ${formatWan(car.price - car.targetPrice)}，适合继续观察或压价。`,
      question: "可否按目标价谈？是否还有平台券、金融返现或整备减免？"
    });
  }

  if (validEvidenceCount === 0) {
    risks.push({
      level: "medium",
      title: "缺少关键信息",
      detail: "当前信息墙里还没有记录，后续容易被口头承诺带偏。",
      question: "先补车源页、检测报告、权益截图、聊天截图或自己的判断。"
    });
  }

  if (!car.url) {
    risks.push({
      level: "low",
      title: "车源链接缺失",
      detail: "补充链接后便于追踪价格变化、收藏状态和报告。",
      question: "补充懂车帝或官方车源链接。"
    });
  }

  risks.push(...quality.risks);
  const score = Math.min(100, risks.reduce((sum, item) => sum + ({ high: 34, medium: 18, low: 8 }[item.level] || 0), 0));
  return { risks, score, level: riskLevelFromScore(score) };
}

function getChecklist(car) {
  if (carKind(car) === "new") {
    return [
      "确认目标版本：官方指导价、权益价、必选/可选配置、交付周期。",
      "北京门店试驾：前排座椅、静谧性、底盘滤震、车机语音、高速NOA逐项打分。",
      "补车系质量数据：官方召回/缺陷记录、车质网投诉销量比、三电投诉关键词。",
      "核实权益：订金退订、锁单规则、保险、金融、置换、充电/补能权益和质保。",
      "等真实反馈：首批车主能耗、OTA稳定性、异响、底盘舒适性和辅助驾驶接管。",
      "和二手候选分开比较：新车看确定性和权益，二手看折价和车况风险。"
    ];
  }
  const isNio = /蔚来|ES6|ES8|EC6|ET5/i.test(`${car.name} ${car.trim}`);
  const isLi = /理想|i6|L6|L7|L8|L9/i.test(`${car.name} ${car.trim}`);
  const items = [
    "完整出险记录、维保记录、第三方检测报告。",
    "三电专项：SOH/电池健康度、电池一致性/压差、故障码读取。",
    "三电质保：是否随车、剩余期限、是否受过户/BaaS/官方认证影响。",
    "车系口碑：车质网投诉销量比、三电投诉关键词、官方召回/缺陷记录。",
    "漆膜检测：前后杠、四门、翼子板、后围板、ABC柱。",
    "举升检查：底盘、电池包外壳、悬架、轮毂和轮胎。",
    "手续核验：发票、登记证、是否抵押、是否营运、是否可正常迁入北京。",
    "把商家承诺写进合同或订单附件，不只保留口头承诺。"
  ];
  if (isNio) {
    items.unshift("蔚来系统截图：电池产权、是否 BaaS、是否欠费、是否可过户。");
    items.push("蔚来系统截图：NOP+、车联网、质保、道路救援和二手车主权益。");
  }
  if (isLi) {
    items.push("理想官方 App/客服确认：是否官方认证、辅助驾驶权益、保修和维修记录。");
  }
  if (car.transfers > 0) items.push("解释准新车过户原因，并写入合同附件。");
  if (car.battery === "baas") items.push("核实 BaaS 月租、租约转移、后续买断规则和违约责任。");
  if (car.report !== "full") items.push("付款前约第三方复检，重点看底盘、电池包和结构件。");
  return items;
}

function render() {
  ensureSelectedCar();
  renderAuth();
  renderNav();
  renderDashboard();
  renderDiscover();
  renderGarage();
  renderNewCars();
  renderUsedCars();
  renderDetail();
  renderCompare();
  renderDrives();
  renderRisks();
  renderSellers();
  renderReport();
  renderTimeline();
  return saveState();
}

function ensureSelectedCar() {
  if (!state.cars.some((car) => car.id === selectedCarId)) {
    selectedCarId = state.cars[0]?.id || "";
  }
}

function renderNav() {
  if (!viewMeta[activeView]) activeView = "dashboard";
  const activeNavView = activeView === "detail" || activeView === "risks" ? "garage" : activeView;
  document.querySelectorAll(".nav-button").forEach((button) => {
    const isActive = button.dataset.view === activeNavView;
    button.classList.toggle("active", isActive);
    button.toggleAttribute("aria-current", isActive);
  });
  const [title, subtitle] = viewMeta[activeView];
  document.body.dataset.view = activeView;
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewSubtitle").textContent = subtitle;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${activeView}View`)?.classList.add("active");
}

function setActiveView(view, { scroll = "restore" } = {}) {
  const requestedView = resolveViewAlias(view);
  if (!viewMeta[requestedView]) return false;
  if (requestedView === activeView) {
    if (scroll === true || scroll === "top") {
      const saved = render();
      scrollPageToTop();
      return saved;
    }
    return true;
  }
  saveViewScrollPosition(activeView);
  activeView = requestedView;
  const saved = render();
  if (scroll === true || scroll === "top") {
    scrollPageToTop();
  } else if (scroll === "restore") {
    restoreViewScrollPosition(view);
  }
  return saved;
}

function resolveViewAlias(view) {
  if (view === "newcars") {
    activeDiscoverTab = "newcars";
    return "discover";
  }
  if (view === "usedcars") {
    activeDiscoverTab = "usedcars";
    return "discover";
  }
  return view;
}

function scrollPageToTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  });
}

function saveViewScrollPosition(view = activeView) {
  if (!viewMeta[view]) return;
  viewScrollPositions[view] = {
    windowTop: window.scrollY || document.documentElement.scrollTop || 0,
    mainTop: document.querySelector(".main")?.scrollTop || 0
  };
}

function restoreViewScrollPosition(view = activeView) {
  const position = viewScrollPositions[view] || { windowTop: 0, mainTop: 0 };
  requestAnimationFrame(() => {
    window.scrollTo({ top: position.windowTop || 0, left: 0, behavior: "auto" });
    document.querySelector(".main")?.scrollTo?.({ top: position.mainTop || 0, left: 0, behavior: "auto" });
  });
}

function renderDiscover() {
  const summary = document.querySelector("#discoverProfileSummary");
  if (summary) {
    const requirement = state.userRequirement;
    const chips = [
      requirement.city || "北京",
      peopleLabel(requirement.people),
      energyPreferenceLabel(requirement.energyTypes),
      `${formatWan(requirement.budgetMinWan)}-${formatWan(requirement.budgetMaxWan)}`,
      requirement.referenceCar ? "i6 标尺" : "",
      ...requirement.priorities.slice(0, 3).map((priority) => requirementPriorityLabels[priority] || priority)
    ].filter(Boolean);
    summary.innerHTML = `
      <span class="profile-summary-label">使用画像</span>
      <div>${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}</div>
    `;
  }

  document.querySelectorAll("[data-discover-tab]").forEach((button) => {
    const active = button.dataset.discoverTab === activeDiscoverTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-discover-panel]").forEach((panel) => {
    const active = panel.dataset.discoverPanel === activeDiscoverTab;
    panel.classList.toggle("active", active);
    panel.toggleAttribute("hidden", !active);
  });
}

function renderRequirementPanel() {
  const panel = document.querySelector("#requirementPanel");
  if (!panel) return;
  const requirement = state.userRequirement;
  const analysis = state.requirementAnalysis;
  const form = document.querySelector("#requirementForm");
  const preview = document.querySelector("#requirementPreview");
  panel.classList.toggle("is-editing", requirementEditMode);
  if (form) form.hidden = !requirementEditMode;
  document.querySelector("#editRequirement")?.toggleAttribute("hidden", requirementEditMode);
  document.querySelector("#saveRequirement")?.toggleAttribute("hidden", !requirementEditMode);
  document.querySelector("#cancelRequirementEdit")?.toggleAttribute("hidden", !requirementEditMode);
  if (!requirementEditMode || !form?.contains(document.activeElement)) {
    fillRequirementFormFromState(requirement);
  }
  if (preview) preview.innerHTML = renderRequirementPreview(requirement, analysis);
  document.querySelector("#requirementSummary").innerHTML = renderRequirementSummary(requirement, analysis);
  document.querySelector("#requirementRecommendations").innerHTML = renderRequirementRecommendations(analysis);
  setRequirementAnalyzeState(requirementAnalysisRunning);
}

function fillRequirementFormFromState(requirement = state.userRequirement) {
  setValue("#reqPeople", requirement.people);
  setValue("#reqBudgetMin", requirement.budgetMinWan);
  setValue("#reqBudgetMax", requirement.budgetMaxWan);
  setValue("#reqEnergy", requirement.energyTypes.includes("ev") && requirement.energyTypes.length === 1 ? "ev" : requirement.energyTypes.includes("erev") && !requirement.energyTypes.includes("ev") ? "hybrid" : "all");
  setValue("#reqRange", requirement.minRangeKm);
  setValue("#reqBody", requirement.bodyPreference);
  setValue("#reqTiming", requirement.purchaseTiming);
  setValue("#reqMustHaves", requirement.mustHaves);
  setValue("#reqDealBreakers", requirement.dealBreakers);
  setValue("#reqNotes", requirement.notes);
  setRequirementCheckboxes("reqScene", requirement.scenes);
  setRequirementCheckboxes("reqPriority", requirement.priorities);
}

function renderRequirementPreview(requirement, analysis) {
  const scenes = requirement.scenes.map((scene) => requirementSceneLabels[scene] || scene);
  const priorities = requirement.priorities.map((priority) => requirementPriorityLabels[priority] || priority);
  const summaryLine = [
    peopleLabel(requirement.people),
    requirement.city || "北京",
    `${formatWan(requirement.budgetMinWan)}-${formatWan(requirement.budgetMaxWan)}`,
    energyPreferenceLabel(requirement.energyTypes),
    bodyPreferenceLabel(requirement.bodyPreference)
  ].filter(Boolean).join(" · ");
  const updatedText = requirement.updatedAt ? `保存于 ${formatDateTime(requirement.updatedAt)}` : "样例画像，尚未手动保存";
  const analyzedText = analysis.lastAnalyzedAt ? `上次分析 ${formatDateTime(analysis.lastAnalyzedAt)}` : "尚未分析";
  const blocks = [
    ["购车时间", requirement.purchaseTiming],
    ["必须满足", requirement.mustHaves],
    ["不能接受", requirement.dealBreakers],
    ["其他补充", requirement.notes]
  ].filter(([, value]) => value);
  return `
    <div class="profile-preview-top">
      <div class="profile-main">
        <div class="eyebrow">当前画像</div>
        <h3>${escapeHtml(summaryLine)}</h3>
        <p>${escapeHtml(analysis.summary || "保存画像后，后续新车推荐、二手车排序和风险提示都会以这份偏好为中心。")}</p>
      </div>
      <div class="profile-status">
        <span>${escapeHtml(updatedText)}</span>
        <strong>${escapeHtml(analyzedText)}</strong>
      </div>
    </div>
    <div class="profile-chip-row">
      ${scenes.map((scene) => `<span>${escapeHtml(scene)}</span>`).join("")}
      <span>纯电续航≥${escapeHtml(requirement.minRangeKm)}km</span>
    </div>
    <div class="profile-priority">
      <span>优先级</span>
      <div>${priorities.map((priority) => `<strong>${escapeHtml(priority)}</strong>`).join("")}</div>
    </div>
    <div class="profile-grid">
      ${blocks.map(([label, value]) => `
        <div class="profile-block">
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(value)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRequirementSummary(requirement, analysis) {
  if (!analysis.searchStrategy && !analysis.error) return "";
  return `
    <div class="requirement-summary-text">
      ${analysis.searchStrategy ? `<p class="muted">${escapeHtml(analysis.searchStrategy)}</p>` : ""}
      ${analysis.error ? `<p class="requirement-error">${escapeHtml(analysis.error)}</p>` : ""}
    </div>
  `;
}

function renderRequirementRecommendations(analysis) {
  if (!analysis.candidates.length) {
    return `
      <div class="requirement-empty">
        <strong>还没有候选车型</strong>
        <span>点击“理解需求并找车”，会先拉取近期发布/热门车型，再按新车车型和二手车源分栏输出。</span>
      </div>
    `;
  }
  const newCandidates = analysis.candidates.filter((candidate) => requirementCandidateBucket(candidate) === "new");
  const usedCandidates = analysis.candidates.filter((candidate) => requirementCandidateBucket(candidate) === "used");
  const manualCandidates = analysis.candidates.filter((candidate) => requirementCandidateBucket(candidate) === "manual");
  return `
    <div class="requirement-result-head">
      <div>
        <strong>候选结果 ${analysis.candidates.length} 个</strong>
        <span class="muted">${analysis.lastAnalyzedAt ? `上次分析：${formatDateTime(analysis.lastAnalyzedAt)}` : "按当前画像排序"}</span>
      </div>
      ${analysis.source ? `<span class="chip info">${escapeHtml(analysis.source)}</span>` : ""}
    </div>
    ${renderRequirementCandidateGroup("新车车型候选", "先选车系和版本，再去新车情报里跟踪价格、权益和试驾。", newCandidates)}
    ${renderRequirementCandidateGroup("二手具体车源", "这是可联系、可检测、可谈价的一台车，要按二手风险核验。", usedCandidates)}
    ${renderRequirementCandidateGroup("手动建议/待归类", "车型池不足时先放这里，补链接后再归入新车或二手。", manualCandidates)}
    ${analysis.questions.length ? `
      <div class="requirement-questions">
        ${analysis.questions.slice(0, 4).map((question) => `<span>${escapeHtml(question)}</span>`).join("")}
      </div>
    ` : ""}
  `;
}

function requirementCandidateBucket(candidate) {
  if (candidate.source === "used") return "used";
  if (candidate.source === "release") return "new";
  if (candidate.source === "garage" && candidate.carId) {
    const car = state.cars.find((item) => item.id === candidate.carId);
    return carKind(car);
  }
  if (candidate.skuId) return "used";
  if (candidate.seriesId) return "new";
  return "manual";
}

function renderRequirementCandidateGroup(title, hint, candidates) {
  if (!candidates.length) return "";
  return `
    <section class="requirement-group">
      <div class="requirement-group-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="muted">${escapeHtml(hint)}</span>
      </div>
      <div class="requirement-candidate-grid">
        ${candidates.map(renderRequirementCandidateCard).join("")}
      </div>
    </section>
  `;
}

function renderRequirementCandidateCard(candidate) {
  const bucket = requirementCandidateBucket(candidate);
  const sourceLabel = candidate.source === "release" ? "懂车帝车型" : candidate.source === "used" ? "二手车源" : candidate.source === "garage" ? "候选库" : "AI建议";
  const actionLabel = candidate.source === "garage" ? "查看详情" : bucket === "used" ? "加入二手车源" : bucket === "new" ? "加入新车候选" : "加入待归类";
  return `
    <article class="requirement-candidate">
      <div class="requirement-candidate-top">
        <div>
          <h3>${escapeHtml(candidate.name)}</h3>
          <p class="muted">${escapeHtml(candidate.trim || sourceLabel)}</p>
        </div>
        <div class="fit-score">${candidate.fitScore || "-"}</div>
      </div>
      <div class="chip-row">
        <span class="chip ${candidate.fitScore >= 76 ? "ok" : candidate.fitScore >= 60 ? "warn" : "info"}">匹配度</span>
        <span class="chip">${escapeHtml(sourceLabel)}</span>
        ${candidate.priceWan !== "" ? `<span class="chip">${formatWan(candidate.priceWan)}</span>` : ""}
        ${candidate.rangeKm !== "" ? `<span class="chip">续航 ${candidate.rangeKm}km</span>` : ""}
        ${candidate.tags.slice(0, 3).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <p>${escapeHtml(candidate.why || "需要继续看配置、价格权益和试驾反馈。")}</p>
      ${candidate.tradeoffs.length ? `<div class="requirement-tradeoffs">${candidate.tradeoffs.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      <div class="card-actions">
        <button class="primary-card-action" data-add-requirement-candidate="${candidate.id}" type="button">${actionLabel}</button>
        ${candidate.sourceUrl ? `<a href="${escapeAttr(candidate.sourceUrl)}" target="_blank" rel="noreferrer">外部信息</a>` : ""}
      </div>
    </article>
  `;
}

const requirementSceneLabels = {
  city: "市区通勤",
  highway: "高速长途",
  holiday: "假期出行",
  parking: "北京停车"
};

const requirementPriorityLabels = {
  comfort: "舒适/NVH",
  range: "续航补能",
  cockpit: "车机生态",
  adas: "高速智驾",
  interior: "内饰质感",
  appearance: "外观耐看"
};

function peopleLabel(value) {
  return { "1": "1人", "2": "2人", "3-4": "3-4人", "5+": "5人以上" }[value] || `${value}人`;
}

function energyPreferenceLabel(types) {
  if (types.includes("ev") && types.length === 1) return "只看纯电";
  if (!types.includes("ev") && (types.includes("erev") || types.includes("phev"))) return "增程/插混";
  return "新能源不限";
}

function bodyPreferenceLabel(value) {
  return {
    suv_sedan: "SUV/轿车均可",
    suv: "优先SUV",
    sedan: "优先轿车/旅行",
    compact: "优先好停车",
    no_mpv: "不看MPV"
  }[value] || "车身不限";
}

function getSavedRefreshRequirement() {
  return normalizeUserRequirement(state.userRequirement);
}

function getRequirementBudget(requirement = state.userRequirement) {
  const req = normalizeUserRequirement(requirement);
  let min = Number(req.budgetMinWan);
  let max = Number(req.budgetMaxWan);
  if (min > max) [min, max] = [max, min];
  return { min, max, center: (min + max) / 2 };
}

function buildRefreshProfileSummary(requirement = state.userRequirement, options = {}) {
  const req = normalizeUserRequirement(requirement);
  const budget = getRequirementBudget(req);
  return [
    options.city || req.city || "北京",
    `${formatWan(budget.min)}-${formatWan(budget.max)}`,
    energyPreferenceLabel(req.energyTypes),
    `续航≥${req.minRangeKm}km`,
    bodyPreferenceLabel(req.bodyPreference),
    req.priorities.slice(0, 3).map((priority) => requirementPriorityLabels[priority] || priority).join("/")
  ].filter(Boolean).join(" · ");
}

function buildRefreshProfileParams(extra = {}) {
  const req = getSavedRefreshRequirement();
  const params = new URLSearchParams();
  params.set("profile", "1");
  params.set("profileCity", req.city || "北京");
  params.set("people", req.people || "2");
  params.set("scenes", req.scenes.join(","));
  params.set("budgetMinWan", String(req.budgetMinWan));
  params.set("budgetMaxWan", String(req.budgetMaxWan));
  params.set("energyTypes", req.energyTypes.join(","));
  params.set("minRangeKm", String(req.minRangeKm));
  params.set("minPhevRangeKm", String(req.minPhevRangeKm));
  params.set("priorities", req.priorities.join(","));
  params.set("seatFocus", req.seatFocus || "front");
  params.set("bodyPreference", req.bodyPreference || "suv_sedan");
  params.set("purchaseTiming", String(req.purchaseTiming || "").slice(0, 80));
  params.set("mustHaves", String(req.mustHaves || "").slice(0, 160));
  params.set("dealBreakers", String(req.dealBreakers || "").slice(0, 180));
  params.set("referenceCar", String(req.referenceCar || "").slice(0, 120));
  params.set("notes", String(req.notes || "").slice(0, 120));
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

function resolveUsedcarRefreshCity(selectedCity = "profile") {
  if (selectedCity === "profile" || !selectedCity) return getSavedRefreshRequirement().city || "北京";
  return selectedCity;
}

function profileRequiresPureEv(requirement = state.userRequirement) {
  const req = normalizeUserRequirement(requirement);
  return req.energyTypes.length === 1 && req.energyTypes[0] === "ev";
}

function energyMatchesRequirement(type, requirement = state.userRequirement) {
  const req = normalizeUserRequirement(requirement);
  if (!req.energyTypes.length) return true;
  if (profileRequiresPureEv(req)) return type === "ev";
  if (req.energyTypes.includes(type)) return true;
  return type === "new_energy" && req.energyTypes.some((energy) => ["ev", "phev", "erev"].includes(energy));
}

function setRequirementCheckboxes(name, values) {
  const set = new Set(values);
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = set.has(input.value);
  });
}

function renderDashboard() {
  renderRequirementPanel();
  const risks = state.cars.map(analyzeCar);
  const riskClosures = state.cars.map(riskCompletionSummary);
  const highCount = riskClosures.reduce((sum, item) => sum + item.highOpen, 0);
  const avgRisk = risks.length ? Math.round(risks.reduce((sum, item) => sum + item.score, 0) / risks.length) : 0;
  const best = [...state.cars].sort((a, b) => fitScore(b) - fitScore(a))[0];
  const monthly = state.cars.reduce((sum, car) => sum + costProfile(car).monthly, 0);

  document.querySelector("#decisionSummary").innerHTML = `
    <div>
      <div class="eyebrow">当前判断</div>
      <h2>${best ? `${escapeHtml(best.name)} ${escapeHtml(best.trim || "")}：${recommendationLabel(deriveRecommendation(best))}` : "先添加一台车源"}</h2>
      <p>${best ? escapeHtml(best.nextAction || "补齐信息、成本和试驾记录后再做最终判断。") : "系统会自动生成风险和核验清单。"}</p>
    </div>
    <div class="decision-actions">
      <div class="deadline-pill">
        <span>指标到期</span>
        <strong>${daysUntilDeadline()} 天</strong>
      </div>
      <button class="secondary-button" id="analyzeDashboardCar" data-dashboard-ai type="button" ${best ? "" : "disabled"}>AI 重新分析</button>
    </div>
  `;

  document.querySelector("#metricsGrid").innerHTML = [
    metric("候选车", state.cars.length, best ? `最高匹配：${best.name}` : "当前车库数量"),
    metric("待关闭高风险", highCount, "需要先问清楚"),
    metric("平均风险", avgRisk, "0低 100高"),
    metric("月固定成本", `${monthly.toLocaleString("zh-CN")}元`, "BaaS + 订阅合计")
  ].join("");

  const mode = document.querySelector("#rankMode").value;
  const ranked = [...state.cars].sort((a, b) => {
    if (mode === "risk") return analyzeCar(a).score - analyzeCar(b).score;
    if (mode === "value") return (getDiscountPct(b) || 0) - (getDiscountPct(a) || 0);
    if (mode === "i6") return i6Score(b) - i6Score(a);
    if (mode === "cost") return costProfile(a).year3 - costProfile(b).year3;
    return fitScore(b) - fitScore(a);
  });
  document.querySelector("#rankedCars").innerHTML = ranked.map((car, index) => {
    const risk = analyzeCar(car);
    const rec = deriveRecommendation(car);
    const score = mode === "risk" ? risk.score : mode === "i6" ? i6Score(car) : mode === "cost" ? formatWan(costProfile(car).year3) : fitScore(car);
    return `
      <button class="rank-item" data-detail="${car.id}" type="button">
        <div class="rank-index">${index + 1}</div>
        <div>
          <div class="car-name">${escapeHtml(car.name)}</div>
          <div class="car-trim">${escapeHtml(car.trim || "")}</div>
          <div class="chip-row tight">
            <span class="chip ${carKindClass(carKind(car))}">${carKindLabel(carKind(car))}</span>
            <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
            <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
          </div>
        </div>
        <div class="fit-score">${score}</div>
      </button>
    `;
  }).join("");

  const actions = getDashboardWorkflowActions();
  document.querySelector("#actionList").innerHTML = actions.slice(0, 8).map(({ car, task, workflow }) => `
    <button class="action-item ${task.level}" data-detail="${car.id}" type="button">
      <strong>${escapeHtml(car.name)}</strong>
      <div>${escapeHtml(task.title)}</div>
      <div class="muted">${escapeHtml(workflow.decision.label)} · ${escapeHtml(task.detail)}</div>
    </button>
  `).join("") || `<div class="muted">暂无待关闭风险项。</div>`;

  document.querySelector("#timelinePreview").innerHTML = buildTimelineItems().slice(0, 6).map((item) => `
    <div class="timeline-item ${item.level || ""}">
      <div class="timeline-date">${escapeHtml(item.date)}</div>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p class="muted">${escapeHtml(item.detail)}</p>
      </div>
    </div>
  `).join("");
}

function metric(label, value, foot) {
  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-foot">${escapeHtml(foot)}</div>
    </div>
  `;
}

function getDashboardWorkflowActions() {
  return state.cars
    .filter((car) => !["rejected", "purchased"].includes(car.stage))
    .flatMap((car) => {
      const workflow = getWorkflowForCar(car);
      return workflow.tasks.filter((task) => task.status !== "done").slice(0, 2).map((task) => ({ car, workflow, task }));
    })
    .sort((a, b) => workflowTaskWeight(b.task.level) - workflowTaskWeight(a.task.level));
}

function workflowTaskWeight(level) {
  return { high: 3, danger: 3, medium: 2, warn: 2, low: 1, ok: 0 }[level] || 1;
}

function getFilteredCars() {
  const query = document.querySelector("#searchInput")?.value.trim().toLowerCase() || "";
  const kind = document.querySelector("#kindFilter")?.value || "all";
  const stage = document.querySelector("#stageFilter")?.value || "all";
  const risk = document.querySelector("#riskFilter")?.value || "all";
  const battery = document.querySelector("#batteryFilter")?.value || "all";
  const source = document.querySelector("#sourceFilter")?.value || "all";
  return state.cars.filter((car) => {
    const haystack = `${car.name} ${car.trim} ${car.city} ${car.seller} ${car.source} ${car.notes} ${car.issues}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesKind = kind === "all" || carKind(car) === kind;
    const matchesStage = stage === "all" || car.stage === stage;
    const riskLevel = analyzeCar(car).level;
    const matchesRisk = risk === "all" || riskLevel === risk;
    const matchesBattery = battery === "all" || car.battery === battery;
    const matchesSource = source === "all" || sourceBucket(car.source) === source;
    return matchesQuery && matchesKind && matchesStage && matchesRisk && matchesBattery && matchesSource;
  });
}

function renderGarage() {
  const cars = getFilteredCars();
  const allCars = state.cars;
  const counts = {
    all: allCars.length,
    new: allCars.filter((car) => carKind(car) === "new").length,
    used: allCars.filter((car) => carKind(car) === "used").length,
    manual: allCars.filter((car) => carKind(car) === "manual").length,
    filtered: cars.length
  };
  document.querySelector("#garageListHeader").innerHTML = `
    <div class="garage-list-copy">
      <div class="eyebrow">候选尽调</div>
      <h2>先按阶段推进，再进入单车详情闭环风险</h2>
      <p class="muted">第一层是候选列表和阶段看板；第二层是单车详情，集中看信息墙、核验清单、真实成本和风险关闭状态。</p>
    </div>
    <div class="garage-list-stats">
      <div><span>显示</span><strong>${counts.filtered}/${counts.all}</strong></div>
      <div><span>新车</span><strong>${counts.new}</strong></div>
      <div><span>二手</span><strong>${counts.used}</strong></div>
      <div><span>待关闭</span><strong>${allCars.reduce((sum, car) => sum + riskCompletionSummary(car).open, 0)}</strong></div>
    </div>
  `;
  const order = ["new", "used", "manual"];
  document.querySelector("#carGrid").innerHTML = `
    ${renderInvestigationBoard(cars)}
    ${order.map((kind) => {
    const group = cars.filter((car) => carKind(car) === kind);
    if (!group.length) return "";
    return `
      <section class="garage-section">
        <div class="garage-section-head">
          <h2>${garageSectionTitle(kind)}</h2>
          <span class="muted">${garageSectionHint(kind, group.length)}</span>
        </div>
        <div class="garage-section-grid">
          ${group.map(renderGarageCard).join("")}
        </div>
      </section>
    `;
  }).join("") || `<div class="muted">没有符合条件的候选。</div>`}
  `;
}

function renderInvestigationBoard(cars) {
  if (!cars.length) return "";
  const lanes = [
    ["watching", "观察", "先补链接、价格和基本配置"],
    ["contacted", "已联系", "等材料、问权益、确认商家"],
    ["waiting-docs", "等材料", "检测报告、权益截图、配置单还没到齐"],
    ["test-drive", "已试驾", "记录体感并对齐 i6 标尺"],
    ["recheck", "待复检", "第三方检测和手续核验"],
    ["negotiating", "谈价", "把风险转成压价和合同条款"]
  ];
  return `
    <section class="investigation-board" aria-label="候选尽调阶段">
      ${lanes.map(([stage, label, hint]) => {
        const laneCars = cars.filter((car) => car.stage === stage);
        return `
          <div class="investigation-lane">
            <div class="investigation-lane-head">
              <strong>${escapeHtml(label)}</strong>
              <span>${laneCars.length}</span>
            </div>
            <p>${escapeHtml(hint)}</p>
            <div class="investigation-mini-list">
              ${laneCars.slice(0, 3).map((car) => {
                const progress = getInvestigationProgress(car);
                const riskSummary = riskCompletionSummary(car);
                return `
                  <button class="investigation-mini-card" data-detail="${car.id}" type="button">
                    <span>${escapeHtml(car.name)}</span>
                    <strong>${formatWan(car.price)}</strong>
                    <div class="progress-strip"><span style="width:${progress.percent}%"></span></div>
                    <small>${progress.done}/${progress.total} 项 · ${riskSummary.open ? `${riskSummary.open} 风险` : "已闭环"}</small>
                  </button>
                `;
              }).join("") || `<div class="investigation-empty">暂无候选</div>`}
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderInvestigationProgress(progress, riskSummary, { compact = false } = {}) {
  const openText = riskSummary.open
    ? `${riskSummary.highOpen ? `${riskSummary.highOpen} 高风险 · ` : ""}${riskSummary.open} 待关闭`
    : "风险已闭环";
  return `
    <div class="investigation-progress ${compact ? "compact" : ""}">
      <div class="investigation-progress-head">
        <span>尽调完成 ${progress.done}/${progress.total}</span>
        <strong>${progress.percent}%</strong>
      </div>
      <div class="progress-strip"><span style="width:${progress.percent}%"></span></div>
      <div class="investigation-progress-foot">
        <span>${escapeHtml(openText)}</span>
        <span>风险闭环 ${riskSummary.percent}%</span>
      </div>
    </div>
  `;
}

function renderGarageCard(car) {
  const kind = carKind(car);
  const risk = analyzeCar(car);
  const discount = getDiscountPct(car);
  const cost = costProfile(car);
  const rec = deriveRecommendation(car);
  const progress = getInvestigationProgress(car);
  const riskSummary = riskCompletionSummary(car);
  const workflow = getWorkflowForCar(car);
  const quality = assessCarQuality(car);
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
            <span class="chip ${carKindClass(kind)}">${carKindLabel(kind)}</span>
            <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
            <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
            <span class="chip ${quality.threeElectricRisk === "high" ? "danger" : quality.threeElectricRisk === "medium" ? "warn" : quality.confidenceLevel === "high" ? "ok" : "info"}">质量${qualityLevelLabel(quality.confidenceLevel)}</span>
            <span class="chip">${stageLabel(car.stage)}</span>
            <span class="chip">${batteryLabel(car.battery)}</span>
            ${discount !== null ? `<span class="chip">折让 ${discount.toFixed(1)}%</span>` : ""}
          </div>
          <div class="car-meta">
            <div class="meta-cell"><div class="meta-label">${kind === "new" ? "落地估算" : "3年成本"}</div><div class="meta-value">${formatWan(kind === "new" ? car.landing || cost.year1 : cost.year3)}</div></div>
            <div class="meta-cell"><div class="meta-label">i6标尺</div><div class="meta-value">${i6Score(car)}/100</div></div>
            <div class="meta-cell"><div class="meta-label">目标价</div><div class="meta-value">${formatWan(car.targetPrice)}</div></div>
          </div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(car.city || "未知城市")}</span>
            <span class="chip">${escapeHtml(car.source || "未知车源")}</span>
            <span class="chip">${reportLabel(car.report)}</span>
            <span class="chip">${nopLabel(car.nop)}</span>
            <span class="chip ${workflow.decision.level}">${escapeHtml(workflow.decision.label)}</span>
          </div>
          ${renderInvestigationProgress(progress, riskSummary)}
          <p class="card-note">${escapeHtml(workflow.tasks[0]?.detail || car.nextAction || "补齐车源信息后再判断。")}</p>
          <div class="card-actions">
            <button class="primary-card-action" data-detail="${car.id}" type="button">查看详情</button>
            <button data-edit="${car.id}" type="button">编辑</button>
            <button data-risk="${car.id}" type="button">风险</button>
            <button class="${selectedCompare.has(car.id) ? "selected-card-action" : ""}" data-compare="${car.id}" type="button">${selectedCompare.has(car.id) ? "取消对比" : "加入对比"}</button>
            <button class="danger-action" data-remove-car="${car.id}" type="button">移出候选</button>
            ${car.url ? `<a href="${escapeAttr(getExternalSourceUrl(car))}" target="_blank" rel="noopener noreferrer">外部链接</a>` : ""}
          </div>
        </div>
      </article>
    `;
}

function renderNewCars() {
  const status = document.querySelector("#newcarStatus");
  const spotlight = document.querySelector("#newcarSpotlight");
  const grid = document.querySelector("#newcarGrid");
  if (!status || !spotlight || !grid) return;
  const releases = getFilteredNewReleases();
  const total = state.market.releases.length;
  const lastFetched = state.market.lastFetchedAt ? formatDateTime(state.market.lastFetchedAt) : "";
  const recentCount = state.market.releases.filter((release) => release.sourceTypes.includes("recent")).length;
  const hotCount = state.market.releases.filter((release) => release.sourceTypes.includes("hot")).length;
  const newsCount = state.market.releases.filter((release) => release.sourceTypes.includes("news")).length;
  const industryCount = state.market.releases.filter((release) => release.sourceTypes.includes("industry")).length;
  const watchCount = state.market.releases.filter((release) => release.sourceTypes.includes("watchlist")).length;
  const sourceCounts = [
    `近期 ${recentCount}`,
    `热门 ${hotCount}`,
    newsCount ? `资讯 ${newsCount}` : "",
    industryCount ? `行业 ${industryCount}` : "",
    watchCount ? `重点 ${watchCount}` : ""
  ].filter(Boolean).join(" / ");
  const profileSummary = buildRefreshProfileSummary();
  status.textContent = total
    ? `已缓存 ${total} 款：${sourceCounts}，当前显示 ${releases.length} 款。按首页画像：${profileSummary}。${lastFetched ? `上次刷新：${lastFetched}` : ""}`
    : `还没有刷新数据。点击按钮后会按首页画像获取近期发布、热门车型、资讯信源、行业线索和重点纯电车型：${profileSummary}。`;

  if (!total) {
    spotlight.innerHTML = `
      <section class="panel newcar-empty">
        <h2>从懂车帝拉一份新车与热门车型清单</h2>
        <p class="muted">刷新后会保存到本机缓存，后续可按近期发布、热门车型、新能源、车身形式、30万附近价格筛选，也能把感兴趣的车型加入新车候选继续跟踪。</p>
      </section>
    `;
    grid.innerHTML = "";
    return;
  }

  const best = releases[0];
  if (!best) {
    spotlight.innerHTML = "";
    grid.innerHTML = `<div class="muted">当前筛选条件下没有车型。</div>`;
    return;
  }
  const listReleases = releases.slice(1);
  spotlight.innerHTML = renderNewCarSpotlight(best);
  grid.innerHTML = listReleases.length
    ? `${renderMarketListHeading("继续浏览车型", `${listReleases.length} 款`, "顶部已单独展示当前最匹配的一款。")}${listReleases.map(renderNewCarCard).join("")}`
    : `<section class="panel market-empty-note"><h2>当前筛选只命中顶部这款车型</h2><p class="muted">可以切换筛选条件或刷新数据，继续扩展车型池。</p></section>`;
}

function getFilteredNewReleases() {
  const scope = document.querySelector("#newcarScopeFilter")?.value || "fit";
  const body = document.querySelector("#newcarBodyFilter")?.value || "all";
  const price = document.querySelector("#newcarPriceFilter")?.value || "all";
  return [...(state.market.releases || [])]
    .filter((release) => {
      if (scope === "fit" && !energyMatchesRequirement(release.energyType)) return false;
      if (scope === "newenergy" && !isNewEnergyRelease(release)) return false;
      if (scope === "recent" && !release.sourceTypes.includes("recent")) return false;
      if (scope === "hot" && !release.sourceTypes.includes("hot")) return false;
      if (scope === "fit" && !releaseMatchesUserProfile(release)) return false;
      if (body !== "all" && newReleaseBodyBucket(release) !== body) return false;
      if (price !== "all" && newReleasePriceBucket(release) !== price) return false;
      return true;
    })
    .sort((a, b) => {
      if (scope === "fit") return newReleaseFitScore(b) - newReleaseFitScore(a);
      if (scope === "hot") return hotSortValue(a) - hotSortValue(b);
      return num(b.releaseTimestamp) - num(a.releaseTimestamp);
    });
}

function renderNewCarSpotlight(release) {
  const fit = newReleaseFitScore(release);
  const reasons = newReleaseFitReasons(release);
  return `
    <section class="panel newcar-feature">
      <div class="newcar-feature-media">${release.coverUrl ? `<img src="${escapeAttr(release.coverUrl)}" alt="${escapeAttr(release.seriesName)}">` : `<span>${escapeHtml(release.seriesName)}</span>`}</div>
      <div class="newcar-feature-copy">
        <span class="market-eyebrow">当前最匹配</span>
        <div class="chip-row tight">
          <span class="chip ok">适配度 ${fit}</span>
          ${renderReleaseSourceChips(release)}
          <span class="chip info">${escapeHtml(release.energyLabel)}</span>
          <span class="chip">${escapeHtml(release.carType || "车型待确认")}</span>
        </div>
        <h2>${escapeHtml(release.brandName)} ${escapeHtml(release.seriesName)}</h2>
        <p class="muted">${escapeHtml(releaseSourceText(release))} · ${escapeHtml(release.priceText || "价格待确认")} · 数据来自懂车帝</p>
        <div class="newcar-reason-list">
          ${reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="primary-card-action" data-add-release="${release.seriesId}" type="button">加入新车候选</button>
          <a href="${escapeAttr(release.dcdUrl)}" target="_blank" rel="noreferrer">车型页</a>
          ${release.articleUrl ? `<a href="${escapeAttr(release.articleUrl)}" target="_blank" rel="noreferrer">上市资讯</a>` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderNewCarCard(release) {
  const fit = newReleaseFitScore(release);
  const modelFacts = getReleaseModelFacts(release);
  const dimensions = release.dimensions;
  return `
    <article class="newcar-card">
      <div class="newcar-card-image">${release.coverUrl ? `<img src="${escapeAttr(release.coverUrl)}" alt="${escapeAttr(release.seriesName)}">` : `<span>${escapeHtml(release.seriesName)}</span>`}</div>
      <div class="newcar-card-body">
        <div class="newcar-card-title">
          <div>
            <div class="car-name">${escapeHtml(release.seriesName)}</div>
            <div class="car-trim">${escapeHtml(release.brandName)} · ${escapeHtml(release.releaseDate || "日期待确认")}</div>
          </div>
          <div class="fit-score">${fit}</div>
        </div>
        <div class="chip-row">
          <span class="chip ${fit >= 72 ? "ok" : fit >= 56 ? "warn" : "info"}">适配度</span>
          ${renderReleaseSourceChips(release)}
          <span class="chip info">${escapeHtml(release.energyLabel)}</span>
          ${release.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="newcar-facts">
          <div><span>价格</span><strong>${escapeHtml(release.priceText || "-")}</strong></div>
          <div><span>车身</span><strong>${escapeHtml(release.carType || "-")}</strong></div>
          <div><span>尺寸</span><strong>${formatDimensions(dimensions)}</strong></div>
          <div><span>续航/电池</span><strong>${escapeHtml(modelFacts.energy || "-")}</strong></div>
        </div>
        ${release.models.length ? `
          <details class="newcar-models">
            <summary>车型版本 ${release.models.length} 个</summary>
            <div class="newcar-model-list">
              ${release.models.map((model) => `
                <div class="newcar-model-row">
                  <strong>${escapeHtml(model.year ? `${model.year}款 ${model.name}` : model.name)}</strong>
                  <span>${escapeHtml(model.officialPrice || model.price || model.dealerPrice || "价格待确认")}</span>
                  <p class="muted">${escapeHtml([model.groupKey, model.battery, model.range, model.power, model.drive].filter(Boolean).join(" · ") || model.baseConfig.join(" · "))}</p>
                </div>
              `).join("")}
            </div>
          </details>
        ` : `<p class="muted">懂车帝车型页暂未返回版本信息。</p>`}
        ${release.news.length ? `
          <div class="newcar-news">
            ${release.news.slice(0, 3).map((news) => `<a href="${escapeAttr(news.url)}" target="_blank" rel="noreferrer">${escapeHtml(news.title)}</a>`).join("")}
          </div>
        ` : ""}
        <div class="card-actions">
          <button class="primary-card-action" data-add-release="${release.seriesId}" type="button">加入新车候选</button>
          <a href="${escapeAttr(release.dcdUrl)}" target="_blank" rel="noreferrer">懂车帝</a>
          ${release.articleUrl ? `<a href="${escapeAttr(release.articleUrl)}" target="_blank" rel="noreferrer">资讯</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderUsedCars() {
  const status = document.querySelector("#usedcarStatus");
  const spotlight = document.querySelector("#usedcarSpotlight");
  const grid = document.querySelector("#usedcarGrid");
  if (!status || !spotlight || !grid) return;
  const listings = getFilteredUsedListings();
  const total = state.usedMarket.listings.length;
  const lastFetched = state.usedMarket.lastFetchedAt ? formatDateTime(state.usedMarket.lastFetchedAt) : "";
  const officialCount = state.usedMarket.listings.filter((listing) => /官方|直营|自营/.test(listing.sourceType)).length;
  const selectedCity = document.querySelector("#usedcarCityFilter")?.value || "profile";
  const profileCity = resolveUsedcarRefreshCity(selectedCity);
  const profileSummary = buildRefreshProfileSummary(state.userRequirement, { city: profileCity });
  status.textContent = total
    ? `已缓存 ${total} 台官方/自营车源，当前显示 ${listings.length} 台。按首页画像：${profileSummary}。${lastFetched ? `上次刷新：${lastFetched}` : ""}`
    : `还没有刷新数据。点击按钮后会按首页画像拉取懂车帝官方二手车源：${profileSummary}。`;

  if (!total) {
    spotlight.innerHTML = `
      <section class="panel usedcar-empty">
        <h2>从懂车帝拉取官方二手车源</h2>
        <p class="muted">默认优先懂车帝官方直营/自营车源，刷新后会按 30 万左右、准新低里程、长续航、接近理想 i6 体感和二手风险排序。</p>
      </section>
    `;
    grid.innerHTML = "";
    return;
  }

  const best = listings[0];
  if (!best) {
    spotlight.innerHTML = "";
    grid.innerHTML = `<section class="panel market-empty-note"><h2>当前筛选条件下没有车源</h2><p class="muted">可以切换城市、风险筛选，或重新刷新懂车帝官方车源。</p></section>`;
    return;
  }
  const listListings = listings.slice(1);
  spotlight.innerHTML = renderUsedCarSpotlight(best, officialCount);
  grid.innerHTML = listListings.length
    ? `${renderMarketListHeading("继续浏览车源", `${listListings.length} 台`, "顶部已单独展示当前最值得先看的车源。")}${listListings.map(renderUsedCarCard).join("")}`
    : `<section class="panel market-empty-note"><h2>当前筛选只命中顶部这台车源</h2><p class="muted">可以扩大城市范围、放宽风险筛选，或稍后重新刷新。</p></section>`;
}

function renderMarketListHeading(title, count, caption) {
  return `
    <div class="market-list-heading">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">${escapeHtml(caption)}</p>
      </div>
      <span>${escapeHtml(count)}</span>
    </div>
  `;
}

function getFilteredUsedListings() {
  const selectedCity = document.querySelector("#usedcarCityFilter")?.value || "profile";
  const city = resolveUsedcarRefreshCity(selectedCity);
  const scope = document.querySelector("#usedcarScopeFilter")?.value || "fit";
  const risk = document.querySelector("#usedcarRiskFilter")?.value || "all";
  return [...(state.usedMarket.listings || [])]
    .filter((listing) => {
      if (selectedCity !== "全国" && listing.city !== city) return false;
      if (!isOfficialUsedListingClient(listing)) return false;
      if (!energyMatchesRequirement(listing.energyType)) return false;
      if (scope === "fit" && usedListingClientScore(listing) < 52) return false;
      if (scope === "budget" && !priceNearBudget(listing)) return false;
      if (scope === "fresh" && !isFreshUsedListing(listing)) return false;
      if (scope === "known" && !isKnownConcernListing(listing)) return false;
      if (scope === "longrange" && !isLongRangeUsedListing(listing)) return false;
      if (risk === "cleaner" && (listing.riskFlags || []).length > 3) return false;
      if (risk === "no-old" && listing.year && listing.year < 2023) return false;
      return true;
    })
    .sort((a, b) => usedListingClientScore(b) - usedListingClientScore(a) || usedListingPriceDistance(a) - usedListingPriceDistance(b));
}

function isOfficialUsedListingClient(listing = {}) {
  return /官方|自营|直营/.test(`${listing.sourceType || ""} ${listing.seller || ""} ${listing.authentication || ""} ${listing.officialHint || ""}`);
}

function renderUsedCarSpotlight(listing, officialCount) {
  const risks = listing.riskFlags.slice(0, 4);
  const qualityHint = usedListingQualityHint(listing);
  return `
    <section class="panel usedcar-feature">
      <div class="usedcar-feature-media">${listing.image ? `<img src="${escapeAttr(listing.image)}" alt="${escapeAttr(listing.title)}">` : `<span>${escapeHtml(listing.seriesName)}</span>`}</div>
      <div class="usedcar-feature-copy">
        <span class="market-eyebrow">优先核验车源</span>
        <div class="chip-row tight">
          <span class="chip ok">匹配度 ${usedListingClientScore(listing)}</span>
          <span class="chip official">${escapeHtml(listing.sourceType || "官方车源")}</span>
          <span class="chip">${escapeHtml(listing.city || "全国")}</span>
          <span class="chip info">${escapeHtml(usedEnergyLabel(listing.energyType))}</span>
        </div>
        <h2>${escapeHtml(listing.title)}</h2>
        <p class="muted">${escapeHtml(listing.priceText || "价格待确认")} · ${escapeHtml(listing.ageText || "-")} · ${escapeHtml(listing.mileageText || "-")} · 本次官方/自营池 ${officialCount} 台</p>
        <div class="newcar-reason-list">
          ${listing.fitReasons.slice(0, 5).map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}
        </div>
        <div class="usedcar-risk-strip">
          ${risks.map((risk) => `<span>${escapeHtml(risk)}</span>`).join("")}
        </div>
        <div class="usedcar-quality-strip">
          ${qualityHint.map((item) => `<span class="${item.level}">${escapeHtml(item.text)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="primary-card-action" data-add-used-listing="${listing.skuId}" type="button">加入二手车源并分析</button>
          <a href="${escapeAttr(getExternalSourceUrl(listing))}" target="_blank" rel="noopener noreferrer">懂车帝详情</a>
        </div>
      </div>
    </section>
  `;
}

function renderUsedCarCard(listing) {
  const score = usedListingClientScore(listing);
  const discount = getUsedListingDiscount(listing);
  const qualityHint = usedListingQualityHint(listing);
  return `
    <article class="usedcar-card">
      <div class="usedcar-card-image">${listing.image ? `<img src="${escapeAttr(listing.image)}" alt="${escapeAttr(listing.title)}">` : `<span>${escapeHtml(listing.seriesName)}</span>`}</div>
      <div class="usedcar-card-body">
        <div class="usedcar-card-title">
          <div>
            <div class="car-name">${escapeHtml(listing.seriesName || listing.title)}</div>
            <div class="car-trim">${escapeHtml(listing.trim || listing.title)}</div>
          </div>
          <div class="fit-score">${score}</div>
        </div>
        <div class="chip-row">
          <span class="chip ${score >= 72 ? "ok" : score >= 56 ? "warn" : "info"}">偏好排序</span>
          <span class="chip official">${escapeHtml(listing.sourceType)}</span>
          <span class="chip">${escapeHtml(listing.city || "未知城市")}</span>
          ${listing.authentication ? `<span class="chip">${escapeHtml(listing.authentication)}</span>` : ""}
        </div>
        <div class="usedcar-facts">
          <div><span>报价</span><strong>${escapeHtml(listing.priceText || "-")}</strong></div>
          <div><span>新车指导</span><strong>${escapeHtml(listing.officialPriceText || "-")}</strong></div>
          <div><span>年份/里程</span><strong>${escapeHtml([listing.ageText, listing.mileageText].filter(Boolean).join(" / ") || "-")}</strong></div>
          <div><span>折让</span><strong>${discount === null ? "-" : `${discount.toFixed(1)}%`}</strong></div>
        </div>
        <div class="chip-row">
          ${listing.range ? `<span class="chip">续航 ${listing.range}km</span>` : ""}
          ${listing.transferCount !== "" ? `<span class="chip">过户 ${listing.transferCount} 次</span>` : ""}
          ${listing.tags.slice(0, 4).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="usedcar-risk-list">
          ${listing.riskFlags.slice(0, 4).map((risk) => `<span>${escapeHtml(risk)}</span>`).join("")}
        </div>
        <div class="usedcar-quality-strip compact">
          ${qualityHint.map((item) => `<span class="${item.level}">${escapeHtml(item.text)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="primary-card-action" data-add-used-listing="${listing.skuId}" type="button">加入二手车源</button>
          <a href="${escapeAttr(getExternalSourceUrl(listing))}" target="_blank" rel="noopener noreferrer">打开详情</a>
        </div>
      </div>
    </article>
  `;
}

function usedListingQualityHint(listing) {
  const hints = [];
  if (["ev", "phev", "erev", "new_energy"].includes(listing.energyType)) {
    hints.push({ level: "warn", text: "SOH待补" });
    hints.push({ level: "warn", text: "维保待补" });
    hints.push({ level: "warn", text: "三电质保待确认" });
  }
  if ((listing.tags || []).some((tag) => /深度质检|检测/.test(tag))) hints.push({ level: "info", text: "平台检测不等于三电专项" });
  return hints.slice(0, 4);
}

function usedListingClientScore(listing) {
  const req = getSavedRefreshRequirement();
  const budget = getRequirementBudget(req);
  let score = numberOrDefault(listing.fitScore, 0);
  const text = `${listing.brandName} ${listing.seriesName} ${listing.title}`;
  if (listing.priceWan !== "") {
    if (listing.priceWan >= budget.min - 4 && listing.priceWan <= budget.max + 1) {
      score += 6;
    } else {
      score -= Math.min(14, Math.abs(Number(listing.priceWan) - budget.center) * 1.2);
    }
  }
  if (energyMatchesRequirement(listing.energyType, req)) score += 4;
  else if (req.energyTypes.length) score -= 18;
  if (listing.range && req.minRangeKm) {
    if (listing.range >= Number(req.minRangeKm)) score += 5;
    else if (listing.range < Number(req.minRangeKm) - 100) score -= 6;
  }
  if (listing.city && listing.city === (req.city || "北京")) score += 4;
  if (req.bodyPreference === "no_mpv" && /ES8|L80|L90|六座|七座|MPV/i.test(text)) score -= 6;
  if (req.bodyPreference === "compact" && /ES8|L80|L90|大型|六座|七座|MPV/i.test(text)) score -= 8;
  if (vehicleHitsProfileDealBreaker(text, req)) score -= 18;
  if (state.cars.some((car) => car.url === listing.url)) score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function priceNearBudget(listing) {
  const { min, max } = getRequirementBudget();
  return listing.priceWan !== "" && listing.priceWan >= Math.max(5, min - 6) && listing.priceWan <= max + 1;
}

function isFreshUsedListing(listing) {
  return listing.year >= 2025 || (listing.mileageWan !== "" && listing.mileageWan <= 1.2);
}

function isKnownConcernListing(listing) {
  return /理想i6|蔚来ES6|蔚来ES8|ZEEKR 7X|007GT|小鹏G7|智己LS6|奥迪Q6L|乐道L80|智界R7/i.test(`${listing.seriesName} ${listing.title}`);
}

function isLongRangeUsedListing(listing) {
  const req = getSavedRefreshRequirement();
  return listing.range >= Number(req.minRangeKm || 650) || (!listing.range && req.energyTypes.includes(listing.energyType));
}

function usedListingPriceDistance(listing) {
  const { center } = getRequirementBudget();
  return listing.priceWan === "" ? 999 : Math.abs(Number(listing.priceWan) - center);
}

function getUsedListingDiscount(listing) {
  if (listing.priceWan === "" || listing.officialPriceWan === "" || !listing.officialPriceWan) return null;
  return Math.max(0, (1 - Number(listing.priceWan) / Number(listing.officialPriceWan)) * 100);
}

function usedEnergyLabel(type) {
  return { ev: "纯电", phev: "插混", erev: "增程", new_energy: "新能源", unknown: "待确认" }[type] || "待确认";
}

function getReleaseModelFacts(release) {
  const battery = firstModelMatch(release, /(\d+(?:\.\d+)?)\s*kwh/i);
  const range = firstModelMatch(release, /续航\s*(\d+)\s*km/i) || firstModelMatch(release, /(\d+)\s*km/i);
  const power = firstModelMatch(release, /(\d+)\s*马力/i);
  const parts = [];
  if (range) parts.push(`${range}km`);
  if (battery) parts.push(`${battery}kWh`);
  if (!parts.length && power) parts.push(`${power}马力`);
  return { energy: parts.join(" / ") };
}

function renderReleaseSourceChips(release) {
  return release.sourceTypes.map((type) => {
    const sourceMeta = {
      hot: ["热门车型", "hot"],
      recent: ["近期发布", "recent"],
      news: ["资讯信源", "info"],
      industry: ["行业线索", "info"],
      watchlist: ["重点车型", "ok"]
    }[type] || [type, "info"];
    const [label, klass] = sourceMeta;
    return `<span class="chip ${klass}">${label}</span>`;
  }).join("");
}

function releaseSourceText(release) {
  const parts = [];
  if (release.sourceTypes.includes("recent")) parts.push(release.releaseDate ? `发布于 ${release.releaseDate}` : "近期发布");
  if (release.sourceTypes.includes("hot")) parts.push(release.hotLabel || release.hotCategory || "热门车型");
  if (release.sourceTypes.includes("news")) parts.push(release.articleTitle ? `资讯线索：${release.articleTitle}` : "懂车帝资讯线索");
  if (release.sourceTypes.includes("industry")) parts.push(release.articleTitle ? `行业线索：${release.articleTitle}` : "行业资讯线索");
  if (release.sourceTypes.includes("watchlist")) parts.push("重点车型池");
  return parts.join(" · ") || "车型信息";
}

function hotSortValue(release) {
  return release.heatRank === "" ? 9999 : Number(release.heatRank);
}

function firstModelMatch(release, pattern) {
  for (const model of release.models || []) {
    const text = [model.groupKey, model.battery, model.range, model.power, model.baseConfig.join(" "), model.highlightsConfig.join(" ")].join(" ");
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function getReleaseRangeKm(release) {
  const values = [];
  for (const model of release.models || []) {
    const text = [
      model.groupKey,
      model.battery,
      model.range,
      model.power,
      ...(model.baseConfig || []),
      ...(model.highlightsConfig || [])
    ].join(" ");
    [...text.matchAll(/(\d{3,4})\s*(?:km|公里)/gi)].forEach((match) => values.push(Number(match[1])));
    if (model.range && Number(model.range)) values.push(Number(model.range));
  }
  const direct = firstModelMatch(release, /续航\s*(\d+)\s*km/i) || firstModelMatch(release, /(\d+)\s*km/i);
  if (direct) values.push(Number(direct));
  return values.filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0] || "";
}

function vehicleHitsProfileDealBreaker(text = "", requirement = state.userRequirement) {
  const req = normalizeUserRequirement(requirement);
  const haystack = String(text);
  const breakers = `${req.dealBreakers || ""} ${req.notes || ""}`;
  if (/智界\s*R7/i.test(haystack) && /智界\s*R7|R7.*外观|不喜欢.*R7/i.test(breakers)) return true;
  if (/阿维塔.*06|06T/i.test(haystack) && /阿维塔|方向盘|小.*方|方.*方向盘/i.test(breakers)) return true;
  if (/事故|重大修复|火烧|泡水/i.test(haystack) && /事故|修复太多|泡水|火烧/i.test(breakers)) return true;
  return false;
}

function formatDimensions(dimensions) {
  if (!dimensions?.length) return "-";
  return `${dimensions.length}/${dimensions.width || "-"}/${dimensions.height || "-"} · ${dimensions.wheelbase || "-"}轴距`;
}

function isNewEnergyRelease(release) {
  if (["ev", "phev", "erev", "hev", "new_energy"].includes(release.energyType)) return true;
  return /纯电|插混|混动|增程|PHEV|EV|DM-i|DM|电动/i.test([
    release.energyLabel,
    release.seriesName,
    ...(release.models || []).map((model) => [model.groupKey, model.baseConfig.join(" "), model.range, model.battery].join(" "))
  ].join(" "));
}

function releaseMatchesUserProfile(release) {
  const req = getSavedRefreshRequirement();
  if (!isNewEnergyRelease(release)) return false;
  if (!energyMatchesRequirement(release.energyType, req)) return false;
  if (newReleasePriceBucket(release) === "expensive") return false;
  if (/微型|小型车|皮卡|跑车/.test(release.carType || "")) return false;
  if (vehicleHitsProfileDealBreaker(`${release.brandName} ${release.seriesName}`, req)) return false;
  const body = newReleaseBodyBucket(release);
  if (req.bodyPreference === "no_mpv" && body === "mpv") return false;
  if (req.bodyPreference === "suv" && body !== "suv") return false;
  if (req.bodyPreference === "sedan" && body !== "sedan") return false;
  const range = getReleaseRangeKm(release);
  if (range && req.minRangeKm && range < Number(req.minRangeKm) - 160) return false;
  return newReleaseFitScore(release) >= 48;
}

function newReleaseBodyBucket(release) {
  const text = `${release.carType} ${release.seriesName}`;
  if (/SUV/i.test(text)) return "suv";
  if (/MPV|六座|七座/.test(text)) return "mpv";
  if (/轿车|轿跑|旅行|Sportback/i.test(text)) return "sedan";
  return "other";
}

function newReleasePriceBucket(release) {
  const budget = getRequirementBudget();
  const min = release.priceMinWan;
  const max = release.priceMaxWan || min;
  if (min === "") return "all";
  if (max >= budget.min - 6 && min <= budget.max + 2) return "budget";
  if (min <= budget.max + 10) return "stretch";
  return "expensive";
}

function newReleaseFitScore(release) {
  const req = getSavedRefreshRequirement();
  const budget = getRequirementBudget(req);
  let score = 18;
  if (isNewEnergyRelease(release)) score += 18;
  const min = release.priceMinWan;
  const max = release.priceMaxWan || min;
  if (min !== "") {
    if (max >= budget.min - 6 && min <= budget.max + 2) score += 24;
    else if (min < budget.min - 6) score += 12;
    else if (min <= budget.max + 10) score += 14;
    else score -= 12;
  }
  const body = newReleaseBodyBucket(release);
  if (req.bodyPreference === "suv_sedan" && (body === "suv" || body === "sedan")) score += 12;
  if (req.bodyPreference === "suv" && body === "suv") score += 14;
  if (req.bodyPreference === "sedan" && body === "sedan") score += 14;
  if (req.bodyPreference === "compact" && release.dimensions?.length && Number(release.dimensions.length) <= 4950) score += 8;
  if (req.bodyPreference === "no_mpv" && body === "mpv") score -= 12;
  else if (body === "mpv") score += 2;
  if (/中大型|大型|行政|六座|七座/.test(`${release.carType} ${release.seriesName}`)) score -= 4;
  const brandText = `${release.brandName} ${release.seriesName}`;
  if (vehicleHitsProfileDealBreaker(brandText, req)) score -= 18;
  if (/理想|蔚来|乐道|极氪|奥迪|小米|智界|问界|阿维塔/i.test(brandText)) score += 10;
  if (/i6|ES6|7X|Q6L|E7X|YU7|L80|R7/i.test(brandText)) score += 8;
  if (req.referenceCar && /理想\s*i6/i.test(req.referenceCar) && /理想\s*i6/i.test(brandText)) score += 10;
  if (energyMatchesRequirement(release.energyType, req)) score += 8;
  else if (req.energyTypes.length) score -= 12;
  const range = getReleaseRangeKm(release);
  if (range >= Number(req.minRangeKm || 650)) score += 8;
  else if (range && range < Number(req.minRangeKm || 650) - 100) score -= 5;
  if (req.priorities.includes("comfort") && release.score.comfort >= 4) score += 4;
  if (req.priorities.includes("interior") && release.score.interior >= 4) score += 4;
  if (req.priorities.includes("appearance") && release.score.appearance >= 4) score += 3;
  if (req.priorities.includes("adas") && /理想|小鹏|华为|问界|智界|阿维塔/i.test(brandText)) score += 4;
  if (req.priorities.includes("cockpit") && /理想|蔚来|小鹏|极氪|小米/i.test(brandText)) score += 4;
  if (/改款|小改款|新增车型|全新车系/.test(release.tags.join(" "))) score += 4;
  if (release.sourceTypes.includes("recent")) score += 4;
  if (release.sourceTypes.includes("hot")) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function newReleaseFitReasons(release) {
  const reasons = [];
  if (release.sourceTypes.includes("hot")) reasons.push(release.hotLabel || "懂车帝热门车型");
  if (release.sourceTypes.includes("recent")) reasons.push(release.releaseDate ? `近期发布：${release.releaseDate}` : "近期发布");
  if (isNewEnergyRelease(release)) reasons.push(release.energyLabel);
  if (newReleasePriceBucket(release) === "budget") {
    const budget = getRequirementBudget();
    reasons.push(`贴近画像预算 ${formatWan(budget.min)}-${formatWan(budget.max)}`);
  }
  if (newReleaseBodyBucket(release) === "suv") reasons.push("SUV形态适合北京通勤和假期高速");
  if (newReleaseBodyBucket(release) === "sedan") reasons.push("轿车/轿跑更贴近两人用车");
  const facts = getReleaseModelFacts(release).energy;
  if (facts) reasons.push(facts);
  if (release.dimensions?.wheelbase) reasons.push(`轴距 ${release.dimensions.wheelbase}mm`);
  if (!reasons.length) reasons.push("需要进一步看配置和试驾");
  return reasons.slice(0, 5);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderDetail() {
  const select = document.querySelector("#detailCarSelect");
  if (!select) return;
  select.innerHTML = state.cars.map((car) => `<option value="${car.id}">${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</option>`).join("");
  if (selectedCarId) select.value = selectedCarId;
  const car = state.cars.find((item) => item.id === selectedCarId);
  const carIndex = getSelectedCarIndex();
  const previousButton = document.querySelector("#prevDetailCar");
  const nextButton = document.querySelector("#nextDetailCar");
  if (previousButton) previousButton.disabled = carIndex <= 0;
  if (nextButton) nextButton.disabled = carIndex < 0 || carIndex >= state.cars.length - 1;
  if (!car) {
    document.querySelector("#detailContextLabel").textContent = "暂无候选";
    document.querySelector("#detailHero").innerHTML = `<div class="muted">暂无候选。</div>`;
    document.querySelector("#detailGallery").innerHTML = "";
    document.querySelector("#decisionReportPreview").innerHTML = "";
    document.querySelector("#redlineGate").innerHTML = "";
    document.querySelector("#detailDecision").innerHTML = "";
    document.querySelector("#qualityPanel").innerHTML = "";
    setQualityButtonState(false);
    return;
  }
  const risk = analyzeCar(car);
  const rec = deriveRecommendation(car);
  const cost = costProfile(car);
  const discount = getDiscountPct(car);
  const kind = carKind(car);
  const progress = getInvestigationProgress(car);
  const riskSummary = riskCompletionSummary(car);
  const workflow = getWorkflowForCar(car);
  const quality = assessCarQuality(car);
  const heroFacts = kind === "new"
    ? [
        ["参考价", formatWan(car.price)],
        ["目标落地", formatWan(car.landing || car.targetPrice)],
        ["续航", formatNumber(car.range, "km")],
        ["版本目标", car.trim || "-"]
      ]
    : [
        ["售价", formatWan(car.price)],
        ["新车参考", formatWan(car.newPrice)],
        ["折价", formatPct(discount)],
        ["目标价", formatWan(car.targetPrice)]
      ];
  document.querySelector("#detailContextLabel").textContent = `${carKindLabel(kind)} · ${car.name}`;

  document.querySelector("#detailHero").innerHTML = `
    <div class="detail-hero">
      <div class="detail-image ${car.image ? "" : "is-empty"}">${car.image ? `<img src="${escapeAttr(car.image)}" alt="${escapeAttr(car.name)}">` : `<span>${escapeHtml(car.name)}</span>`}</div>
      <div class="detail-hero-copy">
        <div class="chip-row tight">
          <span class="chip ${carKindClass(kind)}">${carKindLabel(kind)}</span>
          <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
          <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
          <span class="chip">${stageLabel(car.stage)}</span>
        </div>
        <h2>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</h2>
        <p class="muted">${escapeHtml(car.city || "未知城市")} · ${escapeHtml(car.source || "未知车源")} · ${escapeHtml(car.seller || "未知商家")}</p>
        <div class="hero-facts">
          ${heroFacts.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
        </div>
        <p class="detail-note">${escapeHtml(car.notes || "暂无备注。")}</p>
        ${renderExternalSourceActions(car)}
      </div>
    </div>
  `;

  document.querySelector("#detailGallery").innerHTML = renderVehicleGallery(car);
  document.querySelector("#decisionReportPreview").innerHTML = renderDecisionReportPreview(car, workflow);
  document.querySelector("#redlineGate").innerHTML = renderRedlineGate(car);
  document.querySelector("#detailDecision").innerHTML = `
    <div class="decision-score ${risk.level}">
      <div>
        <span>风险分</span>
        <strong>${risk.score}</strong>
      </div>
      <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
    </div>
    ${renderInvestigationProgress(progress, riskSummary, { compact: true })}
    <div class="decision-row"><span>综合匹配</span><strong>${fitScore(car)}</strong></div>
    <div class="decision-row"><span>质量可信度</span><strong>${qualityLevelLabel(quality.confidenceLevel)} · ${qualityRiskLabel(quality.threeElectricRisk)}</strong></div>
    <div class="decision-row"><span>i6标尺</span><strong>${i6Score(car)}/100</strong></div>
    <div class="decision-row"><span>3年成本</span><strong>${formatWan(cost.year3)}</strong></div>
    <div class="decision-row"><span>月固定成本</span><strong>${formatNumber(cost.monthly, "元")}</strong></div>
    <p class="muted">${escapeHtml(car.nextAction || "补齐关键信息后再推进。")}</p>
  `;

  document.querySelector("#costPanel").innerHTML = renderCostPanel(car);
  document.querySelector("#priceTimeline").innerHTML = renderPriceTimeline(car);
  document.querySelector("#i6Matrix").innerHTML = renderI6Matrix(car);
  document.querySelector("#workflowPanel").innerHTML = renderWorkflowPanel(car, workflow);
  document.querySelector("#investigationSteps").innerHTML = renderInvestigationStepList(car, progress);
  renderEvidenceWall(car);
  document.querySelector("#decisionLog").innerHTML = renderDecisionLog(car);
  document.querySelector("#whyCheap").innerHTML = getRiskItemsForCar(car).map((item) => renderRiskClosureCard(item, car.id)).join("") || `<div class="muted">暂无自动风险项。</div>`;
  document.querySelector("#detailChecklist").innerHTML = getChecklist(car).map((item) => `
    <div class="check-item">
      <div class="check-dot"></div>
      <div>${escapeHtml(item)}</div>
    </div>
  `).join("");
  document.querySelector("#qualityPanel").innerHTML = renderQualityPanel(car);
  setQualityButtonState(qualityAnalysisRunning);
}

function getSelectedCarIndex() {
  return state.cars.findIndex((car) => car.id === selectedCarId);
}

function switchDetailByOffset(offset) {
  const index = getSelectedCarIndex();
  if (index < 0) return;
  const next = state.cars[index + offset];
  if (!next) return;
  selectedCarId = next.id;
  render();
  scrollPageToTop();
}

function renderVehicleGallery(car) {
  const images = getVehicleImages(car);
  if (!images.length) {
    return `
      <div class="panel-head">
        <h2>车辆图片</h2>
        <span class="muted">暂无图片</span>
      </div>
      <div class="vehicle-gallery-empty">暂无车辆图片</div>
    `;
  }
  const [primary, ...thumbs] = images;
  return `
    <div class="panel-head">
      <h2>车辆图片</h2>
      <span class="muted">${images.length} 张</span>
    </div>
    <div class="vehicle-gallery">
      <a class="vehicle-gallery-feature" href="${escapeAttr(primary.src)}" target="_blank" rel="noreferrer" aria-label="${escapeAttr(primary.name)}">
        <img src="${escapeAttr(primary.src)}" alt="${escapeAttr(primary.name)}">
        <span>${escapeHtml(primary.source)}</span>
      </a>
      ${thumbs.length ? `
        <div class="vehicle-gallery-strip">
          ${thumbs.map((image) => `
            <a href="${escapeAttr(image.src)}" target="_blank" rel="noreferrer" aria-label="${escapeAttr(image.name)}">
              <img src="${escapeAttr(image.src)}" alt="${escapeAttr(image.name)}">
              <span>${escapeHtml(image.source)}</span>
            </a>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function getVehicleImages(car) {
  const images = [];
  const seen = new Set();
  const pushImage = (src, name, source) => {
    const safeSrc = normalizeImageUrl(src);
    if (!safeSrc || seen.has(safeSrc)) return;
    seen.add(safeSrc);
    images.push({
      src: safeSrc,
      name: name || car.name || "车辆图片",
      source: source || "车辆图片"
    });
  };

  pushImage(car.image, `${car.name} ${car.trim || ""}`.trim(), "车源主图");
  getCarEvidence(car.id).forEach((item) => {
    (item.attachments || []).forEach((attachment) => {
      pushImage(attachment.dataUrl, attachment.name || item.title, item.title || "信息墙");
    });
    if (isImageUrl(item.url)) {
      pushImage(item.url, item.title || "链接图片", item.title || "信息墙");
    }
  });

  return images.slice(0, 12);
}

function renderExternalSourceActions(car) {
  if (!car.url) return "";
  const webUrl = getExternalSourceUrl(car);
  if (!webUrl) return "";
  const isDongchedi = isDongchediSourceUrl(webUrl);
  return `
    <div class="detail-source-actions">
      <a class="secondary-button" href="${escapeAttr(webUrl)}" target="_blank" rel="noopener noreferrer">外部车源详情</a>
      ${isDongchedi ? `<button class="primary-button" data-open-source-app="${car.id}" type="button">唤起懂车帝详情</button>` : ""}
    </div>
  `;
}

function isDongchediSourceUrl(url = "") {
  return /^https?:\/\/([^/]+\.)?(dongchedi|dongchediapp|dcdapp)\.com\//i.test(url);
}

function getExternalSourceUrl(source) {
  if (!source?.url) return "";
  const safeUrl = normalizeWebUrl(source.url);
  if (!safeUrl) return "";
  if (!isDongchediSourceUrl(safeUrl)) return safeUrl;
  const skuId = getDongchediUsedCarSkuId(source);
  return skuId ? buildDongchediUsedCarDetailUrl(skuId, source.city) : safeUrl;
}

function getDongchediUsedCarSkuId(source) {
  if (!source) return "";
  const direct = source.sourceSkuId || source.skuId || source.sku_id || "";
  if (direct) return String(direct);
  const url = source.url || "";
  try {
    const parsed = new URL(url, window.location.origin);
    const fromQuery = parsed.searchParams.get("sku_id") || parsed.searchParams.get("skuId");
    if (fromQuery) return fromQuery;
  } catch (error) {
    // Keep falling back to regex extraction for older stored PC links.
  }
  return url.match(/\/usedcar\/(\d+)/i)?.[1] || url.match(/[?&]sku_id=(\d+)/i)?.[1] || "";
}

function buildDongchediUsedCarDetailUrl(skuId, city = "北京") {
  if (!skuId) return "";
  const url = new URL("https://m.dcdapp.com/motor/feoffline/usedcar_detail/detail.html");
  url.searchParams.set("_pia_", "1");
  url.searchParams.set("sku_id", String(skuId));
  url.searchParams.set("city_name", city || "北京");
  url.searchParams.set("sh_city_name", city || "北京");
  url.searchParams.set("biz_scene", "sh_car");
  url.searchParams.set("used_car_entry", "newcar_workbench");
  url.searchParams.set("link_source", "newcar_workbench_source_detail");
  return url.toString();
}

function buildDongchediAppDetailUrl(webUrl) {
  if (!webUrl) return "";
  const params = new URLSearchParams({
    url: webUrl,
    hide_bar: "0"
  });
  return `snssdk36://webview?${params.toString()}`;
}

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function openSourceInApp(carId) {
  const car = state.cars.find((item) => item.id === carId);
  const webUrl = getExternalSourceUrl(car);
  if (!webUrl) {
    showToast("这台车还没有外部车源链接。", "warn");
    return;
  }
  if (!isDongchediSourceUrl(webUrl)) {
    window.open(webUrl, "_blank", "noopener");
    return;
  }
  if (!isMobileBrowser()) {
    window.open(webUrl, "_blank", "noopener");
    showToast("当前浏览器不支持唤起 App，已打开懂车帝详情页。", "ok");
    return;
  }
  showToast("正在尝试唤起懂车帝 App，未安装时会打开详情页。", "ok");
  let didHide = false;
  const markHidden = () => {
    if (document.hidden) didHide = true;
  };
  document.addEventListener("visibilitychange", markHidden, { once: true });
  window.location.href = buildDongchediAppDetailUrl(webUrl);
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", markHidden);
    if (!didHide) window.location.href = webUrl;
  }, 1200);
}

function renderCostPanel(car) {
  const cost = costProfile(car);
  const rows = [
    ["车价", cost.base, "成交/报价"],
    ["一次性成本", cost.oneTime, "保险、运输、复检、整备"],
    ["1年总成本", cost.year1, `${formatNumber(cost.monthly, "元/月")}`],
    ["3年总成本", cost.year3, "核心比较口径"],
    ["5年总成本", cost.year5, "长期持有口径"]
  ];
  const max = Math.max(...rows.map((row) => row[1]), 1);
  return `
    <div class="cost-grid">
      ${rows.map(([label, value, hint]) => `
        <div class="cost-row">
          <div>
            <strong>${label}</strong>
            <span>${escapeHtml(hint)}</span>
          </div>
          <div class="cost-bar"><span style="width:${Math.max(6, Math.min(100, value / max * 100))}%"></span></div>
          <div class="cost-value">${formatWan(value)}</div>
        </div>
      `).join("")}
    </div>
    <div class="cost-breakdown">
      <span>保险 ${formatWan(car.costs.insurance)}</span>
      <span>运输 ${formatWan(car.costs.transport)}</span>
      <span>检测 ${formatWan(car.costs.inspection)}</span>
      <span>整备 ${formatWan(car.costs.reconditioning)}</span>
      <span>BaaS ${formatNumber(car.batteryMonthly, "元/月")}</span>
      <span>智驾订阅 ${formatNumber(car.costs.adasMonthly, "元/月")}</span>
    </div>
  `;
}

function renderQualityPanel(car) {
  const quality = assessCarQuality(car);
  const sourceRows = quality.sourceRows;
  const issueRows = qualityIssueDistribution(car, quality);
  return `
    <div class="quality-panel">
      <div class="quality-summary-card ${quality.threeElectricRisk}">
        <div>
          <span>质量可信度</span>
          <strong>${qualityLevelLabel(quality.confidenceLevel)}</strong>
          <p>${escapeHtml(qualitySummaryText(quality))}</p>
        </div>
        <div class="quality-score-box">
          <span>证据完整度</span>
          <strong>${quality.evidenceCompleteness}%</strong>
        </div>
        <div class="quality-score-box">
          <span>三电风险</span>
          <strong>${qualityRiskLabel(quality.threeElectricRisk)}</strong>
        </div>
      </div>
      <div class="quality-source-grid">
        ${sourceRows.map(renderQualitySourceCard).join("")}
      </div>
      ${renderQualityAiSources(quality.profile.sources)}
      <div class="quality-split">
        <div class="quality-block">
          <div class="quality-block-head">
            <h3>三电问题分布</h3>
            <span>${escapeHtml(quality.updatedAt ? `更新 ${formatDateTime(quality.updatedAt)}` : "待补数据")}</span>
          </div>
          <div class="quality-issue-grid">
            ${issueRows.map((item) => `
              <div>
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)}</strong>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="quality-block">
          <div class="quality-block-head">
            <h3>缺口与下一步</h3>
            <span>${quality.missingItems.length ? `${quality.missingItems.length} 项待补` : "证据较完整"}</span>
          </div>
          <div class="quality-gap-list">
            ${(quality.missingItems.length ? quality.missingItems : ["暂无关键缺口"]).slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <ol class="quality-question-list">
            ${quality.questions.slice(0, 5).map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
          </ol>
        </div>
      </div>
      ${quality.warnings.length ? `
        <div class="quality-warning-list">
          ${quality.warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderQualityAiSources(sources = []) {
  const usable = (sources || []).filter((source) => source.url || source.summary).slice(0, 8);
  if (!usable.length) {
    return `
      <div class="quality-ai-note">
        <strong>还没有 AI 公开质量线索</strong>
        <span>点击“AI 检索质量线索”后，会联网检索召回、投诉销量比、三电投诉和车主口碑；SOH/维保/故障码仍需单车检测或上传证明。</span>
      </div>
    `;
  }
  return `
    <div class="quality-ai-sources">
      <div class="quality-block-head">
        <h3>AI 检索线索</h3>
        <span>${usable.length} 条</span>
      </div>
      <div class="quality-ai-source-list">
        ${usable.map((source) => {
          const body = `
            <strong>${escapeHtml(source.label || qualitySourceTypeLabel(source.type))}</strong>
            <span>${escapeHtml(source.summary || source.url || "公开来源")}</span>
          `;
          return source.url
            ? `<a class="quality-ai-source-item" href="${escapeAttr(source.url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
            : `<div class="quality-ai-source-item">${body}</div>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderQualitySourceCard(row) {
  const evidenceState = classifyQualityEvidenceField(row.type, row.value, {
    sourceStatus: row.status,
    sourceUrl: row.url
  });
  const stateClass = qualityEvidenceStateClass(evidenceState.state);
  return `
    <article class="quality-source-card ${stateClass}">
      <div>
        <span class="quality-grade">${escapeHtml(row.grade)}</span>
        <h3>${escapeHtml(row.label)}</h3>
      </div>
      <span class="chip ${stateClass}">${escapeHtml(row.status || evidenceState.label)}</span>
      <p>${escapeHtml(row.summary)}</p>
      ${row.url ? `<a class="quality-source-link" href="${escapeAttr(row.url)}" target="_blank" rel="noopener noreferrer">查看来源</a>` : ""}
      ${row.updatedAt ? `<small>${escapeHtml(formatDateTime(row.updatedAt))}</small>` : ""}
    </article>
  `;
}

function qualitySummaryText(quality) {
  if (quality.threeElectricRisk === "high") return quality.warnings[0] || "三电质量证据缺口较大，先按高风险处理。";
  if (quality.confidenceLevel === "high") return "车系级和单车级证据较完整，可以继续推进但仍需保留原始证明。";
  if (quality.confidenceLevel === "medium") return "已有部分质量证据，关键缺口补齐前不要下定。";
  if (quality.confidenceLevel === "low") return "质量证据不足，容易被价格和体感带偏。";
  return "尚无足够质量数据，先按未知风险处理。";
}

function qualityIssueDistribution(car, quality) {
  const profile = quality.profile;
  return [
    ["动力电池", hasPositiveQualityNumber(profile.batterySoh) ? `SOH ${profile.batterySoh}%` : quality.evidenceSignals.soh.length ? "有 SOH 线索" : "待补 SOH"],
    ["电机/电控", quality.evidenceSignals.repair.length || profile.batteryRepairStatus !== "unknown" ? qualityStatusLabel(profile.batteryRepairStatus) : "待查维修"],
    ["充电/补能", qualityPositiveNumberText(profile.threeElectricComplaintShare, "% 三电投诉", "待查投诉")],
    ["故障码", qualityStatusLabel(profile.troubleCodeStatus)],
    ["维保记录", qualityStatusLabel(profile.maintenanceStatus)],
    ["三电质保", qualityStatusLabel(profile.warrantyStatus)]
  ].map(([label, value]) => ({ label, value }));
}

function buildDecisionReport(car) {
  if (!car) return "";
  const workflow = getWorkflowForCar(car);
  const risk = analyzeCar(car);
  const cost = costProfile(car);
  const riskSummary = riskCompletionSummary(car);
  const progress = getInvestigationProgress(car);
  const quality = assessCarQuality(car);
  const evidence = getCarEvidence(car.id);
  const openRisks = riskSummary.items.filter((item) => !isRiskClosed(item));
  const closedRisks = riskSummary.items.filter(isRiskClosed);
  const doneTasks = workflow.tasks.filter((task) => task.status === "done");
  const openTasks = workflow.tasks.filter((task) => task.status !== "done");
  const lines = [
    `# ${car.name} ${car.trim || ""} 决策报告`.trim(),
    "",
    `生成时间：${new Date().toLocaleString("zh-CN")}`,
    `车源类型：${carKindLabel(carKind(car))}`,
    `当前阶段：${stageLabel(car.stage)}`,
    `推进判断：${workflow.decision.label} - ${workflow.decision.detail}`,
    "",
    "## 1. 核心结论",
    `- 推荐结论：${recommendationLabel(deriveRecommendation(car))}`,
    `- 综合匹配：${fitScore(car)}`,
    `- i6 体感标尺：${i6Score(car)}/100`,
    `- 尽调完成度：${progress.done}/${progress.total} (${progress.percent}%)`,
    `- 风险：${riskLabel(risk.level)} ${risk.score}，待关闭 ${riskSummary.open} 条，高风险 ${riskSummary.highOpen} 条`,
    `- 质量可信度：${qualityLevelLabel(quality.confidenceLevel)}，三电风险：${qualityRiskLabel(quality.threeElectricRisk)}，证据完整度：${quality.evidenceCompleteness}%`,
    car.nextAction ? `- 当前下一步：${car.nextAction}` : "- 当前下一步：按下方任务推进",
    "",
    "## 2. 成本与价格",
    `- 当前报价：${formatWan(car.price)}`,
    `- 目标价：${formatWan(car.targetPrice)}`,
    `- 新车参考价：${formatWan(car.newPrice)}`,
    `- 落地估算：${formatWan(car.landing)}`,
    `- 3年总成本：${formatWan(cost.year3)}`,
    `- 5年总成本：${formatWan(cost.year5)}`,
    `- 月固定成本：${formatNumber(cost.monthly, "元")}`,
    "",
    "## 3. 配置与权益",
    `- 电池：${batteryLabel(car.battery)}${car.batterySize ? ` / ${car.batterySize}kWh` : ""}${car.batteryMonthly ? ` / ${car.batteryMonthly}元/月` : ""}`,
    `- 续航：${formatNumber(car.range, "km")}`,
    `- 智驾/NOP：${nopLabel(car.nop)}`,
    `- 检测报告：${reportLabel(car.report)}`,
    `- 认证状态：${certifiedLabel(car.certified)}`,
    `- 城市/来源：${car.city || "-"} / ${car.source || "-"}`,
    `- 商家：${car.seller || "-"}`,
    "",
    "## 4. 三电与长期质量",
    `- 质量可信度：${qualityLevelLabel(quality.confidenceLevel)}`,
    `- 三电风险：${qualityRiskLabel(quality.threeElectricRisk)}`,
    `- 证据完整度：${quality.evidenceCompleteness}%`,
    `- 投诉销量比：${hasPositiveQualityNumber(quality.profile.complaintSalesRatio) ? quality.profile.complaintSalesRatio : "待补"}`,
    `- 三电投诉占比：${hasPositiveQualityNumber(quality.profile.threeElectricComplaintShare) ? `${quality.profile.threeElectricComplaintShare}%` : "待补"}`,
    `- 召回/缺陷：${hasPositiveQualityNumber(quality.profile.recallCount) ? `${quality.profile.recallCount} 条` : "待查"} ${hasMeaningfulQualityText(quality.profile.recallNotes) ? quality.profile.recallNotes : ""}`.trim(),
    `- SOH：${hasPositiveQualityNumber(quality.profile.batterySoh) ? `${quality.profile.batterySoh}%` : (quality.hasSoh ? "有线索，需确认数值" : "缺失")}`,
    `- 维保/故障码/质保：${qualityStatusLabel(quality.profile.maintenanceStatus)} / ${qualityStatusLabel(quality.profile.troubleCodeStatus)} / ${qualityStatusLabel(quality.profile.warrantyStatus)}`,
    ...(quality.missingItems.length ? quality.missingItems.map((item) => `- 待补：${item}`) : ["- 质量证据暂无关键缺口"]),
    ...(quality.warnings.length ? quality.warnings.map((item) => `- 质量警示：${item}`) : ["- 暂无明确质量警示"]),
    "",
    "## 5. 待办任务",
    ...(openTasks.length ? openTasks.map((task) => `- [ ] ${task.title}：${task.detail}`) : ["- 暂无未完成任务"]),
    "",
    "## 6. 已完成任务",
    ...(doneTasks.length ? doneTasks.map((task) => `- [x] ${task.title}${task.completedAt ? `（${formatDateTime(task.completedAt)}）` : ""}`) : ["- 暂无已完成任务"]),
    "",
    "## 7. 待关闭风险",
    ...(openRisks.length ? openRisks.map((item) => `- ${riskLabel(item.level)}｜${item.title}｜${riskStatusLabel(item.status)}：${item.question || item.detail}`) : ["- 无待关闭风险"]),
    "",
    "## 8. 已闭环风险",
    ...(closedRisks.length ? closedRisks.map((item) => `- ${riskLabel(item.level)}｜${item.title}｜${riskStatusLabel(item.status)}`) : ["- 暂无已闭环风险"]),
    "",
    "## 9. 要问商家的问题",
    ...(workflow.questions.length ? workflow.questions.map((question, index) => `${index + 1}. ${question}`) : ["- 暂无需要追问的问题"]),
    "",
    "## 10. 信息墙证据",
    ...(evidence.length ? evidence.map((item) => `- ${evidenceTypeLabel(item.type)}｜${evidenceStatusLabel(item.status)}｜${item.title}${item.url ? `｜${item.url}` : ""}${item.notes ? `\n  - ${item.notes.replace(/\n/g, "\n  - ")}` : ""}`) : ["- 暂无信息墙证据"]),
    "",
    "## 11. 决策记录",
    ...((car.decisionLog || []).length ? (car.decisionLog || []).slice(0, 18).map((log) => `- ${formatDateTime(log.at)}｜${log.title}${log.detail ? `：${log.detail}` : ""}`) : ["- 暂无决策记录"]),
    "",
    "## 12. 核验清单",
    ...getChecklist(car).map((item) => `- [ ] ${item}`)
  ];
  return lines.join("\n");
}

function renderDecisionReportPreview(car, workflow) {
  const cost = costProfile(car);
  const riskSummary = riskCompletionSummary(car);
  const quality = assessCarQuality(car);
  const doneTasks = workflow.tasks.filter((task) => task.status === "done").length;
  return `
    <div class="report-preview-grid">
      <div><span>推进判断</span><strong>${escapeHtml(workflow.decision.label)}</strong></div>
      <div><span>综合匹配</span><strong>${fitScore(car)}</strong></div>
      <div><span>3年成本</span><strong>${formatWan(cost.year3)}</strong></div>
      <div><span>待关闭风险</span><strong>${riskSummary.open}</strong></div>
      <div><span>质量可信度</span><strong>${escapeHtml(qualityLevelLabel(quality.confidenceLevel))}</strong></div>
      <div><span>任务完成</span><strong>${doneTasks}/${workflow.tasks.length}</strong></div>
      <div><span>信息墙</span><strong>${getCarEvidence(car.id).length} 条</strong></div>
    </div>
    <div class="report-preview-text">
      <strong>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</strong>
      <p>${escapeHtml(workflow.decision.detail)}</p>
    </div>
  `;
}

function getSelectedCar() {
  return state.cars.find((item) => item.id === selectedCarId);
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    textarea.remove();
    return copied;
  }
}

function showCopyFallback(title, text) {
  document.querySelector(".copy-fallback-panel")?.remove();
  const panel = document.createElement("div");
  panel.className = "copy-fallback-panel";
  panel.innerHTML = `
    <div class="copy-fallback-card" role="dialog" aria-modal="false" aria-label="${escapeAttr(title)}">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p class="muted">浏览器拦截了自动复制，文本已自动选中，可以手动复制。</p>
      </div>
      <textarea readonly>${escapeHtml(text)}</textarea>
      <button class="secondary-button" data-close-copy-fallback type="button">关闭</button>
    </div>
  `;
  document.body.appendChild(panel);
  const textarea = panel.querySelector("textarea");
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
}

async function copyDecisionReport() {
  const car = getSelectedCar();
  if (!car) return;
  const content = buildDecisionReport(car);
  if (await copyTextToClipboard(content)) {
    addDecisionLog(car, {
      type: "report",
      title: "复制决策报告",
      detail: "已生成并复制 Markdown 决策报告。",
      level: "info",
      relatedIds: [car.id]
    });
    render();
    showToast("决策报告已复制。", "ok");
  } else {
    showCopyFallback("决策报告", content);
    showToast("复制失败，可以下载报告。", "warn");
  }
}

function downloadDecisionReport() {
  const car = getSelectedCar();
  if (!car) return;
  const content = buildDecisionReport(car);
  const blob = new Blob([content], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFileName(car.name)}-${new Date().toISOString().slice(0, 10)}-decision-report.md`;
  link.click();
  URL.revokeObjectURL(link.href);
  addDecisionLog(car, {
    type: "report",
    title: "下载决策报告",
    detail: "已导出 Markdown 决策报告。",
    level: "info",
    relatedIds: [car.id]
  });
  render();
  showToast("决策报告已下载。", "ok");
}

function refreshQualityAssessment() {
  const car = getSelectedCar();
  if (!car) return;
  car.qualityProfile = normalizeQualityProfile({
    ...(car.qualityProfile || {}),
    updatedAt: new Date().toISOString()
  });
  const quality = assessCarQuality(car);
  addDecisionLog(car, {
    type: "quality",
    title: "刷新质量可信度评估",
    detail: `${qualityLevelLabel(quality.confidenceLevel)} / ${qualityRiskLabel(quality.threeElectricRisk)}，缺口：${quality.missingItems.join("、") || "暂无"}`,
    level: quality.threeElectricRisk === "high" ? "high" : quality.threeElectricRisk === "medium" ? "warn" : "info",
    relatedIds: [car.id]
  });
  render();
  showToast("已按当前证据刷新质量评估。", "ok");
}

async function fetchQualityDataWithAi() {
  if (qualityAnalysisRunning) {
    showToast("正在获取质量数据。", "warn");
    return;
  }
  const car = getSelectedCar();
  if (!car) return;
  qualityAnalysisRunning = true;
  setQualityButtonState(true);
  showToast("正在联网检索车系质量与三电线索。", "ok");
  try {
    const payload = buildQualityGeminiPayload(car);
    let result = null;
    let lastError = "";
    for (const url of getGeminiQualityUrls()) {
      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, AI_ANALYZE_TIMEOUT_MS);
        result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) throw new Error(result.error || `质量线索检索失败：${response.status}`);
        break;
      } catch (error) {
        lastError = error?.message || "质量线索检索失败。";
        result = null;
      }
    }
    if (!result) throw new Error(lastError || "AI 质量线索服务未就绪。");
    applyQualityAnalysisResult(car, result);
    const saved = render();
    showToast(saved ? qualityResultToast(result) : "质量线索已回填，但本机保存失败，请先导出备份。", saved ? "ok" : "danger");
  } catch (error) {
      showToast(formatAiFailureMessage(error, { provider: "Gemini / DeepSeek", nextAction: "请检查质量线索服务，或先上传检测报告和车质网截图作为证据。" }), "danger");
  } finally {
    qualityAnalysisRunning = false;
    setQualityButtonState(false);
  }
}

function getGeminiQualityUrls() {
  const urls = [];
  if (location.protocol === "http:" || location.protocol === "https:") {
    urls.push(GEMINI_QUALITY_URL);
  }
  urls.push(LOCAL_GEMINI_QUALITY_URL);
  return [...new Set(urls)];
}

function buildQualityGeminiPayload(car) {
  return {
    profile: state.userRequirement,
    car: cloneCarForGemini(car),
    qualityAssessment: assessCarQuality(car),
    infoWall: getCarEvidence(car.id).slice(0, 20).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      url: item.url,
      notes: item.notes,
      createdAt: item.createdAt
    })),
    outputRules: {
      usePublicSources: true,
      keepSingleCarEvidenceConservative: true,
      sourceTypes: ["official", "complaint", "study", "reputation", "single"]
    }
  };
}

function applyQualityAnalysisResult(car, result) {
  const before = normalizeCar(car);
  const patch = result.carPatch || {};
  applyCarPatch(car, patch);
  const quality = assessCarQuality(car);
  const sources = car.qualityProfile.sources || [];
  const notes = formatQualityAnalysisNotes(result, quality);
  state.evidence.unshift({
    id: makeId("ev"),
    carId: car.id,
    title: result.sanitizedQualityFacts ? "AI 检索三电与质量线索" : "AI 刷新三电与质量数据",
    type: "quality",
    status: result.analysis?.confidence === "high" && sources.length ? "valid" : "pending",
    url: chooseBestQualityEvidenceUrl(sources),
    notes,
    attachments: [],
    createdAt: new Date().toISOString().slice(0, 10),
    analysisStatus: "applied",
    analysisError: "",
    analysisResult: {
      analysis: result.analysis || null,
      carPatch: patch,
      infoCard: result.infoCard || null,
      analyzedAt: new Date().toISOString(),
      provider: result.provider || ""
    },
    linkedRiskIds: quality.risks.map((risk) => risk.key).filter(Boolean),
    appliedAt: new Date().toISOString()
  });
  recordPriceChanges(before, car, "AI质量数据");
  addDecisionLog(car, {
    type: "quality",
    title: result.sanitizedQualityFacts ? "AI 检索质量与三电线索" : "AI 刷新质量与三电数据",
    detail: `${qualityLevelLabel(quality.confidenceLevel)} / ${qualityRiskLabel(quality.threeElectricRisk)}；来源 ${sources.length} 条；${result.sanitizedQualityFacts ? "事实字段待核验，未直接回填" : result.analysis?.summary || "已回填质量档案"}`,
    level: quality.threeElectricRisk === "high" ? "high" : quality.threeElectricRisk === "medium" ? "warn" : "ok",
    relatedIds: [car.id]
  });
  car.updatedAt = new Date().toISOString();
}

function formatQualityAnalysisNotes(result, quality) {
  const lines = [];
  const provider = aiProviderLabel(result);
  lines.push(`来源：${provider}${result.providerFallbackFrom ? "（Gemini 失败后兜底）" : ""}`);
  if (result.grounding?.sourceCount) lines.push(`联网来源：${result.grounding.sourceCount} 条`);
  if (result.sanitizedQualityFacts) lines.push("可信分层：本次未获得可直接引用的联网 grounding，AI 只保留待核验线索，未写入投诉、召回、SOH、质保等事实字段。");
  if (result.analysis?.summary) lines.push(`结论：${normalizeAiDisplayCopy(result.analysis.summary)}`);
  if (result.analysis?.qualityOpinion) lines.push(`质量口碑：${normalizeAiDisplayCopy(result.analysis.qualityOpinion)}`);
  if (result.analysis?.threeElectricOpinion) lines.push(`三电判断：${normalizeAiDisplayCopy(result.analysis.threeElectricOpinion)}`);
  if (result.analysis?.singleCarEvidenceOpinion) lines.push(`单车证据：${normalizeAiDisplayCopy(result.analysis.singleCarEvidenceOpinion)}`);
  lines.push(`当前质量可信度：${qualityLevelLabel(quality.confidenceLevel)}；三电风险：${qualityRiskLabel(quality.threeElectricRisk)}；证据完整度：${quality.evidenceCompleteness}%`);
  if (quality.missingItems.length) lines.push(`仍需补证：${quality.missingItems.join("、")}`);
  const sources = quality.profile.sources || [];
  if (sources.length) {
    lines.push("公开来源：");
    sources.slice(0, 8).forEach((source, index) => {
      lines.push(`${index + 1}. ${source.label || qualitySourceTypeLabel(source.type)} - ${source.url || source.summary || "无链接"}`);
    });
  }
  if (Array.isArray(result.analysis?.questions) && result.analysis.questions.length) {
    lines.push("下一步问题：");
    result.analysis.questions.slice(0, 6).forEach((question) => lines.push(`- ${question}`));
  }
  return lines.join("\n");
}

function chooseBestQualityEvidenceUrl(sources = []) {
  return (sources || []).find((source) => typeof source?.url === "string" && source.url.trim())?.url?.trim() || "";
}

function qualityResultToast(result = {}) {
  if (result.sanitizedQualityFacts || result.sourceFallback) return `${aiProviderLabel(result)} 已生成待核验质量线索。`;
  return `${aiProviderLabel(result)} 已刷新质量数据。`;
}

function setQualityButtonState(isRunning) {
  const button = document.querySelector("#fetchQualityData");
  if (!button) return;
  button.disabled = isRunning || !selectedCarId;
  button.textContent = isRunning ? "AI 检索中..." : "AI 检索质量线索";
}

async function copyQualityQuestions() {
  const car = getSelectedCar();
  if (!car) return;
  const quality = assessCarQuality(car);
  const questions = [
    `# ${car.name} ${car.trim || ""} 三电质量核验问题`.trim(),
    "",
    `质量可信度：${qualityLevelLabel(quality.confidenceLevel)}，三电风险：${qualityRiskLabel(quality.threeElectricRisk)}`,
    "",
    ...quality.questions.map((question, index) => `${index + 1}. ${question}`)
  ].join("\n");
  if (await copyTextToClipboard(questions)) {
    addDecisionLog(car, {
      type: "quality",
      title: "复制三电质量问商家清单",
      detail: `${quality.questions.length} 个问题`,
      level: "info",
      relatedIds: [car.id]
    });
    render();
    showToast("三电质量问题清单已复制。", "ok");
  } else {
    showCopyFallback("三电质量问商家清单", questions);
    showToast("复制失败，可以从质量模块手动选中问题。", "warn");
  }
}

function safeFileName(value) {
  return String(value || "newcar").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
}

function priceFieldLabel(field) {
  return {
    price: "报价",
    targetPrice: "目标价",
    landing: "落地价",
    newPrice: "新车参考价"
  }[field] || "价格";
}

function renderPriceTimeline(car) {
  const events = [...(car.priceEvents || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const head = `
    <div class="price-snapshot-grid">
      <div><span>当前报价</span><strong>${formatWan(car.price)}</strong></div>
      <div><span>目标价</span><strong>${formatWan(car.targetPrice)}</strong></div>
      <div><span>落地估算</span><strong>${formatWan(car.landing)}</strong></div>
      <div><span>新车参考</span><strong>${formatWan(car.newPrice)}</strong></div>
    </div>
  `;
  if (!events.length) {
    return `
      ${head}
      <div class="timeline-empty">暂无价格记录。编辑候选保存价格变动，或点击“记录当前报价”。</div>
    `;
  }
  return `
    ${head}
    <div class="price-event-list">
      ${events.slice(0, 8).map((event) => `
        <div class="price-event">
          <div>
            <strong>${escapeHtml(priceFieldLabel(event.field))} ${formatWan(event.price)}</strong>
            <span>${escapeHtml(event.note || event.source || "价格记录")}</span>
          </div>
          <div>
            <span>${escapeHtml(event.date)}</span>
            ${event.previousPrice !== "" ? `<small>${formatWan(event.previousPrice)} → ${formatWan(event.price)}</small>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWorkflowPanel(car, workflow) {
  return `
    <div class="workflow-panel">
      <div class="workflow-decision ${workflow.decision.level}">
        <span>当前推进判断</span>
        <strong>${escapeHtml(workflow.decision.label)}</strong>
        <p>${escapeHtml(workflow.decision.detail)}</p>
      </div>
      ${workflow.blockers.length ? `
        <div class="workflow-blockers">
          ${workflow.blockers.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      ` : ""}
      <div class="workflow-section">
        <div class="workflow-section-head">
          <h3>下一步任务</h3>
        </div>
        <div class="workflow-task-list">
          ${workflow.tasks.map((task) => `
            <div class="workflow-task ${task.level} ${task.status === "done" ? "done" : ""}">
              <div class="workflow-task-top">
                <strong>${escapeHtml(task.title)}</strong>
                <button class="mini-button" data-workflow-task-toggle="${escapeAttr(task.id)}" data-workflow-car="${escapeAttr(car.id)}" type="button">${task.status === "done" ? "恢复" : "完成"}</button>
              </div>
              <span>${escapeHtml(task.detail)}</span>
              ${task.completedAt ? `<small>完成于 ${formatDateTime(task.completedAt)}</small>` : ""}
              ${renderWorkflowTaskEvidencePicker(car, task)}
            </div>
          `).join("") || `<div class="muted">暂无下一步任务。</div>`}
        </div>
      </div>
      <div class="workflow-section">
        <div class="workflow-section-head">
          <h3>要问商家的问题</h3>
          <button class="mini-button" data-copy-workflow-questions="${escapeAttr(car.id)}" type="button">复制</button>
        </div>
        <div class="workflow-question-list">
          ${workflow.questions.map((question, index) => `
            <div><span>${index + 1}</span><p>${escapeHtml(question)}</p></div>
          `).join("") || `<div class="muted">暂无需要追问的问题。</div>`}
        </div>
      </div>
      ${workflow.nextStages.length ? `
        <div class="workflow-stage-actions">
          ${workflow.nextStages.map(([stage, label]) => `
            <button type="button" data-workflow-stage="${escapeAttr(stage)}" data-workflow-car="${escapeAttr(car.id)}">${escapeHtml(label)}</button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderWorkflowTaskEvidencePicker(car, task) {
  const evidence = getCarEvidence(car.id).slice(0, 4);
  if (!evidence.length) return `<div class="workflow-task-evidence empty">先在信息墙补一条证据，再关联到任务。</div>`;
  const linked = new Set(task.evidenceIds || []);
  return `
    <div class="workflow-task-evidence">
      <span>关联证据</span>
      <div>
        ${evidence.map((item) => `
          <button class="${linked.has(item.id) ? "linked" : ""}" data-workflow-task-evidence="${escapeAttr(task.id)}" data-workflow-car="${escapeAttr(car.id)}" data-evidence-id="${escapeAttr(item.id)}" type="button">
            ${linked.has(item.id) ? "已关联" : "关联"} · ${escapeHtml(item.title)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDecisionLog(car) {
  const logs = car.decisionLog || [];
  if (!logs.length) {
    return `<div class="timeline-empty">暂无决策记录。完成任务、推进阶段、应用 AI 分析或处理风险后会自动记录。</div>`;
  }
  return `
    <div class="decision-log-list">
      ${logs.slice(0, 18).map((log) => `
        <div class="decision-log-item ${log.level}">
          <div class="decision-log-time">${escapeHtml(formatDateTime(log.at))}</div>
          <div>
            <strong>${escapeHtml(log.title)}</strong>
            ${log.detail ? `<p>${escapeHtml(log.detail)}</p>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderInvestigationStepList(car, progress) {
  return `
    <div class="investigation-step-list">
      ${progress.items.map((step) => `
        <button class="investigation-step ${step.done ? "done" : ""}" data-investigation-car="${escapeAttr(car.id)}" data-investigation-step="${escapeAttr(step.id)}" type="button">
          <span class="step-check">${step.done ? "✓" : ""}</span>
          <div>
            <strong>${escapeHtml(step.label)}</strong>
            <small>${escapeHtml(step.reason || step.hint)}</small>
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function renderI6Matrix(car) {
  const rows = [
    ["前排座椅", car.experience.seat, "座椅支撑、通风、按摩、腿托"],
    ["静谧性", car.experience.nvh, "低速胎噪、高速风噪、电机声"],
    ["底盘滤震", car.experience.chassis, "井盖、减速带、连续破损路"],
    ["车机", car.experience.cockpit, "语音、导航、空调、座椅和媒体"],
    ["智驾", car.experience.adas, "高速 NOA、变道、接管频率"],
    ["高速稳定", car.experience.highway, "120km/h 稳定性和信心"],
    ["外观接受度", car.experience.exterior, "大气耐看、不浮夸"],
    ["内饰高级感", car.experience.interior, "用料、设计、耐看程度"]
  ];
  return `
    <div class="table-wrap compact-table">
      <table class="matrix-table">
        <thead>
          <tr><th>维度</th><th>评分</th><th>相对 i6</th><th>核验提示</th></tr>
        </thead>
        <tbody>
          ${rows.map(([label, score, hint]) => `
            <tr>
              <td>${label}</td>
              <td><strong>${score}/10</strong></td>
              <td>${score >= 9 ? "优于/接近 i6" : score >= 7 ? "接近但需试驾确认" : "弱于 i6"}</td>
              <td class="muted">${hint}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderEvidenceWall(car) {
  const evidence = getCarEvidence(car.id);
  document.querySelector("#evidenceWall").innerHTML = evidence.map((item) => `
    <article class="evidence-card ${item.status}">
      <div>
        <div class="panel-head compact-head">
          <strong>${escapeHtml(item.title)}</strong>
          <div class="evidence-actions">
            <button class="mini-button" data-analyze-evidence="${item.id}" type="button" ${item.analysisStatus === "running" ? "disabled" : ""}>${item.analysisStatus === "running" ? "分析中" : "重新分析"}</button>
            ${item.analysisStatus === "ready" ? `<button class="mini-button primary-mini" data-apply-evidence-analysis="${item.id}" type="button">应用回填</button>` : ""}
            <button class="mini-button" data-delete-evidence="${item.id}" type="button">删除</button>
          </div>
        </div>
        <div class="chip-row tight">
          <span class="chip">${evidenceTypeLabel(item.type)}</span>
          ${item.status && item.status !== "valid" ? `<span class="chip ${item.status === "conflict" ? "danger" : "warn"}">${evidenceStatusLabel(item.status)}</span>` : ""}
          <span class="chip ${infoAnalysisStatusClass(item.analysisStatus)}">${infoAnalysisStatusLabel(item.analysisStatus)}</span>
          ${item.attachments?.length ? `<span class="chip info">${item.attachments.length} 张图</span>` : ""}
        </div>
        ${renderInfoAttachments(item)}
        <p class="muted info-note">${escapeHtml(item.notes || "暂无说明。")}</p>
        ${renderInfoAnalysisPreview(item)}
        ${renderEvidenceRiskLinks(item, car)}
      </div>
      <div class="evidence-foot">
        <span>${escapeHtml(item.createdAt || "")}</span>
        ${item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">打开</a>` : ""}
      </div>
    </article>
  `).join("") || `<div class="muted">还没有信息。可以直接写一段判断，或上传车源截图、聊天截图、检测报告照片。</div>`;
}

function renderEvidenceRiskLinks(item, car) {
  const risks = getRiskItemsForCar(car).filter((risk) => !isRiskClosed(risk)).slice(0, 5);
  if (!risks.length) return "";
  const linked = new Set(item.linkedRiskIds || []);
  return `
    <div class="evidence-risk-links">
      <span>关联风险</span>
      <div>
        ${risks.map((risk) => {
          const isLinked = linked.has(risk.key) || risk.evidenceIds?.includes(item.id);
          return `
            <button class="${isLinked ? "linked" : ""}" data-evidence-risk="${escapeAttr(item.id)}" data-risk-key="${escapeAttr(risk.key)}" type="button">
              ${isLinked ? "已关联" : "关联"} · ${escapeHtml(risk.title)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderInfoAttachments(item) {
  const attachments = item.attachments || [];
  const safeLinkedImage = isImageUrl(item.url) ? normalizeImageUrl(item.url) : "";
  const linkedImage = safeLinkedImage ? [{ id: "url", name: "链接图片", dataUrl: safeLinkedImage }] : [];
  const images = [...attachments, ...linkedImage];
  if (!images.length) return "";
  return `
    <div class="info-attachments">
      ${images.map((image) => `
        <a href="${escapeAttr(image.dataUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeAttr(image.name)}">
          <img src="${escapeAttr(image.dataUrl)}" alt="${escapeAttr(image.name)}">
        </a>
      `).join("")}
    </div>
  `;
}

function renderInfoAnalysisPreview(item) {
  if (item.analysisStatus === "failed" && item.analysisError) {
    return `<div class="info-analysis-preview danger">${escapeHtml(item.analysisError)}</div>`;
  }
  const summary = item.analysisResult?.analysis?.summary || item.analysisResult?.summary || "";
  const patchFields = item.analysisResult?.carPatch ? Object.keys(item.analysisResult.carPatch).filter((key) => !isBlankValue(item.analysisResult.carPatch[key])) : [];
  const infoCard = item.analysisResult?.infoCard || null;
  if (!summary && !patchFields.length && !infoCard) return "";
  return `
    <div class="info-analysis-preview ${item.analysisStatus === "ready" ? "ready" : ""}">
      ${item.analysisResult?.imageAnalysisDowngraded ? `<p class="analysis-warning">图片未被本次兜底模型直接读取，请补充文字摘要后再分析。</p>` : ""}
      ${renderInfoAnalysisSections(item, { summary, patchFields, infoCard })}
      ${item.analysisStatus === "ready" ? `<small>请确认后再应用回填，系统不会自动覆盖候选信息。</small>` : ""}
    </div>
  `;
}

function renderInfoAnalysisSections(item, context = {}) {
  const result = item.analysisResult || {};
  const analysis = result.analysis || {};
  const carPatch = result.carPatch || {};
  const patchFields = context.patchFields || Object.keys(carPatch).filter((key) => !isBlankValue(carPatch[key]));
  const infoCard = context.infoCard || result.infoCard || null;
  const summary = context.summary || analysis.summary || result.summary || "";
  const factItems = unique([
    summary,
    infoCard?.title ? `信息标题：${String(infoCard.title).slice(0, 42)}` : "",
    infoCard?.notes ? `信息备注：${String(infoCard.notes).slice(0, 60)}` : "",
    result.provider ? `分析来源：${aiProviderLabel(result)}${result.providerFallbackFrom ? "（备用模型）" : ""}` : ""
  ]).filter(Boolean);
  const patchItems = patchFields.slice(0, 8).map((field) => `${carPatchFieldLabel(field)}${formatPatchValue(carPatch[field])}`);
  const riskItems = unique([
    analysis.riskLevel ? `风险等级：${riskLabel(analysis.riskLevel)}` : "",
    analysis.confidence ? `置信度：${analysis.confidence}` : "",
    infoCard?.status === "conflict" ? "信息卡状态：有冲突" : "",
    result.imageAnalysisDowngraded ? "截图/照片未被兜底模型直接读取，需要补充文字摘要。" : ""
  ]).filter(Boolean);
  const questionItems = normalizeStringArray(analysis.questions).slice(0, 4);
  const sections = [
    { title: "识别事实", items: factItems, empty: "暂无可识别事实" },
    { title: "待确认回填", items: patchItems, empty: "暂无字段回填" },
    { title: "发现风险", items: riskItems, empty: "暂无新增风险" },
    { title: "下一步问题", items: questionItems, empty: "暂无新增问题" }
  ];
  return `
    <div class="info-analysis-sections">
      ${sections.map((section) => `
        <section class="info-analysis-section ${section.items.length ? "" : "empty"}">
          <h4>${escapeHtml(section.title)}</h4>
          <ul>
            ${(section.items.length ? section.items : [section.empty]).map((text) => `<li>${escapeHtml(text)}</li>`).join("")}
          </ul>
        </section>
      `).join("")}
    </div>
  `;
}

function carPatchFieldLabel(field) {
  return {
    name: "车型",
    trim: "版本",
    url: "链接",
    plateDate: "上牌时间",
    city: "城市",
    source: "来源",
    seller: "商家",
    exterior: "外观",
    interior: "内饰",
    options: "选装",
    issues: "已知问题",
    rightsNotes: "权益备注",
    sellerNotes: "商家背调",
    nextAction: "下一步",
    notes: "备注",
    price: "报价",
    newPrice: "新车参考价",
    targetPrice: "目标价",
    landing: "落地价",
    batteryMonthly: "电池月租",
    batterySize: "电池容量",
    range: "续航",
    mileage: "里程",
    transfers: "过户",
    qualityProfile: "质量档案"
  }[field] || field;
}

function formatPatchValue(value) {
  if (typeof value === "object" && value !== null) return `：${Object.keys(value).length} 项更新`;
  return `：${String(value).slice(0, 36)}`;
}

function isImageUrl(url) {
  const safeUrl = normalizeImageUrl(url);
  if (!safeUrl) return false;
  if (/^data:image\//i.test(safeUrl)) return true;
  try {
    return /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(new URL(safeUrl).pathname);
  } catch {
    return false;
  }
}

function renderRiskCard(risk) {
  return `
    <article class="risk-card ${risk.level}">
      <div class="chip-row tight"><span class="chip ${risk.level}">${riskLabel(risk.level)}</span></div>
      <h3>${escapeHtml(risk.title)}</h3>
      <p class="muted">${escapeHtml(risk.detail)}</p>
      <p class="risk-question">${escapeHtml(risk.question || "")}</p>
    </article>
  `;
}

function renderRiskClosureCard(risk, carId) {
  const linkedCount = risk.evidenceIds?.filter((id) => state.evidence.some((item) => item.id === id)).length || 0;
  return `
    <article class="risk-card risk-closure-card ${risk.level} ${isRiskClosed(risk) ? "closed" : ""}">
      <div class="risk-closure-top">
        <span class="chip ${risk.level}">${riskLabel(risk.level)}</span>
        <span class="chip ${riskStatusClass(risk.status)}">${riskStatusLabel(risk.status)}</span>
      </div>
      <h3>${escapeHtml(risk.title)}</h3>
      <p class="muted">${escapeHtml(risk.detail)}</p>
      <p class="risk-question">${escapeHtml(risk.question || "")}</p>
      <div class="risk-closure-meta">
        <span>${linkedCount ? `${linkedCount} 条信息关联` : "未关联信息"}</span>
        ${risk.updatedAt ? `<span>${formatDateTime(risk.updatedAt)}</span>` : ""}
      </div>
      <div class="risk-status-actions">
        <button type="button" data-risk-car="${escapeAttr(carId)}" data-risk-key="${escapeAttr(risk.key)}" data-risk-status="confirmed">证实</button>
        <button type="button" data-risk-car="${escapeAttr(carId)}" data-risk-key="${escapeAttr(risk.key)}" data-risk-status="cleared">排除</button>
        <button type="button" data-risk-car="${escapeAttr(carId)}" data-risk-key="${escapeAttr(risk.key)}" data-risk-status="contracted">写入合同</button>
        <button type="button" data-risk-car="${escapeAttr(carId)}" data-risk-key="${escapeAttr(risk.key)}" data-risk-status="accepted">接受</button>
      </div>
    </article>
  `;
}

function renderCompare() {
  const cars = state.cars.filter((car) => selectedCompare.has(car.id));
  document.querySelector("#compareHint").textContent = `已选 ${cars.length} 台`;
  if (!cars.length) {
    document.querySelector("#compareTableWrap").innerHTML = `<div class="muted">在车库中加入对比。</div>`;
    return;
  }
  const rows = [
    ["推荐结论", (car) => recommendationLabel(deriveRecommendation(car))],
    ["售价", (car) => formatWan(car.price)],
    ["目标价", (car) => formatWan(car.targetPrice)],
    ["新车同配置", (car) => formatWan(car.newPrice)],
    ["折让", (car) => formatPct(getDiscountPct(car))],
    ["3年成本", (car) => formatWan(costProfile(car).year3)],
    ["5年成本", (car) => formatWan(costProfile(car).year5)],
    ["月固定成本", (car) => formatNumber(costProfile(car).monthly, "元")],
    ["i6体感", (car) => `${i6Score(car)}/100`],
    ["前排/静谧/底盘", (car) => `${car.experience.seat}/${car.experience.nvh}/${car.experience.chassis}`],
    ["车机/智驾", (car) => `${car.experience.cockpit}/${car.experience.adas}`],
    ["电池", (car) => `${batteryLabel(car.battery)}${car.batteryMonthly ? ` / ${car.batteryMonthly}元月` : ""}`],
    ["续航", (car) => formatNumber(car.range, "km")],
    ["质量可信度", (car) => {
      const quality = assessCarQuality(car);
      return `${qualityLevelLabel(quality.confidenceLevel)} / ${quality.evidenceCompleteness}%`;
    }],
    ["三电风险", (car) => qualityRiskLabel(assessCarQuality(car).threeElectricRisk)],
    ["SOH/维保/质保", (car) => {
      const quality = assessCarQuality(car);
      const profile = quality.profile;
      return [
        hasPositiveQualityNumber(profile.batterySoh) ? `SOH ${profile.batterySoh}%` : quality.hasSoh ? "SOH有线索" : "SOH缺失",
        qualityStatusLabel(profile.maintenanceStatus),
        qualityStatusLabel(profile.warrantyStatus)
      ].join(" · ");
    }],
    ["投诉/召回", (car) => {
      const profile = assessCarQuality(car).profile;
      return [
        hasPositiveQualityNumber(profile.complaintSalesRatio) ? `投诉销量比 ${profile.complaintSalesRatio}` : "投诉待补",
        qualityPositiveNumberText(profile.recallCount, " 条召回", "召回待查")
      ].join(" · ");
    }],
    ["里程", (car) => formatNumber(car.mileage, "万km")],
    ["过户", (car) => formatNumber(car.transfers, "次")],
    ["车源", (car) => `${car.city || "-"} · ${car.source || "-"}`],
    ["NOP/智驾", (car) => nopLabel(car.nop)],
    ["检测", (car) => reportLabel(car.report)],
    ["风险", (car) => `${riskLabel(analyzeCar(car).level)} ${analyzeCar(car).score}`],
    ["下一步", (car) => car.nextAction || "-"]
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
    const avg = Math.round((drive.seat + drive.nvh + drive.chassis + drive.cockpit + drive.adas + drive.highway) / 6);
    return `
      <article class="drive-card">
        <div class="panel-head compact-head">
          <h3>${escapeHtml(car ? car.name : "已删除车辆")}</h3>
          <span class="chip ${avg >= 8 ? "ok" : avg >= 7 ? "warn" : "danger"}">${avg}/10 · ${relativeLabel(drive.relative)}</span>
        </div>
        <div class="muted">${escapeHtml(drive.date || "-")} · ${escapeHtml(drive.place || "-")}</div>
        <div class="chip-row">
          <span class="chip">座椅 ${drive.seat}</span>
          <span class="chip">静谧 ${drive.nvh}</span>
          <span class="chip">底盘 ${drive.chassis}</span>
          <span class="chip">车机 ${drive.cockpit}</span>
          <span class="chip">智驾 ${drive.adas}</span>
          <span class="chip">高速 ${drive.highway}</span>
        </div>
        <p class="drive-notes">${escapeHtml(drive.notes || "")}</p>
      </article>
    `;
  }).join("") || `<div class="muted">暂无试驾记录。</div>`;
}

function renderRisks() {
  const select = document.querySelector("#riskCarSelect");
  const analyzeButton = document.querySelector("#analyzeRiskCar");
  const current = select.value || selectedCarId || state.cars[0]?.id;
  select.innerHTML = state.cars.map((car) => `<option value="${car.id}">${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</option>`).join("");
  if (current && state.cars.some((car) => car.id === current)) select.value = current;
  const car = state.cars.find((item) => item.id === select.value) || state.cars[0];
  if (!car) {
    document.querySelector("#riskDetail").innerHTML = `<div class="muted">暂无车辆。</div>`;
    document.querySelector("#checklist").innerHTML = "";
    if (analyzeButton) analyzeButton.disabled = true;
    return;
  }
  if (analyzeButton) analyzeButton.disabled = geminiAnalysisRunning;
  const result = analyzeCar(car);
  const riskSummary = riskCompletionSummary(car);
  document.querySelector("#riskDetail").innerHTML = `
    <div class="risk-summary">
      <div class="risk-dial ${result.level}">${result.score}</div>
      <div>
        <h3>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</h3>
        <div class="muted">${escapeHtml(car.seller || "-")} · ${escapeHtml(car.city || "-")}</div>
        <div class="chip-row">
          <span class="chip ${result.level}">${riskLabel(result.level)}</span>
          <span class="chip ${riskSummary.open ? "warn" : "ok"}">${openRiskSummaryText(car)}</span>
          <span class="chip">${batteryLabel(car.battery)}</span>
          <span class="chip">${nopLabel(car.nop)}</span>
          <span class="chip">${reportLabel(car.report)}</span>
        </div>
      </div>
    </div>
    <div class="risk-list">
      ${riskSummary.items.map((item) => renderRiskClosureCard(item, car.id)).join("") || `<div class="muted">暂无自动风险项。</div>`}
    </div>
  `;
  document.querySelector("#checklist").innerHTML = getChecklist(car).map((item) => `
    <div class="check-item">
      <div class="check-dot"></div>
      <div>${escapeHtml(item)}</div>
    </div>
  `).join("");
}

function analyzeRiskCarWithGemini() {
  const carId = document.querySelector("#riskCarSelect")?.value || selectedCarId;
  if (!carId || !state.cars.some((car) => car.id === carId)) {
    showToast("请先选择一台车源。", "warn");
    return;
  }
  selectedCarId = carId;
  activeView = "risks";
  analyzeCurrentCarWithGemini({ auto: false });
}

function updateRiskStatus(carId, key, status) {
  if (!RISK_STATUS_OPTIONS.includes(status)) return;
  const car = state.cars.find((item) => item.id === carId);
  if (!car) return;
  const nextItems = getRiskItemsForCar(car);
  const target = nextItems.find((item) => item.key === key);
  if (!target) return;
  target.status = status;
  target.updatedAt = new Date().toISOString();
  persistRiskItems(car, nextItems);
  car.updatedAt = new Date().toISOString();
  addDecisionLog(car, {
    type: "risk",
    title: `风险标记为${riskStatusLabel(status)}：${target.title}`,
    detail: target.question || target.detail,
    level: status === "cleared" || status === "contracted" ? "ok" : "warn",
    relatedIds: [key]
  });
  render();
  showToast(`风险已标记为：${riskStatusLabel(status)}。`, status === "cleared" || status === "contracted" ? "ok" : "warn");
}

function toggleEvidenceRiskLink(evidenceId, riskKey) {
  const item = state.evidence.find((evidence) => evidence.id === evidenceId);
  if (!item) return;
  const car = state.cars.find((candidate) => candidate.id === item.carId);
  if (!car) return;
  const risks = getRiskItemsForCar(car);
  const risk = risks.find((entry) => entry.key === riskKey);
  if (!risk) return;
  const evidenceLinks = new Set(item.linkedRiskIds || []);
  const riskLinks = new Set(risk.evidenceIds || []);
  const isLinked = evidenceLinks.has(riskKey) || riskLinks.has(evidenceId);
  if (isLinked) {
    evidenceLinks.delete(riskKey);
    riskLinks.delete(evidenceId);
  } else {
    evidenceLinks.add(riskKey);
    riskLinks.add(evidenceId);
  }
  item.linkedRiskIds = [...evidenceLinks];
  risk.evidenceIds = [...riskLinks];
  risk.updatedAt = new Date().toISOString();
  persistRiskItems(car, risks);
  car.updatedAt = risk.updatedAt;
  if (!isLinked) {
    addDecisionLog(car, {
      type: "risk-evidence",
      title: `风险关联信息：${risk.title}`,
      detail: item.title,
      level: "info",
      relatedIds: [risk.key, item.id]
    });
  }
  render();
  showToast(isLinked ? "已取消信息与风险的关联。" : "已关联信息与风险。", isLinked ? "warn" : "ok");
}

function advanceWorkflowStage(carId, nextStage) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car || !["watching", "contacted", "waiting-docs", "test-drive", "negotiating", "recheck", "rejected", "purchased"].includes(nextStage)) return;
  if (nextStage === "rejected") {
    const reason = window.prompt("写一下排除原因，后续复盘会更清楚：", car.issues || "");
    if (reason === null) return;
    if (reason.trim()) {
      car.issues = car.issues ? `${car.issues}\n排除原因：${reason.trim()}` : `排除原因：${reason.trim()}`;
      car.recommendation = "reject";
    }
  }
  car.stage = nextStage;
  car.investigation = normalizeInvestigation(car.investigation, car);
  car.investigation.phase = nextStage;
  car.investigation.lastReviewedAt = new Date().toISOString();
  car.updatedAt = new Date().toISOString();
  addDecisionLog(car, {
    type: "stage",
    title: `阶段推进到：${stageLabel(nextStage)}`,
    detail: nextStage === "rejected" ? "已排除，保留原因用于复盘。" : "工作流阶段已更新。",
    level: nextStage === "rejected" ? "warn" : "ok",
    relatedIds: [nextStage]
  });
  render();
  showToast(`已推进到：${stageLabel(nextStage)}。`, nextStage === "rejected" ? "warn" : "ok");
}

async function copyWorkflowQuestions(carId) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car) return;
  const workflow = getWorkflowForCar(car);
  const text = [
    `${car.name} ${car.trim || ""} 要问的问题：`,
    ...workflow.questions.map((question, index) => `${index + 1}. ${question}`)
  ].join("\n");
  if (await copyTextToClipboard(text)) {
    showToast("商家问题已复制。", "ok");
  } else {
    showCopyFallback("商家问题清单", text);
    showToast("复制失败，可以手动选中问题。", "warn");
  }
}

function analyzeDashboardBestWithGemini() {
  const best = [...state.cars].sort((a, b) => fitScore(b) - fitScore(a))[0];
  if (!best) {
    showToast("请先添加一台车源。", "warn");
    return;
  }
  selectedCarId = best.id;
  activeView = "dashboard";
  analyzeCurrentCarWithGemini({ auto: false });
}

function renderSellers() {
  const sellers = groupSellers();
  document.querySelector("#sellerGrid").innerHTML = sellers.map((seller) => {
    const avgRisk = seller.cars.length ? Math.round(seller.cars.reduce((sum, car) => sum + analyzeCar(car).score, 0) / seller.cars.length) : 0;
    const level = riskLevelFromScore(avgRisk);
    return `
      <article class="seller-card">
        <div class="panel-head compact-head">
          <div>
            <h3>${escapeHtml(seller.name)}</h3>
            <div class="muted">${escapeHtml(seller.type)} · ${seller.cars.length} 台车源</div>
          </div>
          <span class="chip ${level}">均值 ${avgRisk}</span>
        </div>
        <div class="seller-cars">
          ${seller.cars.map((car) => `
            <button data-detail="${car.id}" type="button">
              <strong>${escapeHtml(car.name)}</strong>
              <span>${formatWan(car.price)} · ${recommendationLabel(deriveRecommendation(car))}</span>
            </button>
          `).join("")}
        </div>
        <p class="muted">${escapeHtml(seller.notes || "暂无背调备注。")}</p>
      </article>
    `;
  }).join("") || `<div class="muted">暂无商家。</div>`;
}

function renderReport() {
  const summary = document.querySelector("#reportSummary");
  const redlines = document.querySelector("#reportRedlines");
  if (!summary || !redlines) return;
  const car = state.cars.find((item) => item.id === selectedCarId) || state.cars[0];
  if (!car) {
    summary.innerHTML = `<div class="muted">暂无候选，先从发现页或手动新增一台车。</div>`;
    redlines.innerHTML = "";
    return;
  }
  const workflow = getWorkflowForCar(car);
  const quality = assessCarQuality(car);
  const openRedlines = getOpenRedlineItems(car);
  const conclusion = openRedlines.length
    ? "可继续谈，但暂不建议下订"
    : workflow.decision.label;
  summary.innerHTML = `
    <div class="report-hero ${openRedlines.length ? "blocked" : "ok"}">
      <div>
        <div class="eyebrow">当前报告对象</div>
        <h2>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</h2>
        <p>${escapeHtml(conclusion)}。${escapeHtml(openRedlines.length ? `仍有 ${openRedlines.length} 项成交前红线未关闭。` : workflow.decision.detail)}</p>
      </div>
      <div class="report-hero-metrics">
        <div><span>质量可信度</span><strong>${escapeHtml(qualityLevelLabel(quality.confidenceLevel))}</strong></div>
        <div><span>三电风险</span><strong>${escapeHtml(qualityRiskLabel(quality.threeElectricRisk))}</strong></div>
        <div><span>证据完整度</span><strong>${quality.evidenceCompleteness}%</strong></div>
      </div>
    </div>
    ${renderDecisionReportPreview(car, workflow)}
  `;
  redlines.innerHTML = state.cars.map((item) => {
    const open = getOpenRedlineItems(item);
    const qualityState = assessCarQuality(item);
    return `
      <article class="report-redline-card ${open.length ? "blocked" : "ok"}">
        <div class="panel-head compact-head">
          <div>
            <h3>${escapeHtml(item.name)} ${escapeHtml(item.trim || "")}</h3>
            <div class="muted">${escapeHtml(carKindLabel(carKind(item)))} · ${escapeHtml(item.city || "未知城市")} · ${escapeHtml(item.seller || item.source || "未知来源")}</div>
          </div>
          <span class="chip ${open.length ? "high" : "ok"}">${open.length ? `${open.length} 项红线` : "红线清爽"}</span>
        </div>
        <p class="muted">质量 ${escapeHtml(qualityLevelLabel(qualityState.confidenceLevel))}，三电 ${escapeHtml(qualityRiskLabel(qualityState.threeElectricRisk))}，证据完整度 ${qualityState.evidenceCompleteness}%。</p>
        <div class="redline-list">
          ${(open.length ? open : getRedlineItems(item).slice(0, 2)).map((risk) => `
            <div class="redline-item ${open.includes(risk) ? "open" : "closed"}">
              <strong>${escapeHtml(risk.title)}</strong>
              <p>${escapeHtml(risk.detail)}</p>
            </div>
          `).join("") || `<div class="muted">暂无成交阻断项。</div>`}
        </div>
      </article>
    `;
  }).join("") || `<div class="muted">暂无候选。</div>`;
}

function groupSellers() {
  const map = new Map();
  state.cars.forEach((car) => {
    const name = car.seller || car.source || "未知商家";
    if (!map.has(name)) {
      map.set(name, {
        name,
        type: car.source || "未知类型",
        notes: car.sellerNotes || "",
        cars: []
      });
    }
    const entry = map.get(name);
    entry.cars.push(car);
    if (!entry.notes && car.sellerNotes) entry.notes = car.sellerNotes;
  });
  return [...map.values()].sort((a, b) => b.cars.length - a.cars.length);
}

function renderTimeline() {
  const board = document.querySelector("#timelineBoard");
  if (!board) return;
  board.innerHTML = buildTimelineItems().map((item) => `
    <div class="timeline-item ${item.level || ""}">
      <div class="timeline-date">${escapeHtml(item.date)}</div>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p class="muted">${escapeHtml(item.detail)}</p>
      </div>
      ${item.carId ? `<button class="mini-button" data-detail="${item.carId}" type="button">详情</button>` : ""}
    </div>
  `).join("");
}

function buildTimelineItems() {
  const items = [
    {
      date: "2026-05-26",
      title: "北京新能源指标下发",
      detail: `最晚 2027-05-26 前完成登记，当前剩余 ${daysUntilDeadline()} 天。`,
      level: "ok"
    }
  ];
  state.cars.forEach((car) => {
    (car.priceEvents || []).slice(0, 3).forEach((event) => {
      items.push({
        date: event.date || "价格记录",
        title: `${car.name} ${priceFieldLabel(event.field)} ${formatWan(event.price)}`,
        detail: event.note || event.source || "价格有更新，建议结合目标价判断是否推进。",
        level: event.field === "price" && car.targetPrice && event.price <= car.targetPrice ? "ok" : "warn",
        carId: car.id
      });
    });
    if (car.targetPrice && car.price) {
      const diff = car.price - car.targetPrice;
      items.push({
        date: "价格观察",
        title: `${car.name} 目标价 ${formatWan(car.targetPrice)}`,
        detail: diff > 0 ? `当前还高 ${formatWan(diff)}，适合继续等或压价。` : "已经达到目标价，优先核验车况。",
        level: diff > 0 ? "warn" : "ok",
        carId: car.id
      });
    }
    if (car.nextAction) {
      items.push({
        date: stageLabel(car.stage),
        title: `${car.name} 下一步`,
        detail: car.nextAction,
        level: analyzeCar(car).level,
        carId: car.id
      });
    }
  });
  items.push({
    date: "2027-05-26",
    title: "指标有效期截止",
    detail: "购车、验车、转籍和上牌流程都要给自己留冗余。",
    level: daysUntilDeadline() < 60 ? "high" : "warn"
  });
  return items;
}

function openCarDialog(carId = null) {
  const car = carId ? state.cars.find((item) => item.id === carId) : null;
  document.querySelector("#dialogTitle").textContent = car ? "编辑候选" : "新增候选";
  document.querySelector("#deleteCar").style.display = car ? "inline-block" : "none";
  const data = normalizeCar(car || {});
  setValue("#carId", car ? data.id : "");
  setValue("#carName", data.name);
  setValue("#carTrim", data.trim);
  setValue("#carStage", data.stage);
  setValue("#carKind", data.kind);
  setValue("#carRecommendation", data.recommendation);
  setValue("#carUrl", data.url);
  setValue("#carImage", data.image);
  setValue("#carCity", data.city);
  setValue("#carSource", data.source);
  setValue("#carSeller", data.seller);
  setValue("#carTargetPrice", data.targetPrice);
  setValue("#carPrice", data.price);
  setValue("#carNewPrice", data.newPrice);
  setValue("#carLanding", data.landing);
  setValue("#carInsurance", data.costs.insurance);
  setValue("#carTransport", data.costs.transport);
  setValue("#carInspection", data.costs.inspection);
  setValue("#carReconditioning", data.costs.reconditioning);
  setValue("#carAdasMonthly", data.costs.adasMonthly);
  setValue("#carBattery", data.battery);
  setValue("#carBatteryMonthly", data.batteryMonthly);
  setValue("#carBatterySize", data.batterySize);
  setValue("#carRange", data.range);
  setValue("#carMileage", data.mileage);
  setValue("#carPlateDate", data.plateDate);
  setValue("#carTransfers", data.transfers);
  setValue("#carExterior", data.exterior);
  setValue("#carInterior", data.interior);
  setValue("#carNop", data.nop);
  setValue("#carReport", data.report);
  setValue("#carCertified", data.certified);
  setValue("#carSeatScore", data.experience.seat);
  setValue("#carNvhScore", data.experience.nvh);
  setValue("#carChassisScore", data.experience.chassis);
  setValue("#carCockpitScore", data.experience.cockpit);
  setValue("#carAdasScore", data.experience.adas);
  setValue("#carHighwayScore", data.experience.highway);
  setValue("#carExteriorScore", data.experience.exterior);
  setValue("#carInteriorScore", data.experience.interior);
  setValue("#carComplaintSalesRatio", data.qualityProfile.complaintSalesRatio);
  setValue("#carThreeElectricShare", data.qualityProfile.threeElectricComplaintShare);
  setValue("#carRecallCount", data.qualityProfile.recallCount);
  setValue("#carBatterySoh", data.qualityProfile.batterySoh);
  setValue("#carMaintenanceStatus", data.qualityProfile.maintenanceStatus);
  setValue("#carTroubleCodeStatus", data.qualityProfile.troubleCodeStatus);
  setValue("#carWarrantyStatus", data.qualityProfile.warrantyStatus);
  setValue("#carBatteryRepairStatus", data.qualityProfile.batteryRepairStatus);
  setValue("#carQualityNotes", data.qualityProfile.notes);
  setValue("#carOptions", data.options);
  setValue("#carIssues", data.issues);
  setValue("#carRightsNotes", data.rightsNotes);
  setValue("#carSellerNotes", data.sellerNotes);
  setValue("#carNextAction", data.nextAction);
  setValue("#carNotes", data.notes);
  document.querySelector("#carDialog").showModal();
}

function saveCarFromForm() {
  const id = getValue("#carId") || makeId("car");
  const existing = state.cars.find((item) => item.id === id);
  const before = existing ? normalizeCar(existing) : null;
  const car = normalizeCar({
    ...(existing || {}),
    id,
    kind: getValue("#carKind") || existing?.kind || "manual",
    name: getValue("#carName"),
    trim: getValue("#carTrim"),
    stage: getValue("#carStage"),
    recommendation: getValue("#carRecommendation"),
    url: getValue("#carUrl"),
    image: getValue("#carImage"),
    city: getValue("#carCity"),
    source: getValue("#carSource"),
    seller: getValue("#carSeller"),
    targetPrice: numberValue("#carTargetPrice"),
    price: numberValue("#carPrice"),
    newPrice: numberValue("#carNewPrice"),
    landing: numberValue("#carLanding"),
    costs: {
      insurance: numberValue("#carInsurance"),
      transport: numberValue("#carTransport"),
      inspection: numberValue("#carInspection"),
      reconditioning: numberValue("#carReconditioning"),
      adasMonthly: numberValue("#carAdasMonthly"),
      subscriptionMonthly: existing?.costs?.subscriptionMonthly || 0
    },
    battery: getValue("#carBattery"),
    batteryMonthly: numberValue("#carBatteryMonthly"),
    batterySize: numberValue("#carBatterySize"),
    range: numberValue("#carRange"),
    mileage: numberValue("#carMileage"),
    plateDate: getValue("#carPlateDate"),
    transfers: numberValue("#carTransfers"),
    exterior: getValue("#carExterior"),
    interior: getValue("#carInterior"),
    nop: getValue("#carNop"),
    report: getValue("#carReport"),
    certified: getValue("#carCertified"),
    experience: {
      seat: numberValue("#carSeatScore"),
      nvh: numberValue("#carNvhScore"),
      chassis: numberValue("#carChassisScore"),
      cockpit: numberValue("#carCockpitScore"),
      adas: numberValue("#carAdasScore"),
      highway: numberValue("#carHighwayScore"),
      exterior: numberValue("#carExteriorScore"),
      interior: numberValue("#carInteriorScore")
    },
    qualityProfile: {
      ...(existing?.qualityProfile || {}),
      updatedAt: new Date().toISOString(),
      complaintSalesRatio: numberValue("#carComplaintSalesRatio"),
      threeElectricComplaintShare: numberValue("#carThreeElectricShare"),
      recallCount: numberValue("#carRecallCount"),
      batterySoh: numberValue("#carBatterySoh"),
      maintenanceStatus: getValue("#carMaintenanceStatus"),
      troubleCodeStatus: getValue("#carTroubleCodeStatus"),
      warrantyStatus: getValue("#carWarrantyStatus"),
      batteryRepairStatus: getValue("#carBatteryRepairStatus"),
      notes: getValue("#carQualityNotes")
    },
    options: getValue("#carOptions"),
    issues: getValue("#carIssues"),
    rightsNotes: getValue("#carRightsNotes"),
    sellerNotes: getValue("#carSellerNotes"),
    nextAction: getValue("#carNextAction"),
    notes: getValue("#carNotes")
  });
  recordPriceChanges(before, car, existing ? "编辑候选" : "新增候选");
  addDecisionLog(car, {
    type: existing ? "edit" : "create",
    title: existing ? "编辑候选信息" : "新增候选",
    detail: `${car.name} ${car.trim || ""}`.trim(),
    level: "info",
    relatedIds: [car.id]
  });
  const index = state.cars.findIndex((item) => item.id === id);
  if (index >= 0) state.cars[index] = car;
  else state.cars.unshift(car);
  selectedCarId = id;
  render();
  showToast(index >= 0 ? "候选已更新。" : "候选已添加。", "ok");
}

async function addEvidenceFromForm() {
  if (!selectedCarId) return;
  const title = getValue("#evidenceTitle");
  const url = getValue("#evidenceUrl");
  const notes = getValue("#evidenceNotes");
  const files = document.querySelector("#evidenceFiles")?.files;
  let attachments = [];
  try {
    attachments = await filesToInfoAttachments(files);
  } catch {
    showToast("有图片读取失败，换一张截图或保存为 JPG/PNG 后再试。", "danger");
    return;
  }
  const attachmentStats = collectAttachmentPayloadStats([{ attachments }], {
    warningBytes: INFO_ATTACHMENT_WARNING_BYTES,
    hardLimitBytes: INFO_ATTACHMENT_HARD_BYTES
  });
  if (attachmentStats.tooLarge) {
    showToast(`图片合计 ${formatBytes(attachmentStats.totalBytes)}，本机保存风险太高；请分批添加或减少截图。`, "danger");
    return;
  }
  if (!title && !url && !notes && !attachments.length) {
    showToast("先写一点信息，或上传照片/截图。", "warn");
    return;
  }
  const fallbackTitle = notes ? notes.slice(0, 24) : attachments[0]?.name || url || "未命名信息";
  const item = {
    id: makeId("ev"),
    carId: selectedCarId,
    title: title || fallbackTitle,
    type: inferEvidenceType(title, notes, url),
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
  const car = state.cars.find((candidate) => candidate.id === selectedCarId);
  if (car) {
    addDecisionLog(car, {
      type: "evidence",
      title: `添加信息：${item.title}`,
      detail: notes || url || `${attachments.length} 张图片`,
      level: "info",
      relatedIds: [item.id]
    });
    car.updatedAt = new Date().toISOString();
  }
  ["#evidenceTitle", "#evidenceUrl", "#evidenceNotes"].forEach((selector) => setValue(selector, ""));
  if (document.querySelector("#evidenceFiles")) document.querySelector("#evidenceFiles").value = "";
  const saved = render();
  if (!saved) {
    showToast("信息已加入当前页面，但本机存储空间不足，刷新可能丢失；请减少图片或导出 JSON。", "danger");
    return;
  }
  if (attachmentStats.shouldWarn) {
    showToast(`信息已保存；图片合计 ${formatBytes(attachmentStats.totalBytes)}，先不自动分析，避免 AI 请求过大。`, "warn");
    markEvidenceAnalysisState(item.id, "idle");
    render();
    return;
  }
  showToast("信息已加入当前候选，正在调用 AI 分析。", "ok");
  analyzeCurrentCarWithGemini({ auto: true, focusInfoId: item.id });
}

function inferEvidenceType(title = "", notes = "", url = "") {
  const text = `${title} ${notes} ${url}`;
  if (/soh|电池健康|健康度|三电质保|故障码|电池一致性|投诉销量比|车质网|召回|缺陷|电池包|电机|电控/i.test(text)) return "quality";
  if (/检测|查博士|复检|漆膜|底盘|事故|维修/.test(text)) return "report";
  if (/权益|质保|保修|nop|noa|智驾|随车|BaaS|租电/.test(text)) return "rights";
  if (/合同|订单|条款|承诺/.test(text)) return "contract";
  if (/聊天|客服|销售|微信/.test(text)) return "chat";
  if (/配置|选装|版本|参数/.test(text)) return "config";
  return "note";
}

function markEvidenceAnalysisState(evidenceId, status, extra = {}) {
  if (!evidenceId) return;
  const item = state.evidence.find((evidence) => evidence.id === evidenceId);
  if (!item) return;
  item.analysisStatus = normalizeInfoAnalysisStatus(status);
  item.analysisError = extra.analysisError || "";
  if (extra.analysisResult !== undefined) item.analysisResult = extra.analysisResult;
  if (extra.appliedAt !== undefined) item.appliedAt = extra.appliedAt;
}

function analyzeEvidenceById(evidenceId) {
  const item = state.evidence.find((evidence) => evidence.id === evidenceId);
  if (!item) return;
  selectedCarId = item.carId;
  markEvidenceAnalysisState(evidenceId, "queued");
  render();
  analyzeCurrentCarWithGemini({ auto: false, focusInfoId: evidenceId });
}

async function filesToInfoAttachments(fileList) {
  const files = [...(fileList || [])].filter((file) => file.type.startsWith("image/"));
  return Promise.all(files.map(compressInfoImage));
}

function compressInfoImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片解析失败"));
      image.onload = () => {
        const scale = Math.min(1, INFO_IMAGE_MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", INFO_IMAGE_QUALITY);
        resolve({
          id: makeId("att"),
          name: file.name || "图片",
          type: "image/jpeg",
          size: Math.round((dataUrl.length * 3) / 4),
          dataUrl
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function collectAttachmentPayloadStats(infoWall = [], { warningBytes = AI_ATTACHMENT_WARNING_BYTES, hardLimitBytes = AI_ATTACHMENT_HARD_BYTES } = {}) {
  let imageCount = 0;
  let totalBytes = 0;
  (infoWall || []).forEach((item) => {
    (item.attachments || []).forEach((attachment) => {
      imageCount += 1;
      totalBytes += attachmentPayloadBytes(attachment);
    });
  });
  return {
    imageCount,
    totalBytes,
    warningBytes,
    hardLimitBytes,
    shouldWarn: totalBytes >= warningBytes,
    tooLarge: totalBytes >= hardLimitBytes
  };
}

function attachmentPayloadBytes(attachment = {}) {
  const explicitSize = Number(attachment.size);
  if (Number.isFinite(explicitSize) && explicitSize > 0) return explicitSize;
  const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl : "";
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl;
  return Math.round((base64.length * 3) / 4);
}

function formatBytes(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.max(0, Math.round(bytes))}B`;
}

async function analyzeCurrentCarWithGemini({ auto = false, focusInfoId = "" } = {}) {
  if (geminiAnalysisRunning) {
    if (!auto) showToast("AI 正在分析中。", "warn");
    return;
  }
  const car = state.cars.find((item) => item.id === selectedCarId);
  if (!car) return;
  geminiAnalysisRunning = true;
  if (focusInfoId) {
    markEvidenceAnalysisState(focusInfoId, "running");
    render();
  }
  setGeminiButtonState(true);
  if (!auto) showToast("正在调用 AI 分析信息墙。", "ok");
  try {
    const payload = buildGeminiPayload(car, focusInfoId);
    const attachmentStats = collectAttachmentPayloadStats(payload.infoWall);
    if (attachmentStats.tooLarge) throw new Error(`信息墙图片合计 ${formatBytes(attachmentStats.totalBytes)}，AI 请求过大；请减少图片或分条分析。`);
    if (attachmentStats.shouldWarn && !auto) showToast(`图片合计 ${formatBytes(attachmentStats.totalBytes)}，AI 分析可能变慢。`, "warn");
    const urls = getGeminiAnalyzerUrls();
    let result = null;
    let lastError = "";
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, AI_ANALYZE_TIMEOUT_MS);
        result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) {
          throw new Error(result.error || `AI 分析失败：${response.status}`);
        }
        break;
      } catch (error) {
        lastError = error?.message || "AI 分析失败。";
        result = null;
      }
    }
    if (!result) throw new Error(lastError || "AI 分析服务未就绪。");
    result.imageStats = attachmentStats;
    result.imageAnalysisDowngraded = attachmentStats.imageCount > 0 && result.provider && result.provider !== "gemini";
    applyGeminiAnalysis(result, focusInfoId);
    geminiUnavailableNotified = false;
    const saved = render();
    showToast(saved ? `${aiProviderLabel(result)} 已生成分析预览，确认后再应用回填。` : "AI 已生成分析预览，但本机保存失败，请先导出备份。", saved ? "ok" : "danger");
  } catch (error) {
    const message = error?.message || "AI 分析失败。";
    if (focusInfoId) {
      markEvidenceAnalysisState(focusInfoId, "failed", { analysisError: message });
      render();
    }
    if (auto) {
      if (!geminiUnavailableNotified) {
        showToast(`信息已保存；${formatAiFailureMessage(error, { nextAction: "稍后在信息墙点击重新分析。" })}`, "warn");
        geminiUnavailableNotified = true;
      }
    } else {
      showToast(formatAiFailureMessage(message, { nextAction: "请检查线上服务或本机服务，然后点击 AI 分析重试。" }), "danger");
    }
  } finally {
    geminiAnalysisRunning = false;
    setGeminiButtonState(false);
  }
}

function getGeminiAnalyzerUrls() {
  const urls = [];
  if (location.protocol === "http:" || location.protocol === "https:") {
    urls.push(GEMINI_ANALYZER_URL);
  }
  urls.push(LOCAL_GEMINI_ANALYZER_URL);
  return [...new Set(urls)];
}

function getGeminiRecommenderUrls() {
  const urls = [];
  if (location.protocol === "http:" || location.protocol === "https:") {
    urls.push(GEMINI_RECOMMENDER_URL);
  }
  urls.push(LOCAL_GEMINI_RECOMMENDER_URL);
  return [...new Set(urls)];
}

function saveRequirementFromForm({ touch = true } = {}) {
  const energy = getValue("#reqEnergy");
  state.userRequirement = normalizeUserRequirement({
    city: "北京",
    people: getValue("#reqPeople") || "2",
    scenes: checkedValues("reqScene"),
    budgetMinWan: numberValue("#reqBudgetMin"),
    budgetMaxWan: numberValue("#reqBudgetMax"),
    energyTypes: energy === "ev" ? ["ev"] : energy === "hybrid" ? ["erev", "phev"] : ["ev", "erev", "phev"],
    minRangeKm: numberValue("#reqRange"),
    minPhevRangeKm: seedRequirement.minPhevRangeKm,
    priorities: checkedValues("reqPriority"),
    seatFocus: "front",
    bodyPreference: getValue("#reqBody") || "suv_sedan",
    purchaseTiming: getValue("#reqTiming"),
    mustHaves: getValue("#reqMustHaves"),
    dealBreakers: getValue("#reqDealBreakers"),
    referenceCar: seedRequirement.referenceCar,
    notes: getValue("#reqNotes"),
    updatedAt: touch ? new Date().toISOString() : state.userRequirement.updatedAt
  });
  saveState();
  return state.userRequirement;
}

function setRequirementEditMode(isEditing) {
  requirementEditMode = isEditing;
  if (isEditing) fillRequirementFormFromState();
  renderRequirementPanel();
  if (isEditing) {
    requestAnimationFrame(() => document.querySelector("#reqPeople")?.focus({ preventScroll: true }));
  }
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

async function analyzeRequirementAndCollectCars() {
  if (requirementAnalysisRunning) {
    showToast("正在理解用车需求。", "warn");
    return;
  }
  saveRequirementFromForm();
  requirementEditMode = false;
  requirementAnalysisRunning = true;
  renderRequirementPanel();
  showToast("正在刷新车型池并调用 AI 理解需求。", "ok");
  try {
    await ensureRequirementMarketData();
    const payload = buildRequirementGeminiPayload();
    let result = null;
    let lastError = "";
    for (const url of getGeminiRecommenderUrls()) {
      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, REQUIREMENT_RECOMMEND_TIMEOUT_MS);
        result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) throw new Error(result.error || `需求分析失败：${response.status}`);
        break;
      } catch (error) {
        lastError = error?.message || "需求分析失败";
        result = null;
      }
    }
    if (!result) throw new Error(lastError || "AI 推荐服务未就绪。");
    applyRequirementAnalysis(result, requirementAnalysisSourceLabel(result));
    render();
    showToast("已根据用车需求生成候选车型。", "ok");
  } catch (error) {
    const fallback = buildLocalRequirementRecommendations(error?.message || "AI 推荐服务未就绪");
    applyRequirementAnalysis(fallback, "本地规则兜底");
    render();
    showToast(`${formatAiFailureMessage(error, { provider: "Gemini / DeepSeek", nextAction: "已使用本地规则兜底，恢复模型后可重新分析画像。" })} ${aiJobStatusText("local")}.`, "warn");
  } finally {
    requirementAnalysisRunning = false;
    setRequirementAnalyzeState(false);
  }
}

async function ensureRequirementMarketData() {
  if (marketDataIsFreshForRequirement()) return true;
  return refreshDongchediNewCars({ silent: true, limit: 90, detailLimit: 45 });
}

function marketDataIsFreshForRequirement() {
  if ((state.market.releases || []).length < 24 || !state.market.lastFetchedAt) return false;
  const timestamp = new Date(state.market.lastFetchedAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= REQUIREMENT_MARKET_MAX_AGE_MS;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function setRequirementAnalyzeState(isRunning) {
  const button = document.querySelector("#analyzeRequirement");
  if (!button) return;
  button.disabled = isRunning;
  button.textContent = isRunning ? "正在找车..." : "理解需求并找车";
}

function requirementAnalysisSourceLabel(result = {}) {
  if (result.provider === "deepseek") return "DeepSeek";
  if (result.provider === "gemini") return "Gemini";
  if (result.fallback) return "服务器规则兜底";
  return "AI";
}

function aiProviderLabel(result = {}) {
  const provider = requirementAnalysisSourceLabel(result);
  if (provider === "DeepSeek" && result.providerFallbackFrom) return "DeepSeek";
  if (provider === "Gemini") return "Gemini";
  return provider || "AI";
}

function aiJobStatusText(status, details = {}) {
  const provider = details.provider || "AI";
  const reason = details.reason ? `：${details.reason}` : "";
  switch (status) {
    case "queued":
      return "已加入分析队列";
    case "running":
      return `${provider} 正在分析`;
    case "success":
      return `${provider} 已生成待确认结果`;
    case "fallback":
      return `备用模型 ${provider} 已接管分析`;
    case "local":
      return `本地规则兜底已生成候选`;
    case "failed":
      return `AI 分析失败${reason}`;
    default:
      return "AI 状态待确认";
  }
}

function formatAiFailureMessage(error, options = {}) {
  const reason = normalizeAiFailureReason(error);
  const provider = options.provider || "Gemini / DeepSeek";
  const nextAction = options.nextAction || "请检查线上服务或本机服务配置，也可以稍后重试。";
  return `AI 分析失败：${provider} 未完成请求，原因：${reason}。下一步：${nextAction}`;
}

function normalizeAiFailureReason(error) {
  const message = String(error?.message || error || "未知错误").trim();
  if (!message) return "未知错误";
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(message)) return "网络或服务不可达";
  if (/API Key|GEMINI_API_KEY|DEEPSEEK_API_KEY|未找到|key_missing/i.test(message)) return "服务端 API Key 未配置";
  if (/quota|429|rate limit|RESOURCE_EXHAUSTED/i.test(message)) return "模型额度或频率限制";
  if (/timeout|超时/i.test(message)) return "请求超时";
  if (/parse|JSON|schema|invalid_response/i.test(message)) return "模型返回格式不可解析";
  return message.replace(/\s+/g, " ").slice(0, 160);
}

function buildRequirementGeminiPayload() {
  return {
    profile: state.userRequirement,
    garageCars: state.cars
      .map((car) => ({
        id: car.id,
        kind: carKind(car),
        name: car.name,
        trim: car.trim,
        priceWan: car.price,
        rangeKm: car.range,
        battery: car.battery,
        city: car.city,
        source: car.source,
        notes: car.notes,
        issues: car.issues,
        experience: car.experience,
        fitScore: fitScore(car),
        risk: analyzeCar(car)
      }))
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 8),
    recentModels: getRequirementReleasePool().map((release) => ({
      seriesId: release.seriesId,
      brandName: release.brandName,
      seriesName: release.seriesName,
      carType: release.carType,
      energyType: release.energyType,
      energyLabel: release.energyLabel,
      priceText: release.priceText,
      priceMinWan: release.priceMinWan,
      priceMaxWan: release.priceMaxWan,
      releaseDate: release.releaseDate,
      sourceTypes: release.sourceTypes,
      dcdUrl: release.dcdUrl,
      tags: release.tags.slice(0, 4),
      fitScore: newReleaseFitScore(release),
      fitReasons: newReleaseFitReasons(release).slice(0, 4),
      models: release.models.slice(0, 2).map((model) => ({
        id: model.id,
        year: model.year,
        name: model.name,
        officialPrice: model.officialPrice,
        dealerPrice: model.dealerPrice,
        battery: model.battery,
        range: model.range,
        drive: model.drive
      }))
    })),
    usedListings: getRequirementUsedListingPool().map((listing) => ({
      skuId: listing.skuId,
      title: listing.title,
      seriesName: listing.seriesName,
      trim: listing.trim,
      priceWan: listing.priceWan,
      officialPriceWan: listing.officialPriceWan,
      city: listing.city,
      sourceType: listing.sourceType,
      mileageWan: listing.mileageWan,
      year: listing.year,
      range: listing.range,
      energyType: listing.energyType,
      url: listing.url,
      fitScore: usedListingClientScore(listing),
      fitReasons: listing.fitReasons.slice(0, 4),
      riskFlags: listing.riskFlags.slice(0, 4)
    })),
    outputRules: {
      maxCandidates: 8,
      candidateSources: ["release", "used", "garage", "manual"],
      fitScoreRange: "0-100",
      priceUnit: "万元"
    }
  };
}

function getRequirementReleasePool() {
  return [...(state.market.releases || [])]
    .filter((release) => isNewEnergyRelease(release))
    .filter((release) => energyMatchesRequirement(release.energyType))
    .sort((a, b) => requirementReleaseScore(b) - requirementReleaseScore(a))
    .slice(0, 14);
}

function getRequirementUsedListingPool() {
  return [...(state.usedMarket.listings || [])]
    .filter(listingMatchesUserRequirement)
    .sort((a, b) => usedListingClientScore(b) - usedListingClientScore(a))
    .slice(0, 8);
}

function applyRequirementAnalysis(result, source) {
  if (result.profilePatch && typeof result.profilePatch === "object") {
    state.userRequirement = normalizeUserRequirement({ ...state.userRequirement, ...result.profilePatch });
  }
  state.requirementAnalysis = normalizeRequirementAnalysis({
    summary: result.summary || result.analysis?.summary || "",
    searchStrategy: result.searchStrategy || result.analysis?.searchStrategy || "",
    questions: result.questions || result.analysis?.questions || [],
    source,
    lastAnalyzedAt: new Date().toISOString(),
    error: result.error || "",
    candidates: mergeRequirementCandidates(result.candidates || [])
  });
}

function mergeRequirementCandidates(candidates) {
  const seen = new Set();
  return candidates.map((candidate) => {
    const normalized = normalizeRequirementCandidate(candidate);
    if (!normalized) return null;
    const key = `${normalized.source}:${normalized.seriesId || normalized.skuId || normalized.carId || normalized.name}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return normalized;
  }).filter(Boolean).slice(0, 8);
}

function buildLocalRequirementRecommendations(error = "") {
  const releaseCandidates = [...(state.market.releases || [])]
    .filter(releaseMatchesUserRequirement)
    .sort((a, b) => requirementReleaseScore(b) - requirementReleaseScore(a))
    .slice(0, 8)
    .map((release) => releaseToRequirementCandidate(release));
  const garageCandidates = state.cars
    .map((car) => carToRequirementCandidate(car))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3);
  const usedCandidates = state.usedMarket.listings
    .filter(listingMatchesUserRequirement)
    .sort((a, b) => usedListingClientScore(b) - usedListingClientScore(a))
    .slice(0, 3)
    .map((listing) => usedListingToRequirementCandidate(listing));
  return {
    ok: true,
    error,
    summary: "已先用本地规则按预算、续航、车身和舒适取向排序；AI 接口恢复后可重新分析以细化取舍。",
    searchStrategy: "优先 30 万附近、长续航新能源、北京通勤友好、舒适/智能优先的近期发布或热门车型。",
    candidates: [...releaseCandidates, ...garageCandidates, ...usedCandidates]
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 8),
    questions: ["是否必须纯电？", "是否接受中大型/六座车带来的停车压力？", "是否优先等 7-8 月价格变化？"]
  };
}

function releaseMatchesUserRequirement(release) {
  const req = state.userRequirement;
  if (!isNewEnergyRelease(release)) return false;
  if (!energyMatchesRequirement(release.energyType, req)) return false;
  const min = release.priceMinWan;
  const max = release.priceMaxWan || min;
  if (min !== "" && max < Number(req.budgetMinWan) - 3) return false;
  if (min !== "" && min > Number(req.budgetMaxWan) + 8) return false;
  if (req.bodyPreference === "no_mpv" && newReleaseBodyBucket(release) === "mpv") return false;
  if (req.bodyPreference === "suv" && newReleaseBodyBucket(release) !== "suv") return false;
  if (req.bodyPreference === "sedan" && newReleaseBodyBucket(release) !== "sedan") return false;
  return true;
}

function requirementReleaseScore(release) {
  const req = state.userRequirement;
  let score = newReleaseFitScore(release);
  const center = (Number(req.budgetMinWan) + Number(req.budgetMaxWan)) / 2;
  const price = release.priceMinWan === "" ? center : Number(release.priceMinWan);
  score += Math.max(-14, 16 - Math.abs(price - center) * 2.2);
  if (energyMatchesRequirement(release.energyType, req)) score += 8;
  else if (req.energyTypes.length) score -= 12;
  if (req.priorities.includes("comfort") && /理想|蔚来|乐道|奥迪|极氪/i.test(`${release.brandName} ${release.seriesName}`)) score += 8;
  if (req.priorities.includes("adas") && /理想|小鹏|华为|问界|智界|阿维塔/i.test(`${release.brandName} ${release.seriesName}`)) score += 7;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function releaseToRequirementCandidate(release) {
  const facts = getReleaseModelFacts(release);
  return normalizeRequirementCandidate({
    source: "release",
    seriesId: release.seriesId,
    name: `${release.brandName} ${release.seriesName}`.trim(),
    trim: release.models[0] ? `${release.models[0].year || ""}款 ${release.models[0].name || ""}`.trim() : release.priceText,
    priceWan: release.priceMinWan,
    energyType: release.energyType,
    rangeKm: Number(firstModelMatch(release, /续航\s*(\d+)\s*km/i) || firstModelMatch(release, /(\d+)\s*km/i)) || "",
    fitScore: requirementReleaseScore(release),
    confidence: "medium",
    why: newReleaseFitReasons(release).join("；"),
    tradeoffs: release.tags.slice(0, 3),
    nextAction: "加入新车候选后继续看版本、权益、试驾和价格走势。",
    tags: [release.energyLabel, releaseSourceText(release), facts.energy].filter(Boolean),
    sourceUrl: release.dcdUrl
  });
}

function carToRequirementCandidate(car) {
  return normalizeRequirementCandidate({
    source: "garage",
    carId: car.id,
    name: car.name,
    trim: car.trim,
    priceWan: car.price,
    energyType: car.battery === "baas" ? "ev" : "new_energy",
    rangeKm: car.range,
    fitScore: fitScore(car),
    confidence: "high",
    why: car.nextAction || car.notes || "已在候选库中，可直接进入详情继续判断。",
    tradeoffs: analyzeCar(car).risks.slice(0, 3).map((risk) => risk.title),
    nextAction: car.nextAction || "查看详情并补齐信息墙。",
    tags: [car.city, car.source, batteryLabel(car.battery)].filter(Boolean),
    sourceUrl: car.url ? getExternalSourceUrl(car) : ""
  });
}

function listingMatchesUserRequirement(listing) {
  const req = state.userRequirement;
  if (!energyMatchesRequirement(listing.energyType, req)) return false;
  if (listing.priceWan !== "" && listing.priceWan > Number(req.budgetMaxWan) + 3) return false;
  if (listing.priceWan !== "" && listing.priceWan < Math.max(10, Number(req.budgetMinWan) - 8)) return false;
  if (req.minRangeKm && listing.range && listing.range < Number(req.minRangeKm) - 80) return false;
  return usedListingClientScore(listing) >= 50;
}

function usedListingToRequirementCandidate(listing) {
  return normalizeRequirementCandidate({
    source: "used",
    skuId: listing.skuId,
    name: listing.seriesName || listing.title,
    trim: listing.trim || listing.title,
    priceWan: listing.priceWan,
    energyType: listing.energyType,
    rangeKm: listing.range,
    fitScore: usedListingClientScore(listing),
    confidence: "medium",
    why: listing.fitReasons.join("；") || "二手车源匹配预算和基本偏好。",
    tradeoffs: listing.riskFlags.slice(0, 3),
    nextAction: "加入二手车源后索要检测报告、出险记录和权益截图。",
    tags: [listing.city, listing.sourceType, listing.mileageText].filter(Boolean),
    sourceUrl: getExternalSourceUrl(listing)
  });
}

function setGeminiButtonState(isRunning) {
  const button = document.querySelector("#analyzeInfoWall");
  if (button) {
    button.disabled = isRunning;
    button.textContent = isRunning ? "分析中..." : "AI 分析";
  }
  const riskButton = document.querySelector("#analyzeRiskCar");
  if (riskButton) {
    riskButton.disabled = isRunning || !state.cars.length;
    riskButton.textContent = isRunning ? "分析中..." : "AI 重新分析";
  }
  const dashboardButton = document.querySelector("#analyzeDashboardCar");
  if (dashboardButton) {
    dashboardButton.disabled = isRunning || !state.cars.length;
    dashboardButton.textContent = isRunning ? "分析中..." : "AI 重新分析";
  }
}

function buildGeminiPayload(car, focusInfoId) {
  return {
    profile: {
      city: "北京",
      budgetWan: 30,
      people: "2人用车，后排需求弱",
      preferences: ["前排舒适", "长续航", "车机智能", "高速智驾", "静谧性", "底盘滤震", "内饰精致", "外观耐看"],
      i6Baseline: "用户试驾理想 i6 后认为驾驶和乘坐体验很好，希望找到类似体验但价格更合理、风险可控的车源。"
    },
    focusInfoId,
    car: cloneCarForGemini(car),
    infoWall: getCarEvidence(car.id).slice(0, 30).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      url: item.url,
      notes: item.notes,
      createdAt: item.createdAt,
      attachments: (item.attachments || []).slice(0, 6).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        dataUrl: attachment.dataUrl
      }))
    })),
    allowedValues: {
      stage: ["watching", "contacted", "test-drive", "negotiating", "recheck", "rejected", "purchased"],
      recommendation: ["auto", "worthViewing", "watch", "waitDrop", "bargainOnly", "reject"],
      battery: ["buyout", "baas", "unknown"],
      nop: ["included", "subscription", "none", "unknown"],
      report: ["full", "basic", "none", "unknown"],
      certified: ["official", "platform", "dealer", "unknown"],
      qualityStatus: QUALITY_STATUS_OPTIONS,
      complaintTrend: ["unknown", "rising", "stable", "falling"]
    }
  };
}

function cloneCarForGemini(car) {
  return {
    kind: carKind(car),
    name: car.name,
    trim: car.trim,
    stage: car.stage,
    recommendation: car.recommendation,
    url: car.url,
    price: car.price,
    newPrice: car.newPrice,
    targetPrice: car.targetPrice,
    landing: car.landing,
    battery: car.battery,
    batteryMonthly: car.batteryMonthly,
    batterySize: car.batterySize,
    range: car.range,
    mileage: car.mileage,
    plateDate: car.plateDate,
    transfers: car.transfers,
    city: car.city,
    source: car.source,
    seller: car.seller,
    exterior: car.exterior,
    interior: car.interior,
    nop: car.nop,
    report: car.report,
    certified: car.certified,
    options: car.options,
    issues: car.issues,
    rightsNotes: car.rightsNotes,
    sellerNotes: car.sellerNotes,
    nextAction: car.nextAction,
    notes: car.notes,
    costs: car.costs,
    experience: car.experience,
    qualityProfile: car.qualityProfile
  };
}

function applyGeminiAnalysis(result, focusInfoId) {
  const car = state.cars.find((item) => item.id === selectedCarId);
  if (!car) return;
  const focusInfo = state.evidence.find((item) => item.id === focusInfoId);
  const analysisResult = {
    analysis: result.analysis || null,
    carPatch: result.carPatch || {},
    infoCard: result.infoCard || null,
    focusInfoId: focusInfoId || "",
    analyzedAt: new Date().toISOString()
  };
  if (focusInfo) {
    focusInfo.analysisStatus = "ready";
    focusInfo.analysisError = "";
    focusInfo.analysisResult = analysisResult;
    focusInfo.appliedAt = "";
    return;
  }
  const analysisNotes = formatGeminiAnalysisNotes(result.analysis, result.carPatch, result);
  state.evidence.unshift({
    id: makeId("ev"),
    carId: car.id,
    title: "AI 分析预览",
    type: "analysis",
    status: result.analysis?.riskLevel === "high" ? "conflict" : result.analysis?.confidence === "low" ? "pending" : "valid",
    url: "",
    notes: analysisNotes || "AI 已生成候选信息回填预览。",
    attachments: [],
    createdAt: new Date().toISOString().slice(0, 10),
    analysisStatus: "ready",
    analysisError: "",
    analysisResult,
    linkedRiskIds: [],
    appliedAt: ""
  });
}

function applyEvidenceAnalysis(evidenceId) {
  const item = state.evidence.find((evidence) => evidence.id === evidenceId);
  if (!item?.analysisResult) {
    showToast("这条信息还没有可应用的分析结果。", "warn");
    return;
  }
  const car = state.cars.find((candidate) => candidate.id === item.carId);
  if (!car) return;
  const before = normalizeCar(car);
  const result = item.analysisResult;
  applyCarPatch(car, result.carPatch || {});
  if (result.infoCard && item.type !== "analysis") {
    if (result.infoCard.title) item.title = String(result.infoCard.title).slice(0, 80);
    if (result.infoCard.notes) item.notes = String(result.infoCard.notes);
    if (["valid", "pending", "conflict", "expired"].includes(result.infoCard.status)) item.status = result.infoCard.status;
  }
  recordPriceChanges(before, car, "AI回填");
  item.analysisStatus = "applied";
  item.analysisError = "";
  item.appliedAt = new Date().toISOString();
  if (item.type === "analysis" && item.title.includes("预览")) item.title = "AI 分析结果";
  addDecisionLog(car, {
    type: "ai",
    title: `应用 AI 分析：${item.title}`,
    detail: formatGeminiAnalysisNotes(result.analysis, result.carPatch, result).slice(0, 240),
    level: "ok",
    relatedIds: [item.id]
  });
  car.updatedAt = item.appliedAt;
  const saved = render();
  showToast(saved ? "分析结果已应用到候选信息。" : "分析结果已应用到当前页面，但本机保存失败，请先导出备份。", saved ? "ok" : "danger");
}

function applyCarPatch(car, patch) {
  const textFields = ["name", "trim", "url", "plateDate", "city", "source", "seller", "exterior", "interior", "options", "issues", "rightsNotes", "sellerNotes", "nextAction", "notes"];
  textFields.forEach((field) => {
    if (typeof patch[field] === "string" && patch[field].trim()) car[field] = patch[field].trim();
  });
  const numberFields = ["price", "newPrice", "targetPrice", "landing", "batteryMonthly", "batterySize", "range", "mileage", "transfers"];
  numberFields.forEach((field) => {
    const value = numberOrBlank(patch[field]);
    if (value !== "") car[field] = value;
  });
  applyEnumPatch(car, patch, "stage", ["watching", "contacted", "waiting-docs", "test-drive", "negotiating", "recheck", "rejected", "purchased"]);
  applyEnumPatch(car, patch, "recommendation", ["auto", "worthViewing", "watch", "waitDrop", "bargainOnly", "reject"]);
  applyEnumPatch(car, patch, "battery", ["buyout", "baas", "unknown"]);
  applyEnumPatch(car, patch, "nop", ["included", "subscription", "none", "unknown"]);
  applyEnumPatch(car, patch, "report", ["full", "basic", "none", "unknown"]);
  applyEnumPatch(car, patch, "certified", ["official", "platform", "dealer", "unknown"]);
  if (patch.experience && typeof patch.experience === "object") {
    Object.keys(car.experience).forEach((key) => {
      const value = numberOrBlank(patch.experience[key]);
      if (value !== "") car.experience[key] = Math.max(1, Math.min(10, Math.round(value)));
    });
  }
  if (patch.qualityProfile && typeof patch.qualityProfile === "object") {
    const current = normalizeQualityProfile(car.qualityProfile);
    car.qualityProfile = normalizeQualityProfile({
      ...current,
      ...patch.qualityProfile,
      updatedAt: new Date().toISOString()
    });
  }
}

function applyEnumPatch(car, patch, field, allowed) {
  if (allowed.includes(patch[field])) car[field] = patch[field];
}

function formatGeminiAnalysisNotes(analysis, patch, result = {}) {
  if (!analysis && !patch) return "";
  const lines = [];
  if (result.imageAnalysisDowngraded) lines.push("图片降级：本次由不支持图片读取的模型兜底，截图/照片内容未被直接识别；请补充文字摘要后再分析。");
  if (analysis?.summary) lines.push(`结论：${normalizeAiDisplayCopy(analysis.summary)}`);
  if (analysis?.confidence) lines.push(`置信度：${analysis.confidence}`);
  if (analysis?.riskLevel) lines.push(`风险判断：${riskLabel(analysis.riskLevel)}`);
  if (analysis?.priceOpinion) lines.push(`价格：${normalizeAiDisplayCopy(analysis.priceOpinion)}`);
  if (analysis?.rightsOpinion) lines.push(`权益：${normalizeAiDisplayCopy(analysis.rightsOpinion)}`);
  if (analysis?.conditionOpinion) lines.push(`车况：${normalizeAiDisplayCopy(analysis.conditionOpinion)}`);
  if (Array.isArray(analysis?.questions) && analysis.questions.length) {
    lines.push("下一步问题：");
    analysis.questions.slice(0, 8).forEach((question) => lines.push(`- ${question}`));
  }
  if (patch?.nextAction) lines.push(`建议动作：${patch.nextAction}`);
  return lines.join("\n");
}

async function refreshDongchediNewCars({ silent = false, limit = 120, detailLimit = 90 } = {}) {
  if (newCarRefreshRunning) {
    if (!silent) showToast("正在刷新懂车帝数据。", "warn");
    return false;
  }
  newCarRefreshRunning = true;
  setNewCarRefreshState(true);
  if (!silent) showToast(`正在按首页画像刷新近期发布和热门车型：${buildRefreshProfileSummary()}。`, "ok");
  const urls = getDongchediFeedUrls({ limit, detailLimit });
  let lastError = "";
  try {
    for (const url of urls) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) {
          throw new Error(result.error || `刷新失败：${response.status}`);
        }
        applyDongchediNewCarsPayload(result);
        render();
        if (!silent) showToast(`已刷新 ${state.market.releases.length} 款近期发布/热门车型。`, "ok");
        return true;
      } catch (error) {
        lastError = error?.message || "刷新失败";
      }
    }
    throw new Error(lastError || "无法连接懂车帝数据服务。");
  } catch (error) {
    state.market.error = error?.message || "刷新失败";
    renderNewCars();
    if (!silent) showToast("刷新失败，请确认新车数据服务已启动。", "danger");
    return false;
  } finally {
    newCarRefreshRunning = false;
    setNewCarRefreshState(false);
  }
}

function getDongchediFeedUrls({ limit = 120, detailLimit = 90 } = {}) {
  const params = buildRefreshProfileParams({ limit, detailLimit });
  const urls = [];
  if (location.protocol === "http:" || location.protocol === "https:") {
    urls.push(withQuery(DONGCHEDI_NEWCAR_URL, params));
  }
  urls.push(withQuery(LOCAL_DONGCHEDI_NEWCAR_URL, params));
  return [...new Set(urls)];
}

async function refreshDongchediUsedCars() {
  if (usedCarRefreshRunning) {
    showToast("正在刷新懂车帝二手车源。", "warn");
    return;
  }
  usedCarRefreshRunning = true;
  setUsedCarRefreshState(true);
  const selectedCity = document.querySelector("#usedcarCityFilter")?.value || "profile";
  const refreshCity = resolveUsedcarRefreshCity(selectedCity);
  showToast(`正在按首页画像刷新${refreshCity}官方二手车源。`, "ok");
  const urls = getDongchediUsedcarUrls();
  let lastError = "";
  try {
    for (const url of urls) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) {
          throw new Error(result.error || `刷新失败：${response.status}`);
        }
        applyDongchediUsedCarsPayload(result);
        render();
        showToast(`已刷新 ${state.usedMarket.listings.length} 台懂车帝官方/自营车源。`, "ok");
        return;
      } catch (error) {
        lastError = error?.message || "刷新失败";
      }
    }
    throw new Error(lastError || "无法连接懂车帝二手车数据服务。");
  } catch (error) {
    state.usedMarket.error = error?.message || "刷新失败";
    renderUsedCars();
    showToast("刷新失败，请确认懂车帝数据服务已启动。", "danger");
  } finally {
    usedCarRefreshRunning = false;
    setUsedCarRefreshState(false);
  }
}

function getDongchediUsedcarUrls() {
  const selectedCity = document.querySelector("#usedcarCityFilter")?.value || "profile";
  const city = resolveUsedcarRefreshCity(selectedCity);
  const params = buildRefreshProfileParams({ limit: 90, pages: 3, city, cityScope: selectedCity });
  const urls = [];
  if (location.protocol === "http:" || location.protocol === "https:") {
    urls.push(withQuery(DONGCHEDI_USEDCAR_URL, params));
  }
  urls.push(withQuery(LOCAL_DONGCHEDI_USEDCAR_URL, params));
  return [...new Set(urls)];
}

function withQuery(url, params) {
  return `${url}${url.includes("?") ? "&" : "?"}${params}`;
}

function applyDongchediNewCarsPayload(result) {
  state.market = normalizeMarket({
    releases: result.releases || [],
    lastFetchedAt: result.fetchedAt || new Date().toISOString(),
    sourceUrl: result.sourceUrl || "https://www.dongchedi.com/",
    sourceLabel: result.sourceLabel || "懂车帝",
    profileSummary: result.profileSummary || buildRefreshProfileSummary(),
    error: ""
  });
}

function applyDongchediUsedCarsPayload(result) {
  state.usedMarket = normalizeUsedMarket({
    listings: result.listings || [],
    lastFetchedAt: result.fetchedAt || new Date().toISOString(),
    sourceUrl: result.sourceUrl || "https://www.dongchedi.com/usedcar/",
    sourceLabel: result.sourceLabel || "懂车帝官方二手车",
    city: result.city || "全国",
    profileSummary: result.profileSummary || buildRefreshProfileSummary(state.userRequirement, { city: result.city || state.userRequirement.city || "北京" }),
    error: ""
  });
}

function setNewCarRefreshState(isRunning) {
  const button = document.querySelector("#refreshDcdNewCars");
  if (!button) return;
  button.disabled = isRunning;
  button.textContent = isRunning ? "刷新中..." : "刷新懂车帝数据";
}

function setUsedCarRefreshState(isRunning) {
  const button = document.querySelector("#refreshDcdUsedCars");
  if (!button) return;
  button.disabled = isRunning;
  button.textContent = isRunning ? "刷新中..." : "刷新官方车源";
}

function addReleaseToGarage(seriesId) {
  const release = state.market.releases.find((item) => String(item.seriesId) === String(seriesId));
  if (!release) return;
  const existing = state.cars.find((car) => car.url === release.dcdUrl || `${car.name} ${car.trim}`.includes(release.seriesName));
  if (existing) {
    switchToDetail(existing.id);
    showToast("这款车型已经在新车候选里。", "warn");
    return;
  }
  const facts = getReleaseModelFacts(release);
  const firstModel = release.models[0] || {};
  const car = normalizeCar({
    id: makeId("car"),
    kind: "new",
    name: release.seriesName,
    trim: firstModel.year ? `${firstModel.year}款 ${firstModel.name || ""}`.trim() : firstModel.name || "近期/热门车型",
    stage: "watching",
    recommendation: newReleaseFitScore(release) >= 70 ? "worthViewing" : "watch",
    url: release.dcdUrl,
    image: release.coverUrl,
    city: "北京",
    source: release.sourceTypes.includes("hot") ? "懂车帝热门车型" : "懂车帝新车",
    seller: `${release.brandName || release.seriesName} 官方渠道待确认`,
    price: release.priceMinWan,
    newPrice: release.priceMinWan,
    targetPrice: release.priceMinWan ? Math.max(0, Number(release.priceMinWan) - 1.5) : "",
    landing: release.priceMinWan ? Number(release.priceMinWan) + 1.2 : "",
    battery: "buyout",
    batterySize: Number(firstModelMatch(release, /(\d+(?:\.\d+)?)\s*kwh/i)) || "",
    range: Number(firstModelMatch(release, /续航\s*(\d+)\s*km/i) || firstModelMatch(release, /(\d+)\s*km/i)) || "",
    exterior: "待试驾确认",
    interior: "待试驾确认",
    nop: "unknown",
    report: "none",
    certified: "unknown",
    options: release.models.map((model) => `${model.year || ""}款 ${model.name || ""} ${model.officialPrice || model.price || ""} ${model.groupKey || ""}`.trim()).join("\n"),
    issues: "新车刚发布，真实优惠、交付周期、首批车质量稳定性、北京门店试驾车和金融权益都需要后续确认。",
    rightsNotes: "从懂车帝近期发布/热门车型加入，具体订金、锁单、退订、质保、智驾和充电/补能权益以品牌合同为准。",
    sellerNotes: release.articleTitle || "懂车帝车型页与上市资讯已记录。",
    nextAction: "关注北京试驾车到店、首批车主反馈、实际成交权益和7-8月价格变化。",
    notes: `来自懂车帝新车/热门车型情报。${releaseSourceText(release)}。${facts.energy ? `核心信息：${facts.energy}。` : ""}`
  });
  state.cars.unshift(car);
  selectedCarId = car.id;
  selectedCompare.add(car.id);
  const saved = setActiveView("detail", { scroll: "top" });
  showToast(saved ? "已加入新车候选，可以继续补车型信息和试驾记录。" : "已加入当前页面，但本机保存失败，请先导出备份。", saved ? "ok" : "danger");
}

function addUsedListingToGarage(skuId) {
  const listing = state.usedMarket.listings.find((item) => String(item.skuId) === String(skuId));
  if (!listing) return;
  const existing = state.cars.find((car) => car.url === listing.url);
  if (existing) {
    switchToDetail(existing.id);
    showToast("这台二手车源已经在候选库里。", "warn");
    return;
  }
  const risks = listing.riskFlags || [];
  const isNio = /蔚来|ES6|ES8|EC6|ET5|ET7/i.test(`${listing.seriesName} ${listing.title}`);
  const isLi = /理想|i6/i.test(`${listing.seriesName} ${listing.title}`);
  const car = normalizeCar({
    id: makeId("car"),
    kind: "used",
    name: listing.seriesName || listing.brandName || listing.title,
    trim: listing.trim || listing.title,
    stage: "watching",
    recommendation: listing.fitScore >= 72 ? "worthViewing" : listing.fitScore >= 58 ? "watch" : "waitDrop",
    url: listing.url,
    sourceSkuId: listing.skuId,
    image: listing.image,
    city: listing.city,
    source: listing.sourceType || "懂车帝官方二手车",
    seller: listing.seller || "懂车帝官方二手车",
    price: listing.priceWan,
    newPrice: listing.officialPriceWan,
    targetPrice: listing.priceWan !== "" ? Math.max(0, Number(listing.priceWan) - (listing.priceWan >= 25 ? 1.2 : 0.6)) : "",
    landing: listing.priceWan !== "" ? Number(listing.priceWan) + 1.1 : "",
    costs: { insurance: 0.75, transport: listing.city && listing.city !== "北京" ? 0.18 : 0.05, inspection: 0.18, reconditioning: 0.25, adasMonthly: 0 },
    battery: isNio && /租电|BaaS/i.test(listing.title) ? "baas" : "buyout",
    batterySize: listing.batterySize,
    range: listing.range,
    mileage: listing.mileageWan,
    plateDate: listing.year ? `${listing.year}-01` : "",
    transfers: listing.transferCount,
    exterior: "待看车确认",
    interior: "待看车确认",
    nop: isLi ? "included" : "unknown",
    report: listing.tags.some((tag) => /检测/.test(tag)) ? "basic" : "none",
    certified: /官方认证/.test(listing.authentication) ? "official" : "platform",
    qualityProfile: {
      updatedAt: new Date().toISOString(),
      maintenanceStatus: "missing",
      troubleCodeStatus: "missing",
      warrantyStatus: "unknown",
      batteryRepairStatus: "unknown",
      notes: "从懂车帝二手车源加入，车系投诉销量比、官方召回、SOH、4S维保、故障码和三电质保均需补证。"
    },
    options: listing.tags.join(" / "),
    issues: risks.join("；") || "仍需核验检测报告、出险记录、权益和合同承诺。",
    rightsNotes: isNio ? "重点确认电池产权/BaaS、NOP+、质保、换电权益和二手车主权益。" : "重点确认质保、智驾权益、官方/平台保障、退换和合同承诺。",
    sellerNotes: [listing.seller, listing.officialHint, listing.shopId ? `shop_id: ${listing.shopId}` : ""].filter(Boolean).join("；"),
    nextAction: "先索要完整检测报告、出险/维保记录、权益截图，再决定是否约看和第三方复检。",
    notes: `来自懂车帝官方二手车源。排序原因：${listing.fitReasons.join("、") || "待进一步判断"}。`
  });
  state.cars.unshift(car);
  const evidence = {
    id: makeId("ev"),
    carId: car.id,
    title: "懂车帝官方二手车源",
    type: "listing",
    status: risks.length >= 3 ? "pending" : "valid",
    url: listing.url,
    notes: [
      `车源：${listing.title}`,
      `报价：${listing.priceText || "-"}；新车指导价：${listing.officialPriceText || "-"}`,
      `城市：${listing.city || "-"}；年份/里程：${[listing.ageText, listing.mileageText].filter(Boolean).join(" / ") || "-"}`,
      `商家/来源：${listing.seller || listing.sourceType || "-"}`,
      `平台标签：${listing.tags.join("、") || "-"}`,
      `初步风险：${risks.join("、") || "仍需核验检测报告和出险记录"}`,
      "请 AI 继续做商家信息梳理、风险评估，并和候选库里的新车车型、理想 i6、蔚来 ES6、极氪 7X 等候选做对比评估。"
    ].join("\n"),
    attachments: [],
    createdAt: new Date().toISOString().slice(0, 10)
  };
  state.evidence.unshift(evidence);
  selectedCarId = car.id;
  selectedCompare.add(car.id);
  const saved = setActiveView("detail", { scroll: "top" });
  if (!saved) {
    showToast("已加入当前页面，但本机保存失败，请先导出备份。", "danger");
    return;
  }
  showToast("已加入二手车源，正在调用 AI 做车源分析。", "ok");
  analyzeCurrentCarWithGemini({ auto: true, focusInfoId: evidence.id });
}

function addRequirementCandidateToGarage(candidateId) {
  const candidate = state.requirementAnalysis.candidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  if (candidate.source === "release" && candidate.seriesId) {
    addReleaseToGarage(candidate.seriesId);
    return;
  }
  if (candidate.source === "used" && candidate.skuId) {
    addUsedListingToGarage(candidate.skuId);
    return;
  }
  if (candidate.source === "garage" && candidate.carId) {
    switchToDetail(candidate.carId);
    return;
  }
  const existing = state.cars.find((car) => `${car.name} ${car.trim}`.includes(candidate.name) || candidate.name.includes(car.name));
  if (existing) {
    switchToDetail(existing.id);
    showToast("这个候选已经在候选库里。", "warn");
    return;
  }
  const car = normalizeCar({
    id: makeId("car"),
    kind: requirementCandidateBucket(candidate),
    name: candidate.name,
    trim: candidate.trim || "需求推荐车型",
    stage: "watching",
    recommendation: candidate.fitScore >= 72 ? "worthViewing" : "watch",
    url: candidate.sourceUrl,
    city: state.userRequirement.city || "北京",
    source: "需求推荐",
    seller: "官方渠道/车源待确认",
    price: candidate.priceWan,
    newPrice: candidate.priceWan,
    targetPrice: candidate.priceWan !== "" ? Math.max(0, Number(candidate.priceWan) - 1) : "",
    landing: candidate.priceWan !== "" ? Number(candidate.priceWan) + 1.2 : "",
    battery: "buyout",
    range: candidate.rangeKm,
    exterior: "待确认",
    interior: "待确认",
    nop: "unknown",
    report: "none",
    certified: "unknown",
    options: candidate.tags.join(" / "),
    issues: candidate.tradeoffs.join("；") || "由需求推荐生成，仍需核验配置、权益、价格和交付。",
    rightsNotes: "请确认订金/退订、质保、智驾、充电补能、金融和置换权益。",
    sellerNotes: "需补充官方渠道或车源主体。",
    nextAction: candidate.nextAction || "先看车型页和北京门店试驾，再补齐信息墙。",
    notes: candidate.why
  });
  state.cars.unshift(car);
  state.evidence.unshift({
    id: makeId("ev"),
    carId: car.id,
    title: "需求推荐来源",
    type: "analysis",
    status: "pending",
    url: candidate.sourceUrl,
    notes: [
      `推荐理由：${candidate.why || "-"}`,
      `取舍点：${candidate.tradeoffs.join("、") || "-"}`,
      `下一步：${candidate.nextAction || "-"}`
    ].join("\n"),
    attachments: [],
    createdAt: new Date().toISOString().slice(0, 10)
  });
  selectedCarId = car.id;
  selectedCompare.add(car.id);
  const saved = setActiveView("detail", { scroll: "top" });
  showToast(saved ? `已从需求推荐加入${carKindLabel(car.kind)}。` : "已加入当前页面，但本机保存失败，请先导出备份。", saved ? "ok" : "danger");
}

function removeCarFromGarage(carId, { confirm = true } = {}) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car) return false;
  if (confirm && !window.confirm(`确定将「${car.name}」移出候选库吗？相关信息和试驾记录也会删除。`)) return false;
  state.cars = state.cars.filter((item) => item.id !== carId);
  state.evidence = state.evidence.filter((item) => item.carId !== carId);
  state.drives = state.drives.filter((item) => item.carId !== carId);
  state.requirementAnalysis.candidates = state.requirementAnalysis.candidates.filter((item) => item.carId !== carId);
  selectedCompare.delete(carId);
  if (selectedCarId === carId) selectedCarId = state.cars[0]?.id || "";
  if (activeView === "detail") activeView = "garage";
  render();
  showToast("已移出候选库。", "warn");
  return true;
}

function exportChecklist() {
  const car = state.cars.find((item) => item.id === selectedCarId);
  if (!car) return;
  const risk = analyzeCar(car);
  const quality = assessCarQuality(car);
  const content = [
    `# ${car.name} ${car.trim} 核验清单`,
    "",
    `建议：${recommendationLabel(deriveRecommendation(car))}`,
    `风险：${riskLabel(risk.level)} ${risk.score}`,
    `质量：${qualityLevelLabel(quality.confidenceLevel)} / ${qualityRiskLabel(quality.threeElectricRisk)} / 证据完整度 ${quality.evidenceCompleteness}%`,
    `目标价：${formatWan(car.targetPrice)}，当前价：${formatWan(car.price)}`,
    "",
    "## 主要风险",
    ...risk.risks.map((item) => `- [${riskLabel(item.level)}] ${item.title}：${item.question || item.detail}`),
    "",
    "## 三电质量待补",
    ...(quality.missingItems.length ? quality.missingItems.map((item) => `- [ ] ${item}`) : ["- 暂无关键质量缺口"]),
    ...(quality.questions.length ? quality.questions.map((item) => `- [ ] ${item}`) : []),
    "",
    "## 核验清单",
    ...getChecklist(car).map((item) => `- [ ] ${item}`),
    "",
    "## 信息墙",
    ...getCarEvidence(car.id).map((item) => `- ${item.title}${item.url ? ` ${item.url}` : ""}${item.attachments?.length ? `（${item.attachments.length} 张图）` : ""}`)
  ].join("\n");
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(car.name)}-${new Date().toISOString().slice(0, 10)}-checklist.md`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("核验清单已导出。", "ok");
}

function setValue(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.value = value ?? "";
}

function getValue(selector) {
  return document.querySelector(selector)?.value.trim() || "";
}

function numberValue(selector) {
  const value = getValue(selector);
  return value === "" ? "" : Number(value);
}

function switchToDetail(carId) {
  selectedCarId = carId;
  setActiveView("detail", { scroll: "top" });
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

function normalizeWebUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const candidate = raw.startsWith("//")
    ? `https:${raw}`
    : /^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw)
      ? `https://${raw}`
      : raw;
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function normalizeImageUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^data:image\/(?:png|jpe?g|webp|gif|heic|heif);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
  return normalizeWebUrl(raw);
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
});

document.querySelectorAll("[data-discover-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    activeDiscoverTab = button.dataset.discoverTab || "newcars";
    setActiveView("discover", { scroll: "restore" });
    renderDiscover();
  });
});

document.body.addEventListener("click", (event) => {
  const viewLink = event.target.closest("[data-view-link]")?.dataset.viewLink;
  const detailId = event.target.closest("[data-detail]")?.dataset.detail;
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const riskId = event.target.closest("[data-risk]")?.dataset.risk;
  const compareId = event.target.closest("[data-compare]")?.dataset.compare;
  const removeCarId = event.target.closest("[data-remove-car]")?.dataset.removeCar;
  const releaseId = event.target.closest("[data-add-release]")?.dataset.addRelease;
  const usedListingId = event.target.closest("[data-add-used-listing]")?.dataset.addUsedListing;
  const requirementCandidateId = event.target.closest("[data-add-requirement-candidate]")?.dataset.addRequirementCandidate;
  const openSourceAppId = event.target.closest("[data-open-source-app]")?.dataset.openSourceApp;
  const deleteEvidenceId = event.target.closest("[data-delete-evidence]")?.dataset.deleteEvidence;
  const analyzeEvidenceId = event.target.closest("[data-analyze-evidence]")?.dataset.analyzeEvidence;
  const applyEvidenceAnalysisId = event.target.closest("[data-apply-evidence-analysis]")?.dataset.applyEvidenceAnalysis;
  const evidenceRiskButton = event.target.closest("[data-evidence-risk]");
  const investigationStepButton = event.target.closest("[data-investigation-step]");
  const workflowStageButton = event.target.closest("[data-workflow-stage]");
  const copyWorkflowQuestionsId = event.target.closest("[data-copy-workflow-questions]")?.dataset.copyWorkflowQuestions;
  const workflowTaskToggle = event.target.closest("[data-workflow-task-toggle]");
  const workflowTaskEvidence = event.target.closest("[data-workflow-task-evidence]");
  const riskStatusButton = event.target.closest("[data-risk-status]");
  const shouldAddEvidence = Boolean(event.target.closest("[data-add-evidence]"));

  if (event.target.closest("[data-close-copy-fallback]")) {
    event.target.closest(".copy-fallback-panel")?.remove();
  }
  if (viewLink) {
    setActiveView(viewLink);
  }
  if (detailId) switchToDetail(detailId);
  if (editId) openCarDialog(editId);
  if (riskId) {
    selectedCarId = riskId;
    setActiveView("risks");
    document.querySelector("#riskCarSelect").value = riskId;
    renderRisks();
  }
  if (compareId) {
    if (selectedCompare.has(compareId)) selectedCompare.delete(compareId);
    else selectedCompare.add(compareId);
    render();
  }
  if (removeCarId) removeCarFromGarage(removeCarId);
  if (releaseId) addReleaseToGarage(releaseId);
  if (usedListingId) addUsedListingToGarage(usedListingId);
  if (requirementCandidateId) addRequirementCandidateToGarage(requirementCandidateId);
  if (openSourceAppId) openSourceInApp(openSourceAppId);
  if (event.target.closest("[data-dashboard-ai]")) analyzeDashboardBestWithGemini();
  if (riskStatusButton) {
    updateRiskStatus(riskStatusButton.dataset.riskCar, riskStatusButton.dataset.riskKey, riskStatusButton.dataset.riskStatus);
  }
  if (analyzeEvidenceId) analyzeEvidenceById(analyzeEvidenceId);
  if (applyEvidenceAnalysisId) applyEvidenceAnalysis(applyEvidenceAnalysisId);
  if (evidenceRiskButton) toggleEvidenceRiskLink(evidenceRiskButton.dataset.evidenceRisk, evidenceRiskButton.dataset.riskKey);
  if (investigationStepButton) toggleInvestigationStep(investigationStepButton.dataset.investigationCar, investigationStepButton.dataset.investigationStep);
  if (workflowStageButton) advanceWorkflowStage(workflowStageButton.dataset.workflowCar, workflowStageButton.dataset.workflowStage);
  if (copyWorkflowQuestionsId) copyWorkflowQuestions(copyWorkflowQuestionsId);
  if (workflowTaskToggle) toggleWorkflowTask(workflowTaskToggle.dataset.workflowCar, workflowTaskToggle.dataset.workflowTaskToggle);
  if (workflowTaskEvidence) toggleWorkflowTaskEvidence(workflowTaskEvidence.dataset.workflowCar, workflowTaskEvidence.dataset.workflowTaskEvidence, workflowTaskEvidence.dataset.evidenceId);
  if (deleteEvidenceId) {
    if (!window.confirm("确定删除这条信息吗？")) return;
    state.evidence = state.evidence.filter((item) => item.id !== deleteEvidenceId);
    render();
    showToast("信息已删除。", "warn");
  }
  if (shouldAddEvidence) {
    addEvidenceFromForm();
  }
});

document.querySelector("#addCar").addEventListener("click", () => openCarDialog());
document.querySelector("#signOut").addEventListener("click", signOut);
document.querySelector("#closeDialog").addEventListener("click", () => document.querySelector("#carDialog").close());
document.querySelector("#cancelCar").addEventListener("click", () => document.querySelector("#carDialog").close());
document.querySelector("#carDialog").addEventListener("click", (event) => {
  if (event.target.id === "carDialog") {
    document.querySelector("#carDialog").close();
  }
});
document.querySelector("#carForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveCarFromForm();
  document.querySelector("#carDialog").close();
});

document.querySelector("#requirementForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  analyzeRequirementAndCollectCars();
});

document.querySelector("#editRequirement")?.addEventListener("click", () => setRequirementEditMode(true));
document.querySelector("#cancelRequirementEdit")?.addEventListener("click", () => {
  setRequirementEditMode(false);
  showToast("已取消画像修改。", "warn");
});
document.querySelector("#saveRequirement")?.addEventListener("click", () => {
  saveRequirementFromForm();
  requirementEditMode = false;
  render();
  showToast("用车画像已保存。", "ok");
});

document.querySelector("#deleteCar").addEventListener("click", () => {
  const id = getValue("#carId");
  if (removeCarFromGarage(id)) document.querySelector("#carDialog").close();
});

[
  "#searchInput",
  "#kindFilter",
  "#stageFilter",
  "#riskFilter",
  "#batteryFilter",
  "#sourceFilter",
  "#newcarScopeFilter",
  "#newcarBodyFilter",
  "#newcarPriceFilter",
  "#usedcarCityFilter",
  "#usedcarScopeFilter",
  "#usedcarRiskFilter",
  "#rankMode",
  "#riskCarSelect",
  "#detailCarSelect"
].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("input", (event) => {
    if (selector === "#detailCarSelect") selectedCarId = event.target.value;
    render();
  });
});

document.querySelector("#editCurrentCar").addEventListener("click", () => {
  if (selectedCarId) openCarDialog(selectedCarId);
});

document.querySelector("#backToGarage")?.addEventListener("click", () => setActiveView("garage"));
document.querySelector("#prevDetailCar")?.addEventListener("click", () => switchDetailByOffset(-1));
document.querySelector("#nextDetailCar")?.addEventListener("click", () => switchDetailByOffset(1));
document.querySelector("#exportChecklist").addEventListener("click", exportChecklist);
document.querySelector("#copyDecisionReport")?.addEventListener("click", copyDecisionReport);
document.querySelector("#downloadDecisionReport")?.addEventListener("click", downloadDecisionReport);
document.querySelector("#copyActiveDecisionReport")?.addEventListener("click", copyDecisionReport);
document.querySelector("#fetchQualityData")?.addEventListener("click", fetchQualityDataWithAi);
document.querySelector("#refreshQualityData")?.addEventListener("click", refreshQualityAssessment);
document.querySelector("#copyQualityQuestions")?.addEventListener("click", copyQualityQuestions);
document.querySelector("#addPriceEvent")?.addEventListener("click", () => addCurrentPriceEvent(selectedCarId));
document.querySelector("#analyzeInfoWall").addEventListener("click", () => analyzeCurrentCarWithGemini({ auto: false }));
document.querySelector("#analyzeRiskCar").addEventListener("click", analyzeRiskCarWithGemini);
document.querySelector("#refreshDcdNewCars").addEventListener("click", refreshDongchediNewCars);
document.querySelector("#refreshDcdUsedCars").addEventListener("click", refreshDongchediUsedCars);

document.querySelector("#evidenceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  addEvidenceFromForm();
});

document.querySelector("#driveForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.drives.unshift({
    id: makeId("drive"),
    carId: getValue("#driveCar"),
    date: getValue("#driveDate"),
    place: getValue("#drivePlace"),
    seat: Number(document.querySelector("#scoreSeat").value),
    nvh: Number(document.querySelector("#scoreNvh").value),
    chassis: Number(document.querySelector("#scoreChassis").value),
    cockpit: Number(document.querySelector("#scoreCockpit").value),
    adas: Number(document.querySelector("#scoreAdas").value),
    highway: Number(document.querySelector("#scoreHighway").value),
    relative: getValue("#driveRelative"),
    notes: getValue("#driveNotes")
  });
  setValue("#driveNotes", "");
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
  showToast("数据 JSON 已导出。", "ok");
});

document.querySelector("#importData").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const previousState = state;
  const previousSelectedCarId = selectedCarId;
  const previousCompare = new Set(selectedCompare);
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nextState = normalizeState(parsed);
    if (!nextState.cars.length) throw new Error("导入文件里没有候选车辆。");
    state = nextState;
    selectedCarId = state.selectedCarId || state.cars[0]?.id || "";
    selectedCompare = new Set(state.selectedCompare?.length ? state.selectedCompare : state.cars.slice(0, 3).map((car) => car.id));
    requirementEditMode = false;
    const saved = render();
    showToast(saved ? "数据已导入。" : "数据已导入当前页面，但本机存储失败，请先导出备份。", saved ? "ok" : "danger");
  } catch (error) {
    state = previousState;
    selectedCarId = previousSelectedCarId;
    selectedCompare = previousCompare;
    render();
    showToast(`导入失败：${error?.message || "文件格式不正确"}`, "danger");
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#resetSeed").addEventListener("click", () => {
  if (!window.confirm("确定恢复样例数据吗？当前账号/本机数据会被样例覆盖。")) return;
  const freshIds = {
    es6: makeId("car"),
    es8: makeId("car"),
    i6: makeId("car"),
    g7: makeId("car")
  };
  const idMap = {
    [seedIds.es6]: freshIds.es6,
    [seedIds.es8]: freshIds.es8,
    [seedIds.i6]: freshIds.i6,
    [seedIds.g7]: freshIds.g7
  };
  state = normalizeState({
    cars: seedCars.map((car) => ({ ...car, id: idMap[car.id] || makeId("car") })),
    evidence: seedEvidence.map((item) => ({ ...item, id: makeId("ev"), carId: idMap[item.carId] || item.carId })),
    drives: [],
    userRequirement: seedRequirement,
    requirementAnalysis: {}
  });
  selectedCarId = state.cars[0]?.id || "";
  selectedCompare = new Set(state.cars.slice(0, 3).map((car) => car.id));
  requirementEditMode = false;
  render();
  showToast("已恢复样例数据。", "warn");
});

render();
initGoogleAuth();
