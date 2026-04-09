const fs = require("fs");
const path = require("path");
const { getSajuFromInput } = require("./saju");

function readJson(relativePath) {
  const fullPath = path.join(__dirname, "..", relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

const dreamDataset = readJson("data/dream-dataset.json");
const tarotDataset = readJson("data/tarot-dataset.json");

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

function searchDreamByKeyword(keyword) {
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

function toElementGapText(collisions) {
  if (!collisions.length) return "큰 편차 없음";
  return collisions
    .map((c) => `${ELEMENT_KO[c.element] || c.element}(${c.gap > 0 ? "+" : ""}${c.gap})`)
    .join(", ");
}

function buildCompatibilityResult(payload) {
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
  const emotionalTone =
    score >= 86
      ? "서로의 결을 자연스럽게 알아채는 편이라, 함께 있을 때 정서적 안정감이 빠르게 형성되는 궁합입니다."
      : score >= 72
        ? "끌림과 차이가 함께 존재하는 관계로, 작은 배려가 쌓일수록 관계 만족도가 크게 상승하는 궁합입니다."
        : "감정 리듬의 차이가 분명한 관계입니다. 다만 차이를 언어화하면 오히려 깊은 신뢰를 만들 수 있는 궁합입니다.";

  const resonancePoint =
    collisions.length === 0
      ? "공감 포인트가 유사해 감정 회복 속도가 빠른 편입니다."
      : "강점이 서로 다른 만큼 역할을 분담하면 관계의 탄력성이 높아집니다.";

  const cautionPoint =
    collisions.length === 0
      ? "익숙함이 커질 때 표현이 줄어들 수 있으니, 감사 표현을 의식적으로 유지해 주세요."
      : `${toElementGapText(collisions)} 구간에서 해석 차이가 생기기 쉬우니 즉시 결론보다 '확인 질문'을 먼저 두는 것이 좋습니다.`;

  const careRitual =
    score >= 80
      ? "주 1회 20분 대화 루틴: 이번 주 고마웠던 점 1가지 + 다음 주 바라는 점 1가지를 교환해 보세요."
      : "감정 고조 시 24시간 유예 규칙을 두고, 다음 날 '사실-감정-요청' 3단계로 대화를 재개해 보세요.";

  const conversationGuide = [
    "1) 사실 확인: 지금 상황에서 확인된 사실만 먼저 말하기",
    "2) 감정 공유: 비난 대신 '나는 ~하게 느꼈다' 문장 사용",
    "3) 행동 합의: 이번 주 실천할 1가지 행동만 작게 합의하기",
  ].join("\n");

  return {
    score,
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
    emotionalTone,
    resonancePoint,
    cautionPoint,
    careRitual,
    conversationGuide,
    summary:
      collisions.length === 0
        ? "두 사람의 오행 분포가 비교적 균형적입니다. 감정 교류의 기본 체력이 좋은 편이라 신뢰를 안정적으로 쌓기 유리합니다."
        : `오행 편차(${toElementGapText(collisions)})가 보여 조율이 필요합니다. 다만 차이를 관리하는 대화 규칙을 만들면 관계의 깊이가 빠르게 올라갈 수 있습니다.`,
  };
}

module.exports = {
  searchDreamByKeyword,
  drawRandomTarotCards,
  buildCompatibilityResult,
};
