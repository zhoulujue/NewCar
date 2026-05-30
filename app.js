const BASE_STORAGE_KEY = "newcar-workbench-v1";
const AUTH_PROFILE_KEY = "newcar-auth-profile";
const INDICATOR_DEADLINE = new Date("2027-05-26T23:59:59+08:00");
const INFO_IMAGE_MAX_EDGE = 1600;
const INFO_IMAGE_QUALITY = 0.82;
const LOCAL_GEMINI_ANALYZER_URL = window.NEWCAR_AI_CONFIG?.geminiAnalyzerUrl || "http://127.0.0.1:8787/analyze";
const DONGCHEDI_NEWCAR_URL = window.NEWCAR_DATA_CONFIG?.dongchediNewcarUrl || "/api/dongchedi/recent-models";
const LOCAL_DONGCHEDI_NEWCAR_URL = window.NEWCAR_DATA_CONFIG?.localDongchediNewcarUrl || "http://127.0.0.1:8788/dongchedi/recent-models";

let geminiAnalysisRunning = false;
let geminiUnavailableNotified = false;
let newCarRefreshRunning = false;

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

let currentUser = loadAuthProfile();
let googleAuthReady = false;
let googleAuthAttempts = 0;
let state = normalizeState(loadState());
let activeView = "dashboard";
let selectedCarId = state.selectedCarId || state.cars[0]?.id || "";
let selectedCompare = new Set(state.selectedCompare?.length ? state.selectedCompare : state.cars.slice(0, 3).map((car) => car.id));

const viewMeta = {
  dashboard: ["总览", "一眼看到当前最值得看的车、关键风险和今天该做什么。"],
  garage: ["车源库", "记录备选车、车源类型、成本、权益、信息和推荐状态。"],
  newcars: ["新车情报", "刷新懂车帝近期发布车型，按你的偏好筛出值得关注的新车。"],
  detail: ["车源详情", "围绕单台车回答：为什么便宜、是否接近 i6、风险是否值得折价。"],
  compare: ["对比", "按真实成本、i6体感、权益明确度和风险做取舍。"],
  drives: ["试驾", "记录前排舒适、静谧、底盘、车机、智驾和相对 i6 结论。"],
  risks: ["风险", "按车源信息自动提示二手新能源可能存在的坑。"],
  sellers: ["商家", "聚合卖家身份、承诺、保障和车源风险。"],
  timeline: ["时间线", "跟踪指标到期、降价目标、复检和试驾节奏。"]
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
    market: normalizeMarket(rawState.market),
    selectedCarId: rawState.selectedCarId || cars[0]?.id || "",
    selectedCompare: Array.isArray(rawState.selectedCompare) ? rawState.selectedCompare.filter((id) => carIds.has(id)) : []
  };
}

function normalizeCar(car) {
  const experience = car.experience || {};
  const costs = car.costs || {};
  return {
    id: car.id || makeId("car"),
    name: car.name || "",
    trim: car.trim || "",
    stage: car.stage || "watching",
    recommendation: car.recommendation || "auto",
    url: car.url || "",
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
    image: car.image || "",
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
    notes: car.notes || ""
  };
}

function normalizeEvidence(item) {
  return {
    id: item.id || makeId("ev"),
    carId: item.carId,
    title: item.title || "未命名信息",
    type: item.type || "other",
    status: item.status || "pending",
    url: item.url || "",
    notes: item.notes || "",
    attachments: Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment).filter(Boolean) : [],
    createdAt: item.createdAt || new Date().toISOString().slice(0, 10)
  };
}

function normalizeAttachment(attachment) {
  if (!attachment?.dataUrl) return null;
  return {
    id: attachment.id || makeId("att"),
    name: attachment.name || "图片",
    type: attachment.type || "image/jpeg",
    size: numberOrBlank(attachment.size),
    dataUrl: attachment.dataUrl
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
  return {
    releases: Array.isArray(market.releases) ? market.releases.map(normalizeRelease).filter(Boolean) : [],
    lastFetchedAt: market.lastFetchedAt || "",
    sourceUrl: market.sourceUrl || "",
    sourceLabel: market.sourceLabel || "懂车帝",
    error: market.error || ""
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
    priceText: item.priceText || "",
    priceMinWan: numberOrBlank(item.priceMinWan),
    priceMaxWan: numberOrBlank(item.priceMaxWan),
    releaseDate: item.releaseDate || "",
    releaseTimestamp: numberOrBlank(item.releaseTimestamp),
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean).map(String) : [],
    coverUrl: item.coverUrl || "",
    dcdUrl: item.dcdUrl || "",
    articleUrl: item.articleUrl || "",
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
    link: model.link || ""
  };
}

function normalizeReleaseNews(news) {
  if (!news?.title) return null;
  return {
    title: news.title || "",
    url: news.url || "",
    source: news.source || "懂车帝",
    publishTime: news.publishTime || ""
  };
}

