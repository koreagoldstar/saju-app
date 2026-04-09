const { getSajuFromInput } = require("../lib/saju");
const { getClaudeSajuFortune, normalizeCategory, normalizeTone, CATEGORY_LABELS, TONE_LABELS } = require("../lib/claude");

function buildFallbackFortune(data) {
  const name = data.name;
  const saju = data.saju;
  const category = normalizeCategory(data.category);
  const tone = normalizeTone(data.tone);
  const categoryLabel = CATEGORY_LABELS[category];
  const toneLine =
    tone === "comfort"
      ? "지금의 흐름을 차분히 활용하시면 충분히 좋은 결과를 만들 수 있습니다."
      : "핵심 변수를 통제하면 성과 편차를 줄일 수 있는 구간입니다.";
  const categoryLineMap = {
    love: "상대의 반응을 확인하며 대화 속도를 조절하시면 관계 안정에 유리합니다.",
    business: "의사결정 전 수익 구조와 현금 흐름을 먼저 점검하시면 실수가 줄어듭니다.",
    benefactor: "경험 많은 조언자의 피드백에서 실행 가능한 해법이 나올 가능성이 큽니다.",
    career: "업무 우선순위를 명확히 하여 보고 체계를 정리하면 평가 흐름이 안정됩니다.",
    wealth: "고정 지출과 변동 지출을 분리해 관리하시면 금전 운용의 균형이 빨리 회복됩니다.",
  };
  const fe = saju.fiveElements || { counts: {} };
  const labels = (saju.fiveElements && saju.fiveElements.labels) || {};
  const dominant = labels[saju.fiveElements && saju.fiveElements.dominantElement] || "균형";
  const weak = labels[saju.fiveElements && saju.fiveElements.weakestElement] || "균형";
  const charSection = [
    "성격 분석",
    name + "님의 사주 원국은 일간 " + saju.dayMaster + "을 중심으로 " + saju.dayPillar + " 일주의 결이 뚜렷하게 드러납니다.",
    "년주 " + saju.yearPillar + "는 성장 배경과 기본 가치관을, 월주 " + saju.monthPillar + "는 사회적 역할과 현실 대응 방식을 강하게 반영합니다.",
    "시주 " + saju.timePillar + "는 장기 목표와 내면 동기를 보여주는데, 현재 흐름에서는 즉흥적 선택보다 누적된 경험을 체계화하는 태도가 유리합니다.",
    "오행 분포를 보면 목 " + (fe.counts.wood || 0) + ", 화 " + (fe.counts.fire || 0) + ", 토 " + (fe.counts.earth || 0) + ", 금 " + (fe.counts.metal || 0) + ", 수 " + (fe.counts.water || 0) + "로 나타나며, 상대적으로 " + dominant + " 기운이 주도권을 잡고 " + weak + " 기운은 보완이 필요한 상태입니다.",
    toneLine + " 감정과 판단을 분리해서 의사결정하면 본래 강점이 더 안정적으로 발휘됩니다.",
  ].join("\n");
  const careerSection = [
    "직업운",
    "직업운에서는 월주와 대운 흐름이 핵심인데, 현재 대운 " +
      (saju.luckCycle && saju.luckCycle.currentDaYun ? saju.luckCycle.currentDaYun.ganZhi : "정보 없음") +
      "의 영향으로 역할 확장보다 구조 정비가 성과로 직결되는 구간입니다.",
    "당장 눈에 띄는 결과를 좇기보다 업무 우선순위, 보고 체계, 일정 관리 방식을 표준화하면 평가가 가파르게 개선될 가능성이 높습니다.",
    categoryLineMap[category] + " 특히 " + categoryLabel + " 관련 의사결정은 검토-실행-피드백의 3단계를 유지할수록 리스크가 감소합니다.",
    "동료나 파트너와의 협업에서는 본인의 강점을 먼저 제시하고, 상대의 요구사항을 문서화해 합의점을 남기는 방식이 장기적으로 가장 효율적입니다.",
    "세운 " +
      (saju.luckCycle && saju.luckCycle.currentSeWoon ? saju.luckCycle.currentSeWoon.ganZhi + "(" + saju.luckCycle.currentSeWoon.year + "년)" : "정보 없음") +
      "의 작용을 고려하면, 단기 프로젝트에서 작은 성공 루틴을 반복하는 전략이 유리합니다.",
  ].join("\n");
  const cautionSection = [
    "주의해야 할 점",
    "현재 국면에서 가장 주의할 부분은 판단 속도와 실행 속도의 불균형입니다. 준비가 덜 된 상태에서 결론을 서두르면 체력 소모와 관계 피로가 동시에 커질 수 있습니다.",
    "보완이 필요한 " + weak + " 기운을 채우기 위해 일정 사이에 회복 구간을 넣고, 중요한 약속은 최소 하루 전 사전 점검을 권장합니다.",
    "금전과 계약 관련 사안은 구두 합의보다 기록 기반 확인이 필수이며, 감정이 올라온 상황에서는 결제나 투자 결정을 24시간 유예하는 습관이 도움이 됩니다.",
    "대인관계에서는 상대를 설득하려 하기보다 사실과 근거를 차분히 공유하는 방식이 충돌을 줄입니다.",
    "실천 체크리스트: 첫째, 오늘 할 일 3가지만 우선 확정합니다. 둘째, 중요한 대화 전 핵심 문장 2개를 미리 준비합니다. 셋째, 지출은 필요/보류/제외로 구분해 즉흥 소비를 차단합니다.",
    "위 원칙을 2주 이상 유지하면 사주 구조에서 강점으로 잡힌 영역이 현실 성과로 연결되는 속도가 확실히 빨라집니다.",
  ].join("\n");

  return [charSection, "", careerSection, "", cautionSection].join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, category, tone } = req.body || {};
    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    const [year, month, day] = birthDate.split("-").map(Number);
    const hour = Number(birthHour);
    const minute = Number(birthMinute);
    const isLunar = calendarType === "lunar";
    const normalizedCategory = normalizeCategory(category);
    const normalizedTone = normalizeTone(tone);
    const saju = getSajuFromInput(year, month, day, hour, minute, isLunar, gender);

    let aiFortune = "";
    let aiProvider = "claude";
    try {
      aiFortune = await getClaudeSajuFortune({
        name,
        gender,
        calendarType,
        category: normalizedCategory,
        tone: normalizedTone,
        ...saju,
      });
    } catch (apiError) {
      aiProvider = "fallback";
      aiFortune = buildFallbackFortune({ name, gender, saju, category: normalizedCategory, tone: normalizedTone });
    }

    return res.status(200).json({
      profile: { name, gender, calendarType },
      category: normalizedCategory,
      categoryLabel: CATEGORY_LABELS[normalizedCategory],
      tone: normalizedTone,
      toneLabel: TONE_LABELS[normalizedTone],
      saju,
      aiProvider,
      aiFortune,
    });
  } catch (error) {
    return res.status(500).json({ message: "사주 계산 중 오류가 발생했습니다.", detail: error.message });
  }
};
