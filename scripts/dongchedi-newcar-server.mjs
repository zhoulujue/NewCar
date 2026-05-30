import { createServer } from "node:http";

const HOST = process.env.DCD_NEWCAR_HOST || "127.0.0.1";
const PORT = Number(process.env.DCD_NEWCAR_PORT || 8788);
const HOME_URL = "https://www.dongchedi.com/";
const SERIES_URL = "https://www.dongchedi.com/auto/series/";
const USED_CAR_LIST_URL = "https://www.dongchedi.com/motor/pc/sh/sh_sku_list";
const CACHE_TTL_MS = Number(process.env.DCD_NEWCAR_CACHE_MINUTES || 10) * 60 * 1000;
const USER_AGENT = process.env.DCD_NEWCAR_UA || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

const usedTargetSeries = [
  { seriesId: 25557, name: "理想i6" },
  { seriesId: 2843, name: "蔚来ES6" },
  { seriesId: 1616, name: "蔚来ES8" },
  { seriesId: 9778, name: "ZEEKR 7X" },
  { seriesId: 25172, name: "ZEEKR 007GT" },
  { seriesId: 6391, name: "小鹏G7" },
  { seriesId: 9118, name: "智己LS6" },
  { seriesId: 9440, name: "奥迪Q6L e-tron" },
  { seriesId: 9833, name: "乐道L60" },
  { seriesId: 25565, name: "乐道L80" },
  { seriesId: 10180, name: "智界R7" },
  { seriesId: 6187, name: "小米SU7" }
];

let recentCache = null;
let usedCache = null;

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
    if (req.method === "GET" && url.pathname === "/dongchedi/official-usedcars") {
      const limit = clamp(Number(url.searchParams.get("limit") || 80), 1, 120);
      const pages = clamp(Number(url.searchParams.get("pages") || 3), 1, 6);
      const city = url.searchParams.get("city") || "全国";
      const force = url.searchParams.get("force") === "1";
      const payload = await getOfficialUsedCars({ city, limit, pages, force });
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
  if (!force && recentCache && Date.now() - recentCache.createdAt < CACHE_TTL_MS && recentCache.limit >= limit && recentCache.detailLimit >= detailLimit) {
    return { ...recentCache.payload, cached: true, releases: recentCache.payload.releases.slice(0, limit) };
  }
  const payload = await fetchRecentModels({ limit, detailLimit });
  recentCache = { createdAt: Date.now(), limit, detailLimit, payload };
  return payload;
}

