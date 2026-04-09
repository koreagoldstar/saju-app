const { drawRandomTarotCards } = require("../lib/content-services");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { drawCount } = req.body || {};
    const result = drawRandomTarotCards(drawCount);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "타로 처리 중 오류가 발생했습니다.", detail: error.message });
  }
};
