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

// --- Base-RPC read routes: gas-price, block-number, token-balance ---

declare const BASE_USDC: string;

interface ReadArgs {
  base?: string;
}
interface TokenBalanceArgs {
  address: string;
  token?: string;
  base?: string;
}

interface GasPriceResponse {
  gas_price_wei?: string;
  gas_price_gwei?: number;
  base_fee_gwei?: number | null;
  priority_fee_gwei?: number | null;
  gas_price_usd?: number | null;
  chain?: string;
  note?: string;
  [k: string]: unknown;
}
interface BlockNumberResponse {
  block_number?: number;
  chain?: string;
  note?: string;
  [k: string]: unknown;
}
interface TokenBalanceResponse {
  address?: string;
  token?: string;
  symbol?: string;
  name?: string;
  decimals?: number | null;
  balance_raw?: string;
  balance?: number | null;
  balance_formatted?: string | null;
  chain?: string;
  note?: string;
  [k: string]: unknown;
}

interface GasPriceResult extends GasPriceResponse {
  summary: string;
  paid: boolean;
  activation?: Activation;
  error?: string;
}
interface BlockNumberResult extends BlockNumberResponse {
  summary: string;
  paid: boolean;
  activation?: Activation;
  error?: string;
}
interface TokenBalanceResult extends TokenBalanceResponse {
  summary: string;
  paid: boolean;
  activation?: Activation;
  error?: string;
}

declare function buildGasPriceUrl(args?: ReadArgs): string;
declare function buildGasPricePreviewUrl(args?: ReadArgs): string;
declare function buildBlockNumberUrl(args?: ReadArgs): string;
declare function buildBlockNumberPreviewUrl(args?: ReadArgs): string;
declare function buildTokenBalanceUrl(args?: TokenBalanceArgs): string;
declare function buildTokenBalancePreviewUrl(args?: TokenBalanceArgs): string;

declare function summarizeGasPrice(out: GasPriceResponse): string;
declare function summarizeBlockNumber(out: BlockNumberResponse): string;
declare function summarizeTokenBalance(out: TokenBalanceResponse): string;

declare function runGasPrice(payFetch: PayFetch$1, args?: ReadArgs, opts?: RunOpts): Promise<GasPriceResult>;
declare function runBlockNumber(payFetch: PayFetch$1, args?: ReadArgs, opts?: RunOpts): Promise<BlockNumberResult>;
declare function runTokenBalance(payFetch: PayFetch$1, args?: TokenBalanceArgs, opts?: RunOpts): Promise<TokenBalanceResult>;

// --- Market-intelligence routes: perp funding, market brief ---

interface FundingArgs {
  limit?: number;
  base?: string;
}
interface BriefArgs {
  base?: string;
}

interface FundingRow {
  coin?: string;
  funding?: Record<string, number>;
  funding_spread_bps?: number;
  best_long_venue?: string;
  best_short_venue?: string;
  premium?: number;
  annualized_hl?: number;
  annualized_okx?: number;
  signal?: "LONGS_PAY" | "SHORTS_PAY" | "NEUTRAL" | string;
  next_funding_ts?: number;
  markPx?: number;
  oraclePx?: number;
  openInterest?: number;
  dayNtlVlm?: number;
  [k: string]: unknown;
}

interface MarketBriefResponse {
  fear_greed?: { value: number; classification: string };
  global?: {
    total_market_cap_usd?: number;
    total_volume_24h_usd?: number;
    market_cap_change_24h_pct?: number;
    btc_dominance_pct?: number;
    eth_dominance_pct?: number;
  };
  movers?: { gainers: unknown[]; losers: unknown[] };
  trending?: Array<{ name?: string; symbol?: string }>;
  defi_fees_top?: { total24h_usd?: number; protocols?: Array<{ name: string; fees24h_usd: number }> };
  source?: string;
  ts?: string;
  [k: string]: unknown;
}

interface FundingResult {
  funding: FundingRow[];
  count: number;
  summary: string;
  paid: boolean;
  total_available?: number;
  activation?: Activation;
  guard_reasons?: string[];
  error?: string;
}
interface MarketBriefResult extends MarketBriefResponse {
  summary: string;
  paid: boolean;
  activation?: Activation;
  guard_reasons?: string[];
  error?: string;
}

declare function buildFundingUrl(args?: FundingArgs): string;
declare function buildFundingPreviewUrl(args?: { base?: string }): string;
declare function buildMarketBriefUrl(args?: BriefArgs): string;

declare function summarizeFunding(rows: FundingRow[]): string;
declare function summarizeMarketBrief(out: MarketBriefResponse): string;