function saveState() {
  state.selectedCarId = selectedCarId;
  state.selectedCompare = [...selectedCompare];
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state, null, 2));
  } catch {
    showToast("本机存储空间不足，建议少量分批上传图片，或先压缩截图。", "danger");
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
      ? "Google 登录用于身份识别；当前版本数据仍保存在本机浏览器。"
      : "尚未配置 Google Client ID。请在 auth-config.js 中填入 OAuth Web Client ID。";
    return;
  }
  document.querySelector("#authName").textContent = currentUser.name || "Google 用户";
  document.querySelector("#authEmail").textContent = currentUser.email || "";
  document.querySelector("#authScope").textContent = "已启用账号数据分区";
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
    rejected: "排除",
    purchased: "已成交"
  }[stage] || "观察";
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
    analysis: "Gemini 分析",
    listing: "车源截图",
    config: "配置单",
    report: "检测报告",
    chat: "客服回复",
    contract: "合同条款",
    rights: "权益截图",
    repair: "维修记录",
    other: "其他"
  }[type] || "其他";
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

function getCarEvidence(carId) {
  return state.evidence.filter((item) => item.carId === carId);
}

function hasInfoValue(item) {
  return Boolean(item.title || item.notes || item.url || item.attachments?.length || item.status === "valid");
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
  return Math.round(Math.max(0, rangeScore + valueScore + ownershipScore + i6 + comfortBonus + sizeScore + evidenceScore - risk * 0.22));
}

function deriveRecommendation(car) {
  if (car.recommendation && car.recommendation !== "auto") return car.recommendation;
  if (car.stage === "rejected") return "reject";
  const risk = analyzeCar(car);
  const discount = getDiscountPct(car) || 0;
  if (risk.score >= 82) return "reject";
  if (risk.score >= 62) return "bargainOnly";
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
  const evidence = getCarEvidence(car.id);
  const validEvidenceCount = evidence.filter(hasInfoValue).length;

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

  const score = Math.min(100, risks.reduce((sum, item) => sum + ({ high: 34, medium: 18, low: 8 }[item.level] || 0), 0));
  return { risks, score, level: riskLevelFromScore(score) };
}

