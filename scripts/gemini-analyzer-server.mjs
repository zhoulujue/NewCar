import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { guardQualityResultForProvider } from "./quality-safety.mjs";

const HOST = process.env.GEMINI_ANALYZER_HOST || "127.0.0.1";
const PORT = Number(process.env.GEMINI_ANALYZER_PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MODE = process.env.GEMINI_ANALYZER_MODE || (process.env.GEMINI_API_KEY ? "api" : "cli");
const MAX_BODY_BYTES = Number(process.env.GEMINI_ANALYZER_MAX_BODY_MB || 28) * 1024 * 1024;
const MAX_INLINE_IMAGES = Number(process.env.GEMINI_ANALYZER_MAX_IMAGES || 10);
const GEMINI_API_TIMEOUT_MS = Number(process.env.GEMINI_API_TIMEOUT_MS || 90000);
const GEMINI_RECOMMEND_TIMEOUT_MS = Number(process.env.GEMINI_RECOMMEND_TIMEOUT_MS || 45000);
const GEMINI_QUALITY_TIMEOUT_MS = Number(process.env.GEMINI_QUALITY_TIMEOUT_MS || 90000);
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const DEEPSEEK_API_TIMEOUT_MS = Number(process.env.DEEPSEEK_API_TIMEOUT_MS || 45000);
const DEEPSEEK_MAX_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS || 8192);

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.method === "GET" && ["/health", "/api/gemini-health", "/api/deepseek-health"].includes(req.url)) {
      sendJson(res, 200, {
        ok: true,
        service: "newcar-gemini-analyzer",
        mode: MODE,
        model: MODEL,
        fallbackProvider: "deepseek",
        deepseekModel: DEEPSEEK_MODEL,
        deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY)
      });
      return;
    }
    if (req.method === "POST" && ["/analyze", "/api/analyze"].includes(req.url)) {
      const payload = await readJson(req);
      const result = await analyzeWithProviderFallback(payload, Date.now());
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
    if (req.method === "POST" && ["/quality", "/api/quality"].includes(req.url)) {
      const payload = await readJson(req);
      const startedAt = Date.now();
      const result = await qualityWithFallback(payload, startedAt);
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

async function qualityWithGeminiApi(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("未找到 GEMINI_API_KEY，请先配置本机 Gemini API Key，或设置 GEMINI_ANALYZER_MODE=cli。");
  const prompt = buildQualityPrompt(payload, { grounded: true });
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.12
      }
    })
  }, GEMINI_QUALITY_TIMEOUT_MS);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || `Gemini API 返回 ${response.status}`);
  }
  const candidate = json.candidates?.[0] || {};
  const text = candidate.content?.parts?.map((part) => part.text || "").join("\n");
  return attachGroundingSources(parseModelJson(text), candidate.groundingMetadata || candidate.grounding_metadata);
}

async function qualityWithGeminiCli(payload) {
  const prompt = buildQualityPrompt(stripImageData(payload), { grounded: false });
  const text = await runGeminiCli(prompt);
  return parseModelJson(text);
}

async function recommendWithGeminiCli(payload) {
  const prompt = buildRecommendationPrompt(payload);
  const text = await runGeminiCli(prompt);
  return parseModelJson(text);
}

async function analyzeWithProviderFallback(payload, startedAt = Date.now()) {
  const result = await firstSuccessfulProvider([
    { provider: "gemini", run: () => (MODE === "api" ? analyzeWithGeminiApi(payload) : analyzeWithGeminiCli(payload)) },
    { provider: "deepseek", run: () => analyzeWithDeepSeekApi(payload) }
  ]);
  if (result.ok) {
    console.log(`[analyze] ${result.provider} ok ${Date.now() - startedAt}ms images=${collectImages(payload).length}`);
    return { provider: result.provider, providerFallbackFrom: result.provider === "gemini" ? "" : "gemini", ...result.value };
  }
  console.warn(`[analyze] providers failed ${Date.now() - startedAt}ms: ${formatProviderErrors(result.errors)}`);
  throw new Error(`AI 模型均不可用（Gemini / DeepSeek）。${formatProviderErrors(result.errors)}`);
}

