const { Solar, Lunar } = require("lunar-javascript");
const ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];
const ELEMENT_LABELS = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};
const GAN_ELEMENT_MAP = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};
const ZHI_ELEMENT_MAP = {
  子: "water",
  丑: "earth",
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
};

function assertIntegerRange(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(label + " 값이 올바르지 않습니다.");
  }
}

function assertValidDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("생년월일 값이 올바르지 않습니다.");
  }
}

function normalizeGenderForYun(gender) {
  return String(gender || "").toLowerCase() === "female" ? 0 : 1;
}

function findCurrentDaYun(daYunList, currentYear) {
  return (
    daYunList.find((item) => item.startYear <= currentYear && currentYear <= item.endYear) ||
    daYunList[daYunList.length - 1] ||
    null
  );
}

function getElementFromGan(gan) {
  return GAN_ELEMENT_MAP[gan] || "earth";
}

function getElementFromZhi(zhi) {
  return ZHI_ELEMENT_MAP[zhi] || "earth";
}

function createZeroElementCount() {
  return {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
}

function buildFiveElementAnalysis(manse) {
  const counts = createZeroElementCount();
  const cells = [
    { slot: "year_gan", label: "년간", value: manse.year.gan, element: manse.year.ganElement },
    { slot: "year_zhi", label: "년지", value: manse.year.zhi, element: manse.year.zhiElement },
    { slot: "month_gan", label: "월간", value: manse.month.gan, element: manse.month.ganElement },
    { slot: "month_zhi", label: "월지", value: manse.month.zhi, element: manse.month.zhiElement },
    { slot: "day_gan", label: "일간", value: manse.day.gan, element: manse.day.ganElement },
    { slot: "day_zhi", label: "일지", value: manse.day.zhi, element: manse.day.zhiElement },
    { slot: "time_gan", label: "시간", value: manse.time.gan, element: manse.time.ganElement },
    { slot: "time_zhi", label: "시지", value: manse.time.zhi, element: manse.time.zhiElement },
  ];

  cells.forEach((cell) => {
    counts[cell.element] += 1;
  });

  const total = cells.length || 1;
  const percentages = ELEMENT_KEYS.reduce((acc, key) => {
    acc[key] = Math.round((counts[key] / total) * 100);
    return acc;
  }, {});

  const sorted = [...ELEMENT_KEYS].sort((a, b) => counts[b] - counts[a]);
  return {
    cells,
    counts,
    percentages,
    dominantElement: sorted[0],
    weakestElement: sorted[sorted.length - 1],
    labels: ELEMENT_LABELS,
  };
}

function buildSajuResultFromLunar(lunar) {
  const eightChar = lunar.getEightChar();
  // Sect 2 is commonly used in modern Korean saju reading for day pillar boundary handling.
  if (typeof eightChar.setSect === "function") {
    eightChar.setSect(2);
  }

  const yearPillar = eightChar.getYearGan() + eightChar.getYearZhi();
  const monthPillar = eightChar.getMonthGan() + eightChar.getMonthZhi();
  const dayPillar = eightChar.getDayGan() + eightChar.getDayZhi();
  const timePillar = eightChar.getTimeGan() + eightChar.getTimeZhi();
  const dayMaster = eightChar.getDayGan();
  const yearHiddenStems = typeof eightChar.getYearHideGan === "function" ? eightChar.getYearHideGan() : [];
  const monthHiddenStems = typeof eightChar.getMonthHideGan === "function" ? eightChar.getMonthHideGan() : [];
  const dayHiddenStems = typeof eightChar.getDayHideGan === "function" ? eightChar.getDayHideGan() : [];
  const timeHiddenStems = typeof eightChar.getTimeHideGan === "function" ? eightChar.getTimeHideGan() : [];
  const manse = {
    year: {
      gan: eightChar.getYearGan(),
      zhi: eightChar.getYearZhi(),
      ganElement: getElementFromGan(eightChar.getYearGan()),
      zhiElement: getElementFromZhi(eightChar.getYearZhi()),
    },
    month: {
      gan: eightChar.getMonthGan(),
      zhi: eightChar.getMonthZhi(),
      ganElement: getElementFromGan(eightChar.getMonthGan()),
      zhiElement: getElementFromZhi(eightChar.getMonthZhi()),
    },
    day: {
      gan: eightChar.getDayGan(),
      zhi: eightChar.getDayZhi(),
      ganElement: getElementFromGan(eightChar.getDayGan()),
      zhiElement: getElementFromZhi(eightChar.getDayZhi()),
    },
    time: {
      gan: eightChar.getTimeGan(),
      zhi: eightChar.getTimeZhi(),
      ganElement: getElementFromGan(eightChar.getTimeGan()),
      zhiElement: getElementFromZhi(eightChar.getTimeZhi()),
    },
  };
  const fiveElements = buildFiveElementAnalysis(manse);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    timePillar,
    dayMaster,
    hiddenStems: {
      year: yearHiddenStems,
      month: monthHiddenStems,
      day: dayHiddenStems,
      time: timeHiddenStems,
    },
    manse,
    fiveElements,
    eightChar: yearPillar + " " + monthPillar + " " + dayPillar + " " + timePillar,
    _eightCharRaw: eightChar,
  };
}