function getChecklist(car) {
  const isNio = /蔚来|ES6|ES8|EC6|ET5/i.test(`${car.name} ${car.trim}`);
  const isLi = /理想|i6|L6|L7|L8|L9/i.test(`${car.name} ${car.trim}`);
  const items = [
    "完整出险记录、维保记录、第三方检测报告。",
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
  renderGarage();
  renderNewCars();
  renderDetail();
  renderCompare();
  renderDrives();
  renderRisks();
  renderSellers();
  renderTimeline();
  saveState();
}

function ensureSelectedCar() {
  if (!state.cars.some((car) => car.id === selectedCarId)) {
    selectedCarId = state.cars[0]?.id || "";
  }
}

function renderNav() {
  const activeNavView = activeView === "detail" ? "garage" : activeView;
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

function renderDashboard() {
  const risks = state.cars.map(analyzeCar);
  const highCount = risks.filter((risk) => risk.level === "high").length;
  const avgRisk = risks.length ? Math.round(risks.reduce((sum, item) => sum + item.score, 0) / risks.length) : 0;
  const best = [...state.cars].sort((a, b) => fitScore(b) - fitScore(a))[0];
  const monthly = state.cars.reduce((sum, car) => sum + costProfile(car).monthly, 0);

  document.querySelector("#decisionSummary").innerHTML = `
    <div>
      <div class="eyebrow">当前判断</div>
      <h2>${best ? `${escapeHtml(best.name)} ${escapeHtml(best.trim || "")}：${recommendationLabel(deriveRecommendation(best))}` : "先添加一台车源"}</h2>
      <p>${best ? escapeHtml(best.nextAction || "补齐信息、成本和试驾记录后再做最终判断。") : "系统会自动生成风险和核验清单。"}</p>
    </div>
    <div class="deadline-pill">
      <span>指标到期</span>
      <strong>${daysUntilDeadline()} 天</strong>
    </div>
  `;

  document.querySelector("#metricsGrid").innerHTML = [
    metric("候选车", state.cars.length, best ? `最高匹配：${best.name}` : "当前车库数量"),
    metric("高风险", highCount, "需要先问清楚"),
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
      <button class="rank-item" data-detail="${car.id}">
        <div class="rank-index">${index + 1}</div>
        <div>
          <div class="car-name">${escapeHtml(car.name)}</div>
          <div class="car-trim">${escapeHtml(car.trim || "")}</div>
          <div class="chip-row tight">
            <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
            <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
          </div>
        </div>
        <div class="fit-score">${score}</div>
      </button>
    `;
  }).join("");

  const actions = state.cars.flatMap((car) => analyzeCar(car).risks.slice(0, 2).map((risk) => ({ car, risk })));
  document.querySelector("#actionList").innerHTML = actions.slice(0, 8).map(({ car, risk }) => `
    <button class="action-item ${risk.level}" data-detail="${car.id}">
      <strong>${escapeHtml(car.name)}</strong>
      <div>${escapeHtml(risk.title)}</div>
      <div class="muted">${escapeHtml(risk.question || risk.detail)}</div>
    </button>
  `).join("") || `<div class="muted">暂无风险项。</div>`;

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

function getFilteredCars() {
  const query = document.querySelector("#searchInput")?.value.trim().toLowerCase() || "";
  const stage = document.querySelector("#stageFilter")?.value || "all";
  const risk = document.querySelector("#riskFilter")?.value || "all";
  const battery = document.querySelector("#batteryFilter")?.value || "all";
  const source = document.querySelector("#sourceFilter")?.value || "all";
  return state.cars.filter((car) => {
    const haystack = `${car.name} ${car.trim} ${car.city} ${car.seller} ${car.source} ${car.notes} ${car.issues}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStage = stage === "all" || car.stage === stage;
    const riskLevel = analyzeCar(car).level;
    const matchesRisk = risk === "all" || riskLevel === risk;
    const matchesBattery = battery === "all" || car.battery === battery;
    const matchesSource = source === "all" || sourceBucket(car.source) === source;
    return matchesQuery && matchesStage && matchesRisk && matchesBattery && matchesSource;
  });
}

function renderGarage() {
  const cars = getFilteredCars();
  document.querySelector("#carGrid").innerHTML = cars.map((car) => {
    const risk = analyzeCar(car);
    const discount = getDiscountPct(car);
    const cost = costProfile(car);
    const rec = deriveRecommendation(car);
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
            <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
            <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
            <span class="chip">${stageLabel(car.stage)}</span>
            <span class="chip">${batteryLabel(car.battery)}</span>
            ${discount !== null ? `<span class="chip">折让 ${discount.toFixed(1)}%</span>` : ""}
          </div>
          <div class="car-meta">
            <div class="meta-cell"><div class="meta-label">3年成本</div><div class="meta-value">${formatWan(cost.year3)}</div></div>
            <div class="meta-cell"><div class="meta-label">i6标尺</div><div class="meta-value">${i6Score(car)}/100</div></div>
            <div class="meta-cell"><div class="meta-label">目标价</div><div class="meta-value">${formatWan(car.targetPrice)}</div></div>
          </div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(car.city || "未知城市")}</span>
            <span class="chip">${escapeHtml(car.source || "未知车源")}</span>
            <span class="chip">${reportLabel(car.report)}</span>
            <span class="chip">${nopLabel(car.nop)}</span>
          </div>
          <p class="card-note">${escapeHtml(car.nextAction || analyzeCar(car).risks[0]?.question || "补齐车源信息后再判断。")}</p>
          <div class="card-actions">
            <button data-detail="${car.id}">详情</button>
            <button data-edit="${car.id}">编辑</button>
            <button data-risk="${car.id}">风险</button>
            <button data-compare="${car.id}">${selectedCompare.has(car.id) ? "移出" : "对比"}</button>
            ${car.url ? `<a href="${escapeAttr(car.url)}" target="_blank" rel="noreferrer">打开</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("") || `<div class="muted">没有符合条件的车源。</div>`;
}

function renderNewCars() {
  const status = document.querySelector("#newcarStatus");
  const spotlight = document.querySelector("#newcarSpotlight");
  const grid = document.querySelector("#newcarGrid");
  if (!status || !spotlight || !grid) return;
  const releases = getFilteredNewReleases();
  const total = state.market.releases.length;
  const lastFetched = state.market.lastFetchedAt ? formatDateTime(state.market.lastFetchedAt) : "";
  status.textContent = total
    ? `已缓存 ${total} 款，当前显示 ${releases.length} 款。${lastFetched ? `上次刷新：${lastFetched}` : ""}`
    : "还没有刷新数据。点击按钮后会从懂车帝获取近期发布车型。";

  if (!total) {
    spotlight.innerHTML = `
      <section class="panel newcar-empty">
        <h2>从懂车帝拉一份近期新车清单</h2>
        <p class="muted">刷新后会保存到本机缓存，后续可按新能源、车身形式、30万附近价格筛选，也能把感兴趣的新车加入车源库继续跟踪。</p>
      </section>
    `;
    grid.innerHTML = "";
    return;
  }

  const best = releases[0] || state.market.releases[0];
  spotlight.innerHTML = best ? renderNewCarSpotlight(best) : "";
  grid.innerHTML = releases.map(renderNewCarCard).join("") || `<div class="muted">当前筛选条件下没有车型。</div>`;
}

function getFilteredNewReleases() {
  const scope = document.querySelector("#newcarScopeFilter")?.value || "fit";
  const body = document.querySelector("#newcarBodyFilter")?.value || "all";
  const price = document.querySelector("#newcarPriceFilter")?.value || "all";
  return [...(state.market.releases || [])]
    .filter((release) => {
      if (scope === "newenergy" && !isNewEnergyRelease(release)) return false;
      if (scope === "fit" && !releaseMatchesUserProfile(release)) return false;
      if (body !== "all" && newReleaseBodyBucket(release) !== body) return false;
      if (price !== "all" && newReleasePriceBucket(release) !== price) return false;
      return true;
    })
    .sort((a, b) => {
      if (scope === "fit") return newReleaseFitScore(b) - newReleaseFitScore(a);
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
        <div class="chip-row tight">
          <span class="chip ok">适配度 ${fit}</span>
          <span class="chip info">${escapeHtml(release.energyLabel)}</span>
          <span class="chip">${escapeHtml(release.carType || "车型待确认")}</span>
        </div>
        <h2>${escapeHtml(release.brandName)} ${escapeHtml(release.seriesName)}</h2>
        <p class="muted">${escapeHtml(release.releaseDate || "发布日期待确认")} · ${escapeHtml(release.priceText || "价格待确认")} · 数据来自懂车帝</p>
        <div class="newcar-reason-list">
          ${reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button data-add-release="${release.seriesId}" type="button">加入车源库</button>
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
          <button data-add-release="${release.seriesId}" type="button">加入观察</button>
          <a href="${escapeAttr(release.dcdUrl)}" target="_blank" rel="noreferrer">懂车帝</a>
          ${release.articleUrl ? `<a href="${escapeAttr(release.articleUrl)}" target="_blank" rel="noreferrer">资讯</a>` : ""}
        </div>
      </div>
    </article>
  `;
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

function firstModelMatch(release, pattern) {
  for (const model of release.models || []) {
    const text = [model.groupKey, model.battery, model.range, model.power, model.baseConfig.join(" "), model.highlightsConfig.join(" ")].join(" ");
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function formatDimensions(dimensions) {
  if (!dimensions?.length) return "-";
  return `${dimensions.length}/${dimensions.width || "-"}/${dimensions.height || "-"} · ${dimensions.wheelbase || "-"}轴距`;
}

function isNewEnergyRelease(release) {
  return ["ev", "phev", "erev", "hev", "new_energy"].includes(release.energyType);
}

function releaseMatchesUserProfile(release) {
  if (!isNewEnergyRelease(release)) return false;
  if (newReleasePriceBucket(release) === "expensive") return false;
  if (/微型|小型车|皮卡|跑车/.test(release.carType || "")) return false;
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
  const min = release.priceMinWan;
  const max = release.priceMaxWan || min;
  if (min === "") return "all";
  if (min <= 31 && max >= 20) return "budget";
  if (min <= 40) return "stretch";
  return "expensive";
}

function newReleaseFitScore(release) {
  let score = 18;
  if (isNewEnergyRelease(release)) score += 18;
  const min = release.priceMinWan;
  const max = release.priceMaxWan || min;
  if (min !== "") {
    if (min <= 31 && max >= 22) score += 24;
    else if (min <= 40) score += 14;
    else score -= 12;
  }
  const body = newReleaseBodyBucket(release);
  if (body === "suv" || body === "sedan") score += 12;
  if (body === "mpv") score += 2;
  if (/中大型|大型|行政|六座|七座/.test(`${release.carType} ${release.seriesName}`)) score -= 4;
  const brandText = `${release.brandName} ${release.seriesName}`;
  if (/理想|蔚来|乐道|极氪|奥迪|小米|智界|问界|阿维塔/i.test(brandText)) score += 10;
  if (/i6|ES6|7X|Q6L|E7X|YU7|L80|R7/i.test(brandText)) score += 8;
  if (firstModelMatch(release, /续航\s*(\d+)\s*km/i) >= 650 || firstModelMatch(release, /(\d+)\s*km/i) >= 650) score += 8;
  if (release.score.comfort >= 4 || release.score.interior >= 4) score += 4;
  if (/改款|小改款|新增车型|全新车系/.test(release.tags.join(" "))) score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function newReleaseFitReasons(release) {
  const reasons = [];
  if (isNewEnergyRelease(release)) reasons.push(release.energyLabel);
  if (newReleasePriceBucket(release) === "budget") reasons.push("价格落在30万附近");
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
  if (!car) {
    document.querySelector("#detailHero").innerHTML = `<div class="muted">暂无车源。</div>`;
    return;
  }
  const risk = analyzeCar(car);
  const rec = deriveRecommendation(car);
  const cost = costProfile(car);
  const discount = getDiscountPct(car);

  document.querySelector("#detailHero").innerHTML = `
    <div class="detail-hero">
      <div class="detail-image">${car.image ? `<img src="${escapeAttr(car.image)}" alt="${escapeAttr(car.name)}">` : `<span>${escapeHtml(car.name)}</span>`}</div>
      <div>
        <div class="chip-row tight">
          <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
          <span class="chip ${risk.level}">${riskLabel(risk.level)} ${risk.score}</span>
          <span class="chip">${stageLabel(car.stage)}</span>
        </div>
        <h2>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</h2>
        <p class="muted">${escapeHtml(car.city || "未知城市")} · ${escapeHtml(car.source || "未知车源")} · ${escapeHtml(car.seller || "未知商家")}</p>
        <div class="hero-facts">
          <div><span>售价</span><strong>${formatWan(car.price)}</strong></div>
          <div><span>新车参考</span><strong>${formatWan(car.newPrice)}</strong></div>
          <div><span>折价</span><strong>${formatPct(discount)}</strong></div>
          <div><span>目标价</span><strong>${formatWan(car.targetPrice)}</strong></div>
        </div>
        <p class="detail-note">${escapeHtml(car.notes || "暂无备注。")}</p>
      </div>
    </div>
  `;

  document.querySelector("#detailDecision").innerHTML = `
    <div class="decision-score ${risk.level}">
      <div>
        <span>风险分</span>
        <strong>${risk.score}</strong>
      </div>
      <span class="chip ${recommendationClass(rec)}">${recommendationLabel(rec)}</span>
    </div>
    <div class="decision-row"><span>综合匹配</span><strong>${fitScore(car)}</strong></div>
    <div class="decision-row"><span>i6标尺</span><strong>${i6Score(car)}/100</strong></div>
    <div class="decision-row"><span>3年成本</span><strong>${formatWan(cost.year3)}</strong></div>
    <div class="decision-row"><span>月固定成本</span><strong>${formatNumber(cost.monthly, "元")}</strong></div>
    <p class="muted">${escapeHtml(car.nextAction || "补齐关键信息后再推进。")}</p>
  `;

  document.querySelector("#costPanel").innerHTML = renderCostPanel(car);
  document.querySelector("#i6Matrix").innerHTML = renderI6Matrix(car);
  renderEvidenceWall(car);
  document.querySelector("#whyCheap").innerHTML = risk.risks.map((item) => renderRiskCard(item)).join("") || `<div class="muted">暂无自动风险项。</div>`;
  document.querySelector("#detailChecklist").innerHTML = getChecklist(car).map((item) => `
    <div class="check-item">
      <div class="check-dot"></div>
      <div>${escapeHtml(item)}</div>
    </div>
  `).join("");
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
          <button class="mini-button" data-delete-evidence="${item.id}" type="button">删除</button>
        </div>
        <div class="chip-row tight">
          <span class="chip">${evidenceTypeLabel(item.type)}</span>
          ${item.status && item.status !== "valid" ? `<span class="chip ${item.status === "conflict" ? "danger" : "warn"}">${evidenceStatusLabel(item.status)}</span>` : ""}
          ${item.attachments?.length ? `<span class="chip info">${item.attachments.length} 张图</span>` : ""}
        </div>
        ${renderInfoAttachments(item)}
        <p class="muted info-note">${escapeHtml(item.notes || "暂无说明。")}</p>
      </div>
      <div class="evidence-foot">
        <span>${escapeHtml(item.createdAt || "")}</span>
        ${item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">打开</a>` : ""}
      </div>
    </article>
  `).join("") || `<div class="muted">还没有信息。可以直接写一段判断，或上传车源截图、聊天截图、检测报告照片。</div>`;
}

function renderInfoAttachments(item) {
  const attachments = item.attachments || [];
  const linkedImage = isImageUrl(item.url) ? [{ id: "url", name: "链接图片", dataUrl: item.url }] : [];
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

function isImageUrl(url) {
  return /^data:image\//.test(url || "") || /\.(png|jpe?g|webp|gif|heic|heif)(\?.*)?$/i.test(url || "");
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
  const current = select.value || selectedCarId || state.cars[0]?.id;
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
        <h3>${escapeHtml(car.name)} ${escapeHtml(car.trim || "")}</h3>
        <div class="muted">${escapeHtml(car.seller || "-")} · ${escapeHtml(car.city || "-")}</div>
        <div class="chip-row">
          <span class="chip ${result.level}">${riskLabel(result.level)}</span>
          <span class="chip">${batteryLabel(car.battery)}</span>
          <span class="chip">${nopLabel(car.nop)}</span>
          <span class="chip">${reportLabel(car.report)}</span>
        </div>
      </div>
    </div>
    <div class="risk-list">
      ${result.risks.map(renderRiskCard).join("") || `<div class="muted">暂无自动风险项。</div>`}
    </div>
  `;
  document.querySelector("#checklist").innerHTML = getChecklist(car).map((item) => `
    <div class="check-item">
      <div class="check-dot"></div>
      <div>${escapeHtml(item)}</div>
    </div>
  `).join("");
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
            <button data-detail="${car.id}">
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
  document.querySelector("#timelineBoard").innerHTML = buildTimelineItems().map((item) => `
    <div class="timeline-item ${item.level || ""}">
      <div class="timeline-date">${escapeHtml(item.date)}</div>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p class="muted">${escapeHtml(item.detail)}</p>
      </div>
      ${item.carId ? `<button class="mini-button" data-detail="${item.carId}">详情</button>` : ""}
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
  document.querySelector("#dialogTitle").textContent = car ? "编辑车源" : "新增车源";
  document.querySelector("#deleteCar").style.display = car ? "inline-block" : "none";
  const data = normalizeCar(car || {});
  setValue("#carId", car ? data.id : "");
  setValue("#carName", data.name);
  setValue("#carTrim", data.trim);
  setValue("#carStage", data.stage);
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
  const car = normalizeCar({
    ...(existing || {}),
    id,
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
    options: getValue("#carOptions"),
    issues: getValue("#carIssues"),
    rightsNotes: getValue("#carRightsNotes"),
    sellerNotes: getValue("#carSellerNotes"),
    nextAction: getValue("#carNextAction"),
    notes: getValue("#carNotes")
  });
  const index = state.cars.findIndex((item) => item.id === id);
  if (index >= 0) state.cars[index] = car;
  else state.cars.unshift(car);
  selectedCarId = id;
  render();
  showToast(index >= 0 ? "车源已更新。" : "车源已添加。", "ok");
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
  if (!title && !url && !notes && !attachments.length) {
    showToast("先写一点信息，或上传照片/截图。", "warn");
    return;
  }
  const fallbackTitle = notes ? notes.slice(0, 24) : attachments[0]?.name || url || "未命名信息";
  const item = {
    id: makeId("ev"),
    carId: selectedCarId,
    title: title || fallbackTitle,
    type: "note",
    status: "valid",
    url,
    notes,
    attachments,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  state.evidence.unshift(item);
  ["#evidenceTitle", "#evidenceUrl", "#evidenceNotes"].forEach((selector) => setValue(selector, ""));
  if (document.querySelector("#evidenceFiles")) document.querySelector("#evidenceFiles").value = "";
  render();
  showToast("信息已加入当前车源，正在调用本地 Gemini 分析。", "ok");
  analyzeCurrentCarWithGemini({ auto: true, focusInfoId: item.id });
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

async function analyzeCurrentCarWithGemini({ auto = false, focusInfoId = "" } = {}) {
  if (geminiAnalysisRunning) {
    if (!auto) showToast("Gemini 正在分析中。", "warn");
    return;
  }
  const car = state.cars.find((item) => item.id === selectedCarId);
  if (!car) return;
  geminiAnalysisRunning = true;
  setGeminiButtonState(true);
  if (!auto) showToast("正在调用本地 Gemini 分析信息墙。", "ok");
  try {
    const response = await fetch(LOCAL_GEMINI_ANALYZER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGeminiPayload(car, focusInfoId))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || `Gemini 分析失败：${response.status}`);
    }
    applyGeminiAnalysis(result, focusInfoId);
    geminiUnavailableNotified = false;
    render();
    showToast("Gemini 已分析并更新车源信息。", "ok");
  } catch (error) {
    const message = error?.message || "本地 Gemini 分析失败。";
    if (auto) {
      if (!geminiUnavailableNotified) {
        showToast("信息已保存；本地 Gemini 分析服务未就绪，可稍后点 Gemini 分析。", "warn");
        geminiUnavailableNotified = true;
      }
    } else {
      showToast(message.includes("Failed to fetch") ? "请先启动本地 Gemini 分析服务。" : message, "danger");
    }
  } finally {
    geminiAnalysisRunning = false;
    setGeminiButtonState(false);
  }
}

function setGeminiButtonState(isRunning) {
  const button = document.querySelector("#analyzeInfoWall");
  if (!button) return;
  button.disabled = isRunning;
  button.textContent = isRunning ? "分析中..." : "Gemini 分析";
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
      certified: ["official", "platform", "dealer", "unknown"]
    }
  };
}

function cloneCarForGemini(car) {
  return {
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
    experience: car.experience
  };
}

function applyGeminiAnalysis(result, focusInfoId) {
  const car = state.cars.find((item) => item.id === selectedCarId);
  if (!car) return;
  applyCarPatch(car, result.carPatch || {});
  const focusInfo = state.evidence.find((item) => item.id === focusInfoId);
  if (focusInfo && result.infoCard) {
    if (result.infoCard.title) focusInfo.title = String(result.infoCard.title).slice(0, 80);
    if (result.infoCard.notes) focusInfo.notes = String(result.infoCard.notes);
    if (["valid", "pending", "conflict", "expired"].includes(result.infoCard.status)) focusInfo.status = result.infoCard.status;
  }
  const analysisNotes = formatGeminiAnalysisNotes(result.analysis, result.carPatch);
  if (analysisNotes) {
    state.evidence.unshift({
      id: makeId("ev"),
      carId: car.id,
      title: "Gemini 分析结果",
      type: "analysis",
      status: result.analysis?.riskLevel === "high" ? "conflict" : result.analysis?.confidence === "low" ? "pending" : "valid",
      url: "",
      notes: analysisNotes,
      attachments: [],
      createdAt: new Date().toISOString().slice(0, 10)
    });
  }
}

function applyCarPatch(car, patch) {
  const textFields = ["name", "trim", "url", "plateDate", "city", "source", "seller", "exterior", "interior", "options", "issues", "rightsNotes", "sellerNotes", "nextAction", "notes"];
  textFields.forEach((field) => {
    if (typeof patch[field] === "string" && patch[field].trim()) car[field] = patch[field].trim();
  });
  const numberFields = ["price", "newPrice", "targetPrice", "landing", "batteryMonthly", "batterySize", "range", "mileage", "transfers"];
  numberFields.forEach((field) => {
    if (Number.isFinite(Number(patch[field]))) car[field] = Number(patch[field]);
  });
  applyEnumPatch(car, patch, "stage", ["watching", "contacted", "test-drive", "negotiating", "recheck", "rejected", "purchased"]);
  applyEnumPatch(car, patch, "recommendation", ["auto", "worthViewing", "watch", "waitDrop", "bargainOnly", "reject"]);
  applyEnumPatch(car, patch, "battery", ["buyout", "baas", "unknown"]);
  applyEnumPatch(car, patch, "nop", ["included", "subscription", "none", "unknown"]);
  applyEnumPatch(car, patch, "report", ["full", "basic", "none", "unknown"]);
  applyEnumPatch(car, patch, "certified", ["official", "platform", "dealer", "unknown"]);
  if (patch.experience && typeof patch.experience === "object") {
    Object.keys(car.experience).forEach((key) => {
      const value = Number(patch.experience[key]);
      if (Number.isFinite(value)) car.experience[key] = Math.max(1, Math.min(10, Math.round(value)));
    });
  }
}

function applyEnumPatch(car, patch, field, allowed) {
  if (allowed.includes(patch[field])) car[field] = patch[field];
}

function formatGeminiAnalysisNotes(analysis, patch) {
  if (!analysis && !patch) return "";
  const lines = [];
  if (analysis?.summary) lines.push(`结论：${analysis.summary}`);
  if (analysis?.confidence) lines.push(`置信度：${analysis.confidence}`);
  if (analysis?.riskLevel) lines.push(`风险判断：${riskLabel(analysis.riskLevel)}`);
  if (analysis?.priceOpinion) lines.push(`价格：${analysis.priceOpinion}`);
  if (analysis?.rightsOpinion) lines.push(`权益：${analysis.rightsOpinion}`);
  if (analysis?.conditionOpinion) lines.push(`车况：${analysis.conditionOpinion}`);
  if (Array.isArray(analysis?.questions) && analysis.questions.length) {
    lines.push("下一步问题：");
    analysis.questions.slice(0, 8).forEach((question) => lines.push(`- ${question}`));
  }
  if (patch?.nextAction) lines.push(`建议动作：${patch.nextAction}`);
  return lines.join("\n");
}

async function refreshDongchediNewCars() {
  if (newCarRefreshRunning) {
    showToast("正在刷新懂车帝数据。", "warn");
    return;
  }
  newCarRefreshRunning = true;
  setNewCarRefreshState(true);
  showToast("正在从懂车帝刷新近期发布车型。", "ok");
  const urls = getDongchediFeedUrls();
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
        showToast(`已刷新 ${state.market.releases.length} 款近期发布车型。`, "ok");
        return;
      } catch (error) {
        lastError = error?.message || "刷新失败";
      }
    }
    throw new Error(lastError || "无法连接懂车帝数据服务。");
  } catch (error) {
    state.market.error = error?.message || "刷新失败";
    renderNewCars();
    showToast("刷新失败，请确认新车数据服务已启动。", "danger");
  } finally {
    newCarRefreshRunning = false;
    setNewCarRefreshState(false);
  }
}

function getDongchediFeedUrls() {
  const params = "limit=30&detailLimit=18";
  const urls = [];
  if (location.protocol === "http:" || location.protocol === "https:") {
    urls.push(withQuery(DONGCHEDI_NEWCAR_URL, params));
  }
  urls.push(withQuery(LOCAL_DONGCHEDI_NEWCAR_URL, params));
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
    error: ""
  });
}

function setNewCarRefreshState(isRunning) {
  const button = document.querySelector("#refreshDcdNewCars");
  if (!button) return;
  button.disabled = isRunning;
  button.textContent = isRunning ? "刷新中..." : "刷新懂车帝数据";
}

function addReleaseToGarage(seriesId) {
  const release = state.market.releases.find((item) => String(item.seriesId) === String(seriesId));
  if (!release) return;
  const existing = state.cars.find((car) => car.url === release.dcdUrl || `${car.name} ${car.trim}`.includes(release.seriesName));
  if (existing) {
    switchToDetail(existing.id);
    showToast("这款车已经在车源库里。", "warn");
    return;
  }
  const facts = getReleaseModelFacts(release);
  const firstModel = release.models[0] || {};
  const car = normalizeCar({
    id: makeId("car"),
    name: release.seriesName,
    trim: firstModel.year ? `${firstModel.year}款 ${firstModel.name || ""}`.trim() : firstModel.name || "近期发布车型",
    stage: "watching",
    recommendation: newReleaseFitScore(release) >= 70 ? "worthViewing" : "watch",
    url: release.dcdUrl,
    image: release.coverUrl,
    city: "北京",
    source: "懂车帝新车",
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
    rightsNotes: "从懂车帝近期发布车型加入，具体订金、锁单、退订、质保、智驾和充电/补能权益以品牌合同为准。",
    sellerNotes: release.articleTitle || "懂车帝车型页与上市资讯已记录。",
    nextAction: "关注北京试驾车到店、首批车主反馈、实际成交权益和7-8月价格变化。",
    notes: `来自懂车帝新车情报。${facts.energy ? `核心信息：${facts.energy}。` : ""}`
  });
  state.cars.unshift(car);
  selectedCarId = car.id;
  selectedCompare.add(car.id);
  activeView = "detail";
  render();
  showToast("已加入车源库，可以继续补信息墙和试驾记录。", "ok");
}

function exportChecklist() {
  const car = state.cars.find((item) => item.id === selectedCarId);
  if (!car) return;
  const risk = analyzeCar(car);
  const content = [
    `# ${car.name} ${car.trim} 核验清单`,
    "",
    `建议：${recommendationLabel(deriveRecommendation(car))}`,
    `风险：${riskLabel(risk.level)} ${risk.score}`,
    `目标价：${formatWan(car.targetPrice)}，当前价：${formatWan(car.price)}`,
    "",
    "## 主要风险",
    ...risk.risks.map((item) => `- [${riskLabel(item.level)}] ${item.title}：${item.question || item.detail}`),
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
  link.download = `${car.name}-${new Date().toISOString().slice(0, 10)}-checklist.md`;
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
  activeView = "detail";
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

document.body.addEventListener("click", (event) => {
  const viewLink = event.target.closest("[data-view-link]")?.dataset.viewLink;
  const detailId = event.target.closest("[data-detail]")?.dataset.detail;
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const riskId = event.target.closest("[data-risk]")?.dataset.risk;
  const compareId = event.target.closest("[data-compare]")?.dataset.compare;
  const releaseId = event.target.closest("[data-add-release]")?.dataset.addRelease;
  const deleteEvidenceId = event.target.closest("[data-delete-evidence]")?.dataset.deleteEvidence;
  const shouldAddEvidence = Boolean(event.target.closest("[data-add-evidence]"));

  if (viewLink) {
    activeView = viewLink;
    render();
  }
  if (detailId) switchToDetail(detailId);
  if (editId) openCarDialog(editId);
  if (riskId) {
    selectedCarId = riskId;
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
  if (releaseId) addReleaseToGarage(releaseId);
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

document.querySelector("#deleteCar").addEventListener("click", () => {
  const id = getValue("#carId");
  const car = state.cars.find((item) => item.id === id);
  if (car && !window.confirm(`确定删除「${car.name}」吗？相关信息和试驾记录也会删除。`)) return;
  state.cars = state.cars.filter((car) => car.id !== id);
  state.evidence = state.evidence.filter((item) => item.carId !== id);
  state.drives = state.drives.filter((item) => item.carId !== id);
  selectedCompare.delete(id);
  if (selectedCarId === id) selectedCarId = state.cars[0]?.id || "";
  document.querySelector("#carDialog").close();
  render();
  showToast("车源已删除。", "warn");
});

[
  "#searchInput",
  "#stageFilter",
  "#riskFilter",
  "#batteryFilter",
  "#sourceFilter",
  "#newcarScopeFilter",
  "#newcarBodyFilter",
  "#newcarPriceFilter",
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

document.querySelector("#exportChecklist").addEventListener("click", exportChecklist);
document.querySelector("#analyzeInfoWall").addEventListener("click", () => analyzeCurrentCarWithGemini({ auto: false }));
document.querySelector("#refreshDcdNewCars").addEventListener("click", refreshDongchediNewCars);

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
  const text = await file.text();
  const parsed = JSON.parse(text);
  state = normalizeState(parsed);
  selectedCarId = state.selectedCarId || state.cars[0]?.id || "";
  selectedCompare = new Set(state.selectedCompare?.length ? state.selectedCompare : state.cars.slice(0, 3).map((car) => car.id));
  render();
  showToast("数据已导入。", "ok");
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
    drives: []
  });
  selectedCarId = state.cars[0]?.id || "";
  selectedCompare = new Set(state.cars.slice(0, 3).map((car) => car.id));
  render();
  showToast("已恢复样例数据。", "warn");
});

render();
initGoogleAuth();
