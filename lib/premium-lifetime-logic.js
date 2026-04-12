const { getSajuFromInput } = require("./saju");

function getFunFacts(seed) {
  const n = Math.abs(Number(seed) || 1);
  return {
    bestDate: (n % 27) + 1,
    bestNumber: (n % 9) + 1,
  };
}

function buildPremiumLifetimeResponse(body) {
  const { name, birthDate, birthHour, birthMinute, gender, calendarType, recentIssue } = body || {};
  if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.statusCode = 400;
    throw err;
  }

  const [year, month, day] = birthDate.split("-").map(Number);
  const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
  const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
  const currentSeWoon = saju.luckCycle && saju.luckCycle.currentSeWoon;
  const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
  const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
  const funFacts = getFunFacts(year + month + day + Number(birthHour) + Number(birthMinute));

  const issue = String(recentIssue || "").trim();
  const issueLine =
    issue.length > 0
      ? "적어 주신 고민은 「" + issue + "」이에요. 지금은 결론을 급하게 내리기보다 2~4주마다 한 번씩만 돌아보는 식이 마음이 편해요."
      : "최근 고민을 비워 두었어요. 나중에 적어 주시면 그때 맞춰 읽기 쉽게 다시 정리할 수 있어요.";

  const report = [
    "평생 흐름 한눈에",
    name + "님은 태어난 날 조합(" + saju.dayPillar + ")을 바탕으로 보면, 하루하루 일보다 ‘오래 가는 패턴’을 보는 쪽이 맞아요.",
    "지금 보이는 결과가 전부는 아니에요. 인생에서 큰 국면(대운)과 한 해 흐름(세운)이 바뀔 때마다 잘나가는 쪽·조심할 쪽이 조금씩 달라져요.",
    "지금은 " +
      (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "년~" + currentDaYun.endYear + "년)" : "계산 중") +
      " 쯤에 해당해요. 몸과 생활 습관·생활 구조를 다지는 선택이 나중까지 도움이 되는 때예요.",
    "한 번 크게 성공하기보다, 매일·매주 반복할 수 있는 습관을 만드는 쪽이 장기적으로 더 커져요.",
    "",
    "기질과 다섯 가지 기운",
    "목·화·토·금·수는 각각 " +
      saju.fiveElements.counts.wood +
      ", " +
      saju.fiveElements.counts.fire +
      ", " +
      saju.fiveElements.counts.earth +
      ", " +
      saju.fiveElements.counts.metal +
      ", " +
      saju.fiveElements.counts.water +
      "처럼 들어가 있어요.",
    "많이 갖춘 쪽은 " + dominant + ", 부족해 보이는 쪽은 " + weak + "이에요. 많은 쪽은 힘이 세지만 지나치면 고집이 될 수 있고, 부족한 쪽은 습관으로 채울 수 있어요.",
    "예를 들어 일정 적기, 메모, 휴식, 연락 한 번 더 하기 같은 작은 실천이 부족한 기운을 채워 줘요.",
    "올해 흐름(세운)은 " +
      (currentSeWoon ? currentSeWoon.ganZhi + " (" + currentSeWoon.year + "년)" : "계산 중") +
      " 쪽이에요. 당장 속도보다 회복·안정이 먼저일 때가 많고, 이때 습관이 다음 큰 국면 시작을 부드럽게 만들어 줘요.",
    "",
    "최근 고민이 있을 때",
    issueLine,
    "사람 문제면 ‘언제 말할지’와 ‘어떤 톤으로 할지’를 나눠서 생각해 보세요. 돈 문제면 먼저 나가는 돈·위험부터 줄이고, 진로면 작게 시험해 본 뒤 키우는 순서가 안전해요.",
    "‘지금 당장 정답’보다 일정하게 다시 보는 날을 정해 두는 편이 마음이 편해요.",
    "",
    "사람·돈·몸·성장",
    "사람: 감정이 얼마나 센지보다, 서로에게 신뢰가 쌓이는 속도가 중요해요. 큰 싸움은 바로 풀려 하기보다 사실 정리 → 시간 두기 → 다시 이야기 순서가 장기적으로 편해요.",
    "돈: 벌기만큼 ‘새 나가는 구멍’을 막는 게 먼저예요. 고정비·통장·카드를 분기마다 한 번만 봐도 마음이 안정돼요.",
    "몸: 한번 지치면 오래 가는 날이 없도록, 잠·밥 시간만 비슷하게 맞춰도 회복이 빨라져요.",
    "성장: 목표는 크게 잡되, 실행은 작게 쪼개면 부담이 줄어요. 작게 끝낸 것이 쌓이면 큰 국면이 바뀔 때 흔들림이 줄어들어요.",
    "",
    "나중에 다시 볼 때",
    "이건 한 번 보면 끝이 아니라, 계절 바뀔 때·일이 크게 바뀔 때 다시 보면 좋은 지도예요.",
    "이직·결혼·투자·이사·사업처럼 큰 일 앞뒤에는 꼭 한 번 더 읽고 우선순위만 다시 정해 보세요.",
    "추천 루틴: ① 지금 어느 큰 국면인지 확인 ② 다음 바뀌기까지 대략 몇 년인지 보기 ③ 사람·돈·건강 중 하나만 골라 안정시키기 ④ 90일 안에 할 일 세 줄만 적기.",
    "이걸 반복하면 운세가 막연한 말이 아니라, 실제 선택을 돕는 메모가 돼요.",
  ].join("\n");

  return {
    title: "평생 사주 분석",
    profile: { name, gender, calendarType },
    saju,
    luckGuide: {
      today: "하루 10분만 ‘기분 → 한 일 → 결과’ 세 줄로 적어 보세요.",
      thisWeek: "이번 주는 사람·돈·건강 중에서 꼭 챙길 것 하나만 정해 보세요.",
      avoid: "인생 국면이 바뀌는 전후 6개월은 큰 결정만 서두르지 않기로 해요.",
    },
    funFacts,
    report,
  };
}

module.exports = {
  buildPremiumLifetimeResponse,
};
