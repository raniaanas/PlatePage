// api/notify.js
// Vercel Serverless Function — sends PACI Mobile ID push notification

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  try {
    const { civilId, parcel } = req.body;

    if (!civilId || !parcel) {
      return res.status(400).json({ error: "civilId and parcel are required" });
    }

    if (!/^[1234]\d{11}$/.test(civilId)) {
      return res.status(400).json({ error: "Invalid Civil ID format" });
    }

    // 1. Login to PACI
    const accessToken = await paciLogin();

    // 2. Send push notification
    const notifyRes = await fetch(`${PACI_BASE}/mobile-id/call`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        civilId:                civilId,
        requestType:            1,        // 1 = Push Notification
        assuranceLevel:         20,       // 20 = Medium
        subjectEn:              "Kuwait Finder - Parcel Access",
        subjectAr:              "كويت فايندر - الوصول للقطعة",
        messageEn:              `Approve access to parcel ${parcel}`,
        messageAr:              `الموافقة على الوصول للقطعة ${parcel}`,
        authenticationReasonEn: "Parcel ownership verification",
        authenticationReasonAr: "التحقق من ملكية القطعة",
        requestUserDetails:     true,
        returnedUserDetails:    [1],
        userDetail:             [0],
      }),
    });

    const notifyData = await notifyRes.json();

    if (notifyData.statusCode !== 900) {
      return res.status(400).json({
        error:      "Failed to send notification",
        statusCode: notifyData.statusCode,
        errorCode:  notifyData.errorCode,
      });
    }

    return res.status(200).json({
      success:   true,
      requestId: notifyData.requestId,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
