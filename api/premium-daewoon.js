const { getSajuFromInput } = require("../lib/saju");

function getFunFacts(seed) {
  const n = Math.abs(Number(seed) || 1);
  return {
    bestDate: (n % 27) + 1,
    bestNumber: (n % 9) + 1,
  };
}

function interpretDaYunPhase(idx, item, currentDaYun) {
  const isCurrent =
    currentDaYun &&
    item &&
    item.startYear === currentDaYun.startYear &&
    item.endYear === currentDaYun.endYear;
  const base =
    `${idx + 1}단계 ${item.ganZhi || "-"} (${item.startYear}~${item.endYear}, 나이 ${item.startAge}~${item.endAge})`;
  const phaseText =
    idx <= 1
      ? "기초 체력과 관계 기반을 다지는 구간입니다."
      : idx <= 4
        ? "성장과 확장이 본격화되는 구간으로, 선택의 질이 크게 작동합니다."
        : idx <= 7
          ? "성과를 구조화하고 리스크를 줄이는 운영형 구간입니다."
          : "정리와 전환을 준비하는 구간으로, 속도보다 균형이 중요합니다.";
  if (isCurrent) {
    return `${base} · 현재 구간\n- 현재 대운의 핵심은 '확장보다 안정적 누적'입니다. 큰 결정을 작게 분할해 실행하면 체감 성과가 빨라집니다.`;
  }
  return `${base}\n- ${phaseText}`;
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
    const daYunList = (saju.luckCycle && saju.luckCycle.daYunList) || [];
    const top10 = daYunList.slice(0, 10);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const currentYear = saju.luckCycle && saju.luckCycle.currentYear;
    const counts = (saju.fiveElements && saju.fiveElements.counts) || {};
    const labels = (saju.fiveElements && saju.fiveElements.labels) || {};
    const dominant = labels[saju.fiveElements.dominantElement] || "분석중";
    const weakest = labels[saju.fiveElements.weakestElement] || "분석중";
    const funFacts = getFunFacts(year + month + day + Number(birthHour) + Number(birthMinute));
    const timelineDetail = top10.map((item, idx) => interpretDaYunPhase(idx, item, currentDaYun)).join("\n\n");
    const strategy =
      currentDaYun
        ? "현재 " + currentDaYun.ganZhi + " 구간에서는 장기 프로젝트를 작게 나눠 누적 성과를 만드는 방식이 유리합니다."
        : "현재 구간 계산 중이며, 대운 전환 직전에는 보수적 의사결정을 권장합니다.";
    const yearsLeft =
      currentDaYun && Number.isFinite(currentYear)
        ? Math.max(0, Number(currentDaYun.endYear) - Number(currentYear))
        : null;
    const nextShiftLine =
      yearsLeft === null
        ? "다음 전환 시점은 입력값 기준 계산 중입니다."
        : `다음 전환까지 약 ${yearsLeft}년 남았습니다. 전환 1~2년 전부터는 신규 확장보다 기존 구조 점검 비중을 높이세요.`;
    const report = [
      "10년 대운 종합 해석",
      `${name}님의 현재 대운 흐름은 ${currentDaYun ? currentDaYun.ganZhi : "분석중"} 구간을 중심으로 전개됩니다.`,
      `오행 분포는 목 ${counts.wood || 0}, 화 ${counts.fire || 0}, 토 ${counts.earth || 0}, 금 ${counts.metal || 0}, 수 ${counts.water || 0}이며, 강점 기운은 ${dominant}, 보완 기운은 ${weakest}입니다.`,
      "대운 해석은 한 번의 결론이 아니라, 현재 구간의 실행 방식과 다음 전환 준비를 함께 보는 것이 핵심입니다.",
      "",
      "구간별 상세 흐름",
      timelineDetail,
      "",
      "현재 구간 운영 전략",
      strategy,
      "1) 큰 목표를 90일 단위 실행 단위로 분할하세요.",
      "2) 월 1회 '유지/확장/중단' 점검표로 의사결정 피로를 줄이세요.",
      "3) 관계·재무·건강 중 취약 영역 1개를 정해 먼저 안정화하세요.",
      "",
      "전환기 체크리스트",
      nextShiftLine,
      "전환기에는 신규 시작보다 기존 자산(관계/루틴/현금흐름) 회복 탄성을 키우는 선택이 장기 기대값을 높입니다.",
      "즉시 결론보다 하루 유예 후 재검토하는 규칙이 대운 변동성을 흡수하는 데 도움이 됩니다.",
    ].join("\n");

    return res.status(200).json({
      title: "10년 대운 분석",
      profile: { name, gender, calendarType },
      saju,
      daYunTimeline: top10,
      summary: strategy,
      luckGuide: {
        today: "현재 대운 핵심 키워드 1개를 정해 오늘 실행 1건을 완료하세요.",
        thisWeek: "대운 전환 가능성을 고려해 이번 주는 보수적 결정을 우선하세요.",
        avoid: "장기 계획 없이 단기 성과만 쫓는 선택은 피하세요.",
      },
      funFacts,
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "10년 대운 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
