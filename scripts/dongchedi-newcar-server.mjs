import { createServer } from "node:http";

const HOST = process.env.DCD_NEWCAR_HOST || "127.0.0.1";
const PORT = Number(process.env.DCD_NEWCAR_PORT || 8788);
const HOME_URL = "https://www.dongchedi.com/";
const SERIES_URL = "https://www.dongchedi.com/auto/series/";
const USED_CAR_LIST_URL = "https://www.dongchedi.com/motor/pc/sh/sh_sku_list";
const CACHE_TTL_MS = Number(process.env.DCD_NEWCAR_CACHE_MINUTES || 10) * 60 * 1000;
const USER_AGENT = process.env.DCD_NEWCAR_UA || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

const knownPureEvSeriesIds = new Set([
  25557, 20041, 25621, 6391, 9778, 25172, 25846, 9440, 25994, 25400, 5358, 25565,
  2843, 1616, 9118, 10180, 6187, 25738, 9952, 25904, 25226, 6172, 4363, 1255,
  5813, 8942, 5952, 5248
]);

const industryNewCarSources = [
  { name: "汽车之家资讯", url: "https://www.autohome.com.cn/news/" },
  { name: "易车新车", url: "https://news.yiche.com/xinchexiaoxi/" },
  { name: "太平洋汽车新车", url: "https://www.pcauto.com.cn/nation/" }
];

