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
  const guarded = cloneJson(result);
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
  guarded.sanitizedFields = FACTUAL_QUALITY_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(profile, field));
  return guarded;
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

function hasLinkedQualitySource(result = {}) {
  return Boolean(chooseBestQualityEvidenceUrl(result.carPatch?.qualityProfile?.sources || []));
}

function appendVerificationNote(notes = "") {
  const line = "待核验：本次结果未获得可直接引用的联网 grounding，事实字段已暂缓回填。";
  return notes.includes(line) ? notes : [notes, line].filter(Boolean).join("\n");
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
