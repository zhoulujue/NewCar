import { createServer } from "node:http";

const HOST = process.env.DCD_NEWCAR_HOST || "127.0.0.1";
const PORT = Number(process.env.DCD_NEWCAR_PORT || 8788);
const HOME_URL = "https://www.dongchedi.com/";
const SERIES_URL = "https://www.dongchedi.com/auto/series/";
const CACHE_TTL_MS = Number(process.env.DCD_NEWCAR_CACHE_MINUTES || 10) * 60 * 1000;
const USER_AGENT = process.env.DCD_NEWCAR_UA || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

let cache = null;

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true, service: "newcar-dongchedi-newcar", source: HOME_URL });
      return;
    }
    if (req.method === "GET" && url.pathname === "/dongchedi/recent-models") {
      const limit = clamp(Number(url.searchParams.get("limit") || 30), 1, 60);
      const detailLimit = clamp(Number(url.searchParams.get("detailLimit") || 18), 0, limit);
      const force = url.searchParams.get("force") === "1";
      const payload = await getRecentModels({ limit, detailLimit, force });
      sendJson(res, 200, payload);
      return;
    }
    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: normalizeError(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NewCar Dongchedi new-car service listening on http://${HOST}:${PORT}`);
});

async function getRecentModels({ limit, detailLimit, force }) {
  if (!force && cache && Date.now() - cache.createdAt < CACHE_TTL_MS && cache.limit >= limit && cache.detailLimit >= detailLimit) {
    return { ...cache.payload, cached: true, releases: cache.payload.releases.slice(0, limit) };
  }
  const payload = await fetchRecentModels({ limit, detailLimit });
  cache = { createdAt: Date.now(), limit, detailLimit, payload };
  return payload;
}

async function fetchRecentModels({ limit, detailLimit }) {
  const home = await fetchNextPage(HOME_URL);
  const pageProps = home.props?.pageProps || {};
  const baseReleases = (pageProps.newCarData || []).slice(0, limit).map(fromHomeRelease).filter(Boolean);
  const detailTargets = baseReleases.slice(0, detailLimit);
  const detailed = await mapLimit(detailTargets, 4, enrichRelease);
  const detailMap = new Map(detailed.map((item) => [item.seriesId, item]));
  const releases = baseReleases.map((item) => detailMap.get(item.seriesId) || item);
  return {
    ok: true,
    sourceLabel: "懂车帝",
    sourceUrl: HOME_URL,
    fetchedAt: new Date().toISOString(),
    releases
  };
}

function fromHomeRelease(item) {
  if (!item?.series_id) return null;
  const price = parsePriceInfo(item.price_info);
  return {
    seriesId: Number(item.series_id),
    seriesName: item.series_name || "",
    brandName: item.brand_name || "",
    carType: seriesTypeLabel(item.series_type),
    energyType: energyTypeFromCode(item.series_new_energy_type),
    energyLabel: energyLabelFromCode(item.series_new_energy_type),
    priceText: price.text,
    priceMinWan: price.min,
    priceMaxWan: price.max,
    releaseDate: formatReleaseDate(item.online_date_unix, item.online_date_month, item.online_date_day),
    releaseTimestamp: Number(item.online_date_unix || 0),
    tags: (item.tag_list || []).map((tag) => tag.name).filter(Boolean),
    coverUrl: normalizeImageUrl(item.cover_url),
    dcdUrl: `${SERIES_URL}${item.series_id}`,
    articleUrl: item.article_info?.gid ? `https://www.dongchedi.com/article/${item.article_info.gid}` : "",
    articleTitle: item.article_info?.title_name || "",
    communityText: item.cheyou_community_info?.title_name || "",
    score: {},
    dimensions: {},
    models: [],
    news: [],
    highlights: [],
    rawUpdatedAt: new Date().toISOString()
  };
}

async function enrichRelease(release) {
  try {
    const series = await fetchNextPage(release.dcdUrl);
    const props = series.props?.pageProps || {};
    const head = props.seriesHomeHead || {};
    const overview = props.overviewData || {};
    const models = flattenModels(props.carModelsData).map((model) => enrichModel(model, overview));
    return {
      ...release,
      brandName: head.brand_name || release.brandName,
      seriesName: head.series_name || release.seriesName,
      carType: head.car_type || release.carType,
      priceText: bestPriceText(head, release.priceText),
      coverUrl: normalizeImageUrl(head.cover_url || release.coverUrl),
      dimensions: firstDimensions(overview),
      score: {
        total: scoreValue(props.scoreSimpleInfo?.score || head.total_score),
        comfort: scoreValue(props.scoreSimpleInfo?.comfort_score || head.comfort_score),
        interior: scoreValue(props.scoreSimpleInfo?.interiors_score || head.interiors_score),
        appearance: scoreValue(props.scoreSimpleInfo?.appearance_score || head.appearance_score),
        configuration: scoreValue(props.scoreSimpleInfo?.configuration_score || head.configuration_score)
      },
      models,
      news: collectNews(props),
      highlights: collectHighlights(props, models),
      rawUpdatedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...release,
      highlights: [`车型页详情暂未刷新成功：${normalizeError(error)}`],
      rawUpdatedAt: new Date().toISOString()
    };
  }
}

