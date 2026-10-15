// turns one jsonParsed transaction into what it did for one wallet: sol/stable spent or received, tokens in or out.
// works for any dex, bot or launchpad because it only reads the wallet's own balance changes.
const WSOL = "So11111111111111111111111111111111111111112";
const STABLE = { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC", Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT" };

function keyOf(k) { return typeof k === "string" ? k : k.pubkey; }

function parseTx(tx, owner) {
  if (!tx || !tx.meta || tx.meta.err) return null;
  const keys = tx.transaction.message.accountKeys.map(keyOf);
  const idx = keys.indexOf(owner);
  const fee = idx === 0 ? tx.meta.fee : 0;
  let sol = idx >= 0 ? (tx.meta.postBalances[idx] - tx.meta.preBalances[idx] + fee) / 1e9 : 0;
  const d = {};
  const add = (b, sign) => {
    if (!b || b.owner !== owner) return;
    const v = Number(b.uiTokenAmount.uiAmountString || 0) * sign;
    d[b.mint] = (d[b.mint] || 0) + v;
  };
  (tx.meta.preTokenBalances || []).forEach(b => add(b, -1));
  (tx.meta.postTokenBalances || []).forEach(b => add(b, 1));
  if (d[WSOL]) { sol += d[WSOL]; delete d[WSOL]; }
  let quote = "SOL", q = sol;
  for (const m in STABLE) if (Math.abs(d[m] || 0) > 1e-9) { quote = STABLE[m]; q = d[m]; delete d[m]; }
  const toks = Object.keys(d).filter(m => Math.abs(d[m]) > 1e-12);
  const base = { sig: tx.transaction.signatures[0], t: tx.blockTime || 0, fee: fee / 1e9 };
  const eps = quote === "SOL" ? 1e-6 : 1e-4;
  if (toks.length === 1) {
    const m = toks[0], a = d[m];
    if (a > 0 && q < -eps) return Object.assign(base, { type: "buy", mint: m, amt: a, quote, qamt: -q });
    if (a < 0 && q > eps) return Object.assign(base, { type: "sell", mint: m, amt: -a, quote, qamt: q });
    return Object.assign(base, { type: a > 0 ? "in" : "out", mint: m, amt: Math.abs(a), quote, qamt: 0 });
  }
  if (toks.length === 2 && d[toks[0]] * d[toks[1]] < 0) {
    const out = d[toks[0]] < 0 ? toks[0] : toks[1], inn = out === toks[0] ? toks[1] : toks[0];
    return Object.assign(base, { type: "swap", mint: inn, amt: d[inn], from: out, famt: -d[out], quote, qamt: 0 });
  }
  if (!toks.length && Math.abs(q) > eps && quote === "SOL") return Object.assign(base, { type: q > 0 ? "sol-in" : "sol-out", mint: null, amt: 0, quote, qamt: Math.abs(q) });
  if (!toks.length && fee) return Object.assign(base, { type: "fee", mint: null, amt: 0, quote, qamt: 0 });
  return null;
}

module.exports = { parseTx, WSOL, STABLE };
