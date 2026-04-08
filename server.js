require("dotenv").config();

const path = require("path");
const express = require("express");
const { getSajuFromInput } = require("./lib/saju");
const { getClaudeSajuFortune, normalizeCategory, CATEGORY_LABELS } = require("./lib/claude");

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

function buildFallbackFortune(data) {
  const category = normalizeCategory(data.category);
  const categoryLabel = CATEGORY_LABELS[category];
  const map = {
    love: "서두르지 않고 감정을 차분히 전달하면 관계 흐름이 좋아집니다.",
    business: "새 제안은 이익 구조와 리스크를 먼저 점검하면 안정적입니다.",
    benefactor: "주변 조언 속에 결정적 힌트가 있으니 열린 태도가 유리합니다.",
    career: "업무 우선순위를 명확히 하면 평가와 성과가 동시에 좋아집니다.",
    wealth: "작은 지출을 관리하면 금전운이 빠르게 회복되는 날입니다.",
  };

  return [
    data.name + "님의 오늘 " + categoryLabel + "은 " + data.saju.dayPillar + " 기운이 중심입니다.",
    map[category],
    "오늘의 팁: 중요한 결론은 한 번 더 확인한 뒤 진행하세요.",
  ].join(" ");
}

app.post("/api/saju", async (req, res) => {
  try {
    const { name, birthDate, birthHour, birthMinute, gender, calendarType, category } = req.body || {};

    if (!name || !birthDate || birthHour === undefined || birthMinute === undefined || !gender || !calendarType) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    const [year, month, day] = birthDate.split("-").map(Number);
    const hour = Number(birthHour);
    const minute = Number(birthMinute);
    const isLunar = calendarType === "lunar";
    const normalizedCategory = normalizeCategory(category);

    const saju = getSajuFromInput(year, month, day, hour, minute, isLunar);

    let aiFortune = "";
    let aiProvider = "claude";

    try {
      aiFortune = await getClaudeSajuFortune({
        name,
        gender,
        calendarType,
        category: normalizedCategory,
        ...saju,
      });
    } catch (apiError) {
      aiProvider = "fallback";
      aiFortune = buildFallbackFortune({ name, gender, saju, category: normalizedCategory });
      console.error("Claude API fallback:", apiError.message);
    }

    return res.json({
      profile: { name, gender, calendarType },
      category: normalizedCategory,
      categoryLabel: CATEGORY_LABELS[normalizedCategory],
      saju,
      aiProvider,
      aiFortune,
    });
  } catch (error) {
    return res.status(500).json({ message: "사주 계산 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log("Saju app server running on http://localhost:" + PORT);
});