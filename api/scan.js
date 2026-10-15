// one page of a wallet's history: up to 50 signatures, each fetched and parsed. the browser keeps calling with ?before=
const { ADDR, UA, send } = require("./_lib");
const { parseTx } = require("./_parse");
const RPC = () => process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

async function rpc(method, params) {
  const r = await fetch(RPC(), { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json().catch(() => null);
  if (!j || j.error) throw new Error(method + " " + (j && j.error ? j.error.message : r.status));
  return j.result;
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  async function w() { while (i < items.length) { const k = i++; for (let a = 0; a < 3; a++) { try { out[k] = await fn(items[k]); break; } catch (e) { out[k] = undefined; await new Promise(r => setTimeout(r, (process.env.RPC_URL ? 300 : 800) * (a + 1))); } } } }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, w));
  return out;
}

module.exports = async function (req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const w = String(q.w || ""), before = String(q.before || ""), lim = Math.max(10, Math.min(50, Number(q.limit) || 40));
  if (!ADDR.test(w)) return send(res, 400, { error: "w: one wallet address" });
  if (before && !/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(before)) return send(res, 400, { error: "before: one signature" });
  try {
    const opt = { limit: lim }; if (before) opt.before = before;
    const sigs = await rpc("getSignaturesForAddress", [w, opt]);
    const ok = sigs.filter(s => !s.err);
    const txs = await pool(ok, process.env.RPC_URL ? 8 : 3, s => rpc("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]));
    const rows = [], missed = [];
    txs.forEach((tx, i) => { if (tx === undefined) { missed.push(ok[i].signature); return; } const r = parseTx(tx, w); if (r) rows.push(r); });
    send(res, 200, { rows, seen: sigs.length, failed: sigs.length - ok.length, missed, oldest: sigs.length ? sigs[sigs.length - 1].blockTime || null : null, next: sigs.length === lim ? sigs[sigs.length - 1].signature : null }, "no-store");
  } catch (e) {
    send(res, 502, { error: "chain data unavailable" });
  }
};
module.exports.rpc = rpc;
