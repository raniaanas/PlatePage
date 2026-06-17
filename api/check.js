const PACI_BASE = "https://pcdapi.paci.kw:443/test";
const PACI_USER = "gis";
const PACI_PASS = "9#7RnYCtJ$LL";

module.exports = async function handler(req, res) {
  // CORS - must be first
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight immediately
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    var requestId = req.query.requestId;

    if (!requestId) {
      res.status(400).json({ error: "requestId is required" });
      return;
    }

    // Login
    var loginRes = await fetch(PACI_BASE + "/paci/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: PACI_USER, password: PACI_PASS }),
    });
    var loginData = await loginRes.json();

    if (!loginData.accessToken) {
      res.status(500).json({ error: "PACI login failed" });
      return;
    }

    // Check status
    var checkRes = await fetch(PACI_BASE + "/mobile-id/check/" + requestId, {
      method: "GET",
      headers: { "Authorization": "Bearer " + loginData.accessToken },
    });
    var checkData = await checkRes.json();

    res.status(200).json({
      statusCode: checkData.statusCode,
      requestStatus: checkData.requestStatus,
      isUsed: checkData.isUsed,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
