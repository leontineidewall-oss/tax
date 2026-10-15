// market facts for one mint from DexScreener: the most liquid pair, plus buys and sells across all pairs in the last 6h
const { ADDR, getJson, send, n } = require("./_lib");

function pick(pairs, mint) {
  const mine = (Array.isArray(pairs) ? pairs : []).filter(function (p) { return p && p.baseToken && p.baseToken.address === mint; });
  if (!mine.length) return null;
  mine.sort(function (a, b) { return ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0); });
  const p = mine[0];
  return {
    mint: mint,
    symbol: String(p.baseToken.symbol || "").slice(0, 16),
    dex: String(p.dexId || ""),
    priceUsd: n(p.priceUsd),
    liquidityUsd: n(p.liquidity && p.liquidity.usd),
    marketCapUsd: n(p.marketCap != null ? p.marketCap : p.fdv),
    buys6h: mine.reduce(function (s, q) { return s + (Number(q.txns && q.txns.h6 && q.txns.h6.buys) || 0); }, 0),
    sells6h: mine.reduce(function (s, q) { return s + (Number(q.txns && q.txns.h6 && q.txns.h6.sells) || 0); }, 0),
    url: String(p.url || "")
  };
}

module.exports = async function (req, res) {
  const mint = String((req.query && req.query.mint) || new URL(req.url, "http://x").searchParams.get("mint") || "");
  if (!ADDR.test(mint)) return send(res, 400, { error: "mint: one address" });
  try {
    const pairs = await getJson("https://api.dexscreener.com/tokens/v1/solana/" + mint);
    send(res, 200, { market: pick(pairs, mint), fetchedAt: new Date().toISOString() }, "public, s-maxage=30, stale-while-revalidate=60");
  } catch (e) {
    send(res, 502, { error: "market data unavailable" });
  }
};
module.exports.pick = pick;
