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
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const currentSeWoon = saju.luckCycle && saju.luckCycle.currentSeWoon;
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];

    const report = [
      "인생 전반 흐름",
      name + "님의 평생 사주 분석은 " + saju.dayPillar + " 일주를 중심으로 장기 흐름을 읽습니다.",
      "이 리포트는 한 번의 결론이 아니라, 대운/세운 전환에 따라 해석 강도가 달라지는 장기 지도입니다.",
      "현재는 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + " 구간으로, 무리한 확장보다 기반 정비가 유리합니다.",
      "",
      "시기별 변화 포인트",
      "오행 분포는 목 " + saju.fiveElements.counts.wood + ", 화 " + saju.fiveElements.counts.fire + ", 토 " + saju.fiveElements.counts.earth + ", 금 " + saju.fiveElements.counts.metal + ", 수 " + saju.fiveElements.counts.water + "입니다.",
      "강한 기운은 " + dominant + ", 보완 기운은 " + weak + "으로 나타나며, 환경 변화(이직/이사/관계 변화)에 따라 체감 흐름이 달라질 수 있습니다.",
      "세운 " + (currentSeWoon ? currentSeWoon.ganZhi + " (" + currentSeWoon.year + "년)" : "분석 중") + " 구간에서는 단기 성과보다 안정적 누적이 더 높은 기대값을 만듭니다.",
      "",
      "지속 점검 가이드",
      "평생 사주 리포트는 분기 1회, 또는 큰 전환 이벤트 전후로 재확인하는 것이 가장 효과적입니다.",
      "동일한 사주라도 시기와 상황에 따라 우선순위가 바뀌므로, 고정 해석보다 업데이트 관점으로 활용해 주세요.",
      "권장 루틴: 1) 현재 대운 위치 확인 2) 다음 전환까지 남은 기간 점검 3) 관계/재무/건강 우선순위 재설정.",
    ].join("\n");

    return res.status(200).json({
      title: "평생 사주 분석",
      profile: { name, gender, calendarType },
      saju,
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "평생 사주 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
