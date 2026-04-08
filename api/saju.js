const { getSajuFromInput } = require("../lib/saju");
const { getClaudeSajuFortune } = require("../lib/claude");

function buildFallbackFortune(data) {
  const name = data.name;
  const gender = data.gender;
  const saju = data.saju;
  const styleLine =
    gender === "female"
      ? "섬세함과 공감력이 강점으로 드러나는 흐름입니다."
      : "추진력과 결단력이 강점으로 드러나는 흐름입니다.";

  return [
    name + "님의 사주는 " + saju.dayPillar + " 일주를 중심으로 균형이 좋은 편입니다.",
    styleLine,
    "최근에는 " + saju.monthPillar + " 기운이 강해 학습, 계획, 커리어 정비에 유리합니다.",
    "이번 달은 인간관계에서 속도를 조절하면 더 큰 성과를 얻을 수 있습니다.",
  ].join(" ");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType } = req.body || {};

    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    const [year, month, day] = birthDate.split("-").map(Number);
    const hour = Number(birthHour);
    const minute = Number(birthMinute);
    const isLunar = calendarType === "lunar";

    const saju = getSajuFromInput(year, month, day, hour, minute, isLunar);

    let aiFortune = "";
    let aiProvider = "claude";

    try {
      aiFortune = await getClaudeSajuFortune({
        name,
        gender,
        calendarType,
        ...saju,
      });
    } catch (apiError) {
      aiProvider = "fallback";
      aiFortune = buildFallbackFortune({ name, gender, saju });
      console.error("Claude API fallback:", apiError.message);
    }

    return res.status(200).json({
      profile: { name, gender, calendarType },
      saju,
      aiProvider,
      aiFortune,
    });
  } catch (error) {
    return res.status(500).json({ message: "사주 계산 중 오류가 발생했습니다.", detail: error.message });
  }
};