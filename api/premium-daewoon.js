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
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const report = top10
      .map((item, idx) => `${idx + 1}. ${item.ganZhi || "-"} | ${item.startYear}~${item.endYear} | 나이 ${item.startAge}~${item.endAge}`)
      .join("\n");
    const strategy =
      currentDaYun
        ? "현재 " + currentDaYun.ganZhi + " 구간에서는 장기 프로젝트를 작게 나눠 누적 성과를 만드는 방식이 유리합니다."
        : "현재 구간 계산 중이며, 대운 전환 직전에는 보수적 의사결정을 권장합니다.";

    return res.status(200).json({
      title: "10년 대운 분석",
      profile: { name, gender, calendarType },
      saju,
      daYunTimeline: top10,
      summary: strategy,
      luckTips: [
        "현재 대운 핵심 키워드 1개를 정해 90일 단위로 실행하세요.",
        "대운 전환 1~2년 전에는 보수적 결정을 우선해 변동성을 줄이세요.",
        "월 1회 기록으로 '잘된 선택/아쉬운 선택'을 구분해 패턴을 고정하세요.",
      ],
      report: "10년 대운 타임라인\n" + report + "\n\n운영 조언\n" + strategy,
    });
  } catch (error) {
    return res.status(500).json({ message: "10년 대운 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
