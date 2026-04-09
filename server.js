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
      tone,
      saju,
      ...saju,
    });

    return res.json({
      profile: { name, gender, calendarType },
      category: generated.category,
      categoryLabel: generated.categoryLabel,
      tone: generated.tone,
      toneLabel: generated.toneLabel,
      saju,
      keywords: generated.keywords,
      aiProvider: generated.aiProvider,
      aiFortune: generated.aiFortune,
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
    const { name, birthDate, birthHour, birthMinute, gender, calendarType } = req.body || {};
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
      name + "님은 " + saju.dayPillar + " 일주를 중심으로 2026년에 기회와 리스크가 교차하는 흐름이 뚜렷합니다.",
      "현재 대운은 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + "이며, 연간 운영 전략은 보수적 확장에 가깝습니다.",
      "오행 분포에서 강한 기운은 " + dominant + ", 보완 기운은 " + weak + "이므로 상반기에는 과감한 확장보다 구조 정비가 유리합니다.",
      "하반기에는 관계/재무/커리어 모두 검증된 채널 위주로 선택하면 성과 안정성이 올라갑니다.",
      "월별 실천 원칙: 1) 결제·계약은 서면 검토 2) 일정은 주간 단위 리밸런싱 3) 감정적 의사결정 24시간 유예.",
    ].join("\n");
    return res.json({ title: "2026 신토정비결", profile: { name, gender, calendarType }, saju, report });
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
    const report = top10.map((item, idx) => `${idx + 1}. ${item.ganZhi || "-"} | ${item.startYear}~${item.endYear} | 나이 ${item.startAge}~${item.endAge}`).join("\n");
    return res.json({ title: "10년 대운 분석", profile: { name, gender, calendarType }, saju, daYunTimeline: top10, report: "10년 대운 타임라인\n" + report });
  } catch (error) {
    return res.status(500).json({ message: "10년 대운 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-lifetime", (req, res) => {
  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType } = req.body || {};
    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    const saju = getSajuFromInput(year, month, day, Number(birthHour), Number(birthMinute), calendarType === "lunar", gender);
    const currentDaYun = saju.luckCycle && saju.luckCycle.currentDaYun;
    const currentSeWoon = saju.luckCycle && saju.luckCycle.currentSeWoon;
    const dominant = saju.fiveElements.labels[saju.fiveElements.dominantElement];
    const weak = saju.fiveElements.labels[saju.fiveElements.weakestElement];
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
    return res.json({ title: "평생 사주 분석", profile: { name, gender, calendarType }, saju, report });
  } catch (error) {
    return res.status(500).json({ message: "평생 사주 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log("Saju app server running on http://localhost:" + PORT);
});