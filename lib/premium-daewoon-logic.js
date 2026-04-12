const { getSajuFromInput } = require("./saju");

function getFunFacts(seed) {
  const n = Math.abs(Number(seed) || 1);
  return {
    bestDate: (n % 27) + 1,
    bestNumber: (n % 9) + 1,
  };
}

function sortDaYunByAge(list) {
  return [...(list || [])].sort((a, b) => {
    const aAge = Number(a && a.startAge);
    const bAge = Number(b && b.startAge);
    return aAge - bAge;
  });
}

function interpretDaYunPhase(idx, item, currentDaYun) {
  const isCurrent =
    currentDaYun &&
    item &&
    item.startYear === currentDaYun.startYear &&
    item.endYear === currentDaYun.endYear;
  const base =
    (idx + 1) +
    "번째 " +
    (item.ganZhi || "-") +
    " · " +
    item.startYear +
    "~" +
    item.endYear +
    "년 · 나이 " +
    item.startAge +
    "~" +
    item.endAge +
    "세";
  const phaseText =
    idx <= 1
      ? "몸과 관계 기반을 다지는 때예요."
      : idx <= 4
        ? "성장·도전이 본격적으로 느껴질 수 있어요. 선택을 작게 나누면 편해요."
        : idx <= 7
          ? "성과를 정리하고 리스크를 줄이는 쪽이 잘 맞는 때예요."
          : "정리하고 넘길 준비를 하는 때예요. 서두르기보다 균형이 중요해요.";
  if (isCurrent) {
    return (
      base +
      " · 지금 이 구간\n- 한 번에 크게보다 조금씩 쌓는 방식이 체감이 빨라요."
    );
  }
  return base + "\n- " + phaseText;
}

function buildPremiumDaewoonResponse(body) {
  const { name, birthDate, birthHour, birthMinute, gender, calendarType } = body || {};
  if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.statusCode = 400;
    throw err;
  }

  const [year, month, day] = birthDate.split("-").map(Number);
  const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
  const daYunList = (saju.luckCycle && saju.luckCycle.daYunList) || [];
  const top10 = sortDaYunByAge(daYunList).slice(0, 10);
  const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
  const currentYear = saju.luckCycle && saju.luckCycle.currentYear;
  const counts = (saju.fiveElements && saju.fiveElements.counts) || {};
  const labels = (saju.fiveElements && saju.fiveElements.labels) || {};
  const dominant = labels[saju.fiveElements.dominantElement] || "계산 중";
  const weakest = labels[saju.fiveElements.weakestElement] || "계산 중";
  const funFacts = getFunFacts(year + month + day + Number(birthHour) + Number(birthMinute));
  const timelineDetail = top10.map((item, idx) => interpretDaYunPhase(idx, item, currentDaYun)).join("\n\n");
  const strategy = currentDaYun
    ? "지금 " + currentDaYun.ganZhi + " 구간에서는 긴 일을 작게 쪼개서 쌓아 가는 방식이 잘 맞아요."
    : "지금 구간을 계산 중이에요. 국면이 바뀌기 직전에는 무리한 결정은 잠깐 미루는 편이 안전해요.";
  const yearsLeft =
    currentDaYun && Number.isFinite(currentYear)
      ? Math.max(0, Number(currentDaYun.endYear) - Number(currentYear))
      : null;
  const nextShiftLine =
    yearsLeft === null
      ? "다음에 언제 바뀌는지는 입력을 다시 보면 계산돼요."
      : "이번 큰 국면이 끝나기까지 대략 " + yearsLeft + "년 정도로 보면 돼요. 바뀌기 1~2년 전부터는 새로 크게 시작하기보다 지금 생활을 점검하는 비중을 높여 보세요.";

  const report = [
    "10년 단위 흐름 (쉽게 보기)",
    name + "님은 지금 " + (currentDaYun ? currentDaYun.ganZhi : "계산 중") + " 큰 국면에 있어요.",
    "다섯 가지 기운은 목 " +
      (counts.wood || 0) +
      ", 화 " +
      (counts.fire || 0) +
      ", 토 " +
      (counts.earth || 0) +
      ", 금 " +
      (counts.metal || 0) +
      ", 수 " +
      (counts.water || 0) +
      "예요. 많이 나온 쪽은 " +
      dominant +
      ", 상대적으로 적게 느껴지는 쪽은 " +
      weakest +
      "이에요.",
    "한 번에 결론 내리기보다, ‘지금 구간에서 어떻게 살지’와 ‘다음 바뀔 때 준비’를 같이 보는 게 핵심이에요.",
    "",
    "구간마다 어떤 느낌인지",
    timelineDetail,
    "",
    "지금 구간에서 이렇게",
    strategy,
    "1) 큰 목표를 90일 단위로만 잘라 보기",
    "2) 한 달에 한 번, ‘유지 / 키우기 / 그만두기’만 체크하기",
    "3) 사람·돈·건강 중에서 가장 흔들리는 것 하나만 먼저 잡기",
    "",
    "국면이 바뀔 때",
    nextShiftLine,
    "바뀌는 시기에는 새 출발보다 이미 가진 것(관계, 습관, 통장 흐름)을 회복하는 선택이 나중까지 편해요.",
    "당장 결정하기 어려우면 하루만 미뤄서 다시 읽는 규칙 하나만 만들어도 도움이 돼요.",
  ].join("\n");

  return {
    title: "10년 대운 분석",
    profile: { name, gender, calendarType },
    saju,
    daYunTimeline: top10,
    summary: strategy,
    luckGuide: {
      today: "지금 국면에서 꼭 지키고 싶은 말 한 마디만 정해 보세요. 오늘 그걸 한 번 실천해 보기로 해요.",
      thisWeek: "이번 주는 새로 시작보다, 이미 하던 일을 한 가지만 끝맺는 쪽이 편해요.",
      avoid: "오래 가는 계획 없이 당장 성과만 쫓는 선택은 잠깐 미뤄 보세요.",
    },
    funFacts,
    report,
  };
}

module.exports = {
  buildPremiumDaewoonResponse,
};
