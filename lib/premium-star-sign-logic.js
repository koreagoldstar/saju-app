const STAR_SIGN_RANGES = [
  { sign: "염소자리", start: 1222, end: 119 },
  { sign: "물병자리", start: 120, end: 218 },
  { sign: "물고기자리", start: 219, end: 320 },
  { sign: "양자리", start: 321, end: 419 },
  { sign: "황소자리", start: 420, end: 520 },
  { sign: "쌍둥이자리", start: 521, end: 621 },
  { sign: "게자리", start: 622, end: 722 },
  { sign: "사자자리", start: 723, end: 822 },
  { sign: "처녀자리", start: 823, end: 922 },
  { sign: "천칭자리", start: 923, end: 1022 },
  { sign: "전갈자리", start: 1023, end: 1121 },
  { sign: "사수자리", start: 1122, end: 1221 },
];

function getStarSign(month, day) {
  const value = month * 100 + day;
  const found = STAR_SIGN_RANGES.find((r) =>
    r.start <= r.end ? value >= r.start && value <= r.end : value >= r.start || value <= r.end
  );
  return found ? found.sign : "별자리";
}

function buildPremiumStarSignResponse(body) {
  const { name, birthDate } = body || {};
  if (!name || !birthDate) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.statusCode = 400;
    throw err;
  }
  const [, month, day] = birthDate.split("-").map(Number);
  const starSign = getStarSign(month, day);

  const summary = starSign + " 오늘: 말은 부드럽게, 할 일은 한 가지씩만.";
  const quickCards = [
    {
      title: "사람·일",
      text: "한 문장씩 짧게 말하면 오해가 줄어요. 먼저 들어 주고, 나중에 내 말하기로 해요.",
    },
    {
      title: "돈",
      text: "새로 사기보다 이번 달 쓸 돈만 대략 적어 보는 날이에요.",
    },
    {
      title: "몸",
      text: "커피 대신 물 한 잔, 스트레칭 3분만 해도 집중이 달라져요.",
    },
  ];
  const report = [
    "별자리 오늘",
    name + "님 생일로 보면 별자리는 " + starSign + "이에요.",
    "오늘은 일이든 사람이든 말투가 결과를 많이 바꿔요. 부드럽게 시작하고, 꼭 할 말만 짧게 전하면 좋아요.",
    "팁: 오늘 꼭 끝낼 일 하나만 정하고, 나머지는 내일로 넘겨도 괜찮아요.",
  ].join("\n");

  return { title: "별자리 운세", starSign, summary, quickCards, report };
}

module.exports = {
  buildPremiumStarSignResponse,
  getStarSign,
};