declare function fetchFundingOrPreview(
  payFetch: PayFetch$1,
  args?: FundingArgs,
  opts?: RunOpts
): Promise<{ funding: FundingRow[]; paid: boolean; total_available?: number; activation?: Activation }>;

declare function runFunding(payFetch: PayFetch$1, args?: FundingArgs, opts?: RunOpts): Promise<FundingResult>;
declare function runMarketBrief(
  payFetch: PayFetch$1,
  args?: BriefArgs,
  opts?: { hasKey?: boolean }
): Promise<MarketBriefResult>;

// --- Token-safety route: pre-trade rug/honeypot verdict ---

declare const DEMO_TOKEN: string;

interface TokenReportArgs {
  token?: string;
  base?: string;
}

interface TokenReportResult {
  token?: string;
  verdict: "SAFE" | "CAUTION" | "AVOID" | null | string;
  risk_score: number | null;
  symbol?: string;
  reasons: string[];
  security?: Record<string, unknown>;
  liquidity?: Record<string, unknown>;
  paid: boolean;
  summary: string;
  trial_exhausted?: boolean;
  note?: string;
  paid_url?: string;
  activation?: Activation;
  guard_reasons?: string[];
  error?: string;
}

declare function buildTokenReportUrl(args?: TokenReportArgs): string;
declare function buildTokenReportPreviewUrl(args?: TokenReportArgs): string;
declare function summarizeTokenReport(out: Record<string, unknown>): string;
declare function runTokenReport(payFetch: PayFetch$1, args?: TokenReportArgs, opts?: RunOpts): Promise<TokenReportResult>;

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
/**
 * Vercel AI SDK tool: current Base mainnet gas price via Grey Ridge
 * `/chain/gas-price` ($0.002 USDC/call, paid inline with x402 — no API key).
 * Returns EIP-1559 base_fee_gwei / priority_fee_gwei, gas_price_gwei/_wei and
 * gas_price_usd. The free preview is byte-identical to the paid route, so a
 * keyless install gets the REAL live gas price (never a stub). Use to decide
 * when a Base transaction is cheap to send.
 */
declare function createBaseGasPrice(opts?: DataToolOptions): ai.Tool<{}, GasPriceResult>;
/**
 * Vercel AI SDK tool: current Base mainnet block number via Grey Ridge
 * `/chain/block-number` ($0.002 USDC/call, paid inline with x402 — no API key).
 * The free preview is byte-identical to the paid route, so a keyless install
 * gets the REAL current block. Use for chain height / confirmation math.
 */
declare function createBaseBlockNumber(opts?: DataToolOptions): ai.Tool<{}, BlockNumberResult>;
/**
 * Vercel AI SDK tool: ERC-20 token balance of a Base address via Grey Ridge
 * `/chain/token-balance` ($0.002 USDC/call, paid inline with x402 — no API key).
 * Returns symbol, decimals and the formatted balance. The free preview returns
 * the REAL balance for the given address+token, so a keyless install gets a real
 * number (never fabricated). `token` defaults to USDC on Base.
 */
declare function createBaseTokenBalance(opts?: DataToolOptions): ai.Tool<{
    address: string;
    token?: string | undefined;
}, TokenBalanceResult>;
/**
 * Vercel AI SDK tool: cross-venue perp funding rates via Grey Ridge
 * `/crypto/funding` ($0.004 USDC/call, paid inline with x402 — no API key).
 * Returns top coins by 24h notional volume with per-venue (Hyperliquid/OKX/dYdX)
 * funding, the arb spread (bps), cheapest-long/richest-short venue, premium/basis,
 * annualized rates, a LONGS_PAY/SHORTS_PAY/NEUTRAL signal, next funding time,
 * mark/oracle prices and open interest. Degrades OPEN to a free real top-1 sample
 * when no funded wallet is configured. Use to find a funding-rate arbitrage or
 * to read market positioning before a perp trade.
 */
declare function createCryptoFunding(opts?: DataToolOptions): ai.Tool<{
    limit?: number;
}, FundingResult>;
/**
 * Vercel AI SDK tool: one-call crypto market brief via Grey Ridge
 * `/brief/market` ($0.01 USDC/call, paid inline with x402 — no API key). Returns
 * the Fear & Greed index, global market cap / 24h volume / BTC+ETH dominance, the
 * top 5 gainers and losers, trending coins and the top DeFi fee earners — a full
 * market snapshot in a single payment. There is no free preview for this
 * composite route, so a keyless install returns an activation hint (never a
 * fabricated brief) rather than silently failing.
 */
