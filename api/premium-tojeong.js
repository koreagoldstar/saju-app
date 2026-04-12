const { buildPremiumTojeongResponse } = require("../lib/premium-tojeong-logic");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const payload = buildPremiumTojeongResponse(req.body || {});
    return res.status(200).json(payload);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "신토정비결 분석 중 오류가 발생했습니다.", detail: error.message });
  }
};
