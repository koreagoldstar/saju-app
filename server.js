require("dotenv").config();

const path = require("path");
const express = require("express");
const { getSajuFromInput } = require("./lib/saju");
const { searchDreamByKeyword, drawRandomTarotCards, buildCompatibilityResult } = require("./lib/content-services");
const { generateDatasetBasedFortune } = require("./lib/fortune-report");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use(express.static(path.join(__dirname, "public"), { etag: false, lastModified: false }));
app.get("/saju", (req, res) => res.sendFile(path.join(__dirname, "public", "saju", "index.html")));
app.get("/tarot", (req, res) => res.sendFile(path.join(__dirname, "public", "tarot", "index.html")));
app.get("/dream", (req, res) => res.sendFile(path.join(__dirname, "public", "dream", "index.html")));
app.get("/lifetime-saju", (req, res) => res.sendFile(path.join(__dirname, "public", "lifetime-saju", "index.html")));
app.get("/sintojeong-2026", (req, res) => res.sendFile(path.join(__dirname, "public", "sintojeong-2026", "index.html")));
app.get("/premium-compatibility", (req, res) => res.sendFile(path.join(__dirname, "public", "premium-compatibility", "index.html")));
app.get("/daewoon-10year", (req, res) => res.sendFile(path.join(__dirname, "public", "daewoon-10year", "index.html")));
app.get("/tomorrow-fortune", (req, res) => res.sendFile(path.join(__dirname, "public", "tomorrow-fortune", "index.html")));
app.get("/zodiac-fortune", (req, res) => res.sendFile(path.join(__dirname, "public", "zodiac-fortune", "index.html")));
app.get("/star-sign-fortune", (req, res) => res.sendFile(path.join(__dirname, "public", "star-sign-fortune", "index.html")));

