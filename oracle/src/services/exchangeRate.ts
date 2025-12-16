import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { ExchangeRateData, ConvertResult } from "../types";

/**
 * Exchange Rate Service
 * Fetches ETH/IDR and ETH/USD rates from CoinGecko API
 * Includes caching and auto-update functionality
 */

// Cache for exchange rates
let cachedRate: ExchangeRateData | null = null;
let lastFetchTime: number = 0;

/**
 * Fetch exchange rates from CoinGecko API
 */
async function fetchFromCoinGecko(): Promise<ExchangeRateData> {
  const url = `${env.COINGECKO_API_URL}/simple/price?ids=ethereum&vs_currencies=idr,usd`;

  logger.debug(`Fetching exchange rate from: ${url}`);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `CoinGecko API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    ethereum?: { idr?: number; usd?: number };
  };

  if (!data.ethereum?.idr || !data.ethereum?.usd) {
    throw new Error("Invalid response from CoinGecko API");
  }

  return {
    eth_idr: data.ethereum.idr,
    eth_usd: data.ethereum.usd,
    lastUpdated: new Date(),
    source: "coingecko",
  };
}

/**
 * Get current exchange rate (with caching)
 */
export async function getExchangeRate(): Promise<ExchangeRateData> {
  const now = Date.now();
  const cacheAge = now - lastFetchTime;
  const cacheTtlMs = env.RATE_CACHE_TTL_SECONDS * 1000;

  // Return cached value if still valid
  if (cachedRate && cacheAge < cacheTtlMs) {
    logger.debug(`Using cached rate (age: ${Math.round(cacheAge / 1000)}s)`);
    return cachedRate;
  }

  try {
    const rate = await fetchFromCoinGecko();
    cachedRate = rate;
    lastFetchTime = now;
    logger.success(
      `Exchange rate updated: 1 ETH = ${rate.eth_idr.toLocaleString()} IDR`
    );
    return rate;
  } catch (error) {
    // If fetch fails but we have cached data, return cached (stale) data
    if (cachedRate) {
      logger.warn(`Failed to fetch new rate, using stale cache: ${error}`);
      return cachedRate;
    }
    throw error;
  }
}

/**
 * Convert ETH to IDR and USD
 */
export async function convertEthToFiat(
  ethAmount: number
): Promise<ConvertResult> {
  const rate = await getExchangeRate();

  return {
    eth: ethAmount,
    idr: Math.round(ethAmount * rate.eth_idr),
    usd: Math.round(ethAmount * rate.eth_usd * 100) / 100,
  };
}

/**
 * Convert IDR to ETH
 */
export async function convertIdrToEth(idrAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return idrAmount / rate.eth_idr;
}

/**
 * Convert USD to ETH
 */
export async function convertUsdToEth(usdAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return usdAmount / rate.eth_usd;
}

/**
 * Start background rate updater
 * Periodically fetches new rates to keep cache fresh
 */
export function startRateUpdater(): void {
  logger.info(
    `Starting exchange rate updater (interval: ${
      env.RATE_UPDATE_INTERVAL_MS / 1000
    }s)`
  );

  // Initial fetch
  getExchangeRate().catch((err) => {
    logger.error(`Initial rate fetch failed: ${err.message}`);
  });

  // Periodic updates
  setInterval(async () => {
    try {
      // Force refresh by clearing cache
      lastFetchTime = 0;
      await getExchangeRate();
    } catch (error) {
      logger.error(`Periodic rate update failed: ${error}`);
    }
  }, env.RATE_UPDATE_INTERVAL_MS);
}

/**
 * Get cached rate without fetching (for health checks)
 */
export function getCachedRate(): ExchangeRateData | null {
  return cachedRate;
}
