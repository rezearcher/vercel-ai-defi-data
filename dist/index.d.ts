import * as ai from 'ai';

// Types for the dependency-free core (data.mjs).

declare const DATA_BASE: string;

interface YieldArgs {
  limit?: number;
  project?: string;
  chain?: string;
  stable?: boolean | "true";
  sort?: "tvl" | "risk_adjusted" | string;
  base?: string;
}

interface PricesArgs {
  coins: string | string[];
  base?: string;
}

interface BalanceArgs {
  address: string;
  base?: string;
}

interface Activation {
  needed: boolean;
  mode: "free_preview";
  reason: string;
  hint: string;
  paid_url?: string;
  price_usdc: string;
}

interface YieldPool {
  project?: string;
  chain?: string;
  symbol?: string;
  pool?: string;
  apy?: number;
  apyBase?: number | null;
  apyReward?: number | null;
  tvlUsd?: number;
  stablecoin?: boolean;
  ilRisk?: string;
  exposure?: string;
  risk_adjusted_apy?: number;
  predicted_probability?: number;
  [k: string]: unknown;
}

interface TokenPrice {
  id: string;
  symbol: string;
  price: number;
  change_24h: number | null;
  confidence: number;
  timestamp: number;
}

interface BalanceResponse {
  address?: string;
  balance_wei?: string;
  balance_eth?: number;
  balance_usd?: number | null;
  chain?: string;
  [k: string]: unknown;
}

interface YieldsResult {
  yields: YieldPool[];
  count: number;
  summary: string;
  paid: boolean;
  total_available?: number;
  activation?: Activation;
  guard_reasons?: string[];
  error?: string;
}

interface PricesResult {
  prices: TokenPrice[];
  summary: string;
  paid: boolean;
  activation?: Activation;
  guard_reasons?: string[];
  error?: string;
}

interface BalanceResult extends BalanceResponse {
  summary: string;
  paid: boolean;
  activation?: Activation;
  guard_reasons?: string[];
  error?: string;
}

type PayFetch$1 = (url: string) => Promise<Response>;
interface RunOpts {
  hasKey?: boolean;
  previewFetch?: typeof fetch;
}

declare function normalizeCoins(coins: string | string[]): string[];
declare function buildYieldsUrl(args?: YieldArgs): string;
declare function buildYieldsPreviewUrl(args?: { base?: string }): string;
declare function buildPricesUrl(args?: PricesArgs): string;
declare function buildPricesPreviewUrl(args?: PricesArgs): string;
declare function buildBalanceUrl(args?: BalanceArgs): string;

declare function summarizeYields(rows: YieldPool[]): string;
declare function summarizePrices(rows: TokenPrice[]): string;
declare function summarizeBalance(out: BalanceResponse): string;
declare function fundOnrampHint(): string;

declare function fetchYieldsOrPreview(
  payFetch: PayFetch$1,
  args?: YieldArgs,
  opts?: RunOpts
): Promise<{ yields: YieldPool[]; paid: boolean; total_available?: number; activation?: Activation }>;
declare function fetchPricesOrPreview(
  payFetch: PayFetch$1,
  args?: PricesArgs,
  opts?: RunOpts
): Promise<{ prices: TokenPrice[]; paid: boolean; activation?: Activation }>;

declare function runYields(payFetch: PayFetch$1, args?: YieldArgs, opts?: RunOpts): Promise<YieldsResult>;
declare function runPrices(payFetch: PayFetch$1, args?: PricesArgs, opts?: RunOpts): Promise<PricesResult>;
declare function runBalance(
  payFetch: PayFetch$1,
  args?: BalanceArgs,
  opts?: { hasKey?: boolean }
): Promise<BalanceResult>;

type PayFetch = (url: string) => Promise<Response>;

