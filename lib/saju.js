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

module.exports = {
  getSajuFromInput,
};