declare function createMarketBrief(opts?: DataToolOptions): ai.Tool<{}, MarketBriefResult>;
/**
 * Vercel AI SDK tool: pre-trade token-safety verdict via Grey Ridge
 * `/chain/token-report` ($0.01 USDC/call, paid inline with x402 — no API key).
 * Answers "is this Base ERC-20 safe to buy?" with a decision-grade verdict —
 * SAFE | CAUTION | AVOID — a 0-100 risk_score and the reasons: honeypot /
 * sellability simulation, measured buy/sell tax, owner-renounced +
 * mint/pause/blacklist/fee-setter/upgradeable-proxy checks, owner supply %, and
 * Uniswap-v3 WETH-pool liquidity (USD). The free preview returns the SAME full
 * verdict for any token (capped at 3 real tokens/IP/day), so a keyless install
 * gets a REAL verdict — on a demo token when none is given, or on the caller's
 * token until the daily trial is spent, after which it honestly reports the
 * trial is exhausted and points at the paid route (never a fabricated verdict).
 * Use before an agent buys or swaps a Base ERC-20.
 */
declare function createCheckToken(opts?: DataToolOptions): ai.Tool<{
    token?: string | undefined;
}, TokenReportResult>;
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
declare const baseGasPrice: ai.Tool<{}, GasPriceResult>;
declare const baseBlockNumber: ai.Tool<{}, BlockNumberResult>;
declare const baseTokenBalance: ai.Tool<{
    address: string;
    token?: string | undefined;
}, TokenBalanceResult>;
declare const cryptoFunding: ai.Tool<{
    limit?: number;
}, FundingResult>;
declare const marketBrief: ai.Tool<{}, MarketBriefResult>;
declare const checkToken: ai.Tool<{
    token?: string | undefined;
}, TokenReportResult>;
/** All nine data tools as a ready-to-spread toolset: `tools: { ...defiDataTools }`. */
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
    baseGasPrice: ai.Tool<{}, GasPriceResult>;
    baseBlockNumber: ai.Tool<{}, BlockNumberResult>;
    baseTokenBalance: ai.Tool<{
        address: string;
        token?: string | undefined;
    }, TokenBalanceResult>;
    cryptoFunding: ai.Tool<{
        limit?: number;
    }, FundingResult>;
    marketBrief: ai.Tool<{}, MarketBriefResult>;
    checkToken: ai.Tool<{
        token?: string | undefined;
    }, TokenReportResult>;
};

export { type Activation, BASE_USDC, type BalanceArgs, type BalanceResponse, type BalanceResult, type BlockNumberResponse, type BlockNumberResult, type BriefArgs, DATA_BASE, DEMO_TOKEN, type DataToolOptions, type FundingArgs, type FundingResult, type FundingRow, type GasPriceResponse, type GasPriceResult, type MarketBriefResponse, type MarketBriefResult, type PricesArgs, type PricesResult, type ReadArgs, type TokenBalanceArgs, type TokenBalanceResponse, type TokenBalanceResult, type TokenPrice, type TokenReportArgs, type TokenReportResult, type YieldArgs, type YieldPool, type YieldsResult, baseBalance, baseBlockNumber, baseGasPrice, baseTokenBalance, buildBalanceUrl, buildBlockNumberPreviewUrl, buildBlockNumberUrl, buildFundingPreviewUrl, buildFundingUrl, buildGasPricePreviewUrl, buildGasPriceUrl, buildMarketBriefUrl, buildPricesPreviewUrl, buildPricesUrl, buildTokenBalancePreviewUrl, buildTokenBalanceUrl, buildTokenReportPreviewUrl, buildTokenReportUrl, buildYieldsPreviewUrl, buildYieldsUrl, checkToken, createBaseBalance, createBaseBlockNumber, createBaseGasPrice, createBaseTokenBalance, createCheckToken, createCryptoFunding, createCryptoPrices, createDefiYields, createMarketBrief, cryptoFunding, cryptoPrices, defiDataTools as default, defiDataTools, defiYields, fetchFundingOrPreview, fetchPricesOrPreview, fetchYieldsOrPreview, fundOnrampHint, marketBrief, normalizeCoins, runBalance, runBlockNumber, runFunding, runGasPrice, runMarketBrief, runPrices, runTokenBalance, runTokenReport, runYields, summarizeBalance, summarizeBlockNumber, summarizeFunding, summarizeGasPrice, summarizeMarketBrief, summarizePrices, summarizeTokenBalance, summarizeTokenReport, summarizeYields };
