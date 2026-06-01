import { createServer } from "node:http";
import { spawn } from "node:child_process";

const HOST = process.env.GEMINI_ANALYZER_HOST || "127.0.0.1";
const PORT = Number(process.env.GEMINI_ANALYZER_PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MODE = process.env.GEMINI_ANALYZER_MODE || (process.env.GEMINI_API_KEY ? "api" : "cli");
const MAX_BODY_BYTES = Number(process.env.GEMINI_ANALYZER_MAX_BODY_MB || 28) * 1024 * 1024;
const MAX_INLINE_IMAGES = Number(process.env.GEMINI_ANALYZER_MAX_IMAGES || 10);
const GEMINI_API_TIMEOUT_MS = Number(process.env.GEMINI_API_TIMEOUT_MS || 90000);
const GEMINI_RECOMMEND_TIMEOUT_MS = Number(process.env.GEMINI_RECOMMEND_TIMEOUT_MS || 45000);

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.method === "GET" && ["/health", "/api/gemini-health"].includes(req.url)) {
      sendJson(res, 200, { ok: true, service: "newcar-gemini-analyzer", mode: MODE, model: MODEL });
      return;
    }
    if (req.method === "POST" && ["/analyze", "/api/analyze"].includes(req.url)) {
      const payload = await readJson(req);
      const result = MODE === "api" ? await analyzeWithGeminiApi(payload) : await analyzeWithGeminiCli(payload);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }
    if (req.method === "POST" && ["/recommend", "/api/recommend"].includes(req.url)) {
      const payload = await readJson(req);
      const startedAt = Date.now();
      const result = await recommendWithFallback(payload, startedAt);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }
    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: normalizeError(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NewCar Gemini analyzer listening on http://${HOST}:${PORT}`);
  console.log(`Mode: ${MODE}; model: ${MODEL}`);
});

function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("请求内容太大，请减少单次上传图片数量。"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("请求 JSON 无法解析。"));
      }
    });
    req.on("error", reject);
  });
}

async function analyzeWithGeminiApi(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("未找到 GEMINI_API_KEY，请先配置本机 Gemini API Key，或设置 GEMINI_ANALYZER_MODE=cli。");
  const prompt = buildPrompt(payload, true);
  const parts = [{ text: prompt }];
  collectImages(payload).forEach((image) => {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.base64
      }
    });
  });
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    })
  }, GEMINI_API_TIMEOUT_MS);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || `Gemini API 返回 ${response.status}`);
  }
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
  return parseModelJson(text);
}

async function analyzeWithGeminiCli(payload) {
  const prompt = buildPrompt(stripImageData(payload), false);
  const text = await runGeminiCli(prompt);
  return parseModelJson(text);
}

async function recommendWithGeminiApi(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("未找到 GEMINI_API_KEY，请先配置本机 Gemini API Key，或设置 GEMINI_ANALYZER_MODE=cli。");
  const prompt = buildRecommendationPrompt(payload);
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    })
  }, GEMINI_RECOMMEND_TIMEOUT_MS);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || `Gemini API 返回 ${response.status}`);
  }
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
  return parseModelJson(text);
}

async function recommendWithGeminiCli(payload) {
  const prompt = buildRecommendationPrompt(payload);
  const text = await runGeminiCli(prompt);
  return parseModelJson(text);
}

async function recommendWithFallback(payload, startedAt = Date.now()) {
  try {
    const result = MODE === "api" ? await recommendWithGeminiApi(payload) : await recommendWithGeminiCli(payload);
    console.log(`[recommend] ok ${Date.now() - startedAt}ms models=${(payload.recentModels || []).length} used=${(payload.usedListings || []).length}`);
    return result;
  } catch (error) {
    const normalized = normalizeError(error);
    console.warn(`[recommend] fallback ${Date.now() - startedAt}ms models=${(payload.recentModels || []).length} used=${(payload.usedListings || []).length}: ${normalized}`);
    return buildServerRecommendationFallback(payload, normalized);
  }
}

