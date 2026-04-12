const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

const MOOD = {
  쥐: "머리로 정리하기 좋은 날",
  소: "천천히 밀고 가기 좋은 날",
  호랑이: "새로 도전해 보기 좋은 날",
  토끼: "사람과 대화하기 좋은 날",
  용: "결과 내보이기 좋은 날",
  뱀: "한 가지에 몰입하기 좋은 날",
  말: "움직이고 연락하기 좋은 날",
  양: "쉬고 회복하기 좋은 날",
  원숭이: "아이디어 내기 좋은 날",
  닭: "정리·마무리하기 좋은 날",
  개: "약속 지키기·신뢰 쌓기 좋은 날",
  돼지: "배 채우고 기운 돌리기 좋은 날",
};

function buildPremiumZodiacResponse(body) {
  const { name, birthDate } = body || {};
  if (!name || !birthDate) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.statusCode = 400;
    throw err;
  }
  const [y] = birthDate.split("-").map(Number);
  const zodiac = ZODIAC[((y - 4) % 12 + 12) % 12];
  const mood = MOOD[zodiac] || "무난하게 흘러가기 좋은 날";

  const summary = zodiac + "띠 오늘: " + mood;
  const quickCards = [
    {
      title: "사람·일",
      text: "말은 천천히 해도 괜찮아요. 짧게 한 번 더 확인하면 작은 오해가 줄어들어요.",
    },
    {
      title: "돈",
      text: "큰 결정보다 구독·고정비만 한번 보면 마음이 가벼워져요.",
    },
    {
      title: "몸",
      text: "밥 시간과 잠 시간만 비슷하게 맞춰도 컨디션이 달라져요.",
    },
  ];
  const report = [
    zodiac + "띠 오늘",
    name + "님은 " + zodiac + "띠 흐름에서 오늘은 「" + mood + "」에 가깝게 느껴지기 쉬워요.",
    "사람을 만날 때는 서두르기보다 말 한마디만 더듬어 보면 좋아요. 돈·일정은 급하지 않게 점검하는 편이 편해요.",
    "짧은 팁: 중요한 선택 전에 10분만 자리에서 일어나서 할 일 세 가지만 적어 보세요.",
  ].join("\n");

  return { title: "띠 운세", zodiac, summary, quickCards, report };
}

module.exports = {
  buildPremiumZodiacResponse,
};
