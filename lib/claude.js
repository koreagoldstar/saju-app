const Anthropic = require("@anthropic-ai/sdk");

const CATEGORY_LABELS = {
  love: "연애운",
  business: "사업운",
  benefactor: "귀인운",
  career: "직장운",
  wealth: "재물운",
};

function normalizeCategory(category) {
  const value = String(category || "").trim().toLowerCase();
  if (CATEGORY_LABELS[value]) {
    return value;
  }
  return "love";
}

function buildSajuPrompt(input) {
  const category = normalizeCategory(input.category);
  const categoryLabel = CATEGORY_LABELS[category];

  return [
    "당신은 20년 경력의 명리학 전문가입니다.",
    "아래 사용자의 사주 8자를 바탕으로 오늘의 운세를 해석해 주세요.",
    "요청 카테고리: " + categoryLabel,
    "- 이름: " + input.name,
    "- 성별: " + input.gender,
    "- 달력 기준: " + (input.calendarType === "lunar" ? "음력" : "양력"),
    "- 양력 일시: " + input.solarDateTime,
    "- 음력 일시: " + input.lunarDateTime,
    "- 연주: " + input.yearPillar,
    "- 월주: " + input.monthPillar,
    "- 일주: " + input.dayPillar,
    "- 시주: " + input.timePillar,
    "- 사주 8자: " + input.eightChar,
    "",
    "출력 형식:",
    "1) 오늘의 핵심 흐름 (1문장)",
    "2) " + categoryLabel + " 집중 해석 (2~3문장)",
    "3) 피하면 좋은 행동 1가지",
    "4) 오늘의 한 줄 행운 팁",
    "",
    "조건:",
    "- 한국어로 작성",
    "- 전체 220자~320자",
    "- 너무 추상적 표현보다 구체적인 조언",
  ].join("\n");
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Claude timeout")), ms)),
  ]);
}

async function getClaudeSajuFortune(input) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildSajuPrompt(input);

  const response = await withTimeout(
    anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 420,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    }),
    12000
  );

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude response text is empty");
  }

  return text;
}

module.exports = {
  getClaudeSajuFortune,
  normalizeCategory,
  CATEGORY_LABELS,
};