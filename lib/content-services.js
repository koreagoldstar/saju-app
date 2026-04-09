const fs = require("fs");
const path = require("path");
const { getSajuFromInput } = require("./saju");

function readJson(relativePath) {
  const fullPath = path.join(__dirname, "..", relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

const DEFAULT_DREAM_DATASET = {
  entries: [],
  defaultResult: {
    interpretation: "관련 데이터가 아직 준비되지 않았습니다.",
    advice: "키워드를 조금 더 구체적으로 입력해 주세요.",
  },
};
const DEFAULT_TAROT_DATASET = {
  majorArcana: [],
  minorArcana: { suits: [], ranks: [] },
};

let dreamDatasetCache = null;
let tarotDatasetCache = null;

function getDreamDataset() {
  if (dreamDatasetCache) return dreamDatasetCache;
  try {
    dreamDatasetCache = readJson("data/dream-dataset.json");
  } catch (error) {
    dreamDatasetCache = DEFAULT_DREAM_DATASET;
  }
  return dreamDatasetCache;
}

function getTarotDataset() {
  if (tarotDatasetCache) return tarotDatasetCache;
  try {
    tarotDatasetCache = readJson("data/tarot-dataset.json");
  } catch (error) {
    tarotDatasetCache = DEFAULT_TAROT_DATASET;
  }
  return tarotDatasetCache;
}

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

function searchDreamByKeyword(keyword) {
  const dreamDataset = getDreamDataset();
  const q = normalizeText(keyword);
  if (!q) {
    return {
      matched: false,
      keyword: "",
      interpretation: dreamDataset.defaultResult.interpretation,
      advice: dreamDataset.defaultResult.advice,
    };
  }

  const found = dreamDataset.entries.find((entry) => {
    if (normalizeText(entry.keyword).includes(q) || q.includes(normalizeText(entry.keyword))) {
      return true;
    }
    return (entry.tags || []).some((tag) => normalizeText(tag).includes(q) || q.includes(normalizeText(tag)));
  });

  if (!found) {
    return {
      matched: false,
      keyword: q,
      interpretation: dreamDataset.defaultResult.interpretation,
      advice: dreamDataset.defaultResult.advice,
    };
  }

  return {
    matched: true,
    keyword: found.keyword,
    interpretation: found.interpretation,
    advice: found.advice,
    tags: found.tags || [],
  };
}

function buildTarotCards() {
  const tarotDataset = getTarotDataset();
  const majors = tarotDataset.majorArcana.map((card) => ({
    id: card.id,
    type: "major",
    name: card.name,
    nameKo: card.nameKo,
    keywords: card.keywords,
    image: card.image,
  }));

  const minors = [];
  tarotDataset.minorArcana.suits.forEach((suit) => {
    tarotDataset.minorArcana.ranks.forEach((rank) => {
      minors.push({
        id: `${suit.key}_${rank.key}`,
        type: "minor",
        suit: suit.key,
        suitKo: suit.nameKo,
        rank: rank.key,
        rankKo: rank.nameKo,
        element: suit.element,
        name: `${rank.nameKo} of ${suit.nameKo}`,
        nameKo: `${suit.nameKo} ${rank.nameKo}`,
        keywords: rank.keywords,
        image: suit.image,
      });
    });
  });

  return [...majors, ...minors];
}

function drawRandomTarotCards(count = 3) {
  const cards = buildTarotCards();
  const pool = [...cards];
  const picks = [];
  const size = Math.min(Math.max(Number(count) || 3, 1), 5);

  for (let i = 0; i < size; i += 1) {
    if (!pool.length) break;
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }

  const summary = picks
    .map((card, idx) => `${idx + 1}번 카드 ${card.nameKo}: ${card.keywords.join(", ")}`)
    .join("\n");

  return {
    totalDeckCount: cards.length,
    cards: picks,
    summary,
  };
}

function elementDiff(me, partner) {
  return {
    wood: (me.wood || 0) - (partner.wood || 0),
    fire: (me.fire || 0) - (partner.fire || 0),
    earth: (me.earth || 0) - (partner.earth || 0),
    metal: (me.metal || 0) - (partner.metal || 0),
    water: (me.water || 0) - (partner.water || 0),
  };
}

const ELEMENT_KO = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};
const RELATION_TYPE_LABELS = {
  dating: "연애",
  married: "부부",
  some: "썸",
  reunion: "재회",
};

function normalizeRelationType(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "married" || v === "some" || v === "reunion") return v;
  return "dating";
}

