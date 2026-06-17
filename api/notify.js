const PACI_BASE = "https://pcdapi.paci.kw:443/test";
const PACI_USER = "gis";
const PACI_PASS = "9#7RnYCtJ$LL";

module.exports = async function handler(req, res) {
  // CORS - must be first before anything else
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight immediately
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    var body = req.body;
    var civilId = body.civilId;
    var parcel = body.parcel;

    if (!civilId || !parcel) {
      res.status(400).json({ error: "civilId and parcel are required" });
      return;
    }

    // Login to PACI
    var loginRes = await fetch(PACI_BASE + "/paci/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: PACI_USER, password: PACI_PASS }),
    });
    var loginData = await loginRes.json();

    if (!loginData.accessToken) {
      res.status(500).json({ error: "PACI login failed", detail: loginData });
      return;
    }

    // Send push notification
    var notifyRes = await fetch(PACI_BASE + "/mobile-id/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + loginData.accessToken,
      },
      body: JSON.stringify({
        civilId: civilId,
        requestType: 1,
        assuranceLevel: 20,
        subjectEn: "Kuwait Finder - Parcel Access",
        subjectAr: "كويت فايندر - الوصول للقطعة",
        messageEn: "Approve access to parcel " + parcel,
        messageAr: "الموافقة على الوصول للقطعة " + parcel,
        authenticationReasonEn: "Parcel ownership verification",
        authenticationReasonAr: "التحقق من ملكية القطعة",
        requestUserDetails: true,
        returnedUserDetails: [1],
        userDetail: [0],
      }),
    });
    var notifyData = await notifyRes.json();

    if (notifyData.statusCode !== 900) {
      res.status(400).json({
        error: "PACI notification failed",
        statusCode: notifyData.statusCode,
        errorCode: notifyData.errorCode,
      });
      return;
    }

    res.status(200).json({
      success: true,
      requestId: notifyData.requestId,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
