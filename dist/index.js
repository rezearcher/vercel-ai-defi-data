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
var COIN_ALIASES = {
  btc: "bitcoin",
  eth: "ethereum",
  weth: "weth",
  sol: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  avax: "avalanche-2",
  dot: "polkadot",
  matic: "matic-network",
  pol: "matic-network",
  link: "chainlink",
  uni: "uniswap",
  ltc: "litecoin",
  trx: "tron",
  atom: "cosmos",
  near: "near",
  apt: "aptos",
  arb: "arbitrum",
  op: "optimism",
  usdc: "usd-coin",
  usdt: "tether",
  dai: "dai",
  wbtc: "wrapped-bitcoin",
  cbbtc: "coinbase-wrapped-btc",
  steth: "staked-ether",
  aave: "aave",
  mkr: "maker",
  ldo: "lido-dao",
  crv: "curve-dao-token",
  snx: "havven",
  comp: "compound-governance-token",
  aero: "aerodrome-finance",
  degen: "degen-base",
  pepe: "pepe",
  shib: "shiba-inu",
  ena: "ethena",
  sui: "sui",
  ton: "the-open-network",
  hype: "hyperliquid"
};
function normalizeCoins(coins) {
  const raw = Array.isArray(coins) ? coins : String(coins || "").split(",").map((s) => s.trim());
  const ids = raw.filter(Boolean).map((s) => {
    const k = s.toLowerCase();
    return COIN_ALIASES[k] ?? k;
  });
  if (ids.length === 0) throw new Error("coins must contain at least one CoinGecko id or ticker symbol");
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
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
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
var BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
function buildGasPriceUrl({ base = DATA_BASE } = {}) {
  return `${base}/chain/gas-price`;
}
function buildGasPricePreviewUrl({ base = DATA_BASE } = {}) {
  return `${base}/chain/gas-price/preview`;
}
function buildBlockNumberUrl({ base = DATA_BASE } = {}) {
  return `${base}/chain/block-number`;
}
function buildBlockNumberPreviewUrl({ base = DATA_BASE } = {}) {
  return `${base}/chain/block-number/preview`;
}
function buildTokenBalanceUrl({ address, token = BASE_USDC, base = DATA_BASE } = {}) {
  if (!ADDR_RE.test(String(address || ""))) throw new Error(`invalid Base address: ${address}`);
  if (!ADDR_RE.test(String(token || ""))) throw new Error(`invalid Base token address: ${token}`);
  const qs = new URLSearchParams({ address, token });
  return `${base}/chain/token-balance?${qs.toString()}`;
}
function buildTokenBalancePreviewUrl({ address, token = BASE_USDC, base = DATA_BASE } = {}) {
  if (!ADDR_RE.test(String(address || ""))) throw new Error(`invalid Base address: ${address}`);
  if (!ADDR_RE.test(String(token || ""))) throw new Error(`invalid Base token address: ${token}`);
  const qs = new URLSearchParams({ address, token });
  return `${base}/chain/token-balance/preview?${qs.toString()}`;
}
function gwei(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return `${n < 1e-3 && n > 0 ? n.toExponential(2) : n.toFixed(n < 1 ? 4 : 2)} gwei`;
}
function summarizeGasPrice(out) {
  if (!out || typeof out !== "object" || out.gas_price_gwei == null) return "no gas price";
  const bits = [];
  const g = gwei(Number(out.gas_price_gwei));
  if (g) bits.push(`gas ${g}`);
  const bf = gwei(typeof out.base_fee_gwei === "number" ? out.base_fee_gwei : NaN);
  if (bf) bits.push(`base ${bf}`);
  const pf = gwei(typeof out.priority_fee_gwei === "number" ? out.priority_fee_gwei : NaN);
  if (pf) bits.push(`priority ${pf}`);
  return `Base ${bits.join(" \xB7 ") || "gas price"}`;
}
function summarizeBlockNumber(out) {
  if (!out || typeof out !== "object" || out.block_number == null) return "no block number";
  return `Base mainnet block #${Number(out.block_number).toLocaleString("en-US")}`;
}
function summarizeTokenBalance(out) {
  if (!out || typeof out !== "object" || out.balance == null) return "no token balance";
  const sym = out.symbol || "token";
  const addr = out.address ? `${String(out.address).slice(0, 10)}\u2026` : "address";
  const bal = Number(out.balance);
  const amt = Number.isFinite(bal) ? bal.toLocaleString("en-US", { maximumFractionDigits: 6 }) : out.balance_formatted;
  return `${addr} holds ${amt} ${sym} on Base`;
}
async function runFullPreviewRead(payFetch, { paidUrl, previewUrl, summarize, priceUsdc, label }, { hasKey, previewFetch }) {
  try {
    if (hasKey) {
      const res = await payFetch(paidUrl);
      if (res.ok || res.status === 200) {
        const out3 = await res.json();
        return { ...out3, paid: true, summary: summarize(out3) };
      }
      const reason = res.status === 402 ? `wallet not funded (paid ${label} returned 402)` : `paid ${label} returned HTTP ${res.status}`;
      const out2 = await plainGet(previewFetch, previewUrl);
      return { ...out2, paid: false, summary: summarize(out2), activation: activationBlock(reason, { paidUrl, priceUsdc }) };
    }
    const out = await plainGet(previewFetch, previewUrl);
    return {
      ...out,
      paid: false,
      summary: summarize(out),
      activation: activationBlock("no PRIVATE_KEY configured \u2014 free preview returns identical full data", { paidUrl, priceUsdc })
    };
  } catch (err) {
    const msg = `${label} unavailable: ${err?.message || err}`;
    return { error: msg, paid: false, summary: `ERROR: ${msg}` };
  }
}
async function runGasPrice(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  return runFullPreviewRead(
    payFetch,
    { paidUrl: buildGasPriceUrl(args), previewUrl: buildGasPricePreviewUrl(args), summarize: summarizeGasPrice, priceUsdc: "0.002", label: "/chain/gas-price" },
    { hasKey, previewFetch }
  );
}
async function runBlockNumber(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  return runFullPreviewRead(
    payFetch,
    { paidUrl: buildBlockNumberUrl(args), previewUrl: buildBlockNumberPreviewUrl(args), summarize: summarizeBlockNumber, priceUsdc: "0.002", label: "/chain/block-number" },
    { hasKey, previewFetch }
  );
}
async function runTokenBalance(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  const resolved = { ...args, token: args.token || BASE_USDC };
  let paidUrl;
  let previewUrl;
  try {
    paidUrl = buildTokenBalanceUrl(resolved);
    previewUrl = buildTokenBalancePreviewUrl(resolved);
  } catch (err) {
    const msg = `chain/token-balance unavailable: ${err?.message || err}`;
    return { error: msg, address: args.address, token: resolved.token, paid: false, summary: `ERROR: ${msg}` };
  }
  try {
    if (hasKey) {
      const res = await payFetch(paidUrl);
      if (res.ok || res.status === 200) {
        const out3 = await res.json();
        return { ...out3, paid: true, summary: summarizeTokenBalance(out3) };
      }
      const reason = res.status === 402 ? "wallet not funded (paid /chain/token-balance returned 402)" : `paid /chain/token-balance returned HTTP ${res.status}`;
      const out2 = await plainGet(previewFetch, previewUrl);
      return { ...out2, paid: false, summary: summarizeTokenBalance(out2), activation: activationBlock(reason, { paidUrl, priceUsdc: "0.002" }) };
    }
    const out = await plainGet(previewFetch, previewUrl);
    return {
      ...out,
      paid: false,
      summary: summarizeTokenBalance(out),
      activation: activationBlock("no PRIVATE_KEY configured \u2014 free preview returns the real balance", { paidUrl, priceUsdc: "0.002" })
    };
  } catch (err) {
    const msg = `chain/token-balance unavailable: ${err?.message || err}`;
    return { error: msg, address: args.address, token: resolved.token, paid: false, summary: `ERROR: ${msg}` };
  }
}
function buildFundingUrl({ limit = 20, base = DATA_BASE } = {}) {
  const qs = new URLSearchParams({ limit: String(clampLimit(limit)) });
  return `${base}/crypto/funding?${qs.toString()}`;
}
function buildFundingPreviewUrl({ base = DATA_BASE } = {}) {
  return `${base}/crypto/funding/preview`;
}
function buildMarketBriefUrl({ base = DATA_BASE } = {}) {
  return `${base}/brief/market`;
}
function summarizeFunding(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "no funding data";
  const t = rows[0];
  const bits = [t.coin || "coin"];
  if (typeof t.funding_spread_bps === "number") bits.push(`arb spread ${t.funding_spread_bps.toFixed(2)}bps`);
  if (t.signal) bits.push(String(t.signal));
  if (t.best_long_venue && t.best_short_venue) bits.push(`long@${t.best_long_venue}/short@${t.best_short_venue}`);
  return `Top of ${rows.length}: ${bits.join(" \xB7 ")}`;
}
function summarizeMarketBrief(out) {
  if (!out || typeof out !== "object" || out.fear_greed == null) return "no market brief";
  const bits = [];
  if (out.fear_greed && out.fear_greed.value != null) {
    bits.push(`F&G ${out.fear_greed.value}${out.fear_greed.classification ? ` (${out.fear_greed.classification})` : ""}`);
  }
  const cap = out.global && usd(out.global.total_market_cap_usd);
  if (cap) bits.push(`mcap ${cap}`);
  if (out.global && typeof out.global.btc_dominance_pct === "number") bits.push(`BTC dom ${out.global.btc_dominance_pct.toFixed(1)}%`);
  const trend = Array.isArray(out.trending) && out.trending[0] ? out.trending[0].symbol || out.trending[0].name : null;
  if (trend) bits.push(`trending ${trend}`);
  return bits.join(" \xB7 ") || "market brief";
}
async function fetchFundingOrPreview(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  const paidUrl = buildFundingUrl(args);
  const takePreview = async (reason2) => {
    const out = await plainGet(previewFetch, buildFundingPreviewUrl(args));
    const funding = Array.isArray(out?.preview) ? out.preview : [];
    return { funding, paid: false, total_available: out?.total_available, activation: activationBlock(reason2, { paidUrl, priceUsdc: "0.004" }) };
  };
  if (!hasKey) return takePreview("no PRIVATE_KEY configured");
  const res = await payFetch(paidUrl);
  if (res.ok || res.status === 200) {
    const out = await res.json();
    return { funding: Array.isArray(out) ? out : [], paid: true };
  }
  const reason = res.status === 402 ? "wallet not funded (paid /crypto/funding returned 402)" : `paid /crypto/funding returned HTTP ${res.status}`;
  return takePreview(reason);
}
async function runFunding(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  try {
    const out = await fetchFundingOrPreview(payFetch, args, { hasKey, previewFetch });
    const result = {
      funding: out.funding,
      count: out.funding.length,
      summary: summarizeFunding(out.funding),
      paid: out.paid
    };
    if (out.total_available != null) result.total_available = out.total_available;
    if (out.activation) {
      result.activation = out.activation;
      result.guard_reasons = [out.activation.hint];
    }
    return result;
  } catch (err) {
    const msg = `crypto/funding unavailable: ${err?.message || err}`;
    return { error: msg, funding: [], count: 0, summary: `ERROR: ${msg}`, paid: false };
  }
}
async function runMarketBrief(payFetch, args = {}, { hasKey = true } = {}) {
  const paidUrl = buildMarketBriefUrl(args);
  try {
    if (!hasKey) {
      return {
        paid: false,
        summary: "market brief requires a funded wallet \u2014 running keyless",
        activation: activationBlock("no PRIVATE_KEY configured", { paidUrl, priceUsdc: "0.01" }),
        guard_reasons: [fundOnrampHint()]
      };
    }
    const res = await payFetch(paidUrl);
    if (res.ok || res.status === 200) {
      const out = await res.json();
      return { ...out, paid: true, summary: summarizeMarketBrief(out) };
    }
    const reason = res.status === 402 ? "wallet not funded (paid /brief/market returned 402)" : `paid /brief/market returned HTTP ${res.status}`;
    return {
      paid: false,
      summary: `market brief unavailable \u2014 ${reason}`,
      activation: activationBlock(reason, { paidUrl, priceUsdc: "0.01" }),
      guard_reasons: [fundOnrampHint()]
    };
  } catch (err) {
    const msg = `brief/market unavailable: ${err?.message || err}`;
    return { error: msg, paid: false, summary: `ERROR: ${msg}` };
  }
}
var DEMO_TOKEN = "0x940181a94a35a4569e4529a3cdfb74e38fd98631";
function buildTokenReportUrl({ token = DEMO_TOKEN, base = DATA_BASE } = {}) {
  if (!ADDR_RE.test(String(token || ""))) throw new Error(`invalid Base token address: ${token}`);
  const qs = new URLSearchParams({ token });
  return `${base}/chain/token-report?${qs.toString()}`;
}
function buildTokenReportPreviewUrl({ token = DEMO_TOKEN, base = DATA_BASE } = {}) {
  if (!ADDR_RE.test(String(token || ""))) throw new Error(`invalid Base token address: ${token}`);
  const qs = new URLSearchParams({ token });
  return `${base}/chain/token-report/preview?${qs.toString()}`;
}
function summarizeTokenReport(out) {
  if (!out || typeof out !== "object") return "no token report";
  if (out.trial_exhausted) return "token-safety free trial exhausted for today (3/day/IP) \u2014 pay $0.01 for any token";
  if (out.verdict == null) return out.note ? `token report unavailable \u2014 ${out.note}` : "no token report";
  const sym = out.token_meta && out.token_meta.symbol || out.symbol || "token";
  const bits = [`${sym}: ${out.verdict}`];
  if (typeof out.risk_score === "number") bits.push(`risk ${out.risk_score}/100`);
  const reasons = Array.isArray(out.reasons) ? out.reasons.slice(0, 3) : [];
  if (reasons.length) bits.push(reasons.join("; "));
  return bits.join(" \xB7 ");
}
function shapeTokenReport(out, { paid }) {
  const symbol = out && out.token_meta && out.token_meta.symbol || void 0;
  const result = {
    token: out && out.token,
    verdict: (out && out.verdict) ?? null,
    risk_score: out && typeof out.risk_score === "number" ? out.risk_score : null,
    symbol,
    reasons: Array.isArray(out && out.reasons) ? out.reasons.slice(0, 5) : [],
    security: out && out.security,
    liquidity: out && out.liquidity,
    paid
  };
  result.summary = summarizeTokenReport({ ...out, ...result });
  return result;
}
async function runTokenReport(payFetch, args = {}, { hasKey = true, previewFetch } = {}) {
  const resolved = { ...args, token: args.token || DEMO_TOKEN };
  let paidUrl;
  let previewUrl;
  try {
    paidUrl = buildTokenReportUrl(resolved);
    previewUrl = buildTokenReportPreviewUrl(resolved);
  } catch (err) {
    const msg = `chain/token-report unavailable: ${err?.message || err}`;
    return { error: msg, token: args.token, verdict: null, risk_score: null, reasons: [], paid: false, summary: `ERROR: ${msg}` };
  }
  const takePreview = async (reason) => {
    const f = previewFetch || (typeof fetch !== "undefined" ? fetch : null);
    if (!f) throw new Error("no fetch available");
    const res = await f(previewUrl);
    const body = await res.json();
    if (res.status === 429 || body?.trial?.real_token_checks_left_today === 0) {
      return {
        token: resolved.token,
        verdict: null,
        risk_score: null,
        reasons: [],
        trial_exhausted: true,
        note: body?.error || "free real-token trial exhausted (3/day/IP)",
        paid_url: body?.paid_url || paidUrl,
        paid: false,
        summary: summarizeTokenReport({ trial_exhausted: true }),
        activation: activationBlock(reason, { paidUrl, priceUsdc: "0.01" }),
        guard_reasons: [fundOnrampHint()]
      };
    }
    if (!res.ok && res.status !== 200) throw new Error(`preview failed: HTTP ${res.status}`);
    const shaped = shapeTokenReport(body, { paid: false });
    shaped.activation = activationBlock(reason, { paidUrl, priceUsdc: "0.01" });
    shaped.guard_reasons = [fundOnrampHint()];
    return shaped;
  };
  try {
    if (hasKey) {
      const res = await payFetch(paidUrl);
      if (res.ok || res.status === 200) {
        const out = await res.json();
        return shapeTokenReport(out, { paid: true });
      }
      const reason = res.status === 402 ? "wallet not funded (paid /chain/token-report returned 402)" : `paid /chain/token-report returned HTTP ${res.status}`;
      return await takePreview(reason);
    }
    return await takePreview("no PRIVATE_KEY configured \u2014 free preview returns the full verdict (capped 3 real tokens/IP/day)");
  } catch (err) {
    const msg = `chain/token-report unavailable: ${err?.message || err}`;
    return { error: msg, token: resolved.token, verdict: null, risk_score: null, reasons: [], paid: false, summary: `ERROR: ${msg}` };
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
    description: "Spot token prices (DefiLlama) via Grey Ridge /crypto/prices ($0.001 USDC/call, paid inline with x402 \u2014 no API key). Pass comma-separated ticker symbols or CoinGecko ids (up to 25); returns price, change_24h, symbol, confidence and timestamp per token.",
    inputSchema: z.object({
      coins: z.string().describe("Comma-separated ticker symbols or CoinGecko ids (max 25), e.g. 'ETH,BTC' or 'bitcoin,ethereum,solana'.")
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
function createBaseGasPrice(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "Current Base mainnet gas price via Grey Ridge /chain/gas-price ($0.002 USDC/call, paid inline with x402 \u2014 no API key). Returns EIP-1559 base_fee_gwei, priority_fee_gwei, gas_price_gwei/_wei and gas_price_usd. Use to time a Base transaction around cheap gas.",
    inputSchema: z.object({}),
    execute: async () => runGasPrice(payFetch, { base }, { hasKey })
  });
}
function createBaseBlockNumber(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "Current Base mainnet block number via Grey Ridge /chain/block-number ($0.002 USDC/call, paid inline with x402 \u2014 no API key). Use for chain height or confirmation math.",
    inputSchema: z.object({}),
    execute: async () => runBlockNumber(payFetch, { base }, { hasKey })
  });
}
function createBaseTokenBalance(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "ERC-20 token balance of a Base mainnet address via Grey Ridge /chain/token-balance ($0.002 USDC/call, paid inline with x402 \u2014 no API key). Returns symbol, decimals, balance and balance_formatted. token defaults to USDC on Base.",
    inputSchema: z.object({
      address: z.string().describe("0x-prefixed Base mainnet address to read the balance of (40 hex chars)."),
      token: z.string().optional().describe(`0x-prefixed ERC-20 contract on Base. Defaults to USDC (${BASE_USDC}).`)
    }),
    execute: async ({ address, token }) => runTokenBalance(payFetch, { address, token, base }, { hasKey })
  });
}
function createCryptoFunding(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "Cross-venue perp funding rates (Hyperliquid + OKX + dYdX) via Grey Ridge /crypto/funding ($0.004 USDC/call, paid inline with x402 \u2014 no API key). Top coins by 24h volume with per-venue funding, arb spread (bps), cheapest-long/richest-short venue, premium, annualized rates, LONGS_PAY/SHORTS_PAY/NEUTRAL signal, next_funding_ts, mark/oracle prices and open interest. Use for funding-rate arbitrage or perp positioning.",
    inputSchema: z.object({
      limit: z.number().positive().default(20).describe("Max coins to return (1-100), ranked by 24h notional volume.")
    }),
    execute: async ({ limit }) => runFunding(payFetch, { limit, base }, { hasKey })
  });
}
function createMarketBrief(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "One-call crypto market brief via Grey Ridge /brief/market ($0.01 USDC/call, paid inline with x402 \u2014 no API key). Returns Fear & Greed, global market cap + 24h volume + BTC/ETH dominance, top 5 gainers/losers, trending coins and top DeFi fee earners \u2014 a full market snapshot in one payment. Use when an agent needs the whole market picture at once.",
    inputSchema: z.object({}),
    execute: async () => runMarketBrief(payFetch, { base }, { hasKey })
  });
}
function createCheckToken(opts = {}) {
  const { base, payFetch, hasKey } = resolve(opts);
  return tool({
    description: "Pre-trade token-safety verdict for a Base ERC-20 via Grey Ridge /chain/token-report ($0.01 USDC/call, paid inline with x402 \u2014 no API key). Returns SAFE/CAUTION/AVOID, a 0-100 risk_score and reasons: honeypot/sellability simulation, measured buy/sell tax, owner-renounced + mint/pause/blacklist/fee-setter/upgradeable-proxy checks, owner supply %, and Uniswap-v3 WETH-pool liquidity (USD). Call before buying or swapping a Base ERC-20 to avoid a rug/honeypot.",
    inputSchema: z.object({
      token: z.string().optional().describe("0x-prefixed Base ERC-20 contract to check (40 hex chars). Omit to probe a demo token.")
    }),
    execute: async ({ token }) => runTokenReport(payFetch, { token, base }, { hasKey })
  });
}
var defiYields = createDefiYields({ privateKey: envKey(), base: envBase() });
var cryptoPrices = createCryptoPrices({ privateKey: envKey(), base: envBase() });
var baseBalance = createBaseBalance({ privateKey: envKey(), base: envBase() });
var baseGasPrice = createBaseGasPrice({ privateKey: envKey(), base: envBase() });
var baseBlockNumber = createBaseBlockNumber({ privateKey: envKey(), base: envBase() });
var baseTokenBalance = createBaseTokenBalance({ privateKey: envKey(), base: envBase() });
var cryptoFunding = createCryptoFunding({ privateKey: envKey(), base: envBase() });
var marketBrief = createMarketBrief({ privateKey: envKey(), base: envBase() });
var checkToken = createCheckToken({ privateKey: envKey(), base: envBase() });
var defiDataTools = {
  defiYields,
  cryptoPrices,
  baseBalance,
  baseGasPrice,
  baseBlockNumber,
  baseTokenBalance,
  cryptoFunding,
  marketBrief,
  checkToken
};
export {
  BASE_USDC,
  DATA_BASE,
  DEMO_TOKEN,
  baseBalance,
  baseBlockNumber,
  baseGasPrice,
  baseTokenBalance,
  buildBalanceUrl,
  buildBlockNumberPreviewUrl,
  buildBlockNumberUrl,
  buildFundingPreviewUrl,
  buildFundingUrl,
  buildGasPricePreviewUrl,
  buildGasPriceUrl,
  buildMarketBriefUrl,
  buildPricesPreviewUrl,
  buildPricesUrl,
  buildTokenBalancePreviewUrl,
  buildTokenBalanceUrl,
  buildTokenReportPreviewUrl,
  buildTokenReportUrl,
  buildYieldsPreviewUrl,
  buildYieldsUrl,
  checkToken,
  createBaseBalance,
  createBaseBlockNumber,
  createBaseGasPrice,
  createBaseTokenBalance,
  createCheckToken,
  createCryptoFunding,
  createCryptoPrices,
  createDefiYields,
  createMarketBrief,
  cryptoFunding,
  cryptoPrices,
  defiDataTools as default,
  defiDataTools,
  defiYields,
  fetchFundingOrPreview,
  fetchPricesOrPreview,
  fetchYieldsOrPreview,
  fundOnrampHint,
  marketBrief,
  normalizeCoins,
  runBalance,
  runBlockNumber,
  runFunding,
  runGasPrice,
  runMarketBrief,
  runPrices,
  runTokenBalance,
  runTokenReport,
  runYields,
  summarizeBalance,
  summarizeBlockNumber,
  summarizeFunding,
  summarizeGasPrice,
  summarizeMarketBrief,
  summarizePrices,
  summarizeTokenBalance,
  summarizeTokenReport,
  summarizeYields
};
//# sourceMappingURL=index.js.map