async function recommendWithFallback(payload, startedAt = Date.now()) {
  const result = await firstSuccessfulProvider([
    { provider: "gemini", run: () => (MODE === "api" ? recommendWithGeminiApi(payload) : recommendWithGeminiCli(payload)) },
    { provider: "deepseek", run: () => recommendWithDeepSeekApi(payload) }
  ]);
  if (result.ok) {
    console.log(`[recommend] ${result.provider} ok ${Date.now() - startedAt}ms models=${(payload.recentModels || []).length} used=${(payload.usedListings || []).length}`);
    return { provider: result.provider, providerFallbackFrom: result.provider === "gemini" ? "" : "gemini", ...result.value };
  }
  console.warn(`[recommend] server fallback ${Date.now() - startedAt}ms models=${(payload.recentModels || []).length} used=${(payload.usedListings || []).length}: ${formatProviderErrors(result.errors)}`);
  return buildServerRecommendationFallback(payload, formatProviderErrors(result.errors));
}

async function qualityWithFallback(payload, startedAt = Date.now()) {
  const result = await firstSuccessfulProvider([
    { provider: "gemini", run: () => (MODE === "api" ? qualityWithGeminiApi(payload) : qualityWithGeminiCli(payload)) },
    { provider: "deepseek", run: () => qualityWithDeepSeekApi(payload) }
  ]);
  if (result.ok) {
    console.log(`[quality] ${result.provider} ok ${Date.now() - startedAt}ms car=${payload.car?.name || ""}`);
    return {
      provider: result.provider,
      providerFallbackFrom: result.provider === "gemini" ? "" : "gemini",
      ...ensureQualitySources(result.value, payload, result.provider)
    };
  }
  console.warn(`[quality] providers failed ${Date.now() - startedAt}ms car=${payload.car?.name || ""}: ${formatProviderErrors(result.errors)}`);
  throw new Error(`AI 质量线索检索失败（Gemini / DeepSeek）。${formatProviderErrors(result.errors)}`);
}

async function firstSuccessfulProvider(tasks = []) {
  const outcomes = [];
  for (const task of tasks) {
    try {
      const value = await task.run();
      return { ok: true, provider: task.provider, value, errors: outcomes };
    } catch (error) {
      outcomes.push({ provider: task.provider, message: normalizeError(error) });
    }
  }
  return { ok: false, errors: outcomes };
}

function formatProviderErrors(errors = []) {
  return errors.map((item) => `${item.provider}: ${item.message}`).join("；") || "无可用模型";
}

async function analyzeWithDeepSeekApi(payload) {
  const prompt = buildPrompt(stripImageData(payload), false);
  return requestDeepSeekJson(prompt, 0.15);
}

async function recommendWithDeepSeekApi(payload) {
  const prompt = buildRecommendationPrompt(payload);
  return requestDeepSeekJson(prompt, 0.2);
}

async function qualityWithDeepSeekApi(payload) {
  const prompt = buildQualityPrompt(stripImageData(payload), { grounded: false, provider: "deepseek" });
  return requestDeepSeekJson(prompt, 0.12);
}

async function requestDeepSeekJson(prompt, temperature) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("未找到 DEEPSEEK_API_KEY，请先在服务端环境文件中配置 DeepSeek API Key。");
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "system",
        content: "你是 NewCar 购车工作台的结构化 JSON 分析引擎。请严格输出 JSON，不要输出 Markdown 或解释。"
      },
      { role: "user", content: prompt }
    ],
    stream: false,
    response_format: { type: "json_object" },
    max_tokens: DEEPSEEK_MAX_TOKENS,
    temperature
  };
  if (process.env.DEEPSEEK_THINKING_TYPE) {
    body.thinking = { type: process.env.DEEPSEEK_THINKING_TYPE };
  }
  const response = await fetchWithTimeout(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  }, DEEPSEEK_API_TIMEOUT_MS);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || `DeepSeek API 返回 ${response.status}`);
  }
  const text = json.choices?.[0]?.message?.content || "";
  return parseModelJson(text);
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
- 如果图片或文本里出现 SOH/电池健康度、4S维保、故障码、电池一致性、三电质保、车质网投诉销量比、召回/缺陷、三电投诉关键词，请回填到 carPatch.qualityProfile。
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
    "experience": { "seat": number, "nvh": number, "chassis": number, "cockpit": number, "adas": number, "highway": number, "exterior": number, "interior": number },
    "qualityProfile": {
      "complaintSalesRatio": number,
      "complaintRank": string,
      "complaintTrend": "unknown|rising|stable|falling",
      "threeElectricComplaintShare": number,
      "recallCount": number,
      "recallNotes": string,
      "studySummary": string,
      "ownerReputation": string,
      "batterySoh": number,
      "sohDate": "YYYY-MM-DD",
      "maintenanceStatus": "unknown|missing|pending|partial|complete|clean|issue",
      "troubleCodeStatus": "unknown|missing|clean|issue",
      "warrantyStatus": "unknown|active|expired|not-transferable",
      "batteryRepairStatus": "unknown|none|repaired",
      "notes": string
    }
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

