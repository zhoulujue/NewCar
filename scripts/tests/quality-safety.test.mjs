import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseBestQualityEvidenceUrl,
  classifyQualityEvidenceField,
  collectAttachmentPayloadStats,
  guardQualityResultForProvider,
  sanitizeSparseQualityFacts,
  summarizeQualityEvidenceState
} from "../quality-safety.mjs";

test("DeepSeek fallback strips ungrounded quality facts but keeps verification notes and sources", () => {
  const result = {
    carPatch: {
      qualityProfile: {
        complaintSalesRatio: 12,
        complaintRank: "同级较低",
        complaintTrend: "falling",
        threeElectricComplaintShare: 6,
        recallCount: 0,
        recallNotes: "未见召回",
        studySummary: "长期质量稳定",
        ownerReputation: "车主反馈较好",
        batterySoh: 99,
        maintenanceStatus: "clean",
        notes: "DeepSeek 可给核验建议，但不能直接写入事实字段。",
        sources: [
          {
            type: "complaint",
            label: "车质网检索入口",
            status: "DeepSeek兜底待核验",
            url: "https://example.com/search"
          }
        ]
      }
    },
    analysis: { confidence: "high" }
  };

  const guarded = guardQualityResultForProvider(result, {
    provider: "deepseek",
    sourceFallback: true
  });

  assert.deepEqual(Object.keys(guarded.carPatch.qualityProfile).sort(), ["notes", "sources"].sort());
  assert.equal(guarded.analysis.confidence, "low");
  assert.match(guarded.carPatch.qualityProfile.notes, /待核验/);
});

test("Grounded Gemini quality result keeps structured facts when values are positive evidence", () => {
  const result = {
    carPatch: {
      qualityProfile: {
        complaintSalesRatio: 18,
        recallCount: 2,
        recallNotes: "市场监管总局召回公告显示存在 2 条覆盖目标车系的召回。",
        sources: [{ type: "official", label: "召回公告", url: "https://example.com/recall" }]
      }
    },
    analysis: { confidence: "high" }
  };

  const guarded = guardQualityResultForProvider(result, {
    provider: "gemini",
    sourceFallback: false
  });

  assert.equal(guarded.carPatch.qualityProfile.complaintSalesRatio, 18);
  assert.equal(guarded.carPatch.qualityProfile.recallCount, 2);
  assert.equal(guarded.analysis.confidence, "high");
});

test("Grounded Gemini quality result does not treat zero or missing text as verified data", () => {
  const result = {
    carPatch: {
      qualityProfile: {
        complaintSalesRatio: 0,
        complaintRank: "暂无排行",
        threeElectricComplaintShare: 0,
        recallCount: 0,
        recallNotes: "新车刚发布，暂未检索到官方召回记录。",
        studySummary: "第三方质量研究数据缺失",
        ownerReputation: "车主口碑数据缺失",
        sources: [
          { type: "official", label: "召回检索入口", status: "AI已检索", url: "https://example.com/recall" },
          { type: "complaint", label: "车质网检索入口", status: "AI已检索", url: "https://example.com/complaint" }
        ]
      }
    },
    analysis: { confidence: "high" }
  };

  const sanitized = sanitizeSparseQualityFacts(result);
  const profile = sanitized.carPatch.qualityProfile;

  assert.equal(profile.complaintSalesRatio, undefined);
  assert.equal(profile.complaintRank, undefined);
  assert.equal(profile.threeElectricComplaintShare, undefined);
  assert.equal(profile.recallCount, undefined);
  assert.equal(profile.recallNotes, undefined);
  assert.equal(profile.studySummary, undefined);
  assert.equal(profile.ownerReputation, undefined);
  assert.equal(sanitized.sanitizedQualityFacts, true);
  assert.deepEqual(sanitized.sanitizedFields.sort(), [
    "complaintRank",
    "complaintSalesRatio",
    "ownerReputation",
    "recallCount",
    "recallNotes",
    "studySummary",
    "threeElectricComplaintShare"
  ].sort());
  assert.match(profile.notes, /未把.*0|暂无|缺失.*作为可核验质量数据/);
});

test("Unknown single-car quality statuses do not keep confidence high after sparse facts are removed", () => {
  const result = {
    carPatch: {
      qualityProfile: {
        complaintSalesRatio: 0,
        maintenanceStatus: "unknown",
        troubleCodeStatus: "missing",
        warrantyStatus: "pending",
        sources: [{ type: "complaint", label: "投诉检索入口", url: "https://example.com/complaint" }]
      }
    },
    analysis: { confidence: "high" }
  };

  const sanitized = sanitizeSparseQualityFacts(result);

  assert.equal(sanitized.carPatch.qualityProfile.complaintSalesRatio, undefined);
  assert.equal(sanitized.analysis.confidence, "low");
});

test("Evidence URL uses the first real linked source", () => {
  const url = chooseBestQualityEvidenceUrl([
    { label: "无链接摘要", summary: "只有摘要" },
    { label: "可核验来源", url: "https://example.com/source" }
  ]);

  assert.equal(url, "https://example.com/source");
});

test("Attachment payload stats warn before oversized AI requests", () => {
  const stats = collectAttachmentPayloadStats([
    { attachments: [{ size: 2 * 1024 * 1024 }, { dataUrl: `data:image/jpeg;base64,${"a".repeat(1024)}` }] },
    { attachments: [{ size: 3 * 1024 * 1024 }] }
  ], { warningBytes: 4 * 1024 * 1024, hardLimitBytes: 10 * 1024 * 1024 });

  assert.equal(stats.imageCount, 3);
  assert.equal(stats.shouldWarn, true);
  assert.equal(stats.tooLarge, false);
});

test("Quality evidence classifier treats zero SOH as missing instead of verified evidence", () => {
  assert.deepEqual(classifyQualityEvidenceField("batterySoh", 0), {
    state: "missing",
    label: "缺失",
    verified: false
  });

  assert.deepEqual(classifyQualityEvidenceField("batterySoh", 96.4, { sourceUrl: "https://example.com/soh" }), {
    state: "verified",
    label: "有证据",
    verified: true
  });
});

test("Quality evidence classifier separates AI leads from verified facts and conflicts", () => {
  assert.equal(classifyQualityEvidenceField("recallCount", 0, { sourceStatus: "入口待核验" }).state, "lead");
  assert.equal(classifyQualityEvidenceField("complaintSalesRatio", 12, { sourceUrl: "https://example.com/cq", sourceStatus: "有数据" }).state, "verified");
  assert.equal(classifyQualityEvidenceField("warrantyStatus", "not-transferable", { expected: "active", sourceUrl: "https://example.com/warranty" }).state, "conflict");
});

test("Quality evidence summary counts verified, lead, missing, and conflict states", () => {
  const summary = summarizeQualityEvidenceState([
    classifyQualityEvidenceField("batterySoh", 0),
    classifyQualityEvidenceField("recallCount", 0, { sourceStatus: "入口待核验" }),
    classifyQualityEvidenceField("complaintSalesRatio", 12, { sourceUrl: "https://example.com/cq", sourceStatus: "有数据" }),
    classifyQualityEvidenceField("warrantyStatus", "not-transferable", { expected: "active", sourceUrl: "https://example.com/warranty" })
  ]);

  assert.deepEqual(summary, {
    verified: 1,
    lead: 1,
    missing: 1,
    conflict: 1,
    total: 4
  });
});
