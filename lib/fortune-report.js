const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getClaudeSajuKeywords, normalizeCategory, normalizeTone, CATEGORY_LABELS, TONE_LABELS } = require("./claude");

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "fortune-text-dataset.json"), "utf8")
);
const keywordCache = new Map();

function getCacheTtlMs() {
  const raw = Number(process.env.KEYWORD_CACHE_TTL_MINUTES || 1440);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 24 * 60 * 60 * 1000;
  }
  return Math.floor(raw) * 60 * 1000;
}

function buildCacheKey(input, category, tone) {
  const material = [
    input.name,
    input.gender,
    input.calendarType,
    input.saju.yearPillar,
    input.saju.monthPillar,
    input.saju.dayPillar,
    input.saju.timePillar,
    category,
    tone,
  ].join("|");
  return crypto.createHash("sha1").update(material).digest("hex");
}

function composeReport({ name, category, tone, saju, keywords }) {
  const core = dataset.coreFlow[keywords.coreFlow] || dataset.coreFlow.stability;
  const strength = dataset.strength[keywords.strength] || dataset.strength.execution;
  const risk = dataset.risk[keywords.risk] || dataset.risk.overload;
  const action = dataset.action[keywords.action] || dataset.action.review;
  const focus = dataset.categoryFocus[category] || dataset.categoryFocus.love;
  const toneLine =
    tone === "comfort"
      ? "전반 해석은 불안을 줄이고 안정적인 선택을 돕는 상담형 관점으로 구성합니다."
      : "전반 해석은 근거 중심의 전문가형 관점으로 핵심 판단을 우선 제시합니다.";

  const section1 = [
    "성격 분석",
    name + "님의 기본 기질은 " + saju.dayPillar + " 일주를 중심으로 형성되어 있습니다.",
    core,
    strength,
    "년주 " + saju.yearPillar + ", 월주 " + saju.monthPillar + ", 시주 " + saju.timePillar + "의 조합을 보면 상황 대응에서는 신중함과 실행성의 균형이 중요하게 작동합니다.",
    "오행 분포는 목 " + saju.fiveElements.counts.wood + ", 화 " + saju.fiveElements.counts.fire + ", 토 " + saju.fiveElements.counts.earth + ", 금 " + saju.fiveElements.counts.metal + ", 수 " + saju.fiveElements.counts.water + "로 나타나며, 강한 영역과 약한 영역의 편차를 인식할수록 성향 활용도가 높아집니다.",
  ].join("\n");

  const section2 = [
    "직업운",
    "직업 및 성취 흐름에서는 현재 대운 " + (saju.luckCycle.currentDaYun ? saju.luckCycle.currentDaYun.ganZhi : "분석중") + "의 영향으로 구조적 안정성과 실무 품질 관리가 핵심 과제가 됩니다.",
    focus,
    "특히 업무 우선순위를 문서화하고, 결과를 수치 또는 기록으로 남기는 습관이 평가 안정성에 직접적인 영향을 줍니다.",
    "세운 " + (saju.luckCycle.currentSeWoon ? saju.luckCycle.currentSeWoon.ganZhi : "분석중") + " 구간에서는 성과를 빠르게 키우기보다 손실 가능성을 줄이는 운영 전략이 더 높은 기대값을 만듭니다.",
    "협업에서는 강점을 먼저 제시하고 합의사항을 기록으로 남길 때 충돌 확률이 크게 줄어들며, 반복 가능한 업무 템플릿을 만드는 것이 장기 경쟁력으로 이어집니다.",
  ].join("\n");

  const section3 = [
    "주의해야 할 점",
    risk,
    "의사결정의 정확도를 높이기 위해서는 즉시 판단보다 짧은 유예와 재검토 단계가 반드시 필요합니다.",
    "감정 강도가 높은 날에는 관계 이슈, 결제, 계약, 투자 관련 결정을 늦추고 사실 확인을 먼저 수행하는 편이 안전합니다.",
    action,
    toneLine,
    "오늘의 체크리스트: 1) 우선순위 3개 확정 2) 중요한 대화 전 핵심 문장 2개 준비 3) 지출은 필요/보류/제외로 분류.",
    "위 원칙을 2주 이상 유지하면 운의 흐름이 체감 가능한 성과로 전환되는 속도가 분명히 빨라질 수 있습니다.",
  ].join("\n");

  return [section1, "", section2, "", section3].join("\n");
}

async function generateDatasetBasedFortune(input) {
  const category = normalizeCategory(input.category);
  const tone = normalizeTone(input.tone);
  const cacheKey = buildCacheKey(input, category, tone);
  const ttlMs = getCacheTtlMs();
  const now = Date.now();
  const cached = keywordCache.get(cacheKey);

  let keywordResult;
  if (cached && now - cached.createdAt < ttlMs) {
    keywordResult = {
      provider: `cache:${cached.provider}`,
      keywords: cached.keywords,
    };
  } else {
    keywordResult = await getClaudeSajuKeywords(input);
    keywordCache.set(cacheKey, {
      provider: keywordResult.provider,
      keywords: keywordResult.keywords,
      createdAt: now,
    });
  }

  const report = composeReport({
    name: input.name,
    category,
    tone,
    saju: input.saju,
    keywords: keywordResult.keywords,
  });

  return {
    aiProvider: keywordResult.provider,
    tone,
    toneLabel: TONE_LABELS[tone],
    category,
    categoryLabel: CATEGORY_LABELS[category],
    keywords: keywordResult.keywords,
    aiFortune: report,
  };
}

module.exports = {
  generateDatasetBasedFortune,
};
