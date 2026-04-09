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
      name + "님의 평생 사주 분석은 " + saju.dayPillar + " 일주를 중심으로 장기 흐름을 읽습니다.",
      "이 리포트는 한 번의 결론이 아니라, 대운/세운 전환에 따라 해석 강도가 달라지는 장기 지도입니다.",
      "현재는 " + (currentDaYun ? currentDaYun.ganZhi + " (" + currentDaYun.startYear + "~" + currentDaYun.endYear + ")" : "분석 중") + " 구간으로, 무리한 확장보다 기반 정비가 유리합니다.",
      "",
      "시기별 변화 포인트",
      "오행 분포는 목 " + saju.fiveElements.counts.wood + ", 화 " + saju.fiveElements.counts.fire + ", 토 " + saju.fiveElements.counts.earth + ", 금 " + saju.fiveElements.counts.metal + ", 수 " + saju.fiveElements.counts.water + "입니다.",
      "강한 기운은 " + dominant + ", 보완 기운은 " + weak + "으로 나타나며, 환경 변화(이직/이사/관계 변화)에 따라 체감 흐름이 달라질 수 있습니다.",
      "세운 " + (currentSeWoon ? currentSeWoon.ganZhi + " (" + currentSeWoon.year + "년)" : "분석 중") + " 구간에서는 단기 성과보다 안정적 누적이 더 높은 기대값을 만듭니다.",
      "",
      "지속 점검 가이드",
      "평생 사주 리포트는 분기 1회, 또는 큰 전환 이벤트 전후로 재확인하는 것이 가장 효과적입니다.",
      "동일한 사주라도 시기와 상황에 따라 우선순위가 바뀌므로, 고정 해석보다 업데이트 관점으로 활용해 주세요.",
      "권장 루틴: 1) 현재 대운 위치 확인 2) 다음 전환까지 남은 기간 점검 3) 관계/재무/건강 우선순위 재설정.",
    ].join("\n");
    return res.json({ title: "평생 사주 분석", profile: { name, gender, calendarType }, saju, report });
  } catch (error) {
    return res.status(500).json({ message: "평생 사주 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log("Saju app server running on http://localhost:" + PORT);
});