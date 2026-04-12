const Anthropic = require("@anthropic-ai/sdk");

const CATEGORY_LABELS = {
  love: "연애운",
  business: "사업운",
  benefactor: "귀인운",
  career: "직장운",
  wealth: "재물운",
};

const TONE_LABELS = {
  expert: "전문가형",
  comfort: "상담형",
};
const KEYWORD_OPTIONS = {
  coreFlow: ["stability", "expansion", "transition", "focus"],
  strength: ["execution", "insight", "communication", "resilience"],
  risk: ["impulsive", "overload", "conflict", "distraction"],
  action: ["review", "routine", "record", "pause"],
};
const dailyBudgetState = {
  dayKey: "",
  used: 0,
};

const longformBudgetState = {
  dayKey: "",
  used: 0,
};

function normalizeCategory(category) {
  const value = String(category || "").trim().toLowerCase();
  if (CATEGORY_LABELS[value]) {
    return value;
  }
  return "love";
}

function normalizeTone(tone) {
  const value = String(tone || "").trim().toLowerCase();
  if (TONE_LABELS[value]) {
    return value;
  }
  return "expert";
}

function shouldUseMockKeywords() {
  return process.env.NODE_ENV !== "production" || process.env.MOCK_AI === "true";
}

function getUtcDayKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDailyKeywordLimit() {
  const raw = Number(process.env.MAX_AI_KEYWORD_CALLS_PER_DAY || 120);
  if (!Number.isFinite(raw) || raw < 0) {
    return 120;
  }
  return Math.floor(raw);
}

function resetBudgetIfNeeded() {
  const key = getUtcDayKey();
  if (dailyBudgetState.dayKey !== key) {
    dailyBudgetState.dayKey = key;
    dailyBudgetState.used = 0;
  }
}

function consumeDailyBudget() {
  resetBudgetIfNeeded();
  const limit = getDailyKeywordLimit();
  if (dailyBudgetState.used >= limit) {
    return false;
  }
  dailyBudgetState.used += 1;
  return true;
}

function resetLongformBudgetIfNeeded() {
  const key = getUtcDayKey();
  if (longformBudgetState.dayKey !== key) {
    longformBudgetState.dayKey = key;
    longformBudgetState.used = 0;
  }
}

function getDailyLongformLimit() {
  const raw = Number(process.env.MAX_AI_LONGFORM_CALLS_PER_DAY || 40);
  if (!Number.isFinite(raw) || raw < 0) {
    return 40;
  }
  return Math.floor(raw);
}

function consumeLongformDailyBudget() {
  resetLongformBudgetIfNeeded();
  const limit = getDailyLongformLimit();
  if (longformBudgetState.used >= limit) {
    return false;
  }
  longformBudgetState.used += 1;
  return true;
}

/** 서버에서 계산한 사주만 담아 LLM 프롬프트에 넣습니다(숨김간·대운 요약). */
function buildSajuSnapshotForPrompt(saju, daily) {
  const lc = saju.luckCycle || {};
  const daYunList = (lc.daYunList || []).slice(0, 12).map((d) => ({
    ganZhi: d.ganZhi,
    startYear: d.startYear,
    endYear: d.endYear,
    startAge: d.startAge,
    endAge: d.endAge,
  }));
  const fe = saju.fiveElements || {};
  const labels = fe.labels || {};
  const base = {
    yearPillar: saju.yearPillar,
    monthPillar: saju.monthPillar,
    dayPillar: saju.dayPillar,
    timePillar: saju.timePillar,
    dayMaster: saju.dayMaster,
    calendarType: saju.calendarType,
    fiveElements: {
      counts: fe.counts || {},
      dominantKo: labels[fe.dominantElement] || "",
      weakestKo: labels[fe.weakestElement] || "",
    },
    luckCycle: {
      currentYear: lc.currentYear,
      currentDaYun: lc.currentDaYun || null,
      currentSeWoon: lc.currentSeWoon || null,
      daYunTimeline: daYunList,
    },
  };
  if (daily && daily.fortuneDateKey) {
    base.dailyQuery = {
      fortuneDateKst: daily.fortuneDateKey,
      todayDayPillar: daily.todayDayPillar || "",
    };
  }
  return base;
}

