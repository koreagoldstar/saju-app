const { getSajuFromInput, getFortuneTomorrowContext, getElementFromGan } = require("./saju");

const CONTROLS = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const ORDER = ["wood", "fire", "earth", "metal", "water"];

function idx(el) {
  return ORDER.indexOf(el);
}

/** 일간 오행 기준: 내일 ‘그날 맨 앞 글자’ 오행과의 관계 */
function getDayGanRelation(userGanEl, tomorrowGanEl) {
  if (userGanEl === tomorrowGanEl) return "peer";
  const motherOf = (e) => ORDER[(idx(e) + 4) % 5];
  const childOf = (e) => ORDER[(idx(e) + 1) % 5];
  if (tomorrowGanEl === motherOf(userGanEl)) return "input";
  if (tomorrowGanEl === childOf(userGanEl)) return "output";
  if (CONTROLS[userGanEl] === tomorrowGanEl) return "wealth";
  if (CONTROLS[tomorrowGanEl] === userGanEl) return "pressure";
  return "neutral";
}

function hashSeed(parts) {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function formatKoreanSlashDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return y + "년 " + m + "월 " + d + "일";
}

function pickVariant(relation, seed) {
  const pools = {
    peer: [
      { keyword: "속도 조절", summary: "익숙한 패턴이 통하기 쉬운 날이에요. 급하게 바꾸기보다 우선순위만 정리해 보세요." },
      { keyword: "한 번 점검", summary: "복잡한 건 잠깐 내려두고, 꼭 해야 할 것만 골라도 충분한 날이에요." },
    ],
    input: [
      { keyword: "배우기·쉬기", summary: "남의 말·자료에서 도움 받기 좋은 날이에요. 혼자 끙끙보다 물어보는 게 빠를 수 있어요." },
      { keyword: "몸 챙기기", summary: "무리한 확장보다 잠·식사부터 챙기면 이후 일이 수월해져요." },
    ],
    output: [
      { keyword: "말하기·움직이기", summary: "연락·말하기·시작하기에 좋은 날이에요. 핵심만 짧게 말하면 더 좋아요." },
      { keyword: "실행", summary: "작은 실행이라도 해보면 속이 후련해지기 쉬운 날이에요." },
    ],
    wealth: [
      { keyword: "정리·맺기", summary: "끝맺기·협상·정리에서 손맛이 나기 쉬운 날이에요. 약속은 문자로 남겨 두면 안전해요." },
      { keyword: "덜어내기", summary: "안 쓰는 것·미룬 일부터 치우면 마음이 가벼워져요." },
    ],
    pressure: [
      { keyword: "천천히", summary: "일정이 몰리거나 기준이 빡빡하게 느껴질 수 있어요. 여유 한 칸만 비워 두세요." },
      { keyword: "한 번 더 확인", summary: "서두르면 실수하기 쉬운 날이에요. 확인만 한 번 더하면 편해져요." },
    ],
    neutral: [{ keyword: "무난함", summary: "크게 들쑥날쑥하지 않고 평소처럼 흘러가기 쉬운 날이에요." }],
  };
  const list = pools[relation] || pools.neutral;
  return list[seed % list.length];
}