function runGeminiCli(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn("gemini", ["-p", prompt, "--model", MODEL, "--output-format", "text"], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Gemini CLI 分析超时。"));
    }, Number(process.env.GEMINI_ANALYZER_TIMEOUT_MS || 90000));
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) resolve(stdout);
      else reject(new Error(stderr || stdout || `Gemini CLI 退出：${code}`));
    });
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompt(payload, withImages) {
  const imageList = collectImages(payload).map((image, index) => `${index + 1}. ${image.name}，来自信息「${image.infoTitle}」`);
  return `
你是一个严谨的新能源购车分析助手。请根据用户画像、当前候选字段、信息墙文本以及${withImages ? "随附图片" : "图片文件名"}，更新这个购车工作台里的外显信息。

要求：
- 只依据输入信息推断，不要编造没有证据的事实。
- 如果图片或文本里出现价格、里程、过户、城市、电池、权益、检测、事故/修复、商家承诺、配置，请回填到 carPatch。
- 如果信息来自懂车帝二手车源，请重点梳理商家/平台主体、平台保障、检测报告、退换/质保承诺，以及仍需要电话核验的问题。
- 请把当前候选和用户已关注候选做对比评估，尤其以理想 i6 的驾驶/乘坐体感作为舒适性标尺；差距或优势写入 notes、nextAction 或 questions。
- 如果不确定，用 notes/issues/rightsNotes/nextAction 提醒核验，不要强行下结论。
- 输出必须是严格 JSON，不要 Markdown，不要解释。
- 数值单位：价格为万元，里程为万公里，月租为元/月，续航为 km。
- experience 各项为 1-10 的整数；越接近用户喜欢的理想 i6 越高。
- allowedValues 里的枚举值必须原样使用。

返回 JSON 结构：
{
  "carPatch": {
    "stage": "watching|contacted|test-drive|negotiating|recheck|rejected|purchased",
    "recommendation": "auto|worthViewing|watch|waitDrop|bargainOnly|reject",
    "price": number,
    "newPrice": number,
    "targetPrice": number,
    "landing": number,
    "battery": "buyout|baas|unknown",
    "batteryMonthly": number,
    "batterySize": number,
    "range": number,
    "mileage": number,
    "plateDate": "YYYY-MM",
    "transfers": number,
    "city": string,
    "source": string,
    "seller": string,
    "exterior": string,
    "interior": string,
    "nop": "included|subscription|none|unknown",
    "report": "full|basic|none|unknown",
    "certified": "official|platform|dealer|unknown",
    "options": string,
    "issues": string,
    "rightsNotes": string,
    "sellerNotes": string,
    "nextAction": string,
    "notes": string,
    "experience": { "seat": number, "nvh": number, "chassis": number, "cockpit": number, "adas": number, "highway": number, "exterior": number, "interior": number }
  },
  "analysis": {
    "summary": string,
    "riskLevel": "low|medium|high",
    "confidence": "low|medium|high",
    "priceOpinion": string,
    "rightsOpinion": string,
    "conditionOpinion": string,
    "questions": [string]
  },
  "infoCard": {
    "title": string,
    "notes": string,
    "status": "valid|pending|conflict"
  }
}

如果某个字段没有新信息，就不要在 carPatch 中返回该字段。

图片清单：
${imageList.length ? imageList.join("\n") : "无图片"}

输入数据：
${JSON.stringify(stripImageData(payload), null, 2)}
`;
}

function buildRecommendationPrompt(payload) {
  return `
你是新能源购车筛选助手。基于输入画像和候选池，按匹配度返回最多 8 个候选。
用户画像固定背景：北京新能源指标到 2027-05-26；2 人用车；市区通勤+假期高速；前排舒适、长续航、智能座舱、高速智驾、静谧、底盘、内饰、外观优先；理想 i6 是体验标杆；不喜欢智界 R7 外观；不能接受阿维塔 06T 方小方向盘；不追求性能。
规则：只依据输入池；recentModels 是新车车型，usedListings 是二手具体车源，garageCars 是已入库候选；同车系去重；说明主要匹配点和风险/取舍；输出严格 JSON，不要 Markdown。
JSON 结构：
{"profilePatch":{"people":"1|2|3-4|5+","budgetMinWan":0,"budgetMaxWan":0,"energyTypes":["ev"],"minRangeKm":0,"priorities":["comfort"],"bodyPreference":"suv_sedan|suv|sedan|compact|no_mpv","mustHaves":"","dealBreakers":"","notes":""},"summary":"","searchStrategy":"","candidates":[{"source":"release|used|garage|manual","seriesId":0,"skuId":0,"carId":"","name":"","trim":"","priceWan":0,"energyType":"ev|erev|phev|new_energy|unknown","rangeKm":0,"fitScore":0,"confidence":"low|medium|high","why":"","tradeoffs":[""],"nextAction":"","tags":[""],"sourceUrl":""}],"questions":[""]}
省略没有依据的字段；fitScore 为 0-100；source=release 保留 seriesId/dcdUrl，source=used 保留 skuId/url，source=garage 保留 carId。

输入数据：
${JSON.stringify(trimRecommendationPayload(payload), null, 2)}
`;
}