function buildLongformUserPrompt({ name, gender, category, tone, snapshot }) {
  const categoryLabel = CATEGORY_LABELS[category] || "연애운";
  const toneLabel = TONE_LABELS[tone] || "전문가형";
  const genderLabel = gender === "female" ? "여성" : gender === "male" ? "남성" : "기타";
  return [
    "이름(호칭용): " + name,
    "성별: " + genderLabel,
    "요청 카테고리(이 파트를 가장 비중 있게): " + categoryLabel,
    "문체: " + toneLabel + " (전문가형은 근거·판단 중심, 상담형은 안정·공감 중심)",
    "",
    "아래 JSON은 서버가 계산한 사주 사실만 담고 있습니다. 이 JSON에 없는 간지·대운·오행을 지어내지 마세요.",
    JSON.stringify(snapshot, null, 2),
  ].join("\n");
}

const LONGFORM_SYSTEM_PROMPT = [
  "당신은 한국어로 사주를 풀어 설명하는 도우미입니다.",
  "입력 JSON에 있는 사실(간지, 오행 개수, 대운·세운)만 쓰세요. JSON에 없는 간지나 대운을 지어내지 마세요.",
  "dailyQuery가 있으면 ‘오늘 날짜’와 ‘그날 일진’을 근거로, 어제와 오늘이 어떻게 다르게 느껴질 수 있는지 한 번은 짚어 주세요.",
  "문장은 짧게 끊고, 어려운 한자·용어는 괄호로 풀어서 한 번만 설명하세요. (예: 일진=그날 하루의 기운을 적은 말)",
  "출력은 반드시 한국어입니다. 마크다운 코드펜스(```)는 쓰지 마세요.",
  "의료·법률·투자 원금 보장·절대적 예언은 하지 마세요. 참고용 성향·생활 습관 조언으로만 쓰세요.",
  "다음 소제목을 순서대로 쓰고, 각 소제목 아래에 2~5문단 분량으로 씁니다.",
  "1) 성격·기질 (태어난 날 조합 중심, 쉬운 말)",
  "2) 요청한 주제에 맞는 운세",
  "3) 지금 인생 큰 국면·올해 흐름 (JSON에 있는 대운·세운만)",
  "4) 오늘·이번 주에 해볼 만한 행동",
  "5) 조심하면 좋은 점 (감정 올라갈 때 결정 미루기, 메모하기 등)",
  "전체 분량은 대략 1800~3500자. 이름은 ‘OOO님’처럼 자연스럽게 부르세요.",
].join("\n");

function stripMarkdownFence(text) {
  const t = String(text || "").trim();
  if (t.startsWith("```")) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return t;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Claude timeout")), ms)),
  ]);
}