function toElementGapText(collisions) {
  if (!collisions.length) return "큰 편차 없음";
  return collisions
    .map((c) => `${ELEMENT_KO[c.element] || c.element}(${c.gap > 0 ? "+" : ""}${c.gap})`)
    .join(", ");
}

function buildCompatibilityResult(payload) {
  const relationType = normalizeRelationType(payload.relationType);
  const relationTypeLabel = RELATION_TYPE_LABELS[relationType];
  const me = getSajuFromInput(
    payload.meYear,
    payload.meMonth,
    payload.meDay,
    payload.meHour,
    payload.meMinute,
    payload.meCalendarType === "lunar",
    payload.meGender
  );
  const partner = getSajuFromInput(
    payload.partnerYear,
    payload.partnerMonth,
    payload.partnerDay,
    payload.partnerHour,
    payload.partnerMinute,
    payload.partnerCalendarType === "lunar",
    payload.partnerGender
  );

  const myCounts = me.fiveElements.counts;
  const partnerCounts = partner.fiveElements.counts;
  const diff = elementDiff(myCounts, partnerCounts);
  const collisions = Object.keys(diff)
    .filter((key) => Math.abs(diff[key]) >= 2)
    .map((key) => ({ element: key, gap: diff[key] }));

  const scoreBase = 100 - collisions.length * 12;
  const score = Math.max(45, Math.min(95, scoreBase));
  const toneByMode = {
    dating:
      score >= 86
        ? "연애 모드에서는 서로의 설렘을 오래 유지할 수 있는 정서적 합이 좋게 보입니다."
        : score >= 72
          ? "연애 모드에서는 끌림이 분명하며, 표현 밀도를 맞출수록 관계 만족도가 빠르게 올라갑니다."
          : "연애 모드에서는 감정 온도차가 있어 템포 조율이 중요하지만, 솔직한 대화가 깊이를 만듭니다.",
    married:
      score >= 86
        ? "부부 모드에서는 생활 리듬과 정서 회복 패턴이 잘 맞아 장기 안정성이 높은 궁합입니다."
        : score >= 72
          ? "부부 모드에서는 현실 운영 능력과 정서적 배려가 균형을 이루면 매우 단단해지는 궁합입니다."
          : "부부 모드에서는 생활 습관 차이가 피로를 만들 수 있으니, 가사/시간 규칙을 명확히 나누는 것이 핵심입니다.",
    some:
      score >= 86
        ? "썸 모드에서는 서로의 호감 신호를 자연스럽게 읽어내는 힘이 강한 편입니다."
        : score >= 72
          ? "썸 모드에서는 호감은 충분하지만 확인 불안이 생기기 쉬워, 명확한 표현이 관계 전환을 돕습니다."
          : "썸 모드에서는 기대치 차이가 커질 수 있으니, 관계 정의를 서두르기보다 대화 빈도를 안정화해 보세요.",
    reunion:
      score >= 86
        ? "재회 모드에서는 과거의 상처를 복구할 정서적 체력이 비교적 충분한 궁합입니다."
        : score >= 72
          ? "재회 모드에서는 다시 이어질 가능성이 있지만, 같은 패턴 반복 방지를 위한 합의가 필수입니다."
          : "재회 모드에서는 감정은 남아 있어도 충돌 패턴이 재현되기 쉬우니, 재시작 전 규칙 설정이 우선입니다.",
  };

  const resonanceByMode = {
    dating:
      collisions.length === 0
        ? "설렘-안정의 리듬이 잘 맞아 자연스럽게 친밀도가 올라갑니다."
        : "서로 다른 매력이 뚜렷해 관계의 밀도를 높일 재료가 충분합니다.",
    married:
      collisions.length === 0
        ? "일상 운영의 합이 좋아 작은 갈등이 커지기 전에 회복됩니다."
        : "역할 분담을 명확히 하면 차이가 오히려 생활의 효율을 높여줍니다.",
    some:
      collisions.length === 0
        ? "대화 템포가 맞아 호감 확인 과정이 부드럽게 진행됩니다."
        : "다른 성향 덕분에 신선함이 크며, 질문의 질이 좋아질수록 급속히 가까워집니다.",
    reunion:
      collisions.length === 0
        ? "과거보다 감정 소통의 안정성이 높아진 흐름이 보입니다."
        : "예전과 다른 방식으로 갈등을 다루면, 관계를 더 성숙하게 재구성할 수 있습니다.",
  };

  const cautionByMode = {
    dating:
      collisions.length === 0
        ? "좋은 흐름일수록 표현이 습관화되어 무뎌질 수 있으니, 감정 언어를 자주 바꿔 주세요."
        : `${toElementGapText(collisions)} 구간에서 오해가 생기기 쉬우니, 연락 템포와 기대치를 먼저 맞추세요.`,
    married:
      collisions.length === 0
        ? "안정기에는 대화가 실무형으로만 흐를 수 있으니, 정서 대화 시간을 따로 확보해 주세요."
        : `${toElementGapText(collisions)} 편차가 반복 갈등 포인트가 될 수 있으니, 생활 규칙을 문장으로 합의해 두세요.`,
    some:
      collisions.length === 0
        ? "확신이 느껴져도 속도를 너무 빠르게 올리면 부담이 생길 수 있어 단계 조절이 필요합니다."
        : `${toElementGapText(collisions)} 차이로 신호 해석이 엇갈릴 수 있으니, 추측보다 확인 질문을 사용하세요.`,
    reunion:
      collisions.length === 0
        ? "감정 회복이 빠른 편이지만 과거 이슈를 덮으면 같은 지점에서 다시 흔들릴 수 있습니다."
        : `${toElementGapText(collisions)} 차이가 과거 패턴을 자극할 수 있어, 재시작 조건을 먼저 정하는 것이 안전합니다.`,
  };

  const ritualByMode = {
    dating: "주 1회 '감정 체크인' 15분: 이번 주 좋았던 순간 1개 + 서운했던 순간 1개를 교환하세요.",
    married: "주 1회 '생활-감정 회의' 20분: 일정/가사 10분 + 감정 공유 10분으로 나누어 진행하세요.",
    some: "주 2회 짧은 안부 루틴을 고정하고, 주말 1회는 깊이 대화(30분)로 신뢰를 쌓아보세요.",
    reunion: "재회 초기 4주 동안은 갈등 발생 시 24시간 유예 후 대화 재개 규칙을 반드시 적용하세요.",
  };

  const guideByMode = {
    dating: ["1) 감정 표현: '고마움/서운함'을 같은 비중으로 말하기", "2) 속도 조율: 연락 빈도 기대치 먼저 맞추기", "3) 작은 약속: 주 1회 반드시 지킬 약속 1개 합의"],
    married: ["1) 역할 명확화: 가사/재무/시간 책임을 문장으로 분리", "2) 정서 확인: 해결보다 공감 문장을 먼저 사용", "3) 분기 점검: 3개월마다 생활 규칙 재조정"],
    some: ["1) 신호 확인: 추측 대신 직접 질문하기", "2) 관계 정의: 부담 없는 범위부터 단계적 합의", "3) 감정 안전: 불안할수록 연락 압박 대신 상황 공유"],
    reunion: ["1) 과거 정리: 재회 전에 반복 갈등 1가지 명확화", "2) 재시작 규칙: 싸움 시 중단-재개 시간 합의", "3) 신뢰 복구: 말보다 행동 약속을 작게 반복"],
  };
  const goodPhrasesByMode = {
    dating: ["너랑 있으면 마음이 편해져.", "네 생각을 들으면 내가 정리돼.", "오늘도 내 편이 되어줘서 고마워."],
    married: ["당신이 해준 덕분에 오늘이 수월했어.", "우리 팀으로 잘 버티고 있는 것 같아.", "당신 마음 먼저 듣고 싶어."],
    some: ["네 페이스를 존중하고 싶어.", "오늘 대화가 진짜 반가웠어.", "부담 주지 않는 선에서 더 알아가고 싶어."],
    reunion: ["이번엔 예전과 다르게 잘 듣고 싶어.", "그때 미처 못한 사과를 제대로 하고 싶어.", "다시 시작한다면 천천히 맞춰가고 싶어."],
  };
  const avoidPhrasesByMode = {
    dating: ["왜 그것도 못 맞춰줘?", "그냥 네가 알아서 해.", "너는 원래 그런 사람이야."],
    married: ["내가 다 맞잖아.", "집안일은 네가 알아서.", "또 그 얘기야? 지겨워."],
    some: ["우리 무슨 사이인지 지금 당장 정해.", "읽씹이야? 성의 없네.", "답 없으면 끝인 줄 알아."],
    reunion: ["예전 일은 그냥 잊어.", "이번에도 너만 바뀌면 돼.", "난 달라질 생각 없어."],
  };
  const luckTipsByMode = {
    dating: [
      "주 1회 짧은 감정 체크인으로 오해가 쌓이기 전에 정리하세요.",
      "연락 템포 기대치를 미리 맞추면 갈등 확률이 크게 줄어듭니다.",
      "서운함은 당일 전달하고, 결론은 다음 날 합의하세요.",
    ],
    married: [
      "가사/재무 역할을 문장으로 나눠 분기마다 재조정하세요.",
      "갈등 시 해결보다 공감 문장 1개를 먼저 말하는 습관을 들이세요.",
      "주간 생활회의 20분을 고정해 감정 누수를 줄이세요.",
    ],
    some: [
      "추측 대신 확인 질문을 사용해 신호 해석 오류를 줄이세요.",
      "관계 속도를 단계별로 합의하면 불안감이 크게 낮아집니다.",
      "짧은 안부 루틴을 고정해 신뢰 리듬을 먼저 만드세요.",
    ],
    reunion: [
      "재시작 전 반복 갈등 1가지를 명확히 정리하고 합의하세요.",
      "감정 격할 때 24시간 유예 후 대화 재개 규칙을 지키세요.",
      "말보다 작은 행동 약속을 반복해 신뢰를 복구하세요.",
    ],
  };
  const funSeed =
    Number(payload.meYear) +
    Number(payload.meMonth) +
    Number(payload.meDay) +
    Number(payload.partnerYear) +
    Number(payload.partnerMonth) +
    Number(payload.partnerDay);
  const funFacts = {
    bestDate: (Math.abs(funSeed) % 27) + 1,
    bestNumber: (Math.abs(funSeed) % 9) + 1,
  };

  return {
    score,
    relationType,
    relationTypeLabel,
    me: {
      profile: { name: payload.meName, gender: payload.meGender, calendarType: payload.meCalendarType },
      saju: me,
    },
    partner: {
      profile: { name: payload.partnerName, gender: payload.partnerGender, calendarType: payload.partnerCalendarType },
      saju: partner,
    },
    elementDiff: diff,
    collisions,
    emotionalTone: toneByMode[relationType],
    resonancePoint: resonanceByMode[relationType],
    cautionPoint: cautionByMode[relationType],
    careRitual: ritualByMode[relationType],
    conversationGuide: guideByMode[relationType].join("\n"),
    goodPhrases: goodPhrasesByMode[relationType],
    avoidPhrases: avoidPhrasesByMode[relationType],
    luckGuide: {
      today: luckTipsByMode[relationType][0],
      thisWeek: luckTipsByMode[relationType][1],
      avoid: luckTipsByMode[relationType][2],
    },
    funFacts,
    summary:
      collisions.length === 0
        ? relationTypeLabel + " 모드 기준, 두 사람의 오행 분포가 비교적 균형적입니다. 감정 교류의 기본 체력이 좋아 안정적으로 신뢰를 쌓기 유리합니다."
        : relationTypeLabel + " 모드 기준, 오행 편차(" + toElementGapText(collisions) + ")가 보여 조율이 필요합니다. 차이를 관리하는 대화 규칙을 만들면 관계 깊이가 빠르게 올라갈 수 있습니다.",
  };
}

module.exports = {
  searchDreamByKeyword,
  drawRandomTarotCards,
  buildCompatibilityResult,
};
