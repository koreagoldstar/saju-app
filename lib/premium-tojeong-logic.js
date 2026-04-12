const { getSajuFromInput } = require("./saju");

function getFunFacts(seed) {
  const n = Math.abs(Number(seed) || 1);
  return {
    bestDate: (n % 27) + 1,
    bestNumber: (n % 9) + 1,
  };
}

function buildPremiumTojeongResponse(body) {
  const { name, birthDate, birthHour, birthMinute, gender, calendarType } = body || {};
  if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.statusCode = 400;
    throw err;
  }

  const [year, month, day] = birthDate.split("-").map(Number);
  const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
  const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
  const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
  const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
  const funFacts = getFunFacts(year + month + day + Number(birthHour) + Number(birthMinute));

  const daYunLine = currentDaYun
    ? "지금은 인생에서 '" + currentDaYun.ganZhi + "' 국면(" + currentDaYun.startYear + "년~" + currentDaYun.endYear + "년)에 해당합니다."
    : "지금 국면은 계산 중입니다.";

  const report = [
    "2026년 한눈에 보기",
    "",
    "이번 해 기분",
    name + "님은 태어난 날 조합(" + saju.dayPillar + ")을 바탕으로 보면, 2026년에는 좋은 일과 조심할 일이 번갈아 나타날 수 있어요.",
    daYunLine,
    "한 해 전체로는 서두르기보다, 한 번 확인하고 넓히는 식이 잘 맞습니다.",
    "",
    "1~6월 쯤에 이렇게",
    "많이 갖춘 쪽은 " + dominant + ", 부족하기 쉬운 쪽은 " + weak + " 쪽이에요. 상반기에는 속도 내기보다 정리·습관부터 잡는 게 편해요.",
    "새로 해보고 싶은 일은 '작게 시험 → 결과 보고 → 그다음 키우기' 순서가 안전해요.",
    "",
    "7~12월 쯤에 이렇게",
    "하반기에는 사람·돈·일정 결정을 ‘이미 잘 아는 방법’ 위주로 고르면 마음이 덜 흔들려요.",
    "누가 급하게 결정하라고 해도, 하루만 미뤄서 다시 읽어보는 습관이 도움이 됩니다.",
    "",
    "오늘부터 할 수 있는 것",
    "1) 돈 나가는 일·계약은 글자로 다시 읽기 2) 일정은 일주일 단위로만 정리해 보기 3) 화날 때는 그날 결정하지 않기",
  ].join("\n");

  return {
    title: "2026 신토정비결",
    profile: { name, gender, calendarType },
    saju,
    summary: "2026년은 위에서 ‘정리·확인’을 먼저 하고, 여유가 생기면 그때 넓히면 좋아요.",
    luckGuide: {
      today: "아침에 일정·할 일을 10분만 적어 두면 하루가 한결 편해져요.",
      thisWeek: "큰 돈이나 계약은 당일 말고, 하루 뒤에 한 번 더 생각해 보기로 해요.",
      avoid: "기분이 확 올라가거나 가라앉은 순간에 바로 결정하는 건 피하는 게 좋아요.",
    },
    funFacts,
    report,
  };
}

module.exports = {
  buildPremiumTojeongResponse,
};