function buildQuickCards(relation, seed) {
  const rotate = (arr) => arr[seed % arr.length];

  const base = {
    peer: {
      relation: [
        "비슷한 톤으로 대화가 잘 맞는 날이에요. 고집만 조금만 줄이면 더 부드러워져요.",
        "익숙한 방식이 통해요. 새 시도보다 약속·관계를 다듬는 쪽이 편해요.",
      ],
      wealth: [
        "돈 나갈 때는 ‘정말 필요한지’ 한 번만 더 생각해 보세요.",
        "작은 지출이 모일 수 있어요. 영수증·구독만 잠깐 보면 도움이 돼요.",
      ],
      health: [
        "몸 상태는 보통이에요. 잠만 제대로 자도 커피·야식이 줄어들어요.",
        "가볍게 몸만 풀어 줘도 긴장이 풀려요.",
      ],
    },
    input: {
      relation: [
        "조언이나 도움을 받기 좋은 날이에요. 혼자보다 한 번 물어보는 게 빠를 수 있어요.",
        "상대 이야기에서 힌트를 얻기 쉬워요. 끝까지 들어 주는 게 도움이 돼요.",
      ],
      wealth: [
        "배우거나 고치는 데 쓰는 돈은 나중에 이득으로 돌아오기 쉬워요.",
        "급하게 사기보다 ‘필요한 것 목록’부터 적어 보세요.",
      ],
      health: [
        "쉬는 게 먼저예요. 잠을 챙기면 컨디션이 확 달라져요.",
        "따뜻한 밥·물만 챙겨도 몸이 편해져요.",
      ],
    },
    output: {
      relation: [
        "말이 잘 나오는 날이에요. 먼저 요지만 말하고 설명은 짧게 하면 더 좋아요.",
        "연락·제안이 통하기 쉬워요. 말이 많아질수록 ‘한 줄 요약’을 잊지 마세요.",
      ],
      wealth: [
        "아이디어가 돈과 연결되기 쉬운 날이에요. 작은 제안이라도 내보세요.",
        "할 수 있는 것 하나만 먼저 해도 수입·절약 둘 다 잡기 쉬워요.",
      ],
      health: [
        "움직임이 많아질 수 있어요. 술·과식만 조심하면 에너지는 좋게 쓰기 좋아요.",
        "목·어깨가 뻐근하면 5분만 스트레칭해 보세요.",
      ],
    },
    wealth: {
      relation: [
        "마무리·협상에서 진전이 나기 쉬운 날이에요. 약속은 문자로 남겨 두면 안전해요.",
        "실속 있는 약속을 잡기 좋아요. 말보다 조건·날짜를 먼저 맞추면 좋아요.",
      ],
      wealth: [
        "들어오고 나가는 돈이 눈에 잘 보이는 날이에요. 통장·카드만 한번 봐도 도움이 돼요.",
        "충동 소비보다 이번 주 고정 지출만 확인해도 마음이 편해져요.",
      ],
      health: [
        "소화에 부담이 갈 수 있어요. 밥 시간을 비슷하게 맞추면 좋아요.",
        "굶는 것보다 단백질·채소 비율만 조금 올려 보세요.",
      ],
    },
    pressure: {
      relation: [
        "일정이나 규칙 때문에 부담이 느껴질 수 있어요. ‘안 돼요’ 한마디로 선을 그어도 괜찮아요.",
        "기준이 빡빡하게 느껴지는 날이에요. 감정부터 말하기보다 사실·기한부터 정리해 보세요.",
      ],
      wealth: [
        "큰 돈·계약은 하루만 미뤄도 후회가 줄어들어요.",
        "할부·구독은 금액과 해지만 보면 마음이 가벼워져요.",
      ],
      health: [
        "긴장이 몸으로 올 수 있어요. 카페인·야근만 줄여도 회복이 빨라져요.",
        "짧게 걷기만 해도 숙면에 도움이 돼요.",
      ],
    },
    neutral: {
      relation: ["사람들과 크게 부딪히지 않고 지나가기 쉬운 날이에요."],
      wealth: ["지출은 평소처럼만 관리해도 충분해요."],
      health: ["몸 상태는 보통이에요. 잠만 지키면 돼요."],
    },
  };

  const pack = base[relation] || base.neutral;
  return [
    { title: "사람·일", text: rotate(pack.relation) },
    { title: "돈", text: rotate(pack.wealth) },
    { title: "몸", text: rotate(pack.health) },
  ];
}

