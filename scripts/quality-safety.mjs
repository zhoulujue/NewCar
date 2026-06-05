const FACTUAL_QUALITY_FIELDS = [
  "complaintSalesRatio",
  "complaintRank",
  "complaintTrend",
  "threeElectricComplaintShare",
  "recallCount",
  "recallNotes",
  "studySummary",
  "ownerReputation",
  "batterySoh",
  "sohDate",
  "maintenanceStatus",
  "troubleCodeStatus",
  "warrantyStatus",
  "batteryRepairStatus"
];

export function guardQualityResultForProvider(result = {}, { provider = "", sourceFallback = false } = {}) {
  const guarded = sanitizeSparseQualityFacts(result);
  const needsGuard = provider !== "gemini" || sourceFallback || !hasLinkedQualitySource(guarded);
  if (!needsGuard) return guarded;

  const profile = guarded.carPatch?.qualityProfile || {};
  const safeProfile = {};
  if (profile.notes) safeProfile.notes = appendVerificationNote(profile.notes);
  else safeProfile.notes = "AI 本次只生成待核验质量线索，未写入投诉、召回、SOH、质保等事实字段。";
  if (Array.isArray(profile.sources) && profile.sources.length) safeProfile.sources = profile.sources;

  guarded.carPatch = guarded.carPatch || {};
  guarded.carPatch.qualityProfile = safeProfile;
  guarded.analysis = {
    ...(guarded.analysis || {}),
    confidence: "low"
  };
  guarded.sourceFallback = true;
  guarded.sanitizedQualityFacts = true;
  guarded.sanitizedFields = mergeUnique([
    ...(guarded.sanitizedFields || []),
    ...FACTUAL_QUALITY_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(profile, field))
  ]);
  return guarded;
}

export function sanitizeSparseQualityFacts(result = {}) {
  const sanitized = cloneJson(result);
  const profile = sanitized.carPatch?.qualityProfile;
  if (!profile || typeof profile !== "object") return sanitized;

  const removed = [];
  const removeField = (field) => {
    if (!Object.prototype.hasOwnProperty.call(profile, field)) return;
    delete profile[field];
    removed.push(field);
  };

  if (isNonPositiveNumber(profile.complaintSalesRatio)) removeField("complaintSalesRatio");
  if (isNonPositiveNumber(profile.threeElectricComplaintShare)) removeField("threeElectricComplaintShare");
  if (isNonPositiveNumber(profile.recallCount)) removeField("recallCount");
  if (isNonPositiveNumber(profile.batterySoh)) removeField("batterySoh");

  ["complaintRank", "recallNotes", "studySummary", "ownerReputation"].forEach((field) => {
    if (isMissingQualityText(profile[field])) removeField(field);
  });

  if (!removed.length) return sanitized;

  profile.notes = appendSparseDataNote(profile.notes, removed);
  sanitized.sanitizedQualityFacts = true;
  sanitized.sanitizedFields = mergeUnique([...(sanitized.sanitizedFields || []), ...removed]);
  if (!hasFactualQualityData(profile)) {
    sanitized.analysis = {
      ...(sanitized.analysis || {}),
      confidence: "low"
    };
  }
  return sanitized;
}

export function chooseBestQualityEvidenceUrl(sources = []) {
  return (sources || []).find((source) => typeof source?.url === "string" && source.url.trim())?.url?.trim() || "";
}

export function collectAttachmentPayloadStats(infoWall = [], { warningBytes = 18 * 1024 * 1024, hardLimitBytes = 26 * 1024 * 1024 } = {}) {
  let imageCount = 0;
  let totalBytes = 0;
  for (const item of infoWall || []) {
    for (const attachment of item.attachments || []) {
      imageCount += 1;
      totalBytes += attachmentSizeBytes(attachment);
    }
  }
  return {
    imageCount,
    totalBytes,
    warningBytes,
    hardLimitBytes,
    shouldWarn: totalBytes >= warningBytes,
    tooLarge: totalBytes >= hardLimitBytes
  };
}

export function classifyQualityEvidenceField(field, value, meta = {}) {
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

export function summarizeQualityEvidenceState(items = []) {
  return items.reduce((summary, item) => {
    const state = item?.state || "missing";
    summary[state] = (summary[state] || 0) + 1;
    summary.total += 1;
    return summary;
  }, { verified: 0, lead: 0, missing: 0, conflict: 0, total: 0 });
}

function hasLinkedQualitySource(result = {}) {
  return Boolean(chooseBestQualityEvidenceUrl(result.carPatch?.qualityProfile?.sources || []));
}

function appendVerificationNote(notes = "") {
  const line = "待核验：本次结果未获得可直接引用的联网 grounding，事实字段已暂缓回填。";
  return notes.includes(line) ? notes : [notes, line].filter(Boolean).join("\n");
}

function appendSparseDataNote(notes = "", removed = []) {
  const line = `待核验：AI 返回了 ${removed.join("、")} 的 0、暂无或缺失表述，未把这些内容作为可核验质量数据写入。`;
  return notes.includes(line) ? notes : [notes, line].filter(Boolean).join("\n");
}

function hasFactualQualityData(profile = {}) {
  return FACTUAL_QUALITY_FIELDS.some((field) => {
    if (!Object.prototype.hasOwnProperty.call(profile, field)) return false;
    const value = profile[field];
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    if (typeof value === "string") return value.trim() && !isMissingQualityText(value) && !isUnknownQualityStatus(value);
    return Boolean(value);
  });
}

function isNonPositiveNumber(value) {
  if (value === "" || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isFinite(number) && number <= 0;
}

function isMissingQualityText(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return false;
  return /暂无|暂未|未见|未检索|未查询|未找到|未公开|未取得|未发现|无法|不能确认|缺失|缺少|不可得|没有|刚发布|尚未|不详|待核验|数据不足|无公开/.test(text);
}

function isUnknownQualityStatus(value = "") {
  return /^(unknown|missing|pending)$/i.test(String(value).trim());
}

function mergeUnique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function attachmentSizeBytes(attachment = {}) {
  const explicitSize = Number(attachment.size);
  if (Number.isFinite(explicitSize) && explicitSize > 0) return explicitSize;
  const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl : "";
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.round((base64.length * 3) / 4);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}
