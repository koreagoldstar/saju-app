require("dotenv").config();

const path = require("path");
const express = require("express");
const { getSajuFromInput } = require("./lib/saju");
const { buildPremiumTomorrowResponse } = require("./lib/premium-tomorrow-logic");
const { buildPremiumTojeongResponse } = require("./lib/premium-tojeong-logic");
const { buildPremiumLifetimeResponse } = require("./lib/premium-lifetime-logic");
const { buildPremiumDaewoonResponse } = require("./lib/premium-daewoon-logic");
const { buildPremiumZodiacResponse } = require("./lib/premium-zodiac-logic");
const { buildPremiumStarSignResponse } = require("./lib/premium-star-sign-logic");
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
      fortuneDateKey: generated.fortuneDateKey,
      todayDayPillar: generated.todayDayPillar,
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
    const payload = buildPremiumTojeongResponse(req.body || {});
    return res.json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "신토정비결 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-daewoon", (req, res) => {
  try {
    const payload = buildPremiumDaewoonResponse(req.body || {});
    return res.json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "10년 대운 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-lifetime", (req, res) => {
  try {
    const payload = buildPremiumLifetimeResponse(req.body || {});
    return res.json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "평생 사주 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-tomorrow", (req, res) => {
  try {
    const payload = buildPremiumTomorrowResponse(req.body || {});
    return res.json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "내일의 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-zodiac", (req, res) => {
  try {
    const payload = buildPremiumZodiacResponse(req.body || {});
    return res.json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "띠 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.post("/api/premium-star-sign", (req, res) => {
  try {
    const payload = buildPremiumStarSignResponse(req.body || {});
    return res.json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "별자리 운세 분석 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log("Saju app server running on http://localhost:" + PORT);
});