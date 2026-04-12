const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  getClaudeSajuKeywords,
  getClaudeSajuLongReport,
  buildMockKeywords,
  normalizeCategory,
  normalizeTone,
  CATEGORY_LABELS,
  TONE_LABELS,
} = require("./claude");
const { getFortuneDailyContext } = require("./saju");

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "fortune-text-dataset.json"), "utf8")
);
const keywordCache = new Map();
const llmFortuneCache = new Map();

const DAILY_FLAVOR_LINES = [
  "오늘은 어제와 하루의 기운이 조금 달라요. 일정·연락은 한 번만 더 확인하면 마음이 편해져요.",
  "같은 사람이라도 ‘오늘’은 분위기가 조금 다를 수 있어요. 바로 결정하기보다 잠깐만 미뤄 보세요.",
  "연락·이동·약속에서 작은 변수가 생기기 쉬운 날이에요. 꼭 할 것만 남기고 나머지는 여유를 두세요.",
  "몸과 기분 리듬이 어제와 다를 수 있어요. 여러 가지 동시에보다 한 가지에 집중하는 날이에요.",
  "사람·돈 이야기는 기분이 가장 올라갈 때 말고, 잠깐 적어 두었다가 나중에 보는 편이 안전해요.",
  "오늘은 정리·점검·끝맺기에 잘 맞는 날이에요. 새로 시작하기보다 하던 일을 깔끔히 마무리해 보세요.",
  "기복이 조금 느껴져도 보통 범위예요. 큰 결정은 하루만 숨 고르고, 확인할 것만 빠르게 보면 돼요.",
  "말할 때는 먼저 한 줄 요약, 설명은 짧게. 오늘은 말의 톤이 관계에 크게 영향을 줘요.",
];

function pickDailyFlavorLine(daily, saju) {
  const s = [daily.fortuneDateKey, daily.todayDayPillar, saju && saju.dayMaster, saju && saju.dayPillar].join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return DAILY_FLAVOR_LINES[(h >>> 0) % DAILY_FLAVOR_LINES.length];
}

function getFortuneMode() {
  const v = String(process.env.FORTUNE_MODE || "llm").trim().toLowerCase();
  if (v === "template" || v === "dataset" || v === "legacy") {
    return "template";
  }
  return "llm";
}

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
    input.fortuneDateKey || "",
    input.todayDayPillar || "",
  ].join("|");
  return crypto.createHash("sha1").update(material).digest("hex");
}