function trimRecommendationPayload(payload) {
  return {
    profile: payload.profile || {},
    outputRules: payload.outputRules || {},
    garageCars: (payload.garageCars || []).slice(0, 8),
    recentModels: (payload.recentModels || []).slice(0, 16).map((release) => ({
      ...release,
      fitReasons: (release.fitReasons || []).slice(0, 4),
      tags: (release.tags || []).slice(0, 6),
      models: (release.models || []).slice(0, 2).map((model) => ({
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
    usedListings: (payload.usedListings || []).slice(0, 10).map((listing) => ({
      ...listing,
      fitReasons: (listing.fitReasons || []).slice(0, 4),
      riskFlags: (listing.riskFlags || []).slice(0, 4)
    }))
  };
}

function buildServerRecommendationFallback(payload = {}, error = "") {
  const profile = payload.profile || {};
  const releaseCandidates = (payload.recentModels || [])
    .filter((release) => energyAllowed(release.energyType, profile))
    .map((release) => releaseToFallbackCandidate(release, profile))
    .filter(Boolean);
  const usedCandidates = (payload.usedListings || [])
    .filter((listing) => energyAllowed(listing.energyType, profile))
    .map((listing) => usedListingToFallbackCandidate(listing, profile))
    .filter(Boolean);
  const garageCandidates = (payload.garageCars || [])
    .map((car) => garageCarToFallbackCandidate(car))
    .filter(Boolean);
  const candidates = [...releaseCandidates, ...usedCandidates, ...garageCandidates]
    .sort((a, b) => Number(b.fitScore || 0) - Number(a.fitScore || 0))
    .filter(uniqueCandidateById())
    .slice(0, Number(payload.outputRules?.maxCandidates || 8));
  return {
    fallback: true,
    error,
    summary: "Gemini 本次响应不稳定，服务器已按你的画像、预算、纯电需求、续航、舒适/智驾优先级先完成候选筛选。",
    searchStrategy: "优先保留纯电、30 万左右、续航更长、与理想 i6 体验标尺更接近、且风险更少的车型；后续可再次点击让 Gemini 细化理由。",
    candidates,
    questions: [
      "是否接受等 7-8 月权益变化？",
      "新车优先还是二手车高性价比优先？",
      "是否愿意为了舒适/NVH 接受更大的车身尺寸？"
    ]
  };
}

function releaseToFallbackCandidate(release = {}, profile = {}) {
  const name = `${release.brandName || ""} ${release.seriesName || ""}`.trim() || release.seriesName;
  if (!name) return null;
  const model = (release.models || [])[0] || {};
  const score = fallbackReleaseScore(release, profile);
  return {
    source: "release",
    seriesId: release.seriesId,
    name,
    trim: model.name ? `${model.year || ""}款 ${model.name}`.trim() : release.priceText || "",
    priceWan: numberOrBlank(release.priceMinWan),
    energyType: release.energyType || "unknown",
    rangeKm: firstRangeKm(release),
    fitScore: score,
    confidence: score >= 75 ? "high" : "medium",
    why: fallbackReleaseWhy(release, profile),
    tradeoffs: fallbackReleaseTradeoffs(release),
    nextAction: "加入候选库后继续看具体版本、权益、试驾反馈和交付节奏。",
    tags: [release.energyLabel, release.priceText, ...(release.sourceTypes || [])].filter(Boolean).slice(0, 5),
    sourceUrl: release.dcdUrl || ""
  };
}

function usedListingToFallbackCandidate(listing = {}, profile = {}) {
  const score = clampScore(Number(listing.fitScore || 58) + (listing.city === (profile.city || "北京") ? 4 : -2));
  return {
    source: "used",
    skuId: listing.skuId,
    name: listing.seriesName || listing.title || "二手车源",
    trim: listing.trim || listing.title || "",
    priceWan: numberOrBlank(listing.priceWan),
    energyType: listing.energyType || "unknown",
    rangeKm: numberOrBlank(listing.range),
    fitScore: score,
    confidence: listing.riskFlags?.length ? "medium" : "high",
    why: (listing.fitReasons || []).slice(0, 2).join("；") || "价格和画像匹配，适合作为二手备选继续核验。",
    tradeoffs: (listing.riskFlags || []).slice(0, 3),
    nextAction: "索要检测报告、出险记录、三电权益和成交前复检承诺。",
    tags: [listing.city, listing.sourceType, listing.mileageWan !== "" ? `${listing.mileageWan}万公里` : ""].filter(Boolean),
    sourceUrl: listing.url || ""
  };
}

function garageCarToFallbackCandidate(car = {}) {
  if (!car.name) return null;
  return {
    source: "garage",
    carId: car.id,
    name: car.name,
    trim: car.trim || "",
    priceWan: numberOrBlank(car.priceWan),
    energyType: "new_energy",
    rangeKm: numberOrBlank(car.rangeKm),
    fitScore: clampScore(car.fitScore || 60),
    confidence: "medium",
    why: car.notes || "已在候选库中，适合继续和新车/二手车源对比。",
    tradeoffs: car.risk?.risks?.slice(0, 3).map((risk) => risk.title).filter(Boolean) || [],
    nextAction: "补齐信息墙和试驾记录后再判断。",
    tags: [car.city, car.source].filter(Boolean),
    sourceUrl: ""
  };
}

function fallbackReleaseScore(release = {}, profile = {}) {
  let score = Number(release.fitScore || 58);
  const price = numberOrBlank(release.priceMinWan);
  const min = Number(profile.budgetMinWan || 24);
  const max = Number(profile.budgetMaxWan || 31);
  if (price !== "") {
    if (price >= min - 2 && price <= max + 2) score += 8;
    else if (price > max + 5) score -= 10;
    else if (price < min - 8) score -= 3;
  }
  const text = `${release.brandName || ""} ${release.seriesName || ""}`;
  if (/理想|蔚来|乐道|极氪|奥迪|小米|小鹏/i.test(text)) score += 6;
  if (/i6|ES6|7X|Q6L|E7X|YU7|L80|GX|G7/i.test(text)) score += 6;
  const range = firstRangeKm(release);
  if (range >= Number(profile.minRangeKm || 650)) score += 5;
  return clampScore(score);
}

function fallbackReleaseWhy(release = {}, profile = {}) {
  const pieces = [];
  if (energyAllowed(release.energyType, profile)) pieces.push("符合能源画像");
  if (release.priceText) pieces.push(`价格 ${release.priceText}`);
  const range = firstRangeKm(release);
  if (range) pieces.push(`续航约 ${range}km`);
  if ((release.fitReasons || []).length) pieces.push((release.fitReasons || [])[0]);
  return pieces.slice(0, 3).join("；") || "与预算、能源和舒适取向较匹配。";
}

function fallbackReleaseTradeoffs(release = {}) {
  const text = `${release.brandName || ""} ${release.seriesName || ""} ${release.carType || ""}`;
  const tradeoffs = [];
  if (/ES8|L80|大型|中大型|六座|七座/i.test(text)) tradeoffs.push("车身尺寸和停车便利性需试驾确认");
  if (release.priceMinWan !== "" && Number(release.priceMinWan) > 31) tradeoffs.push("价格可能高于 30 万预算");
  if (!firstRangeKm(release)) tradeoffs.push("续航/电池信息需继续核验");
  if (!(release.models || []).length) tradeoffs.push("具体版本信息还需补齐");
  return tradeoffs.slice(0, 3);
}

function firstRangeKm(release = {}) {
  const text = (release.models || [])
    .map((model) => [model.range, model.battery, model.name].filter(Boolean).join(" "))
    .join(" ");
  const match = text.match(/(\d{3,4})\s*(?:km|公里)?/i);
  return match ? Number(match[1]) : "";
}

function energyAllowed(type = "unknown", profile = {}) {
  const allowed = profile.energyTypes || [];
  if (!allowed.length) return true;
  if (allowed.length === 1 && allowed[0] === "ev") return type === "ev";
  return allowed.includes(type) || (type === "new_energy" && allowed.some((item) => ["ev", "phev", "erev"].includes(item)));
}

function uniqueCandidateById() {
  const seen = new Set();
  return (candidate) => {
    const key = `${candidate.source}:${candidate.seriesId || candidate.skuId || candidate.carId || candidate.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

function numberOrBlank(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 60;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function collectImages(payload) {
  const images = [];
  for (const item of payload.infoWall || []) {
    for (const attachment of item.attachments || []) {
      const parsed = parseDataUrl(attachment.dataUrl);
      if (!parsed) continue;
      images.push({
        name: attachment.name || "图片",
        infoTitle: item.title || "未命名信息",
        mimeType: parsed.mimeType,
        base64: parsed.base64
      });
      if (images.length >= MAX_INLINE_IMAGES) return images;
    }
  }
  return images;
}

function parseDataUrl(dataUrl = "") {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function stripImageData(payload) {
  return {
    ...payload,
    infoWall: (payload.infoWall || []).map((item) => ({
      ...item,
      attachments: (item.attachments || []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        dataUrl: attachment.dataUrl ? "[image data omitted]" : ""
      }))
    }))
  };
}

function parseModelJson(text = "") {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Gemini 没有返回可解析的 JSON。");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeError(error) {
  const message = error?.message || String(error);
  if (/User location is not supported/i.test(message)) {
    return "Gemini API 当前网络区域不可用，请检查代理、API 区域或改用可用的本地 Gemini 配置。";
  }
  if (/AbortError|aborted|timeout/i.test(message)) {
    return "Gemini 请求超时，请稍后重试或减少候选数量。";
  }
  return message;
}
