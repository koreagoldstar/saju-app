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

function buildMockKeywords(input) {
  const seed = String(input.dayPillar || "갑자");
  const idx = seed.charCodeAt(0) % 4;
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
    "반드시 JSON만 출력 예시:",
    "{\"coreFlow\":\"stability\",\"strength\":\"execution\",\"risk\":\"overload\",\"action\":\"review\"}",
  ].join("\n");
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Claude timeout")), ms)),
  ]);
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
  buildMockKeywords,
  shouldUseMockKeywords,
  normalizeCategory,
  normalizeTone,
  CATEGORY_LABELS,
  TONE_LABELS,
  KEYWORD_OPTIONS,
};