interface DataToolOptions {
    /** Pre-built x402-paying fetch; overrides `privateKey`. Mainly for tests. */
    payFetch?: PayFetch;
    /** Hex private key of the agent's Base wallet; signs the per-call USDC x402 payment. Omit for the free preview path only. */
    privateKey?: string;
    /** Override the data base URL (defaults to the hosted Grey Ridge Worker). */
    base?: string;
}
/**
 * Vercel AI SDK tool: top DeFi lending/LP yields from DefiLlama via Grey Ridge
 * `/defi/yields` ($0.001 USDC/call, paid inline with x402 — no API key). Returns
 * ranked pools with APY trend, IL risk, TVL and a risk-adjusted score, plus a
 * one-line `summary`. Degrades OPEN to a free top-1 sample when no funded wallet
 * is configured (carries an `activation` hint), so a keyless install still works.
 *
 * ```ts
 * import { generateText } from "ai";
 * import { createDefiYields } from "@grey-ridge/vercel-ai-defi-data";
 * const defiYields = createDefiYields({ privateKey: process.env.PRIVATE_KEY });
 * await generateText({ model, tools: { defiYields }, prompt: "Best stablecoin yield on Base right now?" });
 * ```
 */
declare function createDefiYields(opts?: DataToolOptions): ai.Tool<{
    limit?: number;
    project?: string;
    chain?: string;
    stable?: boolean;
    sort?: "tvl" | "risk_adjusted";
}, YieldsResult>;
/**
 * Vercel AI SDK tool: spot token prices from DefiLlama via Grey Ridge
 * `/crypto/prices` ($0.001 USDC/call, paid inline with x402 — no API key).
 * Pass comma-separated CoinGecko ids (up to 25); returns price, 24h change,
 * symbol, confidence and timestamp per token, plus a one-line `summary`.
 * Degrades OPEN to a free 1-token sample when no funded wallet is configured.
 */
declare function createCryptoPrices(opts?: DataToolOptions): ai.Tool<{
    coins: string;
}, PricesResult>;
/**
 * Vercel AI SDK tool: ETH balance of a Base address (incl. balance_usd) via
 * Grey Ridge `/chain/balance` ($0.002 USDC/call, paid inline with x402 — no API
 * key). There is no free preview for a live on-chain read, so a keyless install
 * returns an activation hint (no fabricated balance) rather than silently failing.
 */
declare function createBaseBalance(opts?: DataToolOptions): ai.Tool<{
    address: string;
}, BalanceResult>;
/** Zero-config tool instances: read `PRIVATE_KEY` (agent wallet) + optional `X402_DATA_BASE_URL` from env. */
declare const defiYields: ai.Tool<{
    limit?: number;
    project?: string;
    chain?: string;
    stable?: boolean;
    sort?: "tvl" | "risk_adjusted";
}, YieldsResult>;
declare const cryptoPrices: ai.Tool<{
    coins: string;
}, PricesResult>;
declare const baseBalance: ai.Tool<{
    address: string;
}, BalanceResult>;
/** All three data tools as a ready-to-spread toolset: `tools: { ...defiDataTools }`. */
declare const defiDataTools: {
    defiYields: ai.Tool<{
        limit?: number;
        project?: string;
        chain?: string;
        stable?: boolean;
        sort?: "tvl" | "risk_adjusted";
    }, YieldsResult>;
    cryptoPrices: ai.Tool<{
        coins: string;
    }, PricesResult>;
    baseBalance: ai.Tool<{
        address: string;
    }, BalanceResult>;
};

export { type Activation, type BalanceArgs, type BalanceResponse, type BalanceResult, DATA_BASE, type DataToolOptions, type PricesArgs, type PricesResult, type TokenPrice, type YieldArgs, type YieldPool, type YieldsResult, baseBalance, buildBalanceUrl, buildPricesPreviewUrl, buildPricesUrl, buildYieldsPreviewUrl, buildYieldsUrl, createBaseBalance, createCryptoPrices, createDefiYields, cryptoPrices, defiDataTools as default, defiDataTools, defiYields, fetchPricesOrPreview, fetchYieldsOrPreview, fundOnrampHint, normalizeCoins, runBalance, runPrices, runYields, summarizeBalance, summarizePrices, summarizeYields };
