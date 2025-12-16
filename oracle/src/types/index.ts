import { z } from "zod";

// ===========================================
// Exchange Rate Types
// ===========================================

export interface ExchangeRateData {
  eth_idr: number;
  eth_usd: number;
  lastUpdated: Date;
  source: string;
}

export interface ConvertResult {
  eth: number;
  idr: number;
  usd: number;
}

// ===========================================
// KYC Types
// ===========================================

export const kycRequestSchema = z.object({
  walletAddress: z
    .string()
    .startsWith("0x", "Wallet address must start with 0x")
    .length(42, "Wallet address must be 42 characters"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  idNumber: z.string().min(10, "ID number must be at least 10 characters"),
  email: z.string().email("Invalid email format"),
});

export type KycRequest = z.infer<typeof kycRequestSchema>;

export interface KycResult {
  walletAddress: string;
  identityHash: string;
  maxTickets: number;
  blocked: boolean;
  expiry: number; // Unix timestamp
  txHash: string;
}

export interface KycStatus {
  isVerified: boolean;
  identityHash: string | null;
  maxTickets: number;
  blocked: boolean;
  expiry: number | null;
  expiryDate: string | null;
  isExpired: boolean;
}

// ===========================================
// On-chain Identity (from OracleConsumer)
// ===========================================

export interface OnChainIdentity {
  identityHash: string;
  maxTickets: number;
  blocked: boolean;
  expiry: bigint;
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(error: string): ApiResponse<never> {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
}