function flattenModels(carModelsData = {}) {
  return (carModelsData.tab_list || [])
    .flatMap((tab) => tab.data || [])
    .filter((row) => row.type === "1115" && row.info)
    .map((row) => row.info);
}

function enrichModel(info, overview = {}) {
  const carId = Number(info.car_id || info.id || 0);
  const consumption = findByCarId(overview.new_energy_consumption || [], carId);
  const power = findByCarId([...(overview.new_energy_power?.new_energy_power_item || []), ...(overview.power?.power_item || [])], carId);
  const manipulation = findByCarId(overview.manipulation || [], carId);
  return {
    id: carId,
    year: info.year || "",
    name: info.car_name || info.name || "",
    price: info.price || "",
    officialPrice: info.official_price_str || "",
    dealerPrice: info.dealer_price || "",
    ownerPrice: info.owner_price || "",
    saleStatus: saleStatusLabel(info.sale_status, info.presale_car),
    groupKey: info.car_group_list_key || "",
    baseConfig: info.car_config?.base_config || [],
    highlightsConfig: info.car_config?.highlights_config || [],
    battery: consumption?.battery_capacity || "",
    range: consumption?.recharge_mileage || "",
    power: power?.max_horsepower || power?.electric_max_horsepower || power?.engine_description || "",
    drive: manipulation?.driver_form || manipulation?.fourwheel_drive_type || "",
    link: `https://www.dongchedi.com/auto/series/${info.series_id}/model-${carId}`
  };
}

function findByCarId(items, carId) {
  return items.find((item) => (item.car_id_list || []).map(Number).includes(carId)) || null;
}

function firstDimensions(overview = {}) {
  const row = overview.space?.[0] || {};
  return {
    length: row.length || "",
    width: row.width || "",
    height: row.height || "",
    wheelbase: row.wheelbase || ""
  };
}

function collectNews(props) {
  return [
    ...(props.newcarStaticNews || []),
    ...(props.newestStaticNews || []),
    ...(props.originalStaticNews || []),
    ...(props.evaluatingStaticNews || [])
  ].filter((item) => item?.title).slice(0, 8).map((item) => ({
    title: item.title,
    url: `https://www.dongchedi.com/article/${item.unique_id_str || item.unique_id}`,
    source: item.user_info?.name || "懂车帝",
    publishTime: item.publish_time ? new Date(Number(item.publish_time) * 1000).toISOString() : ""
  }));
}

function collectHighlights(props, models) {
  const highlights = [];
  const head = props.seriesHomeHead || {};
  if (head.official_price && head.official_price !== "暂无报价") highlights.push(`官方价 ${head.official_price}`);
  if (head.dealer_price && head.dealer_price !== "暂无报价") highlights.push(`经销商价 ${head.dealer_price}`);
  const dimension = firstDimensions(props.overviewData || {});
  if (dimension.length) highlights.push(`尺寸 ${dimension.length}/${dimension.width}/${dimension.height}mm，轴距 ${dimension.wheelbase}mm`);
  const modelEnergy = models.map((model) => [model.groupKey, model.battery, model.range].filter(Boolean).join(" · ")).filter(Boolean)[0];
  if (modelEnergy) highlights.push(modelEnergy);
  return highlights.slice(0, 6);
}

async function fetchNextPage(url) {
  const html = await fetchHtml(url);
  return extractNextData(html);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7"
    }
  });
  if (!response.ok) throw new Error(`懂车帝返回 ${response.status}`);
  return response.text();
}

function extractNextData(html) {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("未找到懂车帝页面数据。");
  return JSON.parse(match[1]);
}

function parsePriceInfo(priceInfo = {}) {
  const raw = priceInfo.price || priceInfo.text || "";
  const match = String(raw).match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  const prefix = priceInfo.price_prefix || "";
  const unit = priceInfo.unit_text || "";
  return {
    text: raw ? `${prefix}${raw}${unit}` : "价格待确认",
    min: match ? Number(match[1]) : "",
    max: match ? Number(match[2] || match[1]) : ""
  };
}

function bestPriceText(head, fallback) {
  if (head.official_price && head.official_price !== "暂无报价") return head.official_price;
  if (head.dealer_price && head.dealer_price !== "暂无报价") return head.dealer_price;
  if (head.pre_price && head.pre_price !== "暂无报价") return head.pre_price;
  return fallback || "价格待确认";
}

function scoreValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function saleStatusLabel(status, presale) {
  if (presale) return "即将上市";
  return { 1: "在售", 2: "停售", 3: "即将上市" }[status] || "待确认";
}

function seriesTypeLabel(type) {
  return { 0: "轿车", 1: "SUV", 2: "MPV" }[type] || "其他";
}

function energyTypeFromCode(code) {
  return { 1: "ev", 2: "phev", 3: "hev", 4: "erev", 5: "erev" }[code] || (code ? "new_energy" : "fuel");
}

function energyLabelFromCode(code) {
  return { 0: "燃油/其他", 1: "纯电", 2: "插混", 3: "油混", 4: "增程", 5: "增程" }[code] || "新能源";
}

function formatReleaseDate(unix, month, day) {
  if (unix) {
    const date = new Date(Number(unix) * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replaceAll("/", "-");
    }
  }
  if (month && day) return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return "";
}

function normalizeImageUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  return url;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function normalizeError(error) {
  return error?.message || String(error);
}
