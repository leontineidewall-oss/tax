// symbols for up to 50 mints: Helius DAS when RPC_URL supports it, then DexScreener for the rest
const { ADDR, send, getJson } = require("./_lib");
const { rpc } = require("./scan");
module.exports = async function (req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const mints = String(q.mints || "").split(",").filter(m => ADDR.test(m)).slice(0, 50);
  if (!mints.length) return send(res, 400, { error: "mints: comma separated addresses" });
  const out = {};
  try {
    const a = await rpc("getAssetBatch", { ids: mints });
    (a || []).forEach(x => { const s = x && x.content && x.content.metadata && x.content.metadata.symbol; if (s) out[x.id] = String(s).slice(0, 16); });
  } catch (e) {}
  const rest = mints.filter(m => !out[m]);
  for (let i = 0; i < rest.length; i += 30) {
    try {
      const pairs = await getJson("https://api.dexscreener.com/tokens/v1/solana/" + rest.slice(i, i + 30).join(","));
      (Array.isArray(pairs) ? pairs : []).forEach(p => { [p.baseToken, p.quoteToken].forEach(t => { if (t && rest.includes(t.address) && !out[t.address]) out[t.address] = String(t.symbol || "").slice(0, 16); }); });
    } catch (e) {}
  }
  send(res, 200, { symbols: out }, "public, s-maxage=86400, stale-while-revalidate=86400");
};