async function fetchRecentModels({ limit, detailLimit }) {
  const home = await fetchNextPage(HOME_URL);
  const pageProps = home.props?.pageProps || {};
  const recentReleases = (pageProps.newCarData || []).map(fromHomeRelease).filter(Boolean);
  const hotReleases = collectHotModels(pageProps).map(fromPopularModel).filter(Boolean);
  const baseReleases = mergeReleases([...recentReleases, ...hotReleases]).slice(0, limit);
  const recentDetailCount = Math.ceil(detailLimit * 0.58);
  const detailTargets = mergeReleases([
    ...recentReleases.slice(0, recentDetailCount),
    ...hotReleases.slice(0, detailLimit - recentDetailCount)
  ]).slice(0, detailLimit);
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

async function getOfficialUsedCars({ city, limit, pages, force }) {
  const cacheKey = `${city}:${limit}:${pages}`;
  if (!force && usedCache && usedCache.cacheKey === cacheKey && Date.now() - usedCache.createdAt < CACHE_TTL_MS) {
    return { ...usedCache.payload, cached: true, listings: usedCache.payload.listings.slice(0, limit) };
  }
  const payload = await fetchOfficialUsedCars({ city, limit, pages });
  usedCache = { createdAt: Date.now(), cacheKey, payload };
  return payload;
}

async function fetchOfficialUsedCars({ city, limit, pages }) {
  const requests = [];
  for (let page = 1; page <= pages; page += 1) {
    requests.push({ sh_city_name: city, page, limit: 20, dcd_self_sh: 1, price: "15,33" });
  }
  for (let page = 1; page <= Math.min(2, pages); page += 1) {
    requests.push({ sh_city_name: city, page, limit: 20, dcd_self_sh: 1, price: "20,31" });
  }
  usedTargetSeries.forEach((target) => {
    requests.push({ sh_city_name: city, page: 1, limit: 20, dcd_self_sh: 1, series_ids: target.seriesId });
  });

  const payloads = await mapLimit(requests, 3, fetchUsedCarPage);
  const mergedListings = mergeUsedListings(payloads.flatMap((payload) => payload.listings || []));
  const cityListings = city === "全国" ? mergedListings : mergedListings.filter((listing) => listing.city === city);
  const listings = cityListings
    .sort((a, b) => b.fitScore - a.fitScore || usedPriceSort(a) - usedPriceSort(b))
    .slice(0, limit);
  return {
    ok: true,
    sourceLabel: "懂车帝官方二手车",
    sourceUrl: "https://www.dongchedi.com/usedcar/x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x",
    city,
    fetchedAt: new Date().toISOString(),
    listings
  };
}

async function fetchUsedCarPage(params) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) body.set(key, String(value));
  });
  const response = await fetch(USED_CAR_LIST_URL, {
    method: "POST",
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/json,text/plain,*/*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.dongchedi.com",
      referer: "https://www.dongchedi.com/usedcar/x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x"
    },
    body
  });
  if (!response.ok) throw new Error(`懂车帝二手车接口返回 ${response.status}`);
  const json = await response.json();
  if (json.status !== 0) throw new Error(json.prompts || json.message || "懂车帝二手车接口返回异常");
  const rawItems = json.data?.search_sh_sku_info_list || [];
  const glyphMap = buildGlyphMap(rawItems);
  return {
    listings: rawItems.map((item) => normalizeUsedListing(item, glyphMap, params)).filter(Boolean),
    hasMore: Boolean(json.data?.has_more),
    total: json.data?.total || ""
  };
}

function normalizeUsedListing(item, glyphMap, params = {}) {
  if (!item?.sku_id) return null;
  const title = decodeGlyphText(item.title || "", glyphMap);
  const priceText = decodeGlyphText(item.sh_price || "", glyphMap);
  const officialPriceText = decodeGlyphText(item.official_price || "", glyphMap);
  const ageText = decodeGlyphText(item.car_age || "", glyphMap);
  const mileageText = decodeGlyphText(item.car_mileage || "", glyphMap);
  const city = decodeGlyphText(item.brand_source_city_name || item.car_source_city_name || "", glyphMap);
  const tags = normalizeUsedTags(item);
  const listing = {
    skuId: Number(item.sku_id),
    spuId: Number(item.spu_id || 0),
    brandId: Number(item.brand_id || 0),
    brandName: item.brand_name || "",
    seriesId: Number(item.series_id || 0),
    seriesName: item.series_name || "",
    title,
    trim: title.replace(item.series_name || "", "").trim(),
    year: Number(item.car_year || parseYear(ageText) || 0) || "",
    ageText,
    mileageText,
    mileageWan: parseWan(mileageText),
    priceText,
    priceWan: parseWan(priceText),
    officialPriceText,
    officialPriceWan: parseWan(officialPriceText),
    city,
    sourceType: item.is_self_trade ? "懂车帝官方直营" : item.car_source_type || "懂车帝车源",
    seller: item.is_self_trade ? `懂车帝官方直营 ${city || ""}`.trim() : item.car_source_type || "懂车帝车源",
    shopId: item.shop_id || "",
    authentication: item.authentication_method || "",
    officialHint: decodeGlyphText(item.official_hint_bar || "", glyphMap),
    image: normalizeImageUrl(item.image || item.related_video_thumb || ""),
    url: buildUsedCarDetailUrl(item.sku_id, city || params.city || "北京"),
    tags,
    transferCount: numberOrEmpty(item.transfer_cnt),
    range: extractRange(`${title} ${tags.join(" ")}`),
    batterySize: extractBatterySize(`${title} ${tags.join(" ")}`),
    energyType: inferUsedEnergyType(`${title} ${tags.join(" ")}`),
    rawUpdatedAt: new Date().toISOString()
  };
  const fit = scoreUsedListing(listing);
  return {
    ...listing,
    fitScore: fit.score,
    fitReasons: fit.reasons,
    riskFlags: usedListingRisks(listing)
  };
}

function buildUsedCarDetailUrl(skuId, city = "北京") {
  const url = new URL("https://m.dcdapp.com/motor/feoffline/usedcar_detail/detail.html");
  url.searchParams.set("_pia_", "1");
  url.searchParams.set("sku_id", String(skuId || ""));
  url.searchParams.set("city_name", city || "北京");
  url.searchParams.set("sh_city_name", city || "北京");
  url.searchParams.set("biz_scene", "sh_car");
  url.searchParams.set("used_car_entry", "newcar_workbench");
  url.searchParams.set("link_source", "newcar_workbench_source_detail");
  return url.toString();
}

function buildGlyphMap(items) {
  const map = {};
  items.forEach((item) => {
    const plain = [item.car_age, item.car_mileage].filter(Boolean).join(" / ");
    learnGlyphPair(map, item.sub_title, plain);
  });
  return map;
}

function learnGlyphPair(map, raw = "", plain = "") {
  const rawChars = [...String(raw)];
  const plainChars = [...String(plain)];
  if (!rawChars.length || rawChars.length !== plainChars.length) return;
  rawChars.forEach((char, index) => {
    if (char !== plainChars[index] && char.charCodeAt(0) >= 0xe000) map[char] = plainChars[index];
  });
}

function decodeGlyphText(value = "", map = {}) {
  return [...String(value)].map((char) => map[char] || char).join("");
}

function normalizeUsedTags(item) {
  const simple = (item.tags || []).map((tag) => tag.text).filter(Boolean);
  const v2 = Array.isArray(item.tags_v2) ? item.tags_v2.map((tag) => tag.text).filter(Boolean) : [];
  const special = Object.values(item.special_tags || {}).map((tag) => tag.text).filter(Boolean);
  if (item.official_hint_bar) special.push("官方直营");
  if (item.authentication_method) special.push(item.authentication_method);
  return unique([...simple, ...v2, ...special]);
}

function scoreUsedListing(listing) {
  let score = 16;
  const reasons = [];
  if (/官方|自营|直营/.test(listing.sourceType)) {
    score += 14;
    reasons.push("懂车帝官方/自营车源");
  }
  if (listing.priceWan !== "") {
    if (listing.priceWan >= 20 && listing.priceWan <= 31) {
      score += 26;
      reasons.push("价格落在30万左右");
    } else if (listing.priceWan >= 15 && listing.priceWan < 20) {
      score += 12;
      reasons.push("价格明显低于预算，可做性价比备选");
    } else if (listing.priceWan > 31 && listing.priceWan <= 38) {
      score += 8;
      reasons.push("价格略超预算，适合观望压价");
    } else if (listing.priceWan < 10) {
      score -= 10;
    } else {
      score -= 12;
    }
  }
  const text = `${listing.brandName} ${listing.seriesName} ${listing.title}`;
  if (/理想i6/i.test(text)) {
    score += 26;
    reasons.push("理想 i6 是你的体感标尺");
  } else if (/蔚来ES6|ZEEKR 7X|007GT|小鹏G7|奥迪Q6L|智己LS6|乐道L80|智界R7/i.test(text)) {
    score += 18;
    reasons.push("命中近期重点关注车型");
  } else if (/蔚来|理想|极氪|小鹏|奥迪|智己|乐道|小米|智界/i.test(text)) {
    score += 10;
    reasons.push("品牌在你的关注池内");
  }
  if (["ev", "phev", "erev", "new_energy"].includes(listing.energyType)) {
    score += 10;
    reasons.push(energyLabelFromType(listing.energyType, "新能源"));
  }
  if (listing.range >= 650) {
    score += 9;
    reasons.push(`续航 ${listing.range}km`);
  }
  if (listing.year >= 2025) {
    score += 18;
    reasons.push("准新年份");
  } else if (listing.year >= 2023) {
    score += 7;
  } else if (listing.year && listing.year < 2021) {
    score -= 10;
  }
  if (listing.mileageWan !== "") {
    if (listing.mileageWan <= 1) {
      score += 14;
      reasons.push("低里程");
    } else if (listing.mileageWan <= 3) {
      score += 7;
    } else if (listing.mileageWan >= 6) {
      score -= 8;
    }
  }
  if (/ES8|L80|L90|六座|七座|MPV/i.test(text)) {
    score -= 4;
    reasons.push("两人用车略偏大");
  }
  if (/智界R7/i.test(text)) score -= 7;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.slice(0, 6)
  };
}

function usedListingRisks(listing) {
  const risks = [];
  if (listing.authentication && !/官方认证/.test(listing.authentication)) risks.push("非品牌官方认证");
  if (listing.city && listing.city !== "北京") risks.push(`异地车源：${listing.city}`);
  if (listing.year && listing.year < 2023) risks.push("车龄偏老");
  if (listing.mileageWan !== "" && listing.mileageWan >= 5) risks.push("里程偏高");
  if (!listing.priceWan) risks.push("价格字段需二次确认");
  if (/蔚来|ES6|ES8|ET5|ET7/i.test(`${listing.brandName} ${listing.seriesName}`)) risks.push("蔚来权益/NOP+需确认");
  if (/车衣|改色/i.test(listing.title)) risks.push("膜下漆面需复检");
  if (!risks.length) risks.push("仍需看检测报告和出险记录");
  return risks.slice(0, 5);
}

function mergeUsedListings(listings) {
  const map = new Map();
  listings.forEach((listing) => {
    if (!listing?.skuId) return;
    const existing = map.get(listing.skuId);
    if (!existing || listing.fitScore > existing.fitScore) map.set(listing.skuId, listing);
  });
  return [...map.values()];
}

function usedPriceSort(listing) {
  return listing.priceWan === "" ? 999 : Math.abs(Number(listing.priceWan) - 28);
}

function parseYear(text = "") {
  const match = String(text).match(/(20\d{2})/);
  return match ? Number(match[1]) : "";
}

function parseWan(text = "") {
  const match = String(text).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : "";
}

function extractRange(text = "") {
  const match = String(text).match(/(\d{3,4})\s*(?:KM|km|公里)/);
  return match ? Number(match[1]) : "";
}

function extractBatterySize(text = "") {
  const match = String(text).match(/(\d{2,3})\s*kWh/i);
  return match ? Number(match[1]) : "";
}

function inferUsedEnergyType(text = "") {
  if (/增程|EREV/i.test(text)) return "erev";
  if (/插混|PHEV|EM-P|DM-i|DM\b|混动|T8/i.test(text)) return "phev";
  if (/纯电|电动|EV|e-tron|蔚来|极氪|小鹏|智己|乐道|小米|智界|i6|SU7|YU7/i.test(text)) return "ev";
  return "unknown";
}

function numberOrEmpty(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
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
    tags: unique(["近期发布", ...(item.tag_list || []).map((tag) => tag.name).filter(Boolean)]),
    sourceTypes: ["recent"],
    heatRank: "",
    hotCategory: "",
    hotLabel: "",
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

function collectHotModels(pageProps) {
  const popular = pageProps.popularModels || {};
  const buckets = [
    ["car", "热门轿车"],
    ["suv", "热门SUV"],
    ["other", "其他热门"]
  ].map(([key, label]) => ({
    label,
    series: popular[key]?.series || []
  }));
  const maxLength = Math.max(...buckets.map((bucket) => bucket.series.length), 0);
  const models = [];
  for (let index = 0; index < maxLength; index += 1) {
    for (const bucket of buckets) {
      const series = bucket.series[index];
      if (!series) continue;
      models.push({
        ...series,
        hotCategory: bucket.label,
        heatRank: index + 1
      });
    }
  }
  return models;
}

function fromPopularModel(item) {
  if (!item?.id) return null;
  return {
    seriesId: Number(item.id),
    seriesName: item.outter_name || "",
    brandName: "",
    carType: item.hotCategory?.replace("热门", "") || "",
    energyType: "unknown",
    energyLabel: "待确认",
    priceText: "价格待确认",
    priceMinWan: "",
    priceMaxWan: "",
    releaseDate: "",
    releaseTimestamp: 0,
    tags: unique(["热门车型", item.new_car_tag ? "新" : ""]),
    sourceTypes: ["hot"],
    heatRank: item.heatRank || "",
    hotCategory: item.hotCategory || "热门车型",
    hotLabel: `${item.hotCategory || "热门车型"} Top ${item.heatRank || "-"}`,
    coverUrl: "",
    dcdUrl: `${SERIES_URL}${item.id}`,
    articleUrl: "",
    articleTitle: "",
    communityText: "",
    score: {},
    dimensions: {},
    models: [],
    news: [],
    highlights: [],
    rawUpdatedAt: new Date().toISOString()
  };
}

function mergeReleases(items) {
  const map = new Map();
  for (const item of items) {
    if (!item?.seriesId) continue;
    const existing = map.get(item.seriesId);
    if (!existing) {
      map.set(item.seriesId, { ...item, tags: unique(item.tags || []), sourceTypes: unique(item.sourceTypes || []) });
      continue;
    }
    map.set(item.seriesId, {
      ...existing,
      ...Object.fromEntries(Object.entries(item).filter(([, value]) => value !== "" && value !== undefined && value !== null)),
      seriesName: existing.seriesName || item.seriesName,
      brandName: existing.brandName || item.brandName,
      carType: existing.carType || item.carType,
      energyType: existing.energyType !== "unknown" ? existing.energyType : item.energyType,
      energyLabel: existing.energyLabel !== "待确认" ? existing.energyLabel : item.energyLabel,
      priceText: existing.priceText !== "价格待确认" ? existing.priceText : item.priceText,
      priceMinWan: existing.priceMinWan !== "" ? existing.priceMinWan : item.priceMinWan,
      priceMaxWan: existing.priceMaxWan !== "" ? existing.priceMaxWan : item.priceMaxWan,
      releaseDate: existing.releaseDate || item.releaseDate,
      releaseTimestamp: existing.releaseTimestamp || item.releaseTimestamp,
      coverUrl: existing.coverUrl || item.coverUrl,
      tags: unique([...(existing.tags || []), ...(item.tags || [])]),
      sourceTypes: unique([...(existing.sourceTypes || []), ...(item.sourceTypes || [])])
    });
  }
  return [...map.values()].sort((a, b) => releaseSortScore(b) - releaseSortScore(a));
}

function releaseSortScore(item) {
  const recentScore = item.releaseTimestamp ? item.releaseTimestamp / 100000000 : 0;
  const hotScore = item.heatRank ? Math.max(0, 60 - Number(item.heatRank)) : 0;
  const sourceScore = item.sourceTypes?.includes("recent") ? 30 : 0;
  return recentScore + hotScore + sourceScore;
}

async function enrichRelease(release) {
  try {
    const series = await fetchNextPage(release.dcdUrl);
    const props = series.props?.pageProps || {};
    const head = props.seriesHomeHead || {};
    const overview = props.overviewData || {};
    const models = flattenModels(props.carModelsData).map((model) => enrichModel(model, overview));
    const priceText = bestPriceText(head, release.priceText);
    const priceRange = parseWanRange(priceText);
    const energyType = deriveEnergyType(head, models, release);
    return {
      ...release,
      brandName: head.brand_name || release.brandName,
      seriesName: head.series_name || release.seriesName,
      carType: head.car_type || release.carType,
      energyType,
      energyLabel: energyLabelFromType(energyType, release.energyLabel),
      priceText,
      priceMinWan: release.priceMinWan !== "" ? release.priceMinWan : priceRange.min,
      priceMaxWan: release.priceMaxWan !== "" ? release.priceMaxWan : priceRange.max,
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
  const range = parseWanRange(raw);
  const prefix = priceInfo.price_prefix || "";
  const unit = priceInfo.unit_text || "";
  return {
    text: raw ? `${prefix}${raw}${unit}` : "价格待确认",
    min: range.min,
    max: range.max
  };
}

function parseWanRange(text = "") {
  const match = String(text).match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  return {
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

function deriveEnergyType(head, models, fallback) {
  const text = [
    head.series_new_energy ? "新能源" : "",
    fallback.energyLabel,
    fallback.seriesName,
    ...models.map((model) => [model.groupKey, model.baseConfig.join(" "), model.range, model.battery].join(" "))
  ].join(" ");
  if (/增程/.test(text)) return "erev";
  if (/插混|PHEV|DM-i|DM\b|混动/i.test(text)) return "phev";
  if (/纯电|电动|EV\b/i.test(text)) return "ev";
  if (head.series_new_energy) return "new_energy";
  return fallback.energyType || "unknown";
}

function energyLabelFromType(type, fallback = "待确认") {
  return { ev: "纯电", phev: "插混", erev: "增程", hev: "油混", new_energy: "新能源", fuel: "燃油/其他", unknown: fallback }[type] || fallback;
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

function unique(values) {
  return [...new Set((values || []).filter(Boolean).map(String))];
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
