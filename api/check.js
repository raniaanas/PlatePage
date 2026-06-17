const https = require("https");

const PACI_BASE_HOST = "pcdapi.paci.kw";
const PACI_BASE_PATH = "/test";
const PACI_USER = "gis";
const PACI_PASS = "9#7RnYCtJ$LL";

function httpsPost(host, path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: host,
      port: 443,
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
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
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const { requestId } = req.query;
    if (!requestId) { res.status(400).json({ error: "requestId is required" }); return; }

    // Login
    const loginData = await httpsPost(PACI_BASE_HOST, PACI_BASE_PATH + "/paci/login", {
      username: PACI_USER,
      password: PACI_PASS,
    });

    if (!loginData.accessToken) {
      res.status(500).json({ error: "PACI login failed" });
      return;
    }

    // Check status
    const checkData = await httpsGet(
      PACI_BASE_HOST,
      PACI_BASE_PATH + "/mobile-id/check/" + requestId,
      loginData.accessToken
    );

    res.status(200).json({
      statusCode: checkData.statusCode,
      requestStatus: checkData.requestStatus,
      isUsed: checkData.isUsed,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
