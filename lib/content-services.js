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
    interpretation: "아직 이 키워드에 맞는 설명은 없어요.",
    advice: "단어를 바꿔 보거나, 조금 더 구체적으로 적어 보세요.",
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
        ? "연애로 보면 둘이 잘 맞는 편이에요. 설렘이 오래 가기 좋아요."
        : score >= 72
          ? "연애로 보면 끌림이 분명해요. 말하는 방식만 맞추면 더 편해져요."
          : "연애로 보면 감정 온도가 조금 달라요. 천천히 맞추면 깊어져요.",
    married:
      score >= 86
        ? "부부로 보면 생활 리듬이 잘 맞는 편이에요. 오래 가기 좋아요."
        : score >= 72
          ? "부부로 보면 현실이랑 마음을 같이 챙기면 더 단단해져요."
          : "부부로 보면 생활 습관 차이가 피로가 될 수 있어요. 역할만 나눠도 많이 편해져요.",
    some:
      score >= 86
        ? "썸으로 보면 서로 마음 읽기가 잘 돼요."
        : score >= 72
          ? "썸으로 보면 호감은 있는데 확인하고 싶은 마음이 생기기 쉬워요. 짧게라도 솔직히 말하면 좋아요."
          : "썸으로 보면 기대가 엇갈릴 수 있어요. ‘우리 무슨 사이?’보다 연락 리듬부터 맞춰 보세요.",
    reunion:
      score >= 86
        ? "재회로 보면 마음 다시 맞추기에 나쁘지 않아요."
        : score >= 72
          ? "재회로 보면 다시 이어질 수 있어요. 예전이랑 같은 싸움만 안 하면 돼요."
          : "재회로 보면 감정은 남아도 싸움 패턴이 또 나올 수 있어요. 다시 시작하기 전에 규칙부터 정하면 안전해요.",
  };

  const resonanceByMode = {
    dating:
      collisions.length === 0
        ? "편안하게 가까워지기 좋아요."
        : "서로 다른 점이 있어서 재미가 있어요.",
    married:
      collisions.length === 0
        ? "일상에서 잘 맞춰 가요. 작은 다툼도 금방 풀리기 쉬워요."
        : "역할만 정하면 차이가 도움이 될 수 있어요.",
    some:
      collisions.length === 0
        ? "대화 템포가 잘 맞아요."
        : "성향이 달라서 신선해요. 질문만 잘하면 금방 가까워져요.",
    reunion:
      collisions.length === 0
        ? "예전보다 말이 잘 통할 수 있어요."
        : "예전이랑 다르게 싸우는 법만 바꿔도 관계가 새로워져요.",
  };

  const cautionByMode = {
    dating:
      collisions.length === 0
        ? "좋을 때도 말이 똑같으면 무뎌질 수 있어요. 가끔은 다른 표현으로 고마움을 말해 보세요."
        : toElementGapText(collisions) + " 쪽에서 오해가 나기 쉬워요. 연락 자주 할지부터 맞춰 보세요.",
    married:
      collisions.length === 0
        ? "일 얘기만 하다 보면 마음 얘기가 줄어들 수 있어요. 가끔은 감정만 나누는 시간을 정해 보세요."
        : toElementGapText(collisions) + " 차이가 반복되면 싸움이 될 수 있어요. 집안일·시간을 글로 합의해 두면 좋아요.",
    some:
      collisions.length === 0
        ? "좋아도 너무 빨리 밀면 부담이 될 수 있어요. 상대 속도를 존중해 보세요."
        : toElementGapText(collisions) + " 차이로 신호를 다르게 읽을 수 있어요. 추측 말고 물어보세요.",
    reunion:
      collisions.length === 0
        ? "감정은 빨리 돌아와도, 예전 일을 덮으면 또 같은 자리에서 흔들릴 수 있어요."
        : toElementGapText(collisions) + " 차이가 예전 싸움을 다시 부를 수 있어요. 다시 만나기 전에 조건부터 정하세요.",
  };

  const ritualByMode = {
    dating: "한 주에 한 번, 15분만: 이번 주 좋았던 일·서운했던 일 하나씩만 바꿔 말해 보기.",
    married: "한 주에 한 번, 20분: 앞으로 일정·집안일 10분, 기분 얘기 10분만 나누기.",
    some: "짧게 안부는 주 2번 정도, 주말에만 30분 정도 깊게 이야기해 보기.",
    reunion: "다시 만난 뒤 한 달은 싸우면 바로 말고 하루 뒤에 다시 이야기하기로 하기.",
  };

  const guideByMode = {
    dating: [
      "1) 고마운 것·서운한 것을 비슷하게 말해 보기",
      "2) 연락은 며칠에 한 번이 좋은지 먼저 맞추기",
      "3) 작은 약속 하나는 꼭 지키기로 하기",
    ],
    married: [
      "1) 집안일·돈·시간 누가 할지 문장으로 정하기",
      "2) 싸울 때 해결부터 말하지 말고 ‘그렇구나’ 한마디 먼저",
      "3) 세 달에 한 번만이라도 규칙 다시 보기",
    ],
    some: [
      "1) 속으로만 추측하지 말고 짧게 물어보기",
      "2) 부담 없는 선에서만 관계 단계 맞추기",
      "3) 불안할수록 연락 자주 하라고 재촉하기보다 내 상황만 짧게 알리기",
    ],
    reunion: [
      "1) 예전에 반복된 싸움 한 가지만 꼭 짚기",
      "2) 싸울 때 멈추고 다음 날 이야기하기로 정하기",
      "3) 큰 말보다 작은 약속을 자주 지키기",
    ],
  };
  const goodPhrasesByMode = {
    dating: ["너랑 있으면 마음이 편해.", "네 말 들으니까 내 생각이 정리돼.", "오늘도 같이 있어 줘서 고마워."],
    married: ["덕분에 오늘 하루가 수월했어.", "우리 잘 버티고 있는 것 같아.", "네 기분부터 듣고 싶어."],
    some: ["네 속도 존중할게.", "오늘 연락 반가웠어.", "부담 없이 천천히 알아가고 싶어."],
    reunion: ["이번엔 예전처럼 말 안 하고 들을게.", "그때 미안했던 말 제대로 할게.", "다시면 천천히 맞춰 가자."],
  };
  const avoidPhrasesByMode = {
    dating: ["그것도 못 해?", "알아서 해.", "너 원래 그렇지."],
    married: ["내가 다 맞는데.", "집안일 네 몫이잖아.", "또 그 소리야."],
    some: ["우리 뭐야 지금.", "답이 왜 없어.", "이러면 끝이야."],
    reunion: ["예전 일 다 잊자.", "이번엔 너만 바뀌어.", "난 안 바뀌는데."],
  };
  const luckTipsByMode = {
    dating: [
      "한 주에 한 번, 기분만 짧게 나눠도 오해가 줄어요.",
      "며칠에 한 번 연락이 편한지 먼저 말해 보세요.",
      "서운한 건 그날 말하고, 결론은 내일 정해요.",
    ],
    married: [
      "집안일·돈 역할을 글로 적어 두고 세 달마다만 다시 봐요.",
      "싸울 때는 해결부터 말하지 말고 ‘그랬구나’ 한마디부터.",
      "일주일에 한 번은 일 얘기 말고 감정만 10분.",
    ],
    some: [
      "속으로만 생각하지 말고 짧게 물어보세요.",
      "‘다음 단계’는 부담 없을 때만 천천히.",
      "짧은 안부는 정해진 시간에만 해도 마음이 편해요.",
    ],
    reunion: [
      "다시 만나기 전에 예전에 반복된 싸움 한 가지만 짚어요.",
      "화나면 그날은 말 줄이고 다음 날 이야기해요.",
      "큰 약속보다 작은 약속을 자주 지키기로 해요.",
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
        ? relationTypeLabel + "로 보면 둘 다섯 가지 기운이 비슷하게 흩어져 있어요. 기본적으로 말이 통하기 좋은 편이에요."
        : relationTypeLabel +
          "로 보면 기운 차이(" +
          toElementGapText(collisions) +
          ")가 있어요. 서로 다른 점을 인정하고, 연락·역할만 맞추면 훨씬 편해져요.",
  };
}

module.exports = {
  searchDreamByKeyword,
  drawRandomTarotCards,
  buildCompatibilityResult,
};