function buildQualityPrompt(payload, options = {}) {
  const grounded = Boolean(options.grounded);
  const provider = options.provider || (grounded ? "gemini-search" : "model");
  return `
你是 NewCar 购车工作台的新能源“三电与长期质量”研究助手。
任务：围绕当前候选车型，获取/刷新车系级公开质量数据，并给出能直接支持购车决策的结构化结论。

当前能力：
- ${grounded ? "你已启用 Google Search grounding，请主动联网检索并只引用可验证来源。" : "你没有联网检索能力，只能根据输入和模型知识给低置信兜底结论。"}
- 输出必须是严格 JSON，不要 Markdown，不要解释。

研究优先级：
1. 官方召回/缺陷：国家市场监督管理总局、品牌官方公告、可靠新闻中的召回/缺陷信息。
2. 投诉销量比/投诉集中点：车质网、投诉排行、投诉销量比、三电相关投诉关键词，尤其电池、电机、电控、充电、续航衰减、故障码。
3. 第三方质量研究：J.D. Power、懂车帝/汽车之家/易车等长期测试或质量榜单，仅作为 C 级参考。
4. 车主口碑：车主论坛/口碑/社区的高频问题，仅作为 D 级线索。
5. 单车证据：SOH、4S 维保、故障码、电池一致性、三电质保是否随车。注意：这些不能从公开网页判断，除非用户上传了检测报告或车源明示截图；否则必须标为 missing/unknown。

请特别区分：
- “车系级公开数据”：可以由联网检索补全。
- “这台二手车的单车证据”：不能凭 AI 猜测，缺失就保持缺失，并生成下一步核验问题。

返回 JSON 结构：
{
  "carPatch": {
    "qualityProfile": {
      "complaintSalesRatio": number,
      "complaintRank": string,
      "complaintTrend": "unknown|rising|stable|falling",
      "threeElectricComplaintShare": number,
      "recallCount": number,
      "recallNotes": string,
      "studySummary": string,
      "ownerReputation": string,
      "batterySoh": number,
      "sohDate": "YYYY-MM-DD",
      "maintenanceStatus": "unknown|missing|pending|partial|complete|clean|issue",
      "troubleCodeStatus": "unknown|missing|clean|issue",
      "warrantyStatus": "unknown|active|expired|not-transferable",
      "batteryRepairStatus": "unknown|none|repaired",
      "notes": string,
      "sources": [
        { "type": "official|complaint|study|reputation|single", "label": string, "status": string, "summary": string, "url": string, "updatedAt": "YYYY-MM-DD" }
      ]
    }
  },
  "analysis": {
    "summary": string,
    "riskLevel": "low|medium|high",
    "confidence": "low|medium|high",
    "qualityOpinion": string,
    "threeElectricOpinion": string,
    "singleCarEvidenceOpinion": string,
    "questions": [string]
  },
  "infoCard": {
    "title": string,
    "notes": string,
    "status": "valid|pending|conflict"
  }
}

字段要求：
- 没找到精确数值时，不要编造 number 字段；不要用 0 表示未知、暂无、未检索到或新车刚发布。未知就省略该字段，并在 summary/notes 中写“未找到公开精确数据”。
- 如果找到来源，请把来源写入 qualityProfile.sources，url 必须是实际网页地址。
- complaintSalesRatio 使用数值；如果来源是“每万辆投诉量/投诉销量比/PP100”，在 notes 说明口径。
- threeElectricComplaintShare 是三电相关投诉占总投诉百分比，找不到就省略。
- recallCount 是可核验召回/缺陷数量；如果只得到“未检索到/暂无召回/新车刚发布”，不要填写 recallCount 或 recallNotes，只在 notes 写成待核验线索。
- studySummary / ownerReputation 必须写具体发现，例如“J.D. Power 2025 NEV-IQS 中该车系/同平台车型排名或 PP100 信息”。“数据缺失、暂无口碑、未找到资料”不能写入这些字段。
- sources.status 只有在来源页面给出确切数字、榜单、召回公告或清晰口碑证据时才写“有数据/已核验/有线索”；如果只是搜索入口或没有精确结论，写“入口待核验”。
- 新上市车型如果精确车型数据不足，可以补充同车系、同平台、上一款、品牌召回/投诉的背景线索，但必须在 summary 写清楚“这是背景线索，不等同于目标车型结论”。
- 对二手车：batterySoh、maintenanceStatus、troubleCodeStatus、warrantyStatus 不得凭公开车系口碑推断；没有用户上传证据时保持 missing/unknown。
- notes 要给出“是否影响购买”的判断，不要只罗列来源。
- questions 要是用户下一步能直接问商家/4S/检测机构的问题。

搜索建议：
- "${payload.car?.name || ""} ${payload.car?.trim || ""} 召回 三电 电池 电机 电控"
- "${payload.car?.name || ""} 车质网 投诉销量比 三电 投诉"
- "${payload.car?.name || ""} 电池 故障码 续航衰减 车主 口碑"

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
    summary: "AI 模型本次响应不稳定，服务器已按你的画像、预算、纯电需求、续航、舒适/智驾优先级先完成候选筛选。",
    searchStrategy: "优先保留纯电、30 万左右、续航更长、与理想 i6 体验标尺更接近、且风险更少的车型；后续可再次点击让 AI 细化理由。",
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

function attachGroundingSources(result = {}, groundingMetadata = {}) {
  const chunks = groundingMetadata?.groundingChunks || groundingMetadata?.grounding_chunks || [];
  const groundedSources = chunks
    .map((chunk) => chunk.web || chunk.retrievedContext || chunk.retrieved_context || null)
    .filter(Boolean)
    .map((source) => ({
      type: inferQualitySourceType(`${source.title || ""} ${source.uri || ""}`),
      label: source.title || "联网来源",
      status: "AI已检索",
      summary: source.title || source.uri || "Gemini Search grounding 来源",
      url: source.uri || "",
      updatedAt: new Date().toISOString().slice(0, 10)
    }))
    .filter((source) => source.url);
  if (!groundedSources.length) return result;
  const existingSources = result.carPatch?.qualityProfile?.sources || [];
  result.carPatch = result.carPatch || {};
  result.carPatch.qualityProfile = {
    ...(result.carPatch.qualityProfile || {}),
    sources: mergeQualitySources(existingSources, groundedSources)
  };
  result.grounding = {
    webSearchQueries: groundingMetadata?.webSearchQueries || groundingMetadata?.web_search_queries || [],
    sourceCount: groundedSources.length
  };
  return result;
}

function ensureQualitySources(result = {}, payload = {}, provider = "") {
  const existingSources = result.carPatch?.qualityProfile?.sources || [];
  const hasLinkedSource = existingSources.some((source) => source.url);
  if (provider === "gemini" && hasLinkedSource) {
    return guardQualityResultForProvider(result, { provider, sourceFallback: false });
  }
  const fallbackSources = buildQualitySearchSources(payload, provider);
  result.carPatch = result.carPatch || {};
  result.carPatch.qualityProfile = {
    ...(result.carPatch.qualityProfile || {}),
    sources: mergeQualitySources(existingSources, fallbackSources),
    notes: [
      result.carPatch.qualityProfile?.notes || "",
      provider === "gemini"
        ? "Gemini 未返回 grounding 来源，已附权威检索入口，具体数值需打开来源核验。"
        : "本次由 DeepSeek 兜底，未完成联网 grounding；已附权威检索入口，具体投诉/召回数据需打开来源核验。"
    ].filter(Boolean).join("\n")
  };
  result.analysis = {
    ...(result.analysis || {}),
    confidence: result.analysis?.confidence === "high" ? "medium" : result.analysis?.confidence || "low",
    singleCarEvidenceOpinion: result.analysis?.singleCarEvidenceOpinion || "AI 只能补车系公开质量线索；这台车的 SOH、维保、故障码和三电质保必须看检测报告或官方截图。",
    questions: [
      ...(result.analysis?.questions || []),
      "请打开车质网检索入口，确认该车系投诉销量比、三电相关投诉关键词和近期趋势。",
      "请打开官方召回检索入口，确认目标 VIN 是否涉及召回并已处理。",
      "请向卖家索要 SOH/电池健康度、4S 维保、故障码和三电质保随车截图。"
    ].filter(Boolean).slice(0, 10)
  };
  result.sourceFallback = true;
  return guardQualityResultForProvider(result, { provider, sourceFallback: true });
}

function buildQualitySearchSources(payload = {}, provider = "") {
  const carName = [payload.car?.name, payload.car?.trim].filter(Boolean).join(" ");
  const shortName = payload.car?.name || carName || "目标车型";
  const makeSearchUrl = (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
  const today = new Date().toISOString().slice(0, 10);
  const status = provider === "gemini" ? "入口待核验" : "DeepSeek兜底待核验";
  return [
    {
      type: "official",
      label: "市场监管总局/召回中心",
      status,
      summary: `优先核验 ${shortName} 是否存在市场监管总局召回公告、缺陷调查或品牌官方公告。`,
      url: makeSearchUrl(`site:samrdprc.org.cn OR site:samr.gov.cn ${carName} 召回 缺陷 调查`),
      updatedAt: today
    },
    {
      type: "complaint",
      label: "车质网投诉销量比",
      status,
      summary: `核验 ${shortName} 的投诉销量比、投诉列表和电池/电机/电控/充电相关投诉。`,
      url: makeSearchUrl(`site:12365auto.com ${carName} 投诉销量比 投诉 电池 电机 电控 充电`),
      updatedAt: today
    },
    {
      type: "study",
      label: "J.D. Power/长期质量研究",
      status,
      summary: `检索 ${shortName}、同车系或同平台是否进入 J.D. Power NEV-IQS、可靠性研究或长期测试。`,
      url: makeSearchUrl(`${carName} J.D. Power NEV-IQS 质量 可靠性 长期测试`),
      updatedAt: today
    },
    {
      type: "reputation",
      label: "车主口碑/高频问题",
      status,
      summary: `检索 ${shortName} 车主口碑中的高频质量问题和三电相关反馈。`,
      url: makeSearchUrl(`${carName} 车主口碑 三电 故障 电池 续航衰减`),
      updatedAt: today
    }
  ];
}

function mergeQualitySources(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((source) => {
    const key = source.url || `${source.type}:${source.label}:${source.summary}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function inferQualitySourceType(text = "") {
  if (/召回|缺陷|市场监督|samr|官方|公告/i.test(text)) return "official";
  if (/车质网|投诉|12365|投诉销量/i.test(text)) return "complaint";
  if (/j\\.d\\.? power|jd power|质量研究|iqs|pp100/i.test(text)) return "study";
  if (/论坛|社区|口碑|车主|懂车帝|汽车之家|易车/i.test(text)) return "reputation";
  return "reputation";
}

function parseModelJson(text = "") {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("AI 模型没有返回可解析的 JSON。");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeError(error) {
  const message = error?.message || String(error);
  if (/User location is not supported/i.test(message)) {
    return "AI API 当前网络区域不可用，请检查代理、API 区域或改用可用的本地模型配置。";
  }
  if (/AbortError|aborted|timeout/i.test(message)) {
    return "AI 请求超时，请稍后重试或减少候选数量。";
  }
  return message;
}
