import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { env } from "./config/env";
import { logger } from "./utils/logger";
import { rateRoutes } from "./routes/rate";
import { kycRoutes } from "./routes/kyc";
import { startRateUpdater, getCachedRate } from "./services/exchangeRate";
import {
  initBlockchain,
  checkBlockchainHealth,
  getOracleWalletAddress,
} from "./services/blockchainWriter";
import { successResponse, errorResponse } from "./types";

/**
 * BlockTicket Oracle Service
 *
 * Provides:
 * - ETH/IDR exchange rate from CoinGecko
 * - KYC verification and blockchain attestation
 */

const app = new Hono();

// ===========================================
// Middleware
// ===========================================

// CORS - allow frontend to access
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // Vite dev server
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Request logging
app.use("*", honoLogger());

// Pretty JSON in development
if (env.NODE_ENV === "development") {
  app.use("*", prettyJSON());
}

// ===========================================
// Routes
// ===========================================

// Health check
app.get("/health", async (c) => {
  const blockchain = await checkBlockchainHealth();
  const cachedRate = getCachedRate();

  return c.json(
    successResponse({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      services: {
        exchangeRate: {
          status: cachedRate ? "ok" : "initializing",
          lastRate: cachedRate
            ? {
                eth_idr: cachedRate.eth_idr,
                lastUpdated: cachedRate.lastUpdated.toISOString(),
              }
            : null,
        },
        blockchain: {
          status: blockchain.connected ? "ok" : "disconnected",
          blockNumber: blockchain.blockNumber,
          oracleBalance: blockchain.oracleBalance,
        },
      },
    })
  );
});

// API info
app.get("/", (c) => {
  return c.json(
    successResponse({
      name: "BlockTicket Oracle",
      version: "1.0.0",
      description: "Oracle service for BlockTicket DApp",
      endpoints: {
        health: "GET /health",
        rate: {
          current: "GET /api/rate",
          convert: "GET /api/rate/convert?eth={amount}",
          cached: "GET /api/rate/cached",
        },
        kyc: {
          verify: "POST /api/kyc/verify",
          status: "GET /api/kyc/status/:wallet",
          block: "POST /api/kyc/block/:wallet",
          unblock: "POST /api/kyc/unblock/:wallet",
        },
      },
    })
  );
});

// Mount route groups
app.route("/api/rate", rateRoutes);
app.route("/api/kyc", kycRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(errorResponse("Not found"), 404);
});

// Error handler
app.onError((err, c) => {
  logger.error(`Unhandled error: ${err.message}`);
  return c.json(errorResponse(err.message), 500);
});

// ===========================================
// Startup
// ===========================================

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔮 BlockTicket Oracle Service                              ║
║                                                              ║
║   Exchange Rate & KYC Verification                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

async function startup() {
  printBanner();

  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Port: ${env.PORT}`);

  // Initialize blockchain connection
  try {
    initBlockchain();
    logger.success(`Oracle wallet: ${getOracleWalletAddress()}`);
  } catch (error) {
    logger.warn(
      `Blockchain init failed (contract may not be deployed yet): ${error}`
    );
    logger.warn("KYC endpoints will not work until blockchain is connected");
  }

  // Start exchange rate updater
  startRateUpdater();

  logger.success(`Server started on http://localhost:${env.PORT}`);
  logger.info("Press Ctrl+C to stop");
}

// Run startup
startup().catch((err) => {
  logger.error(`Startup failed: ${err}`);
  process.exit(1);
});

// Export for Bun
export default {
  port: env.PORT,
  fetch: app.fetch,
};
