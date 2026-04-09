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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, birthDate } = req.body || {};
    if (!name || !birthDate) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }
    const [, month, day] = birthDate.split("-").map(Number);
    const starSign = getStarSign(month, day);

    const summary = starSign + " 오늘의 포인트: 감정 표현은 부드럽게, 선택은 명확하게.";
    const quickCards = [
      {
        title: "관계",
        text: "문장을 짧게 나누어 말하면 전달력이 좋아지고, 상대의 방어감이 낮아져 대화가 편해집니다.",
      },
      {
        title: "재물",
        text: "새로운 소비보다 기존 계획을 유지하는 편이 유리합니다. 작은 절약이 오늘은 크게 작동합니다.",
      },
      {
        title: "건강",
        text: "과한 카페인보다 수분 보충과 짧은 스트레칭이 집중력 회복에 더 효과적입니다.",
      },
    ];
    const report = [
      "별자리 운세",
      name + "님의 별자리는 " + starSign + " 입니다.",
      "오늘은 관계와 일 모두에서 말의 톤이 결과를 좌우합니다. 부드럽게 시작하고 핵심은 짧게 전달하세요.",
      "짧은 조언: 우선순위 1개만 확실히 끝내면 나머지는 자연스럽게 풀립니다.",
    ].join("\n");

    return res.status(200).json({ title: "별자리 운세", starSign, summary, quickCards, report });
  } catch (error) {
    return res.status(500).json({ message: "별자리 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
