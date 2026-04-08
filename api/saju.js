const { getSajuFromInput } = require("../lib/saju");
const { getClaudeSajuFortune, normalizeCategory, CATEGORY_LABELS } = require("../lib/claude");
const { initSentry, captureException, captureMessage } = require("../lib/sentry");

initSentry();

function buildFallbackFortune(data) {
  const name = data.name;
  const gender = data.gender;
  const saju = data.saju;
  const category = normalizeCategory(data.category);
  const categoryLabel = CATEGORY_LABELS[category];
  const styleLine =
    gender === "female"
      ? "섬세함과 공감력이 강점으로 드러나는 흐름입니다."
      : "추진력과 결단력이 강점으로 드러나는 흐름입니다.";
  const categoryLineMap = {
    love: "감정 표현을 서두르기보다 상대 반응을 살피면 관계 운이 올라갑니다.",
    business: "새 제안은 속도보다 손익 구조를 먼저 점검하면 성과가 좋습니다.",
    benefactor: "오늘은 주변 조언 속에서 핵심 힌트가 들어오는 귀인 흐름이 강합니다.",
    career: "업무에서는 우선순위를 한 번 더 정리하면 평가가 안정적으로 올라갑니다.",
    wealth: "지출은 충동구매만 줄여도 금전 균형이 빠르게 회복됩니다.",
  };

  return [
    name + "님의 오늘 " + categoryLabel + "은 " + saju.dayPillar + " 일주 기운이 중심이 됩니다.",
    styleLine,
    categoryLineMap[category],
    "오늘의 행운 팁: 중요한 결정은 오후에 다시 한 번 확인하고 진행하세요.",
  ].join(" ");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, category } = req.body || {};

    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    const [year, month, day] = birthDate.split("-").map(Number);
    const hour = Number(birthHour);
    const minute = Number(birthMinute);
    const isLunar = calendarType === "lunar";

    const normalizedCategory = normalizeCategory(category);
    const saju = getSajuFromInput(year, month, day, hour, minute, isLunar);

    let aiFortune = "";
    let aiProvider = "claude";

    try {
      aiFortune = await getClaudeSajuFortune({
        name,
        gender,
        calendarType,
        category: normalizedCategory,
        ...saju,
      });
    } catch (apiError) {
      aiProvider = "fallback";
      aiFortune = buildFallbackFortune({ name, gender, saju, category: normalizedCategory });
      captureMessage("Claude API fallback", {
        reason: apiError.message,
        calendarType,
        category: normalizedCategory,
      });
      console.error("Claude API fallback:", apiError.message);
    }

    return res.status(200).json({
      profile: { name, gender, calendarType },
      category: normalizedCategory,
      categoryLabel: CATEGORY_LABELS[normalizedCategory],
      saju,
      aiProvider,
      aiFortune,
    });
  } catch (error) {
    captureException(error, { path: "/api/saju" });
    return res.status(500).json({ message: "사주 계산 중 오류가 발생했습니다.", detail: error.message });
  }
};