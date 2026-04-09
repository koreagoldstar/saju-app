const { getSajuFromInput } = require("../lib/saju");

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
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const daYunList = (saju.luckCycle && saju.luckCycle.daYunList) || [];
    const top10 = daYunList.slice(0, 10);
    const report = top10
      .map((item, idx) => `${idx + 1}. ${item.ganZhi || "-"} | ${item.startYear}~${item.endYear} | 나이 ${item.startAge}~${item.endAge}`)
      .join("\n");

    return res.status(200).json({
      title: "10년 대운 분석",
      profile: { name, gender, calendarType },
      saju,
      daYunTimeline: top10,
      report: "10년 대운 타임라인\n" + report,
    });
  } catch (error) {
    return res.status(500).json({ message: "10년 대운 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