app.post("/api/saju", async (req, res) => {
  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, category, tone } = req.body || {};

    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    const [year, month, day] = birthDate.split("-").map(Number);
    const hour = Number(birthHour);
    const minute = Number(birthMinute);
    const isLunar = calendarType === "lunar";
    const saju = getSajuFromInput(year, month, day, hour, minute, isLunar, gender);
    const generated = await generateDatasetBasedFortune({
      name,
      gender,
      calendarType,
      category,
      tone: tone || "expert",
      saju,
      ...saju,
    });

    return res.json({
      profile: { name, gender, calendarType },
      category: generated.category,
      categoryLabel: generated.categoryLabel,
      saju,
      keywords: generated.keywords,
      aiProvider: generated.aiProvider,
      aiFortune: generated.aiFortune,
      fortuneMode: generated.fortuneMode,
      longformFallback: generated.longformFallback,
    });
  } catch (error) {
    return res.status(500).json({ message: "사주 계산 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/dream", (req, res) => {
  try {
    const { keyword } = req.body || {};
    return res.json(searchDreamByKeyword(keyword));
  } catch (error) {
    return res.status(500).json({ message: "꿈해몽 처리 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/tarot", (req, res) => {
  try {
    const { drawCount } = req.body || {};
    return res.json(drawRandomTarotCards(drawCount));
  } catch (error) {
    return res.status(500).json({ message: "타로 처리 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/compatibility", (req, res) => {
  try {
    const payload = req.body || {};
    const required = [
      "meName",
      "meYear",
      "meMonth",
      "meDay",
      "meHour",
      "meMinute",
      "meGender",
      "meCalendarType",
      "partnerName",
      "partnerYear",
      "partnerMonth",
      "partnerDay",
      "partnerHour",
      "partnerMinute",
      "partnerGender",
      "partnerCalendarType",
    ];
    const missing = required.filter((key) => payload[key] === undefined || payload[key] === null || payload[key] === "");
    if (missing.length) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다.", missing });
    }

    const result = buildCompatibilityResult({
      ...payload,
      meYear: Number(payload.meYear),
      meMonth: Number(payload.meMonth),
      meDay: Number(payload.meDay),
      meHour: Number(payload.meHour),
      meMinute: Number(payload.meMinute),
      partnerYear: Number(payload.partnerYear),
      partnerMonth: Number(payload.partnerMonth),
      partnerDay: Number(payload.partnerDay),
      partnerHour: Number(payload.partnerHour),
      partnerMinute: Number(payload.partnerMinute),
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "궁합 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-tojeong", (req, res) => {
  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, recentIssue } = req.body || {};
    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
    const report = [
      "2026 신토정비결 프리미엄 리포트",
      "연간 핵심 테마",
      name + "님은 " + saju.dayPillar + " 일주를 중심으로 2026년에 기회와 리스크가 교차하는 흐름이 뚜렷합니다.",
      "현재 대운은 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + "이며, 연간 운영 전략은 보수적 확장에 가깝습니다.",
      "",
      "상반기 운영 포인트",
      "오행 분포에서 강한 기운은 " + dominant + ", 보완 기운은 " + weak + "입니다. 상반기는 속도보다 구조 정비가 우선입니다.",
      "새로운 시도는 '소규모 검증-지표 확인-확장' 순서로 진행할수록 리스크를 크게 줄일 수 있습니다.",
      "",
      "하반기 선택 전략",
      "하반기에는 관계/재무/일상 의사결정 모두 검증된 채널 위주로 선택하면 성과 안정성이 올라갑니다.",
      "외부 제안은 즉시 확정하지 말고, 최소 하루 유예 후 재검토하는 규칙이 유효합니다.",
      "",
      "실천 체크리스트",
      "1) 결제·계약은 서면 검토 2) 일정은 주간 단위 리밸런싱 3) 감정적 의사결정 24시간 유예",
    ].join("\n");
    return res.json({
      title: "2026 신토정비결",
      profile: { name, gender, calendarType },
      saju,
      summary: "2026년 핵심 전략: 상반기 구조 정비, 하반기 선택적 확장",
      luckTips: [
        "아침 10분 일정 정리로 하루 우선순위를 먼저 고정하세요.",
        "중요 계약/결제는 당일 확정 대신 하루 유예 후 재검토하세요.",
        "주 1회 지출 점검으로 불필요한 누수부터 줄이세요.",
      ],
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "신토정비결 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-daewoon", (req, res) => {
  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType } = req.body || {};
    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const top10 = ((saju.luckCycle && saju.luckCycle.daYunList) || []).slice(0, 10);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const report = top10.map((item, idx) => `${idx + 1}. ${item.ganZhi || "-"} | ${item.startYear}~${item.endYear} | 나이 ${item.startAge}~${item.endAge}`).join("\n");
    const strategy =
      currentDaYun
        ? "현재 " + currentDaYun.ganZhi + " 구간에서는 장기 프로젝트를 작게 나눠 누적 성과를 만드는 방식이 유리합니다."
        : "현재 구간 계산 중이며, 대운 전환 직전에는 보수적 의사결정을 권장합니다.";
    return res.json({
      title: "10년 대운 분석",
      profile: { name, gender, calendarType },
      saju,
      daYunTimeline: top10,
      summary: strategy,
      luckTips: [
        "현재 대운 핵심 키워드 1개를 정해 90일 단위로 실행하세요.",
        "대운 전환 1~2년 전에는 보수적 결정을 우선해 변동성을 줄이세요.",
        "월 1회 기록으로 '잘된 선택/아쉬운 선택'을 구분해 패턴을 고정하세요.",
      ],
      report: "10년 대운 타임라인\n" + report + "\n\n운영 조언\n" + strategy,
    });
  } catch (error) {
    return res.status(500).json({ message: "10년 대운 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-lifetime", (req, res) => {
  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, recentIssue } = req.body || {};
    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const currentSeWoon = saju.luckCycle && saju.luckCycle.currentSeWoon;
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
    const issue = String(recentIssue || "").trim();
    const issueLine =
      issue.length > 0
        ? "입력하신 최근 이슈는 \"" + issue + "\" 입니다. 이 사안은 지금 시기의 판단 균형(속도 vs 안정성)을 시험하는 주제이므로, 단기 결론보다 2~4주 단위 점검 방식이 유리합니다."
        : "최근 이슈가 입력되지 않아 일반 장기 흐름 기준으로 분석합니다. 이후 이슈를 입력하면 훨씬 구체적인 맞춤 해석이 가능합니다.";

    const report = [
      "인생 전반 흐름",
      name + "님의 평생 사주 분석은 " + saju.dayPillar + " 일주를 중심축으로 삼아, 단기 사건보다 장기 패턴을 읽는 방식으로 구성됩니다.",
      "핵심은 지금 보이는 결과가 전부가 아니라, 대운·세운의 전환에 따라 강점과 약점의 체감 순서가 달라진다는 점입니다.",
      "현재는 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + " 구간으로, 기초 체력과 구조를 다지는 선택이 장기 기대값을 높이는 시기입니다.",
      "즉, 한 번의 성과보다 반복 가능한 루틴을 만드는 방향이 평생 흐름에서 더 큰 복리 효과를 만듭니다.",
      "",
      "시기별 변화 포인트",
      "오행 분포는 목 " + saju.fiveElements.counts.wood + ", 화 " + saju.fiveElements.counts.fire + ", 토 " + saju.fiveElements.counts.earth + ", 금 " + saju.fiveElements.counts.metal + ", 수 " + saju.fiveElements.counts.water + "이며, 강한 기운은 " + dominant + ", 보완 기운은 " + weak + "입니다.",
      "강한 기운은 결정·행동·집중에서 힘을 제공하지만, 과해지면 시야가 좁아질 수 있어 균형 장치가 필요합니다.",
      "보완 기운은 현재 부족하게 보일 수 있으나, 의식적 습관으로 충분히 채울 수 있는 영역입니다. 예를 들어 일정 관리, 기록, 휴식, 관계 조율 같은 실천이 약한 기운을 실제 역량으로 전환합니다.",
      "세운 " + (currentSeWoon ? currentSeWoon.ganZhi + " (" + currentSeWoon.year + "년)" : "분석 중") + " 구간에서는 체감 속도보다 안정성과 회복 탄성이 중요하며, 이 시기 전략이 다음 대운 초반 성과를 좌우할 가능성이 큽니다.",
      "",
      "최근 이슈 맞춤 분석",
      issueLine,
      "최근 이슈가 관계 문제라면 대화 시점과 표현 강도를 분리해 조절하는 것이 우선입니다. 재무 문제라면 위험 노출을 줄이는 선택부터 선행하고, 진로 문제라면 실험 범위를 작게 나누어 실행 데이터를 먼저 확보하는 전략이 유효합니다.",
      "핵심은 '지금 당장 정답 찾기'보다, 일정한 점검 주기로 가설을 업데이트하는 방식입니다. 이 과정이 누적될수록 평생 흐름의 안정성이 높아집니다.",
      "",
      "분야별 장기 운영 관점",
      "관계 영역에서는 감정 강도보다 신뢰 축적 속도가 중요합니다. 중요한 갈등은 즉시 해결보다 사실 확인-정리-재대화 순서가 장기적으로 유리합니다.",
      "재무 영역에서는 수익 확대보다 손실 억제의 일관성이 먼저입니다. 고정비/변동비 구분, 분기별 현금흐름 점검, 고위험 의사결정 유예 규칙이 평생 곡선을 안정화합니다.",
      "건강·에너지 영역에서는 과부하 이후 회복이 늦어지지 않도록 주간 리듬을 고정해야 합니다. 수면/식사/운동보다 중요한 것은 '반복 가능한 최소 기준'을 지키는 것입니다.",
      "성장 영역에서는 목표를 크게 잡되 실행 단위를 작게 쪼개는 방식이 좋습니다. 작은 완성의 누적이 대운 전환기 변동성을 흡수하는 완충장치가 됩니다.",
      "",
      "지속 점검 가이드",
      "평생 사주 리포트는 1회성 판정이 아니라 업데이트형 지도이므로 분기 1회 재확인을 기본 루틴으로 권장합니다.",
      "전환 이벤트(이직, 결혼, 투자, 이사, 사업 확장) 전후에는 반드시 재조회해 우선순위를 다시 정하세요.",
      "권장 루틴: 1) 현재 대운 위치 확인 2) 다음 전환까지 남은 기간 점검 3) 관계/재무/건강 우선순위 재설정 4) 90일 실행 계획 업데이트.",
      "이 과정을 반복하면 운세는 막연한 예측이 아니라, 삶의 의사결정 품질을 개선하는 실전 도구로 작동합니다.",
    ].join("\n");
    return res.json({
      title: "평생 사주 분석",
      profile: { name, gender, calendarType },
      saju,
      luckTips: [
        "분기 1회 핵심 관계/재무/건강 우선순위를 다시 정리하세요.",
        "대운 전환 전후 6개월은 큰 결정 속도를 의도적으로 늦추세요.",
        "하루 10분 기록으로 감정-선택-결과 연결을 점검하세요.",
      ],
      report,
    });
  } catch (error) {
    return res.status(500).json({ message: "평생 사주 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-tomorrow", (req, res) => {
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
    return res.json({ title: "내일의 운세", profile: { name, gender, calendarType }, summary: "내일은 " + tomorrowFocus + " 중심 운영이 좋습니다.", saju, report });
  } catch (error) {
    return res.status(500).json({ message: "내일의 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-zodiac", (req, res) => {
  try {
    const { name, birthDate } = req.body || {};
    if (!name || !birthDate) return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
    const [year] = birthDate.split("-").map(Number);
    const zodiac = ZODIAC[((year - 4) % 12 + 12) % 12];
    const moodMap = { 쥐: "기획운 상승", 소: "안정운 상승", 호랑이: "도전운 상승", 토끼: "관계운 상승", 용: "성과운 상승", 뱀: "집중운 상승", 말: "행동운 상승", 양: "회복운 상승", 원숭이: "아이디어운 상승", 닭: "정리운 상승", 개: "신뢰운 상승", 돼지: "재충전운 상승" };
    const summary = zodiac + "띠 오늘의 포인트: " + (moodMap[zodiac] || "균형운");
    const report = [zodiac + "띠 운세", name + "님은 " + zodiac + "띠 흐름에서 오늘 " + (moodMap[zodiac] || "균형운") + "이 강합니다.", "사람을 대할 때는 속도보다 신뢰를 먼저 쌓고, 금전/일정은 보수적으로 점검하면 안정감이 커집니다.", "짧은 조언: 중요한 선택 전 10분만 멈춰 체크리스트를 확인하세요."].join("\n");
    return res.json({ title: "띠 운세", zodiac, summary, report });
  } catch (error) {
    return res.status(500).json({ message: "띠 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-star-sign", (req, res) => {
  try {
    const { name, birthDate } = req.body || {};
    if (!name || !birthDate) return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    const ranges = [
      { sign: "염소자리", start: 1222, end: 119 }, { sign: "물병자리", start: 120, end: 218 }, { sign: "물고기자리", start: 219, end: 320 }, { sign: "양자리", start: 321, end: 419 },
      { sign: "황소자리", start: 420, end: 520 }, { sign: "쌍둥이자리", start: 521, end: 621 }, { sign: "게자리", start: 622, end: 722 }, { sign: "사자자리", start: 723, end: 822 },
      { sign: "처녀자리", start: 823, end: 922 }, { sign: "천칭자리", start: 923, end: 1022 }, { sign: "전갈자리", start: 1023, end: 1121 }, { sign: "사수자리", start: 1122, end: 1221 },
    ];
    const [, month, day] = birthDate.split("-").map(Number);
    const value = month * 100 + day;
    const found = ranges.find((r) => (r.start <= r.end ? value >= r.start && value <= r.end : value >= r.start || value <= r.end));
    const starSign = found ? found.sign : "별자리";
    const summary = starSign + " 오늘의 포인트: 감정 표현은 부드럽게, 선택은 명확하게.";
    const report = ["별자리 운세", name + "님의 별자리는 " + starSign + " 입니다.", "오늘은 관계와 일 모두에서 말의 톤이 결과를 좌우합니다. 부드럽게 시작하고 핵심은 짧게 전달하세요.", "짧은 조언: 우선순위 1개만 확실히 끝내면 나머지는 자연스럽게 풀립니다."].join("\n");
    return res.json({ title: "별자리 운세", starSign, summary, report });
  } catch (error) {
    return res.status(500).json({ message: "별자리 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log("Saju app server running on http://localhost:" + PORT);
});