async function getClaudeSajuLongReport({ name, gender, category, tone, saju, fortuneDateKey, todayDayPillar }) {
  if (shouldUseMockKeywords()) {
    return null;
  }
  if (!consumeLongformDailyBudget()) {
    return null;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const cat = normalizeCategory(category);
  const tn = normalizeTone(tone);
  const daily = fortuneDateKey ? { fortuneDateKey, todayDayPillar } : null;
  const snapshot = buildSajuSnapshotForPrompt(saju, daily);
  const userContent = buildLongformUserPrompt({
    name,
    gender,
    category: cat,
    tone: tn,
    snapshot,
  });

  const model = String(process.env.ANTHROPIC_MODEL_LONGFORM || "claude-sonnet-4-5").trim() || "claude-sonnet-4-5";
  const maxTokens = Number(process.env.FORTUNE_LLM_MAX_TOKENS || 4096);
  const timeoutMs = Number(process.env.FORTUNE_LLM_TIMEOUT_MS || 90000);

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await withTimeout(
      anthropic.messages.create({
        model,
        max_tokens: Number.isFinite(maxTokens) && maxTokens > 500 ? Math.floor(maxTokens) : 4096,
        temperature: 0.45,
        system: LONGFORM_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
      timeoutMs
    );

    const text = stripMarkdownFence(
      response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim()
    );

    if (text.length < 200) {
      return null;
    }
    return { provider: "claude-longform", text };
  } catch (error) {
    return null;
  }
}

function hashStringToUint(s) {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildMockKeywords(input) {
  const seed = String(input.dayPillar || "갑자") + "|" + String(input.fortuneDateKey || "") + "|" + String(input.todayDayPillar || "");
  const idx = hashStringToUint(seed) % 4;
  return {
    coreFlow: KEYWORD_OPTIONS.coreFlow[idx],
    strength: KEYWORD_OPTIONS.strength[(idx + 1) % 4],
    risk: KEYWORD_OPTIONS.risk[(idx + 2) % 4],
    action: KEYWORD_OPTIONS.action[(idx + 3) % 4],
  };
}

function buildKeywordPrompt(input) {
  const category = normalizeCategory(input.category);
  const categoryLabel = CATEGORY_LABELS[category];
  const tone = normalizeTone(input.tone);
  const genderLabel = input.gender === "female" ? "여성" : input.gender === "male" ? "남성" : "기타";

  return [
    "역할: 명리 데이터 분석기.",
    "목표: 아래 사주 정보를 보고 키워드만 선택.",
    "출력은 JSON 한 줄만. 설명 문장 금지.",
    "필드: coreFlow, strength, risk, action",
    "허용값:",
    "coreFlow: " + KEYWORD_OPTIONS.coreFlow.join(", "),
    "strength: " + KEYWORD_OPTIONS.strength.join(", "),
    "risk: " + KEYWORD_OPTIONS.risk.join(", "),
    "action: " + KEYWORD_OPTIONS.action.join(", "),
    "요청 카테고리: " + categoryLabel + " | 문체: " + tone,
    "- 이름: " + input.name,
    "- 성별: " + genderLabel,
    "- 연주: " + input.yearPillar,
    "- 월주: " + input.monthPillar,
    "- 일주: " + input.dayPillar,
    "- 시주: " + input.timePillar,
    "- 오행 분포: " + JSON.stringify((input.fiveElements && input.fiveElements.counts) || {}),
    "- 해석 기준일(한국): " + String(input.fortuneDateKey || ""),
    "- 그날 일진(日干支): " + String(input.todayDayPillar || ""),
    "반드시 JSON만 출력 예시:",
    "{\"coreFlow\":\"stability\",\"strength\":\"execution\",\"risk\":\"overload\",\"action\":\"review\"}",
  ].join("\n");
}

async function getClaudeSajuKeywords(input) {
  if (shouldUseMockKeywords()) {
    return { provider: "mock", keywords: buildMockKeywords(input) };
  }

  if (!consumeDailyBudget()) {
    return { provider: "budget-mock", keywords: buildMockKeywords(input) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { provider: "mock", keywords: buildMockKeywords(input) };
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildKeywordPrompt(input);

  const response = await withTimeout(
    anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 220,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
    12000
  );

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  try {
    const parsed = JSON.parse(text);
    const keywords = {
      coreFlow: KEYWORD_OPTIONS.coreFlow.includes(parsed.coreFlow) ? parsed.coreFlow : "stability",
      strength: KEYWORD_OPTIONS.strength.includes(parsed.strength) ? parsed.strength : "execution",
      risk: KEYWORD_OPTIONS.risk.includes(parsed.risk) ? parsed.risk : "overload",
      action: KEYWORD_OPTIONS.action.includes(parsed.action) ? parsed.action : "review",
    };
    return { provider: "claude-keyword", keywords };
  } catch (error) {
    return { provider: "mock", keywords: buildMockKeywords(input) };
  }
}

module.exports = {
  getClaudeSajuKeywords,
  getClaudeSajuLongReport,
  buildSajuSnapshotForPrompt,
  buildMockKeywords,
  shouldUseMockKeywords,
  normalizeCategory,
  normalizeTone,
  CATEGORY_LABELS,
  TONE_LABELS,
  KEYWORD_OPTIONS,
};