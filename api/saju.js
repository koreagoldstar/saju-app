const { getSajuFromInput } = require("../lib/saju");
const { generateDatasetBasedFortune } = require("../lib/fortune-report");

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
    const saju = getSajuFromInput(year, month, day, hour, minute, isLunar, gender);
    const generated = await generateDatasetBasedFortune({
      name,
      gender,
      calendarType,
      category,
      tone: "expert",
      saju,
      ...saju,
    });

    return res.status(200).json({
      profile: { name, gender, calendarType },
      category: generated.category,
      categoryLabel: generated.categoryLabel,
      saju,
      keywords: generated.keywords,
      aiProvider: generated.aiProvider,
      aiFortune: generated.aiFortune,
    });
  } catch (error) {
    return res.status(500).json({ message: "사주 계산 중 오류가 발생했습니다.", detail: error.message });
  }
};
