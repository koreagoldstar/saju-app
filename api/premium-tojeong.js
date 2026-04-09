const { getSajuFromInput } = require("../lib/saju");

function getFunFacts(seed) {
  const n = Math.abs(Number(seed) || 1);
  return {
    bestDate: (n % 27) + 1,
    bestNumber: (n % 9) + 1,
  };
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
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
    const funFacts = getFunFacts(year + month + day + Number(birthHour) + Number(birthMinute));

    const report = [
      "2026 신토정비결 프리미엄 리포트",
      "연간 핵심 테마",
      name + "님은 " + saju.dayPillar + " 일주를 중심으로 2026년에 기회와 리스크가 교차하는 흐름이 뚜렷합니다.",
      "현재 대운은 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + "이며, 연간 운영 전략은 보수적 확장에 가깝습니다.",
      "",
      "상반기 운영 포인트",
      "오행 분포에서 강한 기운은 " + dominant + ", 보완 기운은 " + weak + "입니다. 상반기는 속도보다 구조 정비가 우선입니다.",
      "새로운 시도는 '소규모 검증-지표 확인-확장' 순서로 진행할수록 리스크를 크게 줄일 수 있습니다.",
      "",
      "하반기 선택 전략",
      "하반기에는 관계/재무/일상 의사결정 모두 검증된 채널 위주로 선택하면 성과 안정성이 올라갑니다.",
      "외부 제안은 즉시 확정하지 말고, 최소 하루 유예 후 재검토하는 규칙이 유효합니다.",
      "",
      "실천 체크리스트",
      "1) 결제·계약은 서면 검토 2) 일정은 주간 단위 리밸런싱 3) 감정적 의사결정 24시간 유예",
    ].join("\n");

    return res.status(200).json({
      title: "2026 신토정비결",
      profile: { name, gender, calendarType },
      saju,
      summary: "2026년 핵심 전략: 상반기 구조 정비, 하반기 선택적 확장",
      luckGuide: {
        today: "아침 10분 일정 정리로 오늘 우선순위를 먼저 고정하세요.",
        thisWeek: "중요 계약/결제는 당일 확정 대신 하루 유예 후 재검토하는 주간 리듬을 유지하세요.",
        avoid: "감정이 큰 상태에서 즉시 결론 내리는 행동은 피하세요.",
      },
      funFacts,
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "신토정비결 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
