export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const PACI_BASE     = "https://pcdapi.paci.kw:443/test";
  const PACI_USERNAME = "gis";
  const PACI_PASSWORD = "9#7RnYCtJ$LL";

  try {
    const { civilId, parcel } = req.body;

    if (!civilId || !parcel) {
      return res.status(400).json({ error: "civilId and parcel are required" });
    }

    if (!/^[1234]\d{11}$/.test(civilId)) {
      return res.status(400).json({ error: "Invalid Civil ID format" });
    }

    // Step 1: Login
    const loginRes = await fetch(PACI_BASE + "/paci/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: PACI_USERNAME, password: PACI_PASSWORD }),
    });

    const loginData = await loginRes.json();

    if (!loginData.accessToken) {
      return res.status(500).json({ error: "PACI login failed", detail: loginData });
    }

    // Step 2: Send push notification
    const notifyRes = await fetch(PACI_BASE + "/mobile-id/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + loginData.accessToken,
      },
      body: JSON.stringify({
        civilId:                civilId,
        requestType:            1,
        assuranceLevel:         20,
        subjectEn:              "Kuwait Finder - Parcel Access",
        subjectAr:              "كويت فايندر - الوصول للقطعة",
        messageEn:              "Approve access to parcel " + parcel,
        messageAr:              "الموافقة على الوصول للقطعة " + parcel,
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
