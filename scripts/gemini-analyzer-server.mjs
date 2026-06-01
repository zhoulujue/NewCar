import { createServer } from "node:http";

const HOST = process.env.DEEPSEEK_ANALYZER_HOST || process.env.GEMINI_ANALYZER_HOST || "127.0.0.1";
const PORT = Number(process.env.DEEPSEEK_ANALYZER_PORT || process.env.GEMINI_ANALYZER_PORT || 8787);
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const MAX_BODY_BYTES = Number(process.env.DEEPSEEK_ANALYZER_MAX_BODY_MB || process.env.GEMINI_ANALYZER_MAX_BODY_MB || 28) * 1024 * 1024;
const MAX_INLINE_IMAGES = Number(process.env.DEEPSEEK_ANALYZER_MAX_IMAGES || process.env.GEMINI_ANALYZER_MAX_IMAGES || 10);
const TIMEOUT_MS = Number(process.env.DEEPSEEK_ANALYZER_TIMEOUT_MS || process.env.GEMINI_ANALYZER_TIMEOUT_MS || 120000);
const MAX_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS || 8192);
const THINKING_TYPE = process.env.DEEPSEEK_THINKING_TYPE || "disabled";

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.method === "GET" && ["/health", "/api/gemini-health", "/api/deepseek-health"].includes(req.url)) {
      sendJson(res, 200, { ok: true, service: "newcar-deepseek-analyzer", provider: "deepseek", model: MODEL, baseUrl: BASE_URL });
      return;
    }
    if (req.method === "POST" && ["/analyze", "/api/analyze"].includes(req.url)) {
      const payload = await readJson(req);
      const result = await analyzeWithDeepSeekApi(payload);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }
    if (req.method === "POST" && ["/recommend", "/api/recommend"].includes(req.url)) {
      const payload = await readJson(req);
      const result = await recommendWithDeepSeekApi(payload);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }
    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: normalizeError(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NewCar DeepSeek analyzer listening on http://${HOST}:${PORT}`);
  console.log(`Provider: DeepSeek; model: ${MODEL}; base URL: ${BASE_URL}`);
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

async function analyzeWithDeepSeekApi(payload) {
  const prompt = buildPrompt(payload, false);
  return requestDeepSeekJson(prompt, 0.15);
}

async function recommendWithDeepSeekApi(payload) {
  const prompt = buildRecommendationPrompt(payload);
  return requestDeepSeekJson(prompt, 0.2);
}

async function requestDeepSeekJson(prompt, temperature) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("未找到 DEEPSEEK_API_KEY，请先在服务端环境文件中配置 DeepSeek API Key。");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const body = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "你是 NewCar 购车工作台的结构化 JSON 分析引擎。请严格输出 JSON，不要输出 Markdown 或解释。"
      },
      { role: "user", content: prompt }
    ],
    stream: false,
    response_format: { type: "json_object" },
    max_tokens: MAX_TOKENS,
    thinking: { type: THINKING_TYPE }
  };
  if (THINKING_TYPE === "disabled") {
    body.temperature = temperature;
  } else {
    body.reasoning_effort = process.env.DEEPSEEK_REASONING_EFFORT || "high";
  }
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || `DeepSeek API 返回 ${response.status}`);
  }
  const text = json.choices?.[0]?.message?.content || "";
  return parseModelJson(text);
}