function composeReport({ name, category, tone, saju, keywords, fortuneDateKey, todayDayPillar }) {
  const core = dataset.coreFlow[keywords.coreFlow] || dataset.coreFlow.stability;
  const strength = dataset.strength[keywords.strength] || dataset.strength.execution;
  const risk = dataset.risk[keywords.risk] || dataset.risk.overload;
  const action = dataset.action[keywords.action] || dataset.action.review;
  const focus = dataset.categoryFocus[category] || dataset.categoryFocus.love;
  const toneLine =
    tone === "comfort"
      ? "말씀은 부담을 덜어 드리고, 편한 선택을 찾는 쪽으로 적었어요."
      : "말씀은 핵심부터 짚는 쪽으로 적었어요. 참고용으로만 봐 주세요.";

  const todayHeader =
    fortuneDateKey && todayDayPillar
      ? [
          "오늘 보는 관점 (날짜 " + fortuneDateKey + " · 그날 일진 " + todayDayPillar + ")",
          pickDailyFlavorLine({ fortuneDateKey, todayDayPillar }, saju),
          "",
        ].join("\n")
      : "";

  const section1 = [
    todayHeader + "성격은 이런 편이에요",
    name + "님은 태어난 날 조합(" + saju.dayPillar + ")을 중심으로 성향이 잡혀 있어요.",
    core,
    strength,
    "태어난 해·달·시(" +
      saju.yearPillar +
      ", " +
      saju.monthPillar +
      ", " +
      saju.timePillar +
      ")까지 보면, 상황이 생겼을 때 ‘신중함’과 ‘실행’ 사이를 잘 맞추는 게 중요해요.",
    "다섯 가지 기운(목·화·토·금·수)은 각각 " +
      saju.fiveElements.counts.wood +
      ", " +
      saju.fiveElements.counts.fire +
      ", " +
      saju.fiveElements.counts.earth +
      ", " +
      saju.fiveElements.counts.metal +
      ", " +
      saju.fiveElements.counts.water +
      "씩 들어가 있어요. 잘 나오는 쪽과 부족한 쪽을 알면 본인 스타일을 더 잘 쓸 수 있어요.",
  ].join("\n");

  const section2 = [
    "일·커리어 쪽",
    "지금 인생에서 큰 국면(대운)은 " +
      (saju.luckCycle.currentDaYun ? saju.luckCycle.currentDaYun.ganZhi : "계산 중") +
      "이에요. 일이 잘 풀리려면 ‘한번에 크게’보다 ‘꾸준히 품질 지키기’가 맞는 때예요.",
    focus,
    "할 일 순서를 글로 적어 두고, 결과를 숫자나 메모로 남기면 평가나 스트레스가 줄어들기 쉬워요.",
    "올해 흐름(세운)은 " +
      (saju.luckCycle.currentSeWoon ? saju.luckCycle.currentSeWoon.ganZhi : "계산 중") +
      " 쪽이에요. 성과를 급하게 키우기보다, 손해·실수를 줄이는 쪽이 마음이 편해요.",
    "같이 일할 때는 먼저 잘하는 점을 말하고, 합의한 건 문자로 남기면 싸움이 줄어들어요. 반복되는 일은 양식을 만들어 두면 편해요.",
  ].join("\n");

  const section3 = [
    "조심하면 좋은 점",
    risk,
    "바로 결정하기보다 ‘잠깐만’ 하고 다시 보는 습관이 있으면 실수가 줄어들어요.",
    "기분이 크게 오르내리는 날에는 사람 문제, 결제, 계약, 투자는 미루고 사실만 먼저 확인하는 편이 안전해요.",
    action,
    toneLine,
    "오늘 체크: 1) 오늘 꼭 할 일 세 가지 2) 중요한 대화 전에 할 말 두 줄만 적기 3) 지출은 ‘꼭 필요 / 나중 / 안 함’으로 나누기.",
    "이렇게만 두 주 정도 지켜도 마음이 덜 지치고, 결과가 체감되기 시작할 수 있어요.",
  ].join("\n");

  return [section1, "", section2, "", section3].join("\n");
}

async function generateTemplateBasedFortune(input, category, tone) {
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
    fortuneDateKey: input.fortuneDateKey,
    todayDayPillar: input.todayDayPillar,
  });

  return {
    aiProvider: keywordResult.provider,
    tone,
    toneLabel: TONE_LABELS[tone],
    category,
    categoryLabel: CATEGORY_LABELS[category],
    keywords: keywordResult.keywords,
    aiFortune: report,
    fortuneDateKey: input.fortuneDateKey,
    todayDayPillar: input.todayDayPillar,
  };
}

async function generateDatasetBasedFortune(input) {
  const daily = getFortuneDailyContext();
  const merged = { ...input, ...daily };
  const category = normalizeCategory(merged.category);
  const tone = normalizeTone(merged.tone);
  const mode = getFortuneMode();

  if (mode === "llm") {
    const llmKey = buildCacheKey(merged, category, tone) + "|llm";
    const ttlMs = getCacheTtlMs();
    const now = Date.now();
    const llmCached = llmFortuneCache.get(llmKey);
    if (llmCached && now - llmCached.createdAt < ttlMs) {
      return { ...llmCached.payload, fortuneMode: "llm", longformFallback: false };
    }

    const llmResult = await getClaudeSajuLongReport({
      name: merged.name,
      gender: merged.gender,
      category,
      tone,
      saju: merged.saju,
      fortuneDateKey: merged.fortuneDateKey,
      todayDayPillar: merged.todayDayPillar,
    });

    if (llmResult && llmResult.text) {
      const payload = {
        aiProvider: llmResult.provider,
        tone,
        toneLabel: TONE_LABELS[tone],
        category,
        categoryLabel: CATEGORY_LABELS[category],
        keywords: buildMockKeywords(merged),
        aiFortune: llmResult.text,
        fortuneDateKey: merged.fortuneDateKey,
        todayDayPillar: merged.todayDayPillar,
      };
      llmFortuneCache.set(llmKey, { createdAt: now, payload });
      return { ...payload, fortuneMode: "llm", longformFallback: false };
    }
  }

  const templateResult = await generateTemplateBasedFortune(merged, category, tone);
  return {
    ...templateResult,
    fortuneMode: "template",
    longformFallback: mode === "llm",
  };
}

module.exports = {
  generateDatasetBasedFortune,
  getFortuneMode,
};
