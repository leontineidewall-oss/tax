// read-only json-rpc proxy for the holder check
const { UA, send } = require("./_lib");
const RPC = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const ALLOW = { getTokenAccountsByOwner: 1, getBalance: 1 };
module.exports = async function (req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  let body = req.body;
  if (!body || typeof body !== "object") { try { body = JSON.parse(await new Promise((ok, bad) => { let s = ""; req.on("data", c => { s += c; if (s.length > 8192) bad(new Error("big")); }); req.on("end", () => ok(s)); req.on("error", bad); })); } catch (e) { return send(res, 400, { error: "bad json" }); } }
  if (!ALLOW[body.method] || !Array.isArray(body.params)) return send(res, 400, { error: "method not allowed" });
  try {
    const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: body.method, params: body.params }) });
    send(res, 200, await r.json());
  } catch (e) { send(res, 502, { error: "rpc unreachable" }); }
};
