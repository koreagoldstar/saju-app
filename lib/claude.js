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

function buildSajuPrompt(input) {
  const category = normalizeCategory(input.category);
  const categoryLabel = CATEGORY_LABELS[category];
  const tone = normalizeTone(input.tone);
  const toneLabel = TONE_LABELS[tone];
  const genderLabel = input.gender === "female" ? "여성" : input.gender === "male" ? "남성" : "기타";
  const toneGuide =
    tone === "comfort"
      ? "문체: 따뜻하고 안정감을 주는 상담형 존댓말. 불안을 낮추고 선택지를 제시."
      : "문체: 단정하고 품격 있는 전문가형 존댓말. 핵심 판단과 근거를 간결히 제시.";
  const currentDaYun =
    input.luckCycle && input.luckCycle.currentDaYun
      ? input.luckCycle.currentDaYun.ganZhi +
        " (" +
        input.luckCycle.currentDaYun.startYear +
        "~" +
        input.luckCycle.currentDaYun.endYear +
        ")"
      : "정보 없음";
  const currentSeWoon =
    input.luckCycle && input.luckCycle.currentSeWoon
      ? input.luckCycle.currentSeWoon.ganZhi + " (" + input.luckCycle.currentSeWoon.year + "년)"
      : "정보 없음";
  const dominantElement =
    input.fiveElements && input.fiveElements.labels
      ? input.fiveElements.labels[input.fiveElements.dominantElement] || input.fiveElements.dominantElement
      : "정보 없음";
  const weakestElement =
    input.fiveElements && input.fiveElements.labels
      ? input.fiveElements.labels[input.fiveElements.weakestElement] || input.fiveElements.weakestElement
      : "정보 없음";
  const elementCounts = input.fiveElements && input.fiveElements.counts ? input.fiveElements.counts : {};

  return [
    "역할: 20년 경력의 명리학자이자 상담 경험이 풍부한 전문가.",
    "목표: 사용자가 신뢰할 수 있는, 근거 중심의 오늘 운세 리포트 작성.",
    toneGuide,
    "선택 문체: " + toneLabel,
    "중요: 과장, 공포 조장, 단정적 예언 금지.",
    "요청 카테고리: " + categoryLabel,
    "- 이름: " + input.name,
    "- 성별: " + genderLabel,
    "- 달력 기준: " + (input.calendarType === "lunar" ? "음력" : "양력"),
    "- 계산 기준: " + (input.calculationBasis || "lunar-javascript:eightchar-sect2"),
    "- 양력 일시: " + input.solarDateTime,
    "- 음력 일시: " + input.lunarDateTime,
    "- 연주: " + input.yearPillar,
    "- 월주: " + input.monthPillar,
    "- 일주: " + input.dayPillar,
    "- 시주: " + input.timePillar,
    "- 일간(일주 천간): " + (input.dayMaster || ""),
    "- 사주 8자: " + input.eightChar,
    "- 만세력(년): " + input.manse.year.gan + "(" + input.manse.year.ganElement + "), " + input.manse.year.zhi + "(" + input.manse.year.zhiElement + ")",
    "- 만세력(월): " + input.manse.month.gan + "(" + input.manse.month.ganElement + "), " + input.manse.month.zhi + "(" + input.manse.month.zhiElement + ")",
    "- 만세력(일): " + input.manse.day.gan + "(" + input.manse.day.ganElement + "), " + input.manse.day.zhi + "(" + input.manse.day.zhiElement + ")",
    "- 만세력(시): " + input.manse.time.gan + "(" + input.manse.time.ganElement + "), " + input.manse.time.zhi + "(" + input.manse.time.zhiElement + ")",
    "- 오행 분포: 목 " + (elementCounts.wood || 0) + ", 화 " + (elementCounts.fire || 0) + ", 토 " + (elementCounts.earth || 0) + ", 금 " + (elementCounts.metal || 0) + ", 수 " + (elementCounts.water || 0),
    "- 강한 오행: " + dominantElement,
    "- 보완 필요 오행: " + weakestElement,
    "- 지장간: year(" + ((input.hiddenStems && input.hiddenStems.year) || []).join(",") + "), month(" + ((input.hiddenStems && input.hiddenStems.month) || []).join(",") + "), day(" + ((input.hiddenStems && input.hiddenStems.day) || []).join(",") + "), time(" + ((input.hiddenStems && input.hiddenStems.time) || []).join(",") + ")",
    "- 현재 대운: " + currentDaYun,
    "- 현재 세운: " + currentSeWoon,
    "",
    "출력 형식:",
    "반드시 아래 3개 섹션 제목을 정확히 포함해서 작성:",
    "1) 성격 분석",
    "2) 직업운",
    "3) 주의해야 할 점",
    "각 섹션은 최소 4문장 이상 작성하고, 명리 근거(일간/월지/오행/대운/세운)를 자연스럽게 녹여 설명.",
    "",
    "조건:",
    "- 한국어로 작성",
    "- 전체 1,000자 이상",
    "- 과학적 사실처럼 단정하지 말고, 명리 해석 관점임을 자연스럽게 유지",
    "- 추상 표현보다 실제 일정/대화/금전 관리에 적용 가능한 문장으로 작성",
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
      max_tokens: 1800,
      temperature: 0.45,
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
  normalizeTone,
  CATEGORY_LABELS,
  TONE_LABELS,
};