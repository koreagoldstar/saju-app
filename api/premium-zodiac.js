const ZODIAC = [
  "쥐",
  "소",
  "호랑이",
  "토끼",
  "용",
  "뱀",
  "말",
  "양",
  "원숭이",
  "닭",
  "개",
  "돼지",
];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, birthDate } = req.body || {};
    if (!name || !birthDate) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }
    const [year] = birthDate.split("-").map(Number);
    const zodiac = ZODIAC[((year - 4) % 12 + 12) % 12];

    const moodMap = {
      쥐: "기획운 상승",
      소: "안정운 상승",
      호랑이: "도전운 상승",
      토끼: "관계운 상승",
      용: "성과운 상승",
      뱀: "집중운 상승",
      말: "행동운 상승",
      양: "회복운 상승",
      원숭이: "아이디어운 상승",
      닭: "정리운 상승",
      개: "신뢰운 상승",
      돼지: "재충전운 상승",
    };

    const summary = zodiac + "띠 오늘의 포인트: " + (moodMap[zodiac] || "균형운");
    const report = [
      zodiac + "띠 운세",
      name + "님은 " + zodiac + "띠 흐름에서 오늘 " + (moodMap[zodiac] || "균형운") + "이 강합니다.",
      "사람을 대할 때는 속도보다 신뢰를 먼저 쌓고, 금전/일정은 보수적으로 점검하면 안정감이 커집니다.",
      "짧은 조언: 중요한 선택 전 10분만 멈춰 체크리스트를 확인하세요.",
    ].join("\n");

    return res.status(200).json({ title: "띠 운세", zodiac, summary, report });
  } catch (error) {
    return res.status(500).json({ message: "띠 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