function buildLuckCycleFromEightChar(eightChar, gender) {
  const yun = eightChar.getYun(normalizeGenderForYun(gender), 2);
  const daYunSource = yun.getDaYun();
  const currentYear = new Date().getFullYear();
  const daYunList = daYunSource.map((item) => ({
    index: item.getIndex(),
    ganZhi: item.getGanZhi(),
    startYear: item.getStartYear(),
    endYear: item.getEndYear(),
    startAge: item.getStartAge(),
    endAge: item.getEndAge(),
  }));
  const currentDaYun = findCurrentDaYun(daYunList, currentYear);
  let currentSeWoon = null;

  if (currentDaYun) {
    const daYunRef = daYunSource.find((item) => item.getIndex() === currentDaYun.index);
    if (daYunRef) {
      const currentLiuNian = daYunRef.getLiuNian().find((item) => item.getYear() === currentYear);
      if (currentLiuNian) {
        currentSeWoon = {
          year: currentLiuNian.getYear(),
          age: currentLiuNian.getAge(),
          ganZhi: currentLiuNian.getGanZhi(),
        };
      }
    }
  }

  return {
    yunStart: {
      yearOffset: yun.getStartYear(),
      monthOffset: yun.getStartMonth(),
      dayOffset: yun.getStartDay(),
      hourOffset: yun.getStartHour(),
    },
    currentYear,
    currentDaYun,
    currentSeWoon,
    daYunList,
  };
}

function formatLunarDateTime(lunar) {
  return (
    lunar.getYear() +
    "-" +
    lunar.getMonth() +
    "-" +
    lunar.getDay() +
    " " +
    lunar.getHour() +
    ":" +
    lunar.getMinute()
  );
}

function getSajuFromInput(year, month, day, hour, minute, isLunar, gender) {
  assertIntegerRange(year, 1900, 2100, "연도");
  assertIntegerRange(month, 1, 12, "월");
  assertIntegerRange(day, 1, 31, "일");
  assertIntegerRange(hour, 0, 23, "시간");
  assertIntegerRange(minute, 0, 59, "분");
  assertValidDate(year, month, day);

  if (isLunar) {
    const lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0);
    const solar = lunar.getSolar();
    const sajuBase = buildSajuResultFromLunar(lunar);
    const luckCycle = buildLuckCycleFromEightChar(sajuBase._eightCharRaw, gender);
    const { _eightCharRaw, ...safeSajuBase } = sajuBase;
    return {
      calendarType: "lunar",
      calculationBasis: "lunar-javascript:eightchar-sect2",
      solarDateTime: solar.toYmdHms(),
      lunarDateTime: formatLunarDateTime(lunar),
      ...safeSajuBase,
      luckCycle,
    };
  }

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const sajuBase = buildSajuResultFromLunar(lunar);
  const luckCycle = buildLuckCycleFromEightChar(sajuBase._eightCharRaw, gender);
  const { _eightCharRaw, ...safeSajuBase } = sajuBase;
  return {
    calendarType: "solar",
    calculationBasis: "lunar-javascript:eightchar-sect2",
    solarDateTime: solar.toYmdHms(),
    lunarDateTime: formatLunarDateTime(lunar),
    ...safeSajuBase,
    luckCycle,
  };
}

module.exports = {
  getSajuFromInput,
};