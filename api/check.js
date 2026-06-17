// api/check.js
// Vercel Serverless Function — polls PACI Mobile ID approval status

const PACI_BASE     = "https://pcdapi.paci.kw:443/test";
const PACI_USERNAME = "gis";
const PACI_PASSWORD = "9#7RnYCtJ$LL";

async function paciLogin() {
  const res = await fetch(`${PACI_BASE}/paci/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ username: PACI_USERNAME, password: PACI_PASSWORD }),
  });
  if (!res.ok) throw new Error(`PACI login failed: ${res.status}`);
  const data = await res.json();
  if (!data.accessToken) throw new Error("No access token from PACI");
  return data.accessToken;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { requestId } = req.query;

    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    const accessToken = await paciLogin();

    const checkRes = await fetch(`${PACI_BASE}/mobile-id/check/${requestId}`, {
      method:  "GET",
      headers: { "Authorization": `Bearer ${accessToken}` },
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
