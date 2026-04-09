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
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];

    const report = [
      "2026 신토정비결 프리미엄 리포트",
      name + "님은 " + saju.dayPillar + " 일주를 중심으로 2026년에 기회와 리스크가 교차하는 흐름이 뚜렷합니다.",
      "현재 대운은 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + "이며, 연간 운영 전략은 보수적 확장에 가깝습니다.",
      "오행 분포에서 강한 기운은 " + dominant + ", 보완 기운은 " + weak + "이므로 상반기에는 과감한 확장보다 구조 정비가 유리합니다.",
      "하반기에는 관계/재무/커리어 모두 검증된 채널 위주로 선택하면 성과 안정성이 올라갑니다.",
      "월별 실천 원칙: 1) 결제·계약은 서면 검토 2) 일정은 주간 단위 리밸런싱 3) 감정적 의사결정 24시간 유예.",
    ].join("\n");

    return res.status(200).json({
      title: "2026 신토정비결",
      profile: { name, gender, calendarType },
      saju,
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "신토정비결 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
