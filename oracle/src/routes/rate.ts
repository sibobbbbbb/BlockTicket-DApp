import { Hono } from "hono";
import {
  getExchangeRate,
  convertEthToFiat,
  getCachedRate,
} from "../services/exchangeRate";
import { successResponse, errorResponse } from "../types";

/**
 * Exchange Rate Routes
 * /api/rate - Get current rates and convert currencies
 */

export const rateRoutes = new Hono();

/**
 * GET /api/rate
 * Get current ETH/IDR and ETH/USD exchange rates
 */
rateRoutes.get("/", async (c) => {
  try {
    const rate = await getExchangeRate();

    return c.json(
      successResponse({
        eth_idr: rate.eth_idr,
        eth_usd: rate.eth_usd,
        lastUpdated: rate.lastUpdated.toISOString(),
        source: rate.source,
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get exchange rate";
    return c.json(errorResponse(message), 500);
  }
});

/**
 * GET /api/rate/convert
 * Convert ETH to IDR and USD
 * Query params: eth (amount in ETH)
 */
rateRoutes.get("/convert", async (c) => {
  try {
    const ethParam = c.req.query("eth");

    if (!ethParam) {
      return c.json(errorResponse("Missing 'eth' query parameter"), 400);
    }

    const ethAmount = parseFloat(ethParam);

    if (isNaN(ethAmount) || ethAmount < 0) {
      return c.json(
        errorResponse("Invalid 'eth' value. Must be a positive number."),
        400
      );
    }

    const result = await convertEthToFiat(ethAmount);

    return c.json(successResponse(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to convert";
    return c.json(errorResponse(message), 500);
  }
});

/**
 * GET /api/rate/cached
 * Get cached rate without triggering a fetch (for debugging)
 */
rateRoutes.get("/cached", (c) => {
  const cached = getCachedRate();

  if (!cached) {
    return c.json(errorResponse("No cached rate available"), 404);
  }

  return c.json(
    successResponse({
      eth_idr: cached.eth_idr,
      eth_usd: cached.eth_usd,
      lastUpdated: cached.lastUpdated.toISOString(),
      source: cached.source,
      note: "This is the cached value, may be stale",
    })
  );
});