const supplementalNewCarSeries = [
  { seriesId: 25557, name: "理想i6", sourceLabel: "重点纯电候选", aliases: ["理想 i6"] },
  { seriesId: 20041, name: "小米YU7", sourceLabel: "重点纯电候选", aliases: ["小米 YU7"] },
  { seriesId: 25621, name: "小鹏GX", sourceLabel: "重点纯电候选", aliases: ["小鹏GX", "小鹏 G X", "GX Ultra SE"] },
  { seriesId: 6391, name: "小鹏G7", sourceLabel: "重点纯电候选", aliases: ["小鹏 G7"] },
  { seriesId: 9778, name: "ZEEKR 7X", sourceLabel: "重点纯电候选", aliases: ["极氪7X", "极氪 7X"] },
  { seriesId: 25172, name: "ZEEKR 007GT", sourceLabel: "重点纯电候选", aliases: ["极氪007GT", "极氪 007GT", "007GT"] },
  { seriesId: 25846, name: "奥迪E7X", sourceLabel: "重点纯电候选", aliases: ["奥迪 E7X"] },
  { seriesId: 9440, name: "奥迪Q6L e-tron", sourceLabel: "重点纯电候选", aliases: ["奥迪Q6L", "Q6L e-tron"] },
  { seriesId: 25994, name: "钛7 EV", sourceLabel: "重点纯电候选", aliases: ["方程豹钛7", "方程豹 钛7", "钛7"] },
  { seriesId: 25400, name: "海狮06EV", sourceLabel: "重点纯电候选", aliases: ["比亚迪海狮06EV", "海狮06 EV"] },
  { seriesId: 5358, name: "IQ锐歌", sourceLabel: "重点纯电候选", aliases: ["凯迪拉克IQ锐歌", "锐歌"] },
  { seriesId: 25565, name: "乐道L80", sourceLabel: "重点纯电候选", aliases: ["乐道 L80"] },
  { seriesId: 2843, name: "蔚来ES6", sourceLabel: "重点纯电候选", aliases: ["蔚来 ES6"] },
  { seriesId: 1616, name: "蔚来ES8", sourceLabel: "重点纯电候选", aliases: ["蔚来 ES8"] },
  { seriesId: 9118, name: "智己LS6", sourceLabel: "重点纯电候选", aliases: ["智己 LS6"] },
  { seriesId: 10180, name: "智界R7", sourceLabel: "重点纯电候选", aliases: ["智界 R7"] },
  { seriesId: 6187, name: "小米SU7", sourceLabel: "重点纯电候选", aliases: ["小米 SU7"] },
  { seriesId: 4363, name: "Model Y", sourceLabel: "热门纯电候选", aliases: ["特斯拉Model Y", "特斯拉 Model Y"] },
  { seriesId: 25738, name: "与众07", sourceLabel: "近期纯电候选", aliases: ["与众 07"] },
  { seriesId: 9952, name: "与众06", sourceLabel: "近期纯电候选", aliases: ["与众 06"] },
  { seriesId: 25904, name: "蔚来ES9", sourceLabel: "近期纯电候选", aliases: ["蔚来 ES9"] },
  { seriesId: 25226, name: "沃尔沃ES90", sourceLabel: "近期纯电候选", aliases: ["沃尔沃 ES90"] },
  { seriesId: 6172, name: "沃尔沃EX90", sourceLabel: "近期纯电候选", aliases: ["沃尔沃 EX90"] }
];

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
      const limit = clamp(Number(url.searchParams.get("limit") || 60), 1, 120);
      const detailLimit = clamp(Number(url.searchParams.get("detailLimit") || 60), 0, Math.min(limit, 100));
      const force = url.searchParams.get("force") === "1";
      const profile = parseProfileFromSearch(url.searchParams);
      const payload = await getRecentModels({ limit, detailLimit, force, profile });
      sendJson(res, 200, payload);
      return;
    }
    if (req.method === "GET" && url.pathname === "/dongchedi/official-usedcars") {
      const limit = clamp(Number(url.searchParams.get("limit") || 80), 1, 120);
      const pages = clamp(Number(url.searchParams.get("pages") || 3), 1, 6);
      const city = url.searchParams.get("city") || "全国";
      const force = url.searchParams.get("force") === "1";
      const profile = parseProfileFromSearch(url.searchParams);
      const payload = await getOfficialUsedCars({ city, limit, pages, force, profile });
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

async function getRecentModels({ limit, detailLimit, force, profile }) {
  let payload;
  if (!force && recentCache && Date.now() - recentCache.createdAt < CACHE_TTL_MS && recentCache.limit >= limit && recentCache.detailLimit >= detailLimit) {
    payload = { ...recentCache.payload, cached: true };
  } else {
    payload = await fetchRecentModels({ limit, detailLimit });
    recentCache = { createdAt: Date.now(), limit, detailLimit, payload };
  }
  const releases = rankReleasesForProfile(payload.releases, profile).slice(0, limit);
  return { ...payload, profileSummary: profileSummary(profile), profile, releases };
}

async function fetchRecentModels({ limit, detailLimit }) {
  const home = await fetchNextPage(HOME_URL);
  const pageProps = home.props?.pageProps || {};
  const recentReleases = (pageProps.newCarData || []).map(fromHomeRelease).filter(Boolean);
  const hotReleases = collectHotModels(pageProps).map(fromPopularModel).filter(Boolean);
  const articleReleases = await collectArticleSeriesReleases(collectHomeArticleSignals(pageProps));
  const industryReleases = await collectIndustrySeriesReleases();
  const supplementalReleases = supplementalNewCarSeries.map(fromSupplementalSeries);
  const baseReleases = mergeReleases([
    ...recentReleases,
    ...hotReleases,
    ...articleReleases,
    ...industryReleases,
    ...supplementalReleases
  ]);
  const detailTargets = prioritizeDetailTargets(baseReleases).slice(0, detailLimit);
  const detailed = await mapLimit(detailTargets, 4, enrichRelease);
  const detailMap = new Map(detailed.map((item) => [item.seriesId, item]));
  const releases = baseReleases.map((item) => detailMap.get(item.seriesId) || item);
  return {
    ok: true,
    sourceLabel: "懂车帝首页/热门/资讯/行业线索/重点车型",
    sourceUrl: HOME_URL,
    fetchedAt: new Date().toISOString(),
    releases
  };
}

async function getOfficialUsedCars({ city, limit, pages, force, profile }) {
  const cacheKey = `${city}:${limit}:${pages}:${profileSignature(profile)}`;
  if (!force && usedCache && usedCache.cacheKey === cacheKey && Date.now() - usedCache.createdAt < CACHE_TTL_MS) {
    return { ...usedCache.payload, cached: true, listings: usedCache.payload.listings.slice(0, limit) };
  }
  const payload = await fetchOfficialUsedCars({ city, limit, pages, profile });
  usedCache = { createdAt: Date.now(), cacheKey, payload };
  return payload;
}

async function fetchOfficialUsedCars({ city, limit, pages, profile }) {
  const requests = [];
  const [widePrice, tightPrice] = usedPriceRangesForProfile(profile);
  for (let page = 1; page <= pages; page += 1) {
    requests.push({ sh_city_name: city, page, limit: 20, dcd_self_sh: 1, price: widePrice, profile });
  }
  for (let page = 1; page <= Math.min(2, pages); page += 1) {
    requests.push({ sh_city_name: city, page, limit: 20, dcd_self_sh: 1, price: tightPrice, profile });
  }
  usedTargetSeries.forEach((target) => {
    requests.push({ sh_city_name: city, page: 1, limit: 20, dcd_self_sh: 1, series_ids: target.seriesId, profile });
  });

  const payloads = await mapLimit(requests, 3, fetchUsedCarPage);
  const mergedListings = mergeUsedListings(payloads.flatMap((payload) => payload.listings || []));
  const cityListings = city === "全国" ? mergedListings : mergedListings.filter((listing) => listing.city === city);
  const listings = cityListings
    .filter((listing) => listingMatchesEnergyProfile(listing, profile))
    .sort((a, b) => b.fitScore - a.fitScore || usedPriceSort(a, profile) - usedPriceSort(b, profile))
    .slice(0, limit);
  return {
    ok: true,
    sourceLabel: "懂车帝官方二手车",
    sourceUrl: "https://www.dongchedi.com/usedcar/x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x",
    city,
    profileSummary: profileSummary(profile, city),
    profile,
    fetchedAt: new Date().toISOString(),
    listings
  };
}

async function fetchUsedCarPage(params) {
  const { profile = {}, ...requestParams } = params;
  const body = new URLSearchParams();
  Object.entries(requestParams).forEach(([key, value]) => {
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
    listings: rawItems.map((item) => normalizeUsedListing(item, glyphMap, requestParams, profile)).filter(Boolean),
    hasMore: Boolean(json.data?.has_more),
    total: json.data?.total || ""
  };
}

function normalizeUsedListing(item, glyphMap, params = {}, profile = {}) {
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
    energyType: inferUsedEnergyTypeFromListing(item, `${title} ${tags.join(" ")}`),
    rawUpdatedAt: new Date().toISOString()
  };
  const fit = scoreUsedListing(listing, profile);
  return {
    ...listing,
    fitScore: fit.score,
    fitReasons: fit.reasons,
    riskFlags: usedListingRisks(listing, profile)
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

function parseProfileFromSearch(searchParams) {
  const energyTypes = parseCsv(searchParams.get("energyTypes"));
  const priorities = parseCsv(searchParams.get("priorities"));
  const scenes = parseCsv(searchParams.get("scenes"));
  return {
    city: searchParams.get("profileCity") || searchParams.get("city") || "北京",
    people: searchParams.get("people") || "2",
    scenes: scenes.length ? scenes : ["city", "highway", "holiday"],
    budgetMinWan: parseNumberParam(searchParams, "budgetMinWan", 24),
    budgetMaxWan: parseNumberParam(searchParams, "budgetMaxWan", 31),
    energyTypes: energyTypes.length ? energyTypes : ["ev", "erev", "phev"],
    minRangeKm: parseNumberParam(searchParams, "minRangeKm", 650),
    minPhevRangeKm: parseNumberParam(searchParams, "minPhevRangeKm", 300),
    priorities: priorities.length ? priorities : ["comfort", "range", "cockpit", "adas", "interior", "appearance"],
    seatFocus: searchParams.get("seatFocus") || "front",
    bodyPreference: searchParams.get("bodyPreference") || "suv_sedan",
    purchaseTiming: searchParams.get("purchaseTiming") || "",
    mustHaves: searchParams.get("mustHaves") || "",
    dealBreakers: searchParams.get("dealBreakers") || "",
    referenceCar: searchParams.get("referenceCar") || "",
    notes: searchParams.get("notes") || ""
  };
}

function parseCsv(value = "") {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function parseNumberParam(searchParams, key, fallback) {
  const number = Number(searchParams.get(key));
  return Number.isFinite(number) ? number : fallback;
}

function profileBudget(profile = {}) {
  let min = Number(profile.budgetMinWan || 24);
  let max = Number(profile.budgetMaxWan || 31);
  if (!Number.isFinite(min)) min = 24;
  if (!Number.isFinite(max)) max = 31;
  if (min > max) [min, max] = [max, min];
  return { min, max, center: (min + max) / 2 };
}

function usedPriceRangesForProfile(profile = {}) {
  const { min, max } = profileBudget(profile);
  const wide = `${Math.max(5, Math.floor(min - 9))},${Math.ceil(max + 5)}`;
  const tight = `${Math.max(5, Math.floor(min - 4))},${Math.ceil(max)}`;
  const ranges = unique([wide, tight]);
  return [ranges[0] || "15,33", ranges[1] || ranges[0] || "20,31"];
}

function profileSignature(profile = {}) {
  const { min, max } = profileBudget(profile);
  return [
    profile.city || "北京",
    profile.people || "2",
    min,
    max,
    (profile.energyTypes || []).join("|"),
    profile.minRangeKm || 650,
    profile.bodyPreference || "suv_sedan",
    (profile.priorities || []).slice(0, 6).join("|"),
    String(profile.dealBreakers || "").slice(0, 80)
  ].join(":");
}

function profileRequiresPureEv(profile = {}) {
  return (profile.energyTypes || []).length === 1 && profile.energyTypes[0] === "ev";
}

function profileSummary(profile = {}, cityOverride = "") {
  const { min, max } = profileBudget(profile);
  const energy = profile.energyTypes?.includes("ev") && profile.energyTypes.length === 1
    ? "只看纯电"
    : profile.energyTypes?.length ? "新能源不限" : "新能源";
  return [
    cityOverride || profile.city || "北京",
    `${min}-${max}万`,
    energy,
    `续航≥${profile.minRangeKm || 650}km`,
    bodyPreferenceText(profile.bodyPreference),
    (profile.priorities || []).slice(0, 3).join("/")
  ].filter(Boolean).join(" · ");
}

function bodyPreferenceText(value = "") {
  return {
    suv_sedan: "SUV/轿车均可",
    suv: "优先SUV",
    sedan: "优先轿车/旅行",
    compact: "优先好停车",
    no_mpv: "不看MPV"
  }[value] || "车身不限";
}

function rankReleasesForProfile(releases = [], profile = {}) {
  return [...(releases || [])].sort((a, b) => {
    const scoreDelta = scoreReleaseForProfile(b, profile) - scoreReleaseForProfile(a, profile);
    return scoreDelta || releaseSortScore(b) - releaseSortScore(a);
  });
}

function scoreReleaseForProfile(release, profile = {}) {
  const budget = profileBudget(profile);
  const text = `${release.brandName || ""} ${release.seriesName || ""} ${release.carType || ""}`;
  let score = releaseSortScore(release);
  if (releaseIsNewEnergy(release)) score += 20;
  if (releaseMatchesEnergyProfile(release, profile)) score += 10;
  else if ((profile.energyTypes || []).length) score -= 16;
  const min = release.priceMinWan;
  const max = release.priceMaxWan || min;
  if (min !== "") {
    if (max >= budget.min - 6 && min <= budget.max + 2) score += 30;
    else if (min < budget.min - 6) score += 12;
    else if (min <= budget.max + 10) score += 16;
    else score -= 18;
  }
  const body = releaseBodyBucket(release);
  if (profile.bodyPreference === "suv_sedan" && (body === "suv" || body === "sedan")) score += 14;
  if (profile.bodyPreference === "suv" && body === "suv") score += 16;
  if (profile.bodyPreference === "sedan" && body === "sedan") score += 16;
  if ((profile.bodyPreference === "compact" || profile.bodyPreference === "no_mpv") && body === "mpv") score -= 18;
  const range = releaseRangeKm(release);
  if (range >= Number(profile.minRangeKm || 650)) score += 10;
  else if (range && range < Number(profile.minRangeKm || 650) - 100) score -= 8;
  if (profile.priorities?.includes("comfort") && release.score?.comfort >= 4) score += 5;
  if (profile.priorities?.includes("interior") && release.score?.interior >= 4) score += 5;
  if (profile.priorities?.includes("appearance") && release.score?.appearance >= 4) score += 4;
  if (profile.priorities?.includes("adas") && /理想|小鹏|华为|问界|智界|阿维塔/i.test(text)) score += 5;
  if (/理想\s*i6/i.test(profile.referenceCar || "") && /理想\s*i6/i.test(text)) score += 12;
  if (vehicleHitsProfileDealBreaker(text, profile)) score -= 30;
  return score;
}

function releaseIsNewEnergy(release) {
  if (["ev", "phev", "erev", "hev", "new_energy"].includes(release.energyType)) return true;
  return /纯电|插混|混动|增程|PHEV|EV|DM-i|DM|电动/i.test([
    release.energyLabel,
    release.seriesName,
    ...(release.models || []).map((model) => [model.groupKey, ...(model.baseConfig || []), model.range, model.battery].join(" "))
  ].join(" "));
}

function releaseMatchesEnergyProfile(release, profile = {}) {
  const energyTypes = profile.energyTypes || [];
  if (!energyTypes.length) return true;
  if (profileRequiresPureEv(profile)) return release.energyType === "ev";
  if (energyTypes.includes(release.energyType)) return true;
  return release.energyType === "new_energy" && energyTypes.some((type) => ["ev", "phev", "erev"].includes(type));
}

function releaseBodyBucket(release) {
  const text = `${release.carType || ""} ${release.seriesName || ""}`;
  if (/SUV/i.test(text)) return "suv";
  if (/MPV|六座|七座/.test(text)) return "mpv";
  if (/轿车|轿跑|旅行|Sportback/i.test(text)) return "sedan";
  return "other";
}

function releaseRangeKm(release) {
  const values = [];
  for (const model of release.models || []) {
    const text = [model.groupKey, model.battery, model.range, ...(model.baseConfig || []), ...(model.highlightsConfig || [])].join(" ");
    [...text.matchAll(/(\d{3,4})\s*(?:km|公里)/gi)].forEach((match) => values.push(Number(match[1])));
    if (model.range && Number(model.range)) values.push(Number(model.range));
  }
  return values.filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0] || "";
}

function vehicleHitsProfileDealBreaker(text = "", profile = {}) {
  const haystack = String(text);
  const breakers = `${profile.dealBreakers || ""} ${profile.notes || ""}`;
  if (/智界\s*R7/i.test(haystack) && /智界\s*R7|R7.*外观|不喜欢.*R7/i.test(breakers)) return true;
  if (/阿维塔.*06|06T/i.test(haystack) && /阿维塔|方向盘|小.*方|方.*方向盘/i.test(breakers)) return true;
  if (/事故|重大修复|火烧|泡水/i.test(haystack) && /事故|修复太多|泡水|火烧/i.test(breakers)) return true;
  return false;
}

function listingMatchesEnergyProfile(listing, profile = {}) {
  const energyTypes = profile.energyTypes || [];
  if (!energyTypes.length) return true;
  if (profileRequiresPureEv(profile)) return listing.energyType === "ev";
  if (energyTypes.includes(listing.energyType)) return true;
  return listing.energyType === "new_energy" && energyTypes.some((type) => ["ev", "phev", "erev"].includes(type));
}

function scoreUsedListing(listing, profile = {}) {
  let score = 16;
  const reasons = [];
  const budget = profileBudget(profile);
  if (/官方|自营|直营/.test(listing.sourceType)) {
    score += 14;
    reasons.push("懂车帝官方/自营车源");
  }
  if (listing.priceWan !== "") {
    if (listing.priceWan >= budget.min - 4 && listing.priceWan <= budget.max + 1) {
      score += 26;
      reasons.push(`价格贴近画像预算 ${budget.min}-${budget.max}万`);
    } else if (listing.priceWan >= Math.max(8, budget.min - 10) && listing.priceWan < budget.min - 4) {
      score += 12;
      reasons.push("价格低于画像预算，可做性价比备选");
    } else if (listing.priceWan > budget.max + 1 && listing.priceWan <= budget.max + 8) {
      score += 8;
      reasons.push("价格略超预算，适合观望压价");
    } else if (listing.priceWan < Math.max(8, budget.min - 14)) {
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
    score += profile.energyTypes?.includes(listing.energyType) ? 12 : 4;
    reasons.push(profile.energyTypes?.includes(listing.energyType) ? `符合画像能源：${energyLabelFromType(listing.energyType, "新能源")}` : energyLabelFromType(listing.energyType, "新能源"));
  } else if (profile.energyTypes?.length) {
    score -= 18;
  }
  const minRange = Number(profile.minRangeKm || 650);
  if (listing.range >= minRange) {
    score += 9;
    reasons.push(`续航 ${listing.range}km`);
  } else if (listing.range && listing.range < minRange - 100) {
    score -= 6;
  }
  if (listing.city && listing.city === (profile.city || "北京")) {
    score += 5;
    reasons.push(`符合用车城市：${listing.city}`);
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
    const penalty = profile.bodyPreference === "compact" || profile.bodyPreference === "no_mpv" ? 8 : 4;
    score -= penalty;
    reasons.push(profile.people === "2" ? "两人用车略偏大" : "车身尺寸需要确认");
  }
  if (vehicleHitsProfileDealBreaker(text, profile)) score -= 18;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.slice(0, 6)
  };
}

function usedListingRisks(listing, profile = {}) {
  const risks = [];
  if (listing.authentication && !/官方认证/.test(listing.authentication)) risks.push("非品牌官方认证");
  const homeCity = profile.city || "北京";
  if (listing.city && listing.city !== homeCity) risks.push(`异地车源：${listing.city}`);
  if (!listingMatchesEnergyProfile(listing, profile)) risks.push("能源形式不符合画像");
  if (listing.year && listing.year < 2023) risks.push("车龄偏老");
  if (listing.mileageWan !== "" && listing.mileageWan >= 5) risks.push("里程偏高");
  if (!listing.priceWan) risks.push("价格字段需二次确认");
  if (/蔚来|ES6|ES8|ET5|ET7/i.test(`${listing.brandName} ${listing.seriesName}`)) risks.push("蔚来权益/NOP+需确认");
  if (/车衣|改色/i.test(listing.title)) risks.push("膜下漆面需复检");
  if (vehicleHitsProfileDealBreaker(`${listing.brandName} ${listing.seriesName} ${listing.title}`, profile)) risks.push("命中画像中的明确排除项");
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

function usedPriceSort(listing, profile = {}) {
  const { center } = profileBudget(profile);
  return listing.priceWan === "" ? 999 : Math.abs(Number(listing.priceWan) - center);
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
  if (/燃油|汽油|柴油|B5|B6|TFSI|TSI|涡轮|自然吸气/i.test(text)) return "fuel";
  if (/增程|EREV/i.test(text)) return "erev";
  if (/插混|PHEV|EM-P|DM-i|DM\b|混动|T8/i.test(text)) return "phev";
  if (/纯电|电动|EV|e-tron|Model\s*[3YXS]|EQE|EQS|iX\d?|ID\.|蔚来|极氪|小鹏|智己|乐道|小米|智界|阿维塔|i6|SU7|YU7/i.test(text)) return "ev";
  return "unknown";
}

function inferUsedEnergyTypeFromListing(item, text = "") {
  const inferred = inferUsedEnergyType(text);
  if (inferred !== "unknown") return inferred;
  if (knownPureEvSeriesIds.has(Number(item.series_id || 0))) return "ev";
  return inferred;
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

function fromSupplementalSeries(item) {
  const energyType = item.energyType || (/纯电|EV|e-tron/i.test(`${item.name || ""} ${item.sourceLabel || ""}`) ? "ev" : "unknown");
  return {
    seriesId: Number(item.seriesId),
    seriesName: item.name || "",
    brandName: item.brandName || "",
    carType: "",
    energyType,
    energyLabel: energyLabelFromType(energyType, "待确认"),
    priceText: "价格待确认",
    priceMinWan: "",
    priceMaxWan: "",
    releaseDate: "",
    releaseTimestamp: 0,
    tags: unique([item.sourceLabel || "重点车型"]),
    sourceTypes: ["watchlist"],
    heatRank: "",
    hotCategory: "",
    hotLabel: "",
    coverUrl: "",
    dcdUrl: `${SERIES_URL}${item.seriesId}`,
    articleUrl: "",
    articleTitle: item.sourceLabel || "",
    communityText: "",
    score: {},
    dimensions: {},
    models: [],
    news: [],
    highlights: [],
    rawUpdatedAt: new Date().toISOString()
  };
}

function collectHomeArticleSignals(pageProps = {}) {
  const focusSignals = (pageProps.focusPic || [])
    .filter(Boolean)
    .flatMap((group) => group.pic_list || [])
    .map((item) => ({
      articleId: item.group_id,
      title: item.title || "",
      coverUrl: normalizeImageUrl(item.img_url || ""),
      publishTime: "",
      sourceLabel: "懂车帝焦点图"
    }));
  const todaySignals = [
    ...(pageProps.todayNews?.head_article || []),
    ...(pageProps.todayNews?.content_article || [])
  ].map((item) => ({
    articleId: item.gid_str || item.group_id || item.unique_id_str,
    title: item.title || "",
    coverUrl: "",
    publishTime: "",
    sourceLabel: "懂车帝今日资讯"
  }));
  const videoSignals = (pageProps.homeOriginal?.video_list || []).map((item) => ({
    articleId: item.unique_id_str || item.unique_id,
    title: item.title || "",
    coverUrl: normalizeImageUrl(item.video_info?.cover_url || ""),
    publishTime: item.publish_time ? new Date(Number(item.publish_time) * 1000).toISOString() : "",
    sourceLabel: item.column?.name ? `懂车帝${item.column.name}` : "懂车帝视频"
  }));
  const seen = new Set();
  return [...focusSignals, ...todaySignals, ...videoSignals]
    .filter((item) => item.articleId && item.title && looksLikeNewCarArticle(item.title))
    .filter((item) => {
      const key = String(item.articleId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24);
}

function looksLikeNewCarArticle(title = "") {
  return /上市|发布|亮相|首发|预售|申报|内饰|实车|新车|续航|价格|定价|首秀|官图|闪充|纯电|EV|e-tron|YU7|GX|i6|E7X|钛7|L80|ES6|7X|007GT/i.test(title);
}

async function collectArticleSeriesReleases(articleSignals = []) {
  const releases = await mapLimit(articleSignals, 4, async (signal) => {
    try {
      const html = await fetchHtml(`https://www.dongchedi.com/article/${signal.articleId}`);
      const ids = unique([...html.matchAll(/\/auto\/series\/(\d+)/g)].map((match) => match[1]));
      return ids.slice(0, 3).map((seriesId) => fromArticleSeriesSignal(signal, seriesId));
    } catch {
      return [];
    }
  });
  return releases.flat().filter(Boolean);
}

function fromArticleSeriesSignal(signal, seriesId) {
  return {
    seriesId: Number(seriesId),
    seriesName: inferSeriesNameFromTitle(signal.title),
    brandName: "",
    carType: "",
    energyType: inferReleaseEnergyTypeFromText(signal.title),
    energyLabel: energyLabelFromType(inferReleaseEnergyTypeFromText(signal.title), "待确认"),
    priceText: "价格待确认",
    priceMinWan: "",
    priceMaxWan: "",
    releaseDate: signal.publishTime ? signal.publishTime.slice(0, 10) : "",
    releaseTimestamp: signal.publishTime ? Math.floor(new Date(signal.publishTime).getTime() / 1000) : 0,
    tags: unique(["资讯信源", signal.sourceLabel]),
    sourceTypes: ["news"],
    heatRank: "",
    hotCategory: "",
    hotLabel: signal.sourceLabel || "懂车帝资讯",
    coverUrl: signal.coverUrl || "",
    dcdUrl: `${SERIES_URL}${seriesId}`,
    articleUrl: `https://www.dongchedi.com/article/${signal.articleId}`,
    articleTitle: signal.title,
    communityText: "",
    score: {},
    dimensions: {},
    models: [],
    news: [],
    highlights: [`资讯线索：${signal.title}`],
    rawUpdatedAt: new Date().toISOString()
  };
}

function inferSeriesNameFromTitle(title = "") {
  const normalized = String(title).replace(/[“”"]/g, "");
  const match = normalized.match(/(?:全新|新款|2026款|2025款)?([A-Za-z0-9\u4e00-\u9fa5·+\- ]{2,24}?)(?:上市|发布|亮相|首发|预售|申报|内饰|实车|官图|首秀|公布|价格|续航)/);
  return match ? match[1].trim() : "";
}

function inferReleaseEnergyTypeFromText(text = "") {
  if (/增程/.test(text)) return "erev";
  if (/插混|PHEV|DM-i|混动/i.test(text)) return "phev";
  if (/纯电|电动|EV|e-tron|闪充/i.test(text)) return "ev";
  return "unknown";
}

async function collectIndustrySeriesReleases() {
  const sourceResults = await mapLimit(industryNewCarSources, 2, async (source) => {
    try {
      const html = await fetchHtml(source.url);
      return collectIndustrySignals(html, source).flatMap(fromIndustrySignal);
    } catch {
      return [];
    }
  });
  return sourceResults.flat().filter(Boolean);
}

function collectIndustrySignals(html = "", source = {}) {
  const signals = [
    ...extractHtmlAttributeTexts(html, "title"),
    ...extractHtmlAttributeTexts(html, "alt"),
    ...extractHtmlTagTexts(html, "a"),
    ...extractHtmlTagTexts(html, "h1"),
    ...extractHtmlTagTexts(html, "h2"),
    ...extractHtmlTagTexts(html, "h3")
  ];
  const seen = new Set();
  return signals
    .map(cleanHtmlText)
    .filter((title) => title.length >= 4 && title.length <= 80 && looksLikeNewCarArticle(title))
    .filter((title) => {
      const key = normalizeSeriesText(`${source.name}:${title}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 36)
    .map((title) => ({
      title,
      sourceLabel: source.name || "行业资讯",
      sourceUrl: source.url || ""
    }));
}

function fromIndustrySignal(signal) {
  return matchSupplementalSeries(signal.title).map((series) => ({
    seriesId: Number(series.seriesId),
    seriesName: series.name || "",
    brandName: series.brandName || "",
    carType: "",
    energyType: knownPureEvSeriesIds.has(Number(series.seriesId)) ? "ev" : inferReleaseEnergyTypeFromText(signal.title),
    energyLabel: energyLabelFromType(knownPureEvSeriesIds.has(Number(series.seriesId)) ? "ev" : inferReleaseEnergyTypeFromText(signal.title), "待确认"),
    priceText: "价格待确认",
    priceMinWan: "",
    priceMaxWan: "",
    releaseDate: "",
    releaseTimestamp: 0,
    tags: unique(["行业线索", signal.sourceLabel]),
    sourceTypes: ["industry"],
    heatRank: "",
    hotCategory: "",
    hotLabel: signal.sourceLabel || "行业资讯",
    coverUrl: "",
    dcdUrl: `${SERIES_URL}${series.seriesId}`,
    articleUrl: signal.sourceUrl || "",
    articleTitle: signal.title,
    communityText: "",
    score: {},
    dimensions: {},
    models: [],
    news: [],
    highlights: [`行业线索：${signal.title}`],
    rawUpdatedAt: new Date().toISOString()
  }));
}

function matchSupplementalSeries(text = "") {
  const normalized = normalizeSeriesText(text);
  return supplementalNewCarSeries.filter((series) => {
    const aliases = unique([series.name, ...(series.aliases || [])]);
    return aliases.some((alias) => alias && normalized.includes(normalizeSeriesText(alias)));
  });
}

function extractHtmlAttributeTexts(html = "", attr = "title") {
  return [...String(html).matchAll(new RegExp(`${attr}=["']([^"']{2,120})["']`, "gi"))].map((match) => match[1]);
}

function extractHtmlTagTexts(html = "", tag = "a") {
  return [...String(html).matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]{2,200}?)<\\/${tag}>`, "gi"))].map((match) => stripHtml(match[1]));
}

function stripHtml(value = "") {
  return String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function cleanHtmlText(value = "") {
  return decodeHtmlEntities(stripHtml(value)).replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeSeriesText(value = "") {
  return cleanHtmlText(value).replace(/\s+/g, "").toLowerCase();
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

function prioritizeDetailTargets(releases = []) {
  const priority = new Map();
  for (const release of releases) {
    let value = 0;
    if (release.sourceTypes?.includes("watchlist")) value += 1000;
    if (release.sourceTypes?.includes("news")) value += 600;
    if (release.sourceTypes?.includes("industry")) value += 520;
    if (release.sourceTypes?.includes("recent")) value += 300;
    if (release.sourceTypes?.includes("hot")) value += 120;
    if (release.energyType === "ev") value += 80;
    if (release.priceMinWan !== "" || release.priceText !== "价格待确认") value += 20;
    priority.set(release.seriesId, value + releaseSortScore(release));
  }
  return [...releases].sort((a, b) => (priority.get(b.seriesId) || 0) - (priority.get(a.seriesId) || 0));
}

function releaseSortScore(item) {
  const recentScore = item.releaseTimestamp ? item.releaseTimestamp / 100000000 : 0;
  const hotScore = item.heatRank ? Math.max(0, 60 - Number(item.heatRank)) : 0;
  const sourceScore = (item.sourceTypes?.includes("recent") ? 30 : 0)
    + (item.sourceTypes?.includes("industry") ? 18 : 0)
    + (item.sourceTypes?.includes("news") ? 12 : 0);
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
  if (!response.ok) throw new Error(`页面返回 ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return decodeResponseText(buffer, response.headers.get("content-type") || "");
}

function decodeResponseText(buffer, contentType = "") {
  const probe = buffer.toString("latin1", 0, Math.min(buffer.length, 2048));
  const charset = (contentType.match(/charset=([^;\s]+)/i)?.[1]
    || probe.match(/<meta[^>]+charset=["']?([^"'\s/>]+)/i)?.[1]
    || "utf-8").toLowerCase();
  const encoding = /gb2312|gbk|gb18030/i.test(charset) ? "gb18030" : "utf-8";
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return buffer.toString("utf8");
  }
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
  if (knownPureEvSeriesIds.has(Number(fallback.seriesId || 0))) return "ev";
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
