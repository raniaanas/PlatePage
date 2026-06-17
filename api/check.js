export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const PACI_BASE     = "https://pcdapi.paci.kw:443/test";
  const PACI_USERNAME = "gis";
  const PACI_PASSWORD = "9#7RnYCtJ$LL";

  try {
    const { requestId } = req.query;

    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    // Login
    const loginRes = await fetch(PACI_BASE + "/paci/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: PACI_USERNAME, password: PACI_PASSWORD }),
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
      statusCode:    checkData.statusCode,
      requestStatus: checkData.requestStatus,
      isUsed:        checkData.isUsed,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
