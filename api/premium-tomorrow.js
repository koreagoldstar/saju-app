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
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
    const tomorrowFocus = dominant === "화" || dominant === "목" ? "행동" : "정리";
    const quickCards = [
      {
        title: "관계",
        text: tomorrowFocus === "행동"
          ? "대화는 먼저 공감 한마디를 건네고, 핵심 요청은 짧게 전달하면 분위기가 부드럽게 풀립니다."
          : "서두르지 말고 상대의 말 맥락을 끝까지 듣는 태도가 신뢰를 크게 높입니다.",
      },
      {
        title: "재물",
        text: "충동 지출보다 필요한 항목 1~2개만 우선 처리하면 금전 흐름이 안정적으로 유지됩니다.",
      },
      {
        title: "건강",
        text: "과로 신호가 보이면 수면 시간을 30분만 늘려도 컨디션 회복 속도가 확연히 빨라집니다.",
      },
    ];

    const report = [
      "내일의 운세 핵심",
      name + "님의 내일 키워드는 '" + tomorrowFocus + "' 입니다.",
      "강한 기운은 " + dominant + ", 보완 기운은 " + weak + "이므로 과한 확장보다 우선순위 1~2개에 집중하는 편이 유리합니다.",
      "",
      "간단 실천 가이드",
      "1) 오전: 가장 중요한 결정 1건 처리",
      "2) 오후: 대화/연락에서 오해 소지 문장 줄이기",
      "3) 저녁: 다음 날 일정 3줄 정리",
    ].join("\n");

    return res.status(200).json({
      title: "내일의 운세",
      profile: { name, gender, calendarType },
      summary: "내일은 " + tomorrowFocus + " 중심 운영이 좋습니다.",
      quickCards,
      saju,
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "내일의 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
