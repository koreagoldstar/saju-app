const Anthropic = require("@anthropic-ai/sdk");

function buildSajuPrompt(input) {
  return [
    "당신은 20년 경력의 명리학 전문가입니다.",
    "아래 사용자의 사주 8자를 바탕으로 핵심만 간결하게 해석해 주세요.",
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
    "1) 성향",
    "2) 직업/재물",
    "3) 연애/대인",
    "4) 건강",
    "5) 3개월 조언",
    "",
    "각 항목은 한국어로 1~2문장, 전체 350자 내외로 작성해 주세요.",
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
      max_tokens: 450,
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
};