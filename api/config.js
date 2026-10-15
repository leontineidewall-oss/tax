// public settings: the $TAX mint (set by the team in Vercel). without it, exports are open to everyone.
const { ADDR, send } = require("./_lib");
module.exports = function (req, res) {
  const mint = (process.env.TAX_MINT || "").trim();
  send(res, 200, { mint: ADDR.test(mint) ? mint : null, customRpc: !!process.env.RPC_URL }, "public, s-maxage=60");
};
