import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseBestQualityEvidenceUrl,
  collectAttachmentPayloadStats,
  guardQualityResultForProvider
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

test("Grounded Gemini quality result keeps structured facts", () => {
  const result = {
    carPatch: {
      qualityProfile: {
        complaintSalesRatio: 18,
        recallCount: 0,
        recallNotes: "市场监管总局未检索到相关召回。",
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
  assert.equal(guarded.carPatch.qualityProfile.recallCount, 0);
  assert.equal(guarded.analysis.confidence, "high");
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
