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
    summary:
      collisions.length === 0
        ? "두 사람의 오행 분포가 비교적 균형적입니다. 관계 유지와 공동 목표 설정에 유리한 흐름입니다."
        : `오행 편차가 큰 항목(${collisions.map((c) => c.element).join(", ")})이 보여 조율이 필요합니다. 역할 분담과 대화 규칙을 정하면 충돌을 완화할 수 있습니다.`,
  };
}

module.exports = {
  searchDreamByKeyword,
  drawRandomTarotCards,
  buildCompatibilityResult,
};
