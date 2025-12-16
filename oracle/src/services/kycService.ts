import { ethers } from "ethers";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { updateIdentity, getIdentity } from "./blockchainWriter";
import type { KycRequest, KycResult, KycStatus } from "../types";

/**
 * KYC Service
 * Handles user verification and writes attestation to blockchain
 */

// Simple in-memory blocklist for demo (in production, use database)
const blockedAddresses = new Set<string>();

/**
 * Generate identity hash from user data
 * Uses keccak256 with salt to create a unique, non-reversible hash
 */
export function generateIdentityHash(
  walletAddress: string,
  idNumber: string,
  email: string
): string {
  // Combine user data with salt
  const dataToHash = `${
    env.KYC_HASH_SALT
  }:${walletAddress.toLowerCase()}:${idNumber}:${email.toLowerCase()}`;

  // Generate keccak256 hash
  const hash = ethers.keccak256(ethers.toUtf8Bytes(dataToHash));

  logger.debug(
    `Generated identity hash for ${walletAddress}: ${hash.slice(0, 16)}...`
  );

  return hash;
}

/**
 * Calculate KYC expiry timestamp
 */
export function calculateExpiry(): number {
  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = env.KYC_EXPIRY_DAYS * 24 * 60 * 60;
  return now + expirySeconds;
}

/**
 * Check if wallet is in blocklist
 */
export function isBlocked(walletAddress: string): boolean {
  return blockedAddresses.has(walletAddress.toLowerCase());
}

/**
 * Add wallet to blocklist (for scalper detection)
 */
export function blockWallet(walletAddress: string): void {
  blockedAddresses.add(walletAddress.toLowerCase());
  logger.warn(`Wallet blocked: ${walletAddress}`);
}

/**
 * Remove wallet from blocklist
 */
export function unblockWallet(walletAddress: string): void {
  blockedAddresses.delete(walletAddress.toLowerCase());
  logger.info(`Wallet unblocked: ${walletAddress}`);
}

/**
 * Determine max tickets based on verification tier
 * For demo, everyone gets the default. In production, you could
 * implement tiers based on KYC level, purchase history, etc.
 */
function determineMaxTickets(_walletAddress: string): number {
  // Could implement logic like:
  // - VIP users: 10 tickets
  // - Regular verified: 4 tickets
  // - New users: 2 tickets
  return env.KYC_DEFAULT_MAX_TICKETS;
}

/**
 * Validate KYC data (basic validation)
 * In production, you would integrate with actual KYC provider
 */
function validateKycData(data: KycRequest): {
  valid: boolean;
  reason?: string;
} {
  // Check if wallet is blocked
  if (isBlocked(data.walletAddress)) {
    return { valid: false, reason: "Wallet is blocked" };
  }

  // Basic ID number validation (Indonesian NIK = 16 digits)
  if (!/^\d{16}$/.test(data.idNumber)) {
    return {
      valid: false,
      reason: "Invalid ID number format (must be 16 digits)",
    };
  }

  // All checks passed
  return { valid: true };
}

/**
 * Process KYC verification and write to blockchain
 */
export async function verifyKyc(data: KycRequest): Promise<KycResult> {
  logger.info(`Processing KYC for wallet: ${data.walletAddress}`);

  // Validate data
  const validation = validateKycData(data);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  // Generate identity hash
  const identityHash = generateIdentityHash(
    data.walletAddress,
    data.idNumber,
    data.email
  );

  // Determine max tickets
  const maxTickets = determineMaxTickets(data.walletAddress);

  // Calculate expiry
  const expiry = calculateExpiry();

  // Check if blocked
  const blocked = isBlocked(data.walletAddress);

  // Write to blockchain
  const txHash = await updateIdentity(
    data.walletAddress,
    identityHash,
    maxTickets,
    blocked,
    expiry
  );

  logger.success(`KYC verified for ${data.walletAddress}`);

  return {
    walletAddress: data.walletAddress,
    identityHash,
    maxTickets,
    blocked,
    expiry,
    txHash,
  };
}

/**
 * Get KYC status for a wallet
 */
export async function getKycStatus(walletAddress: string): Promise<KycStatus> {
  logger.debug(`Checking KYC status for: ${walletAddress}`);

  const identity = await getIdentity(walletAddress);

  if (!identity) {
    return {
      isVerified: false,
      identityHash: null,
      maxTickets: 0,
      blocked: false,
      expiry: null,
      expiryDate: null,
      isExpired: false,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiryTimestamp = Number(identity.expiry);
  const isExpired = expiryTimestamp !== 0 && now > expiryTimestamp;

  return {
    isVerified: true,
    identityHash: identity.identityHash,
    maxTickets: identity.maxTickets,
    blocked: identity.blocked,
    expiry: expiryTimestamp,
    expiryDate:
      expiryTimestamp !== 0
        ? new Date(expiryTimestamp * 1000).toISOString()
        : null,
    isExpired,
  };
}
