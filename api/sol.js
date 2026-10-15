// daily SOL/USD closes from Coinbase's public candles, for turning sol amounts into dollars on the day of each trade
const { send, UA } = require("./_lib");
module.exports = async function (req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const DAY = 86400, now = Math.floor(Date.now() / 1000);
  let from = Math.floor(Number(q.from) / DAY) * DAY, to = Math.min(now, Number(q.to) || now);
  if (!(from > 1.5e9) || to < from) return send(res, 400, { error: "from/to: unix seconds" });
  from = Math.max(from, to - 4 * 365 * DAY);
  const days = {};
  try {
    for (let s = from; s <= to; s += 290 * DAY) {
      const e = Math.min(to, s + 290 * DAY);
      const u = "https://api.exchange.coinbase.com/products/SOL-USD/candles?granularity=86400&start=" + new Date(s * 1000).toISOString() + "&end=" + new Date(e * 1000).toISOString();
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!r.ok) throw new Error("coinbase " + r.status);
      (await r.json()).forEach(c => { days[Math.floor(c[0] / DAY)] = c[4]; });
    }
    send(res, 200, { source: "coinbase SOL-USD daily close", days }, "public, s-maxage=3600, stale-while-revalidate=86400");
  } catch (e) {
    send(res, 502, { error: "price history unavailable" });
  }
};
