const { searchDreamByKeyword } = require("../lib/content-services");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { keyword } = req.body || {};
    const result = searchDreamByKeyword(keyword);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "꿈해몽 처리 중 오류가 발생했습니다.", detail: error.message });
  }
};
