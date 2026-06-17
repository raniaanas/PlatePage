const PACI_BASE = "https://pcdapi.paci.kw:443/test";
const PACI_USER = "gis";
const PACI_PASS = "9#7RnYCtJ$LL";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { requestId } = req.query;
    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    // Login
    const loginRes = await fetch(PACI_BASE + "/paci/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: PACI_USER, password: PACI_PASS }),
    });
    const loginData = await loginRes.json();

    if (!loginData.accessToken) {
      return res.status(500).json({ error: "PACI login failed" });
    }

    // Check status
    const checkRes = await fetch(PACI_BASE + "/mobile-id/check/" + requestId, {
      method: "GET",
      headers: { "Authorization": "Bearer " + loginData.accessToken },
    });
    const checkData = await checkRes.json();

    return res.status(200).json({
      statusCode: checkData.statusCode,
      requestStatus: checkData.requestStatus,
      isUsed: checkData.isUsed,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
