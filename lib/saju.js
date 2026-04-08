const { Solar, Lunar } = require("lunar-javascript");

function buildSajuResultFromLunar(lunar) {
  const eightChar = lunar.getEightChar();
  const yearPillar = eightChar.getYearGan() + eightChar.getYearZhi();
  const monthPillar = eightChar.getMonthGan() + eightChar.getMonthZhi();
  const dayPillar = eightChar.getDayGan() + eightChar.getDayZhi();
  const timePillar = eightChar.getTimeGan() + eightChar.getTimeZhi();

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    timePillar,
    eightChar: yearPillar + " " + monthPillar + " " + dayPillar + " " + timePillar,
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

function getSajuFromInput(year, month, day, hour, minute, isLunar) {
  if (isLunar) {
    const lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0);
    const solar = lunar.getSolar();
    return {
      calendarType: "lunar",
      solarDateTime: solar.toYmdHms(),
      lunarDateTime: formatLunarDateTime(lunar),
      ...buildSajuResultFromLunar(lunar),
    };
  }

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  return {
    calendarType: "solar",
    solarDateTime: solar.toYmdHms(),
    lunarDateTime: formatLunarDateTime(lunar),
    ...buildSajuResultFromLunar(lunar),
  };
}

function printSajuFromSolarInput(year, month, day, hour = 0, minute = 0, second = 0) {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, second);
  const lunar = solar.getLunar();
  const result = buildSajuResultFromLunar(lunar);

  console.log("Input Solar DateTime:", year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second);
  console.log("Saju 8 Characters");
  console.log("Year Pillar:", result.yearPillar);
  console.log("Month Pillar:", result.monthPillar);
  console.log("Day Pillar:", result.dayPillar);
  console.log("Time Pillar:", result.timePillar);
  console.log("8 Char:", result.eightChar);
}

module.exports = {
  getSajuFromInput,
  printSajuFromSolarInput,
};