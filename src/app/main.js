// Runtime check for lunar-javascript integration.
const { Solar } = require('lunar-javascript');

function printSampleLunarDate() {
  const solar = Solar.fromYmd(1990, 1, 1);
  const lunar = solar.getLunar();
  console.log('Sample solar date:', solar.toYmd());
  console.log('Converted lunar date:', lunar.toFullString());
}

printSampleLunarDate();
