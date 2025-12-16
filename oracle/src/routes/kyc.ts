import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  verifyKyc,
  getKycStatus,
  blockWallet,
  unblockWallet,
} from "../services/kycService";
import { kycRequestSchema, successResponse, errorResponse } from "../types";
import { z } from "zod";
import { logger } from "../utils/logger";

/**
 * KYC Routes
 * /api/kyc - Handle KYC verification and status checks
 */

export const kycRoutes = new Hono();

/**
 * POST /api/kyc/verify
 * Submit KYC verification and write to blockchain
 */
kycRoutes.post(
  "/verify",
  zValidator("json", kycRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        errorResponse(
          `Validation failed: ${JSON.stringify(result.error.issues)}`
        ),
        400
      );
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid("json");

      logger.info(`KYC verification request for: ${data.walletAddress}`);

      const result = await verifyKyc(data);

      return c.json(successResponse(result));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "KYC verification failed";
      logger.error(`KYC verification failed: ${message}`);
      return c.json(errorResponse(message), 500);
    }
  }
);

/**
 * GET /api/kyc/status/:wallet
 * Check KYC status for a wallet address
 */
const walletParamSchema = z.object({
  wallet: z.string().startsWith("0x").length(42),
});

kycRoutes.get(
  "/status/:wallet",
  zValidator("param", walletParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(errorResponse("Invalid wallet address format"), 400);
    }
  }),
  async (c) => {
    try {
      const { wallet } = c.req.valid("param");

      const status = await getKycStatus(wallet);

      return c.json(successResponse(status));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get KYC status";
      return c.json(errorResponse(message), 500);
    }
  }
);

/**
 * POST /api/kyc/block/:wallet
 * Block a wallet (admin endpoint - in production, add auth)
 */
kycRoutes.post(
  "/block/:wallet",
  zValidator("param", walletParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(errorResponse("Invalid wallet address format"), 400);
    }
  }),
  async (c) => {
    try {
      const { wallet } = c.req.valid("param");

      blockWallet(wallet);

      return c.json(
        successResponse({
          wallet,
          blocked: true,
          message: "Wallet has been blocked",
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to block wallet";
      return c.json(errorResponse(message), 500);
    }
  }
);

/**
 * POST /api/kyc/unblock/:wallet
 * Unblock a wallet (admin endpoint - in production, add auth)
 */
kycRoutes.post(
  "/unblock/:wallet",
  zValidator("param", walletParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(errorResponse("Invalid wallet address format"), 400);
    }
  }),
  async (c) => {
    try {
      const { wallet } = c.req.valid("param");

      unblockWallet(wallet);

      return c.json(
        successResponse({
          wallet,
          blocked: false,
          message: "Wallet has been unblocked",
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to unblock wallet";
      return c.json(errorResponse(message), 500);
    }
  }
);
