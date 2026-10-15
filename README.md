# $TAX

On-chain P&L and tax CSV for any Solana wallet. Static page + Vercel functions, no build step.

## Env vars (Vercel → Settings → Environment Variables)

- `TAX_MINT`: the $TAX mint. Unset = exports open to everyone. Set = connected wallet needs $50+ of $TAX.
- `RPC_URL`: a Solana RPC (Helius recommended). Enables faster scans and token names via DAS.

## Routes

`/api/scan` one page of a wallet's history, parsed · `/api/tokens` symbols · `/api/sol` SOL/USD daily closes · `/api/market` DexScreener · `/api/rpc` holder check · `/api/config` · `/api/og` share image

## Dev

`python3 build.py` builds index.html from src/. Tests: `node test/parse.js`, `node test/calc.js`, `node test/site.mjs`.
