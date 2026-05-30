import { createServer } from "node:http";
import { spawn } from "node:child_process";

const HOST = process.env.GEMINI_ANALYZER_HOST || "127.0.0.1";
const PORT = Number(process.env.GEMINI_ANALYZER_PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MODE = process.env.GEMINI_ANALYZER_MODE || (process.env.GEMINI_API_KEY ? "api" : "cli");
const MAX_BODY_BYTES = Number(process.env.GEMINI_ANALYZER_MAX_BODY_MB || 28) * 1024 * 1024;
const MAX_INLINE_IMAGES = Number(process.env.GEMINI_ANALYZER_MAX_IMAGES || 10);

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { ok: true, service: "newcar-gemini-analyzer", mode: MODE, model: MODEL });
      return;
    }
    if (req.method === "POST" && req.url === "/analyze") {
      const payload = await readJson(req);
      const result = MODE === "api" ? await analyzeWithGeminiApi(payload) : await analyzeWithGeminiCli(payload);
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
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    })
  });
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

function buildPrompt(payload, withImages) {
  const imageList = collectImages(payload).map((image, index) => `${index + 1}. ${image.name}，来自信息「${image.infoTitle}」`);
  return `
你是一个严谨的新能源二手车购车分析助手。请根据用户画像、当前车源字段、信息墙文本以及${withImages ? "随附图片" : "图片文件名"}，更新这个购车工作台里的外显信息。

要求：
- 只依据输入信息推断，不要编造没有证据的事实。
- 如果图片或文本里出现价格、里程、过户、城市、电池、权益、检测、事故/修复、商家承诺、配置，请回填到 carPatch。
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
  return message;
}