function buildPrompt(payload, withImages) {
  const imageList = collectImages(payload).map((image, index) => `${index + 1}. ${image.name}，来自信息「${image.infoTitle}」`);
  return `
你是一个严谨的新能源购车分析助手。请根据用户画像、当前候选字段、信息墙文本以及${withImages ? "随附图片" : "图片文件名"}，更新这个购车工作台里的外显信息。

要求：
- 只依据输入信息推断，不要编造没有证据的事实。
- 当前 DeepSeek 接入按文本 JSON 分析处理；如果上传了图片，请仅依据图片文件名、所属信息标题和用户文本描述判断，不要假装看见图片内容。
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
你是一个严谨的新能源车购车需求分析与车型筛选助手。请根据用户填写的用车画像，以及输入里的懂车帝近期发布/热门车型、二手车源和已收藏车源，输出一组最值得用户挑选的候选车型。

用户画像重点：
- 用户在北京用车，新能源指标有效期到 2027-05-26。
- 主要 2 人用车，市区通勤 + 假期高速，前排舒适、长续航、智能座舱、高速智驾、静谧、底盘滤震、内饰质感、外观耐看优先。
- 用户开过理想 i6，认为驾驶和乘坐体验很好，倾向找类似体验。不要质疑“理想 i6”这个基准车，也不要把它改写或纠正为理想 L6、智己 L6 等其他车型。
- 用户不喜欢智界 R7 外观，不能接受阿维塔 06T 又小又方的方向盘，对性能没有强诉求。

要求：
- 只依据输入车型池筛选；如果输入池不足，可以给 manual 建议，但要标低置信度并说明需要补充信息。
- 不要罗列所有车，只给最多 8 个候选，并按匹配度从高到低排序。
- 候选既可以来自 recentModels，也可以来自 usedListings 或 garageCars；如果同一车系重复，只保留最适合的一条。
- 必须区分两类对象：recentModels 是“新车车型/版本候选”，usedListings 是“二手具体车源”，garageCars 会带 kind 字段。不要把新车车型当成可检测二手车源，也不要把二手具体车源当成抽象车型。
- 紧扣用户需求：预算、北京场景、续航、智能化、舒适/NVH、内饰/外观、二手风险。
- 对“价格太高、车太大、续航不足、智驾弱、内饰廉价、二手风险大”等取舍要明确写入 tradeoffs。
- 如果输入车型池为空或不足，只能给低置信度 manual 建议，并明确提示需要先刷新懂车帝车型池；不要基于常识编造精确配置或否定用户画像里的既有事实。
- 输出必须是严格 JSON，不要 Markdown，不要解释。

返回 JSON 结构：
{
  "profilePatch": {
    "people": "1|2|3-4|5+",
    "budgetMinWan": number,
    "budgetMaxWan": number,
    "energyTypes": ["ev","erev","phev"],
    "minRangeKm": number,
    "priorities": ["comfort","range","cockpit","adas","interior","appearance"],
    "bodyPreference": "suv_sedan|suv|sedan|compact|no_mpv",
    "mustHaves": string,
    "dealBreakers": string,
    "notes": string
  },
  "summary": string,
  "searchStrategy": string,
  "candidates": [
    {
      "source": "release|used|garage|manual",
      "seriesId": number,
      "skuId": number,
      "carId": string,
      "name": string,
      "trim": string,
      "priceWan": number,
      "energyType": "ev|erev|phev|new_energy|unknown",
      "rangeKm": number,
      "fitScore": number,
      "confidence": "low|medium|high",
      "why": string,
      "tradeoffs": [string],
      "nextAction": string,
      "tags": [string],
      "sourceUrl": string
    }
  ],
  "questions": [string]
}

字段约束：
- fitScore 是 0-100 的整数。
- 如果 source=release，尽量返回输入中的 seriesId 和 sourceUrl/dcdUrl。
- 如果 source=used，尽量返回输入中的 skuId 和 sourceUrl/url。
- 如果 source=garage，返回输入中的 carId。
- 如果某个字段没有依据，可以省略，不要编造精确参数。

输入数据：
${JSON.stringify(trimRecommendationPayload(payload), null, 2)}
`;
}

function trimRecommendationPayload(payload) {
  return {
    profile: payload.profile || {},
    outputRules: payload.outputRules || {},
    garageCars: (payload.garageCars || []).slice(0, 20),
    recentModels: (payload.recentModels || []).slice(0, 80).map((release) => ({
      ...release,
      models: (release.models || []).slice(0, 8)
    })),
    usedListings: (payload.usedListings || []).slice(0, 60)
  };
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
    throw new Error("DeepSeek 没有返回可解析的 JSON。");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeError(error) {
  const message = error?.message || String(error);
  if (/aborted|AbortError/i.test(message)) {
    return "DeepSeek API 请求超时，请稍后重试或调高 DEEPSEEK_ANALYZER_TIMEOUT_MS。";
  }
  return message;
}
