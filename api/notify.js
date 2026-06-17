const https = require("https");

const PACI_BASE_HOST = "pcdapi.paci.kw";
const PACI_BASE_PATH = "/test";
const PACI_USER = "gis";
const PACI_PASS = "9#7RnYCtJ$LL";

function httpsPost(host, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    };
    if (token) headers["Authorization"] = "Bearer " + token;

    const req = https.request({
      hostname: host,
      port: 443,
      path: path,
      method: "POST",
      headers: headers,
      rejectUnauthorized: false,
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => raw += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Bad JSON: " + raw)); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(host, path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      port: 443,
      path: path,
      method: "GET",
      headers: { "Authorization": "Bearer " + token },
      rejectUnauthorized: false,
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => raw += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Bad JSON: " + raw)); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const { civilId, parcel } = req.body;

    if (!civilId || !parcel) {
      res.status(400).json({ error: "civilId and parcel are required" });
      return;
    }

    // Step 1: Login
    const loginData = await httpsPost(PACI_BASE_HOST, PACI_BASE_PATH + "/paci/login", {
      username: PACI_USER,
      password: PACI_PASS,
    });

    if (!loginData.accessToken) {
      res.status(500).json({ error: "PACI login failed", detail: loginData });
      return;
    }

    // Step 2: Send push notification
    const notifyData = await httpsPost(
      PACI_BASE_HOST,
      PACI_BASE_PATH + "/mobile-id/call",
      {
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
      },
      loginData.accessToken
    );

    if (notifyData.statusCode !== 900) {
      res.status(400).json({
        error: "PACI notification failed",
        statusCode: notifyData.statusCode,
        errorCode: notifyData.errorCode,
      });
      return;
    }

    res.status(200).json({ success: true, requestId: notifyData.requestId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
