const { getSajuFromInput } = require("../lib/saju");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, recentIssue } = req.body || {};
    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    const [year, month, day] = birthDate.split("-").map(Number);
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const currentSeWoon = saju.luckCycle && saju.luckCycle.currentSeWoon;
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];

    const issue = String(recentIssue || "").trim();
    const issueLine =
      issue.length > 0
        ? "입력하신 최근 이슈는 \"" + issue + "\" 입니다. 이 사안은 지금 시기의 판단 균형(속도 vs 안정성)을 시험하는 주제이므로, 단기 결론보다 2~4주 단위 점검 방식이 유리합니다."
        : "최근 이슈가 입력되지 않아 일반 장기 흐름 기준으로 분석합니다. 이후 이슈를 입력하면 훨씬 구체적인 맞춤 해석이 가능합니다.";

    const report = [
      "인생 전반 흐름",
      name + "님의 평생 사주 분석은 " + saju.dayPillar + " 일주를 중심축으로 삼아, 단기 사건보다 장기 패턴을 읽는 방식으로 구성됩니다.",
      "핵심은 지금 보이는 결과가 전부가 아니라, 대운·세운의 전환에 따라 강점과 약점의 체감 순서가 달라진다는 점입니다.",
      "현재는 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + " 구간으로, 기초 체력과 구조를 다지는 선택이 장기 기대값을 높이는 시기입니다.",
      "즉, 한 번의 성과보다 반복 가능한 루틴을 만드는 방향이 평생 흐름에서 더 큰 복리 효과를 만듭니다.",
      "",
      "시기별 변화 포인트",
      "오행 분포는 목 " + saju.fiveElements.counts.wood + ", 화 " + saju.fiveElements.counts.fire + ", 토 " + saju.fiveElements.counts.earth + ", 금 " + saju.fiveElements.counts.metal + ", 수 " + saju.fiveElements.counts.water + "이며, 강한 기운은 " + dominant + ", 보완 기운은 " + weak + "입니다.",
      "강한 기운은 결정·행동·집중에서 힘을 제공하지만, 과해지면 시야가 좁아질 수 있어 균형 장치가 필요합니다.",
      "보완 기운은 현재 부족하게 보일 수 있으나, 의식적 습관으로 충분히 채울 수 있는 영역입니다. 예를 들어 일정 관리, 기록, 휴식, 관계 조율 같은 실천이 약한 기운을 실제 역량으로 전환합니다.",
      "세운 " + (currentSeWoon ? currentSeWoon.ganZhi + " (" + currentSeWoon.year + "년)" : "분석 중") + " 구간에서는 체감 속도보다 안정성과 회복 탄성이 중요하며, 이 시기 전략이 다음 대운 초반 성과를 좌우할 가능성이 큽니다.",
      "",
      "최근 이슈 맞춤 분석",
      issueLine,
      "최근 이슈가 관계 문제라면 대화 시점과 표현 강도를 분리해 조절하는 것이 우선입니다. 재무 문제라면 위험 노출을 줄이는 선택부터 선행하고, 진로 문제라면 실험 범위를 작게 나누어 실행 데이터를 먼저 확보하는 전략이 유효합니다.",
      "핵심은 '지금 당장 정답 찾기'보다, 일정한 점검 주기로 가설을 업데이트하는 방식입니다. 이 과정이 누적될수록 평생 흐름의 안정성이 높아집니다.",
      "",
      "분야별 장기 운영 관점",
      "관계 영역에서는 감정 강도보다 신뢰 축적 속도가 중요합니다. 중요한 갈등은 즉시 해결보다 사실 확인-정리-재대화 순서가 장기적으로 유리합니다.",
      "재무 영역에서는 수익 확대보다 손실 억제의 일관성이 먼저입니다. 고정비/변동비 구분, 분기별 현금흐름 점검, 고위험 의사결정 유예 규칙이 평생 곡선을 안정화합니다.",
      "건강·에너지 영역에서는 과부하 이후 회복이 늦어지지 않도록 주간 리듬을 고정해야 합니다. 수면/식사/운동보다 중요한 것은 '반복 가능한 최소 기준'을 지키는 것입니다.",
      "성장 영역에서는 목표를 크게 잡되 실행 단위를 작게 쪼개는 방식이 좋습니다. 작은 완성의 누적이 대운 전환기 변동성을 흡수하는 완충장치가 됩니다.",
      "",
      "지속 점검 가이드",
      "평생 사주 리포트는 1회성 판정이 아니라 업데이트형 지도이므로 분기 1회 재확인을 기본 루틴으로 권장합니다.",
      "전환 이벤트(이직, 결혼, 투자, 이사, 사업 확장) 전후에는 반드시 재조회해 우선순위를 다시 정하세요.",
      "권장 루틴: 1) 현재 대운 위치 확인 2) 다음 전환까지 남은 기간 점검 3) 관계/재무/건강 우선순위 재설정 4) 90일 실행 계획 업데이트.",
      "이 과정을 반복하면 운세는 막연한 예측이 아니라, 삶의 의사결정 품질을 개선하는 실전 도구로 작동합니다.",
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