function buildReport({ name, saju, tomorrowCtx, relation, variant, labels }) {
  const dom = labels[saju.fiveElements.dominantElement];
  const weak = labels[saju.fiveElements.weakestElement];
  const userElKo = labels[getElementFromGan(saju.dayMaster)];
  const tomElKo = labels[getElementFromGan(tomorrowCtx.tomorrowGan)];
  const dateLine = formatKoreanSlashDate(tomorrowCtx.fortuneTomorrowKey);
  const relationHint = {
    peer:
      "내일 하루의 기운이 당신 태어난 날 쪽(" +
      userElKo +
      ")과 비슷하게 이어져요. 익숙한 방식이 잘 맞는 날이에요.",
    input:
      "내일은 당신에게 ‘숨 고르고 채워 넣기’ 좋은 날이에요. (내일 날의 기운: " +
      tomElKo +
      ")",
    output:
      "내일은 말하기·움직이기·시작하기에 에너지가 잘 붙는 날이에요. (내일 날의 기운: " +
      tomElKo +
      ")",
    wealth:
      "내일은 정리·협상·실속 있는 일에서 손맛이 나기 쉬운 날이에요. (내일 날의 기운: " +
      tomElKo +
      ")",
    pressure:
      "내일은 밀리는 일이나 기준이 부담으로 느껴질 수 있어요. 여유를 조금 남겨 두세요. (내일 날의 기운: " +
      tomElKo +
      ")",
    neutral: "내일은 무난하게 흘러가기 쉬운 날이에요.",
  }[relation];

  return [
    "내일 운세 (한국 시간 기준)",
    "언제 하루인가요? → " + dateLine,
    "그날 이른바 ‘일진’: " + tomorrowCtx.tomorrowDayPillar + " (그날 하루의 기운을 한 글자로 요약한 말이에요)",
    "",
    name +
      "님은 태어난 날 맨 앞 글자가 " +
      saju.dayMaster +
      "(" +
      userElKo +
      " 쪽 기운)이에요. 내일 그날 맨 앞 글자는 " +
      tomorrowCtx.tomorrowGan +
      "(" +
      tomElKo +
      " 쪽 기운)이에요.",
    relationHint,
    "전체적으로 많이 갖춘 쪽은 " + dom + ", 부족하기 쉬운 쪽은 " + weak + "이에요. 한 번에 다 하려 하지 말고, 중요한 것 1~2개만 골라도 충분해요.",
    "",
    "오늘의 키워드: " + variant.keyword,
    "",
    "바로 해볼 수 있는 것",
    "1) 오전: 꼭 해야 할 일·연락 하나만 먼저",
    "2) 오후: 말·문자에서 오해 나올 만한 표현 줄이기",
    "3) 저녁: 내일모레 일정 세 줄만 적어 두기",
  ].join("\n");
}

/**
 * @param {{ name: string, birthDate: string, birthHour: number, birthMinute: number, gender: string, calendarType: string }} body
 */
function buildPremiumTomorrowResponse(body) {
  const { name, birthDate, birthHour, birthMinute, gender, calendarType } = body || {};
  if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.statusCode = 400;
    throw err;
  }

  const [year, month, day] = birthDate.split("-").map(Number);
  const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
  const tomorrowCtx = getFortuneTomorrowContext();
  const userGanEl = getElementFromGan(saju.dayMaster);
  const tomorrowGanEl = getElementFromGan(tomorrowCtx.tomorrowGan);
  const relation = getDayGanRelation(userGanEl, tomorrowGanEl);
  const seed = hashSeed([
    tomorrowCtx.fortuneTomorrowKey,
    tomorrowCtx.tomorrowDayPillar,
    saju.dayMaster,
    relation,
  ]);
  const variant = pickVariant(relation, seed);
  const quickCards = buildQuickCards(relation, seed);
  const labels = saju.fiveElements.labels;
  const summary =
    formatKoreanSlashDate(tomorrowCtx.fortuneTomorrowKey) +
    " · 일진 " +
    tomorrowCtx.tomorrowDayPillar +
    " — " +
    variant.summary;

  const report = buildReport({
    name,
    saju,
    tomorrowCtx,
    relation,
    variant,
    labels,
  });

  return {
    title: "내일의 운세",
    profile: { name, gender, calendarType },
    summary,
    quickCards,
    saju,
    report,
    fortuneTomorrowKey: tomorrowCtx.fortuneTomorrowKey,
    tomorrowDayPillar: tomorrowCtx.tomorrowDayPillar,
  };
}

module.exports = {
  buildPremiumTomorrowResponse,
};
