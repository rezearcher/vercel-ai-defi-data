// src/tool.ts
import { tool } from "ai";
import { z } from "zod";

// src/client.ts
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
var cached = null;
function makePayFetch(privateKey) {
  if (!privateKey) return fetch;
  if (cached) return cached;
  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: privateKeyToAccount(privateKey)
  });
  cached = wrapFetchWithPayment(fetch, client);
  return cached;
}

// src/data.mjs
var DATA_BASE = "https://x402-data-api.sigrunner.workers.dev";
var ADDR_RE = /0x[a-fA-F0-9]{40}/;
var COINGECKO_ID_RE = /^[a-z0-9-]{1,40}$/;
function normalizeCoins(coins) {
  const raw = Array.isArray(coins) ? coins : String(coins || "").split(",").map((s) => s.trim());
  const ids = raw.filter(Boolean);
  if (ids.length === 0) throw new Error("coins must contain at least one CoinGecko id");
  if (ids.length > 25) throw new Error("coins accepts at most 25 ids");
  const bad = ids.filter((id) => !COINGECKO_ID_RE.test(id));
  if (bad.length) throw new Error(`invalid coingecko id(s): ${bad.join(", ")}`);
  return [...new Set(ids)];
}
function clampLimit(limit, def = 20, max = 100) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}
function buildYieldsUrl({ limit = 20, project, chain, stable, sort = "tvl", base = DATA_BASE } = {}) {
  const qs = new URLSearchParams({ limit: String(clampLimit(limit)) });
  if (project) qs.set("project", String(project));
  if (chain) qs.set("chain", String(chain));
  if (stable === true || stable === "true") qs.set("stable", "true");
  qs.set("sort", sort === "risk_adjusted" ? "risk_adjusted" : "tvl");
  return `${base}/defi/yields?${qs.toString()}`;
}
function buildYieldsPreviewUrl({ base = DATA_BASE } = {}) {
  return `${base}/defi/yields/preview`;
}
function buildPricesUrl({ coins, base = DATA_BASE } = {}) {
  const ids = normalizeCoins(coins);
  const qs = new URLSearchParams({ coins: ids.join(",") });
  return `${base}/crypto/prices?${qs.toString()}`;
}
function buildPricesPreviewUrl({ coins, base = DATA_BASE } = {}) {
  const ids = normalizeCoins(coins);
  const qs = new URLSearchParams({ coins: ids[0] });
  return `${base}/crypto/prices/preview?${qs.toString()}`;
}
function buildBalanceUrl({ address, base = DATA_BASE } = {}) {
  if (!ADDR_RE.test(String(address || ""))) throw new Error(`invalid Base address: ${address}`);
  const qs = new URLSearchParams({ address });
  return `${base}/chain/balance?${qs.toString()}`;
}
function usd(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n).toLocaleString("en-US")}`;
  return `$${n.toFixed(abs < 1 ? 4 : 2)}`;
}
function summarizeYields(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "no yield pools";
  const t = rows[0];
  const bits = [];
  const label = [t.project, t.chain, t.symbol].filter(Boolean).join(" ");
  if (label) bits.push(label);
  if (typeof t.apy === "number") bits.push(`${t.apy.toFixed(2)}% APY`);
  const tvl = usd(t.tvlUsd);
  if (tvl) bits.push(`TVL ${tvl}`);
  if (t.ilRisk && t.ilRisk !== "no") bits.push(`IL risk ${t.ilRisk}`);
  return `Top of ${rows.length}: ${bits.join(" \xB7 ") || "pool"}`;
}
function summarizePrices(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "no prices";
  return rows.slice(0, 4).map((p) => {
    const sym = p.symbol || p.id;
    const price = usd(p.price);
    const chg = typeof p.change_24h === "number" ? ` (${p.change_24h >= 0 ? "+" : ""}${p.change_24h.toFixed(2)}%)` : "";
    return `${sym} ${price}${chg}`;
  }).join(" \xB7 ");
}
function summarizeBalance(out) {
  if (!out || typeof out !== "object" || out.balance_eth == null) return "no balance";
  const eth = Number(out.balance_eth);
  const u = usd(out.balance_usd);
  const addr = out.address ? `${String(out.address).slice(0, 10)}\u2026` : "address";
  return `${addr} holds ${eth.toFixed(4)} ETH${u ? ` (${u})` : ""} on Base`;
}
function fundOnrampHint() {
  return "Grey Ridge data tools are running in FREE preview mode: you get a 1-row sample. To unlock full results (up to 25 prices, 100 ranked yield pools, and live Base balances), set PRIVATE_KEY to a Base wallet holding ~1 USDC (covers ~1000 calls at $0.001 each, paid inline per call via x402 \u2014 no API key, no subscription).";
}
function activationBlock(reason, { paidUrl, priceUsdc }) {
  return {
    needed: true,
    mode: "free_preview",
    reason,
    hint: fundOnrampHint(),
    paid_url: paidUrl,
    price_usdc: priceUsdc
  };
}
async function plainGet(previewFetch, url) {
  const f = previewFetch || (typeof fetch !== "undefined" ? fetch : null);
  if (!f) throw new Error("no fetch available");
  const res = await f(url);
  if (!res.ok && res.status !== 200) throw new Error(`preview failed: HTTP ${res.status}`);
  return res.json();
}
async function fetchYieldsOrPreview(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  const paidUrl = buildYieldsUrl(args);
  const takePreview = async (reason2) => {
    const out = await plainGet(previewFetch, buildYieldsPreviewUrl(args));
    const yields = Array.isArray(out?.preview) ? out.preview : [];
    return { yields, paid: false, total_available: out?.total_available, activation: activationBlock(reason2, { paidUrl, priceUsdc: "0.001" }) };
  };
  if (!hasKey) return takePreview("no PRIVATE_KEY configured");
  const res = await payFetch(paidUrl);
  if (res.ok || res.status === 200) {
    const out = await res.json();
    return { yields: Array.isArray(out) ? out : [], paid: true };
  }
  const reason = res.status === 402 ? "wallet not funded (paid /defi/yields returned 402)" : `paid /defi/yields returned HTTP ${res.status}`;
  return takePreview(reason);
}
async function fetchPricesOrPreview(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  const paidUrl = buildPricesUrl(args);
  const takePreview = async (reason2) => {
    const out = await plainGet(previewFetch, buildPricesPreviewUrl(args));
    const prices = Array.isArray(out?.preview) ? out.preview : [];
    return { prices, paid: false, activation: activationBlock(reason2, { paidUrl, priceUsdc: "0.001" }) };
  };
  if (!hasKey) return takePreview("no PRIVATE_KEY configured");
  const res = await payFetch(paidUrl);
  if (res.ok || res.status === 200) {
    const out = await res.json();
    return { prices: Array.isArray(out) ? out : [], paid: true };
  }
  const reason = res.status === 402 ? "wallet not funded (paid /crypto/prices returned 402)" : `paid /crypto/prices returned HTTP ${res.status}`;
  return takePreview(reason);
}
async function runYields(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  try {
    const out = await fetchYieldsOrPreview(payFetch, args, { hasKey, previewFetch });
    const result = {
      yields: out.yields,
      count: out.yields.length,
      summary: summarizeYields(out.yields),
      paid: out.paid
    };
    if (out.total_available != null) result.total_available = out.total_available;
    if (out.activation) {
      result.activation = out.activation;
      result.guard_reasons = [out.activation.hint];
    }
    return result;
  } catch (err) {
    const msg = `defi/yields unavailable: ${err?.message || err}`;
    return { error: msg, yields: [], count: 0, summary: `ERROR: ${msg}`, paid: false };
  }
}
async function runPrices(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  try {
    const out = await fetchPricesOrPreview(payFetch, args, { hasKey, previewFetch });
    const result = { prices: out.prices, summary: summarizePrices(out.prices), paid: out.paid };
    if (out.activation) {
      result.activation = out.activation;
      result.guard_reasons = [out.activation.hint];
    }
    return result;
  } catch (err) {
    const msg = `crypto/prices unavailable: ${err?.message || err}`;
    return { error: msg, prices: [], summary: `ERROR: ${msg}`, paid: false };
  }
}
async function runBalance(payFetch, args = {}, { hasKey = true } = {}) {
  const paidUrl = buildBalanceUrl(args);
  try {
    if (!hasKey) {
      return {
        address: args.address,
        paid: false,
        summary: "balance requires a funded wallet \u2014 running keyless",
        activation: activationBlock("no PRIVATE_KEY configured", { paidUrl, priceUsdc: "0.002" }),
        guard_reasons: [fundOnrampHint()]
      };
    }
    const res = await payFetch(paidUrl);
    if (res.ok || res.status === 200) {
      const out = await res.json();
      return { ...out, paid: true, summary: summarizeBalance(out) };
    }
    const reason = res.status === 402 ? "wallet not funded (paid /chain/balance returned 402)" : `paid /chain/balance returned HTTP ${res.status}`;
    return {
      address: args.address,
      paid: false,
      summary: `balance unavailable \u2014 ${reason}`,
      activation: activationBlock(reason, { paidUrl, priceUsdc: "0.002" }),
      guard_reasons: [fundOnrampHint()]
    };
  } catch (err) {
    const msg = `chain/balance unavailable: ${err?.message || err}`;
    return { error: msg, address: args.address, paid: false, summary: `ERROR: ${msg}` };
  }
}

// src/tool.ts
function envKey() {
  return typeof process !== "undefined" ? process.env?.PRIVATE_KEY : void 0;
}
function envBase() {
  return typeof process !== "undefined" ? process.env?.X402_DATA_BASE_URL : void 0;
}
function resolve(opts) {
  const base = opts.base || DATA_BASE;
  const payFetch = opts.payFetch || makePayFetch(opts.privateKey);
  const hasKey = typeof opts.privateKey === "string" && opts.privateKey.length > 0;
  return { base, payFetch, hasKey };
}
function createDefiYields(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "Top DeFi lending/LP yields (DefiLlama) via Grey Ridge /defi/yields ($0.001 USDC/call, paid inline with x402 \u2014 no API key). Returns ranked pools with project, chain, symbol, APY + 1d/7d/30d trend, IL risk, TVL and a risk-adjusted score. Use to find where to earn yield. Filter by project/chain/stablecoin; sort by TVL or risk-adjusted APY.",
    inputSchema: z.object({
      limit: z.number().positive().default(20).describe("Max pools to return (1-100)."),
      project: z.string().optional().describe("Protocol filter, e.g. 'aave-v3'."),
      chain: z.string().optional().describe("Chain filter, e.g. 'Base' or 'Ethereum'."),
      stable: z.boolean().optional().describe("Stablecoin-only pools when true."),
      sort: z.enum(["tvl", "risk_adjusted"]).default("tvl").describe("Rank by TVL (default) or risk-adjusted APY (apy/sigma).")
    }),
    execute: async ({
      limit,
      project,
      chain,
      stable,
      sort
    }) => runYields(payFetch, { limit, project, chain, stable, sort, base }, { hasKey })
  });
}
function createCryptoPrices(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "Spot token prices (DefiLlama) via Grey Ridge /crypto/prices ($0.001 USDC/call, paid inline with x402 \u2014 no API key). Pass comma-separated CoinGecko ids (up to 25); returns price, change_24h, symbol, confidence and timestamp per token.",
    inputSchema: z.object({
      coins: z.string().describe("Comma-separated CoinGecko ids (max 25), e.g. 'bitcoin,ethereum,solana'.")
    }),
    execute: async ({ coins }) => runPrices(payFetch, { coins, base }, { hasKey })
  });
}
function createBaseBalance(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "ETH balance of a Base mainnet address, including balance_usd, via Grey Ridge /chain/balance ($0.002 USDC/call, paid inline with x402 \u2014 no API key). Use to read a wallet's native balance on Base.",
    inputSchema: z.object({
      address: z.string().describe("0x-prefixed Base mainnet address (40 hex chars).")
    }),
    execute: async ({ address }) => runBalance(payFetch, { address, base }, { hasKey })
  });
}
var defiYields = createDefiYields({ privateKey: envKey(), base: envBase() });
var cryptoPrices = createCryptoPrices({ privateKey: envKey(), base: envBase() });
var baseBalance = createBaseBalance({ privateKey: envKey(), base: envBase() });
var defiDataTools = { defiYields, cryptoPrices, baseBalance };
export {
  DATA_BASE,
  baseBalance,
  buildBalanceUrl,
  buildPricesPreviewUrl,
  buildPricesUrl,
  buildYieldsPreviewUrl,
  buildYieldsUrl,
  createBaseBalance,
  createCryptoPrices,
  createDefiYields,
  cryptoPrices,
  defiDataTools as default,
  defiDataTools,
  defiYields,
  fetchPricesOrPreview,
  fetchYieldsOrPreview,
  fundOnrampHint,
  normalizeCoins,
  runBalance,
  runPrices,
  runYields,
  summarizeBalance,
  summarizePrices,
  summarizeYields
};
//# sourceMappingURL=index.js.map