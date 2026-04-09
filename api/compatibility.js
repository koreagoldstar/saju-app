const { buildCompatibilityResult } = require("../lib/content-services");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

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

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "궁합 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
