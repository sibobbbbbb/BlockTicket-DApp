import { ethers } from "ethers";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { OnChainIdentity } from "../types";
import OracleConsumerABI from "../../contracts/OracleConsumerABI.json";

/**
 * Blockchain Writer Service
 * Handles all interactions with OracleConsumer smart contract
 */

let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let oracleContract: ethers.Contract | null = null;

/**
 * Initialize blockchain connection
 */
export function initBlockchain(): void {
  try {
    // Create provider
    provider = new ethers.JsonRpcProvider(env.RPC_URL, {
      chainId: env.CHAIN_ID,
      name: "private-chain",
    });

    // Create wallet from private key
    const privateKey = env.ORACLE_PRIVATE_KEY.startsWith("0x")
      ? env.ORACLE_PRIVATE_KEY
      : `0x${env.ORACLE_PRIVATE_KEY}`;

    wallet = new ethers.Wallet(privateKey, provider);

    // Create contract instance
    oracleContract = new ethers.Contract(
      env.ORACLE_CONSUMER_ADDRESS,
      OracleConsumerABI,
      wallet
    );

    logger.success(`Blockchain connected: ${env.RPC_URL}`);
    logger.info(`Oracle wallet: ${wallet.address}`);
    logger.info(`OracleConsumer contract: ${env.ORACLE_CONSUMER_ADDRESS}`);
  } catch (error) {
    logger.error(`Failed to initialize blockchain: ${error}`);
    throw error;
  }
}

/**
 * Get the oracle wallet address
 */
export function getOracleWalletAddress(): string {
  if (!wallet) {
    throw new Error("Blockchain not initialized");
  }
  return wallet.address;
}

/**
 * Get oracle wallet balance
 */
export async function getOracleBalance(): Promise<string> {
  if (!provider || !wallet) {
    throw new Error("Blockchain not initialized");
  }

  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

/**
 * Update identity on-chain (KYC attestation)
 */
export async function updateIdentity(
  walletAddress: string,
  identityHash: string,
  maxTickets: number,
  blocked: boolean,
  expiry: number
): Promise<string> {
  if (!oracleContract) {
    throw new Error("Contract not initialized");
  }

  logger.info(`Writing KYC to blockchain for: ${walletAddress}`);
  logger.debug(`  identityHash: ${identityHash}`);
  logger.debug(`  maxTickets: ${maxTickets}`);
  logger.debug(`  blocked: ${blocked}`);
  logger.debug(`  expiry: ${new Date(expiry * 1000).toISOString()}`);

  try {
    // Estimate gas first
    const updateIdentityFn = oracleContract.getFunction("updateIdentity");
    const gasEstimate = await updateIdentityFn.estimateGas(
      walletAddress,
      identityHash,
      maxTickets,
      blocked,
      expiry
    );

    logger.debug(`Gas estimate: ${gasEstimate.toString()}`);

    // Send transaction
    const tx = await updateIdentityFn(
      walletAddress,
      identityHash,
      maxTickets,
      blocked,
      expiry,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      }
    );

    logger.tx(`Transaction sent`, tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      logger.success(`KYC written to blockchain for ${walletAddress}`);
      return tx.hash;
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to update identity: ${errorMessage}`);
    throw error;
  }
}

/**
 * Get identity from blockchain
 */
export async function getIdentity(
  walletAddress: string
): Promise<OnChainIdentity | null> {
  if (!oracleContract) {
    throw new Error("Contract not initialized");
  }

  try {
    const getIdentityFn = oracleContract.getFunction("getIdentity");
    const result = await getIdentityFn(walletAddress);

    // result is a tuple: [identityHash, maxTickets, blocked, expiry]
    const [identityHash, maxTickets, blocked, expiry] = result;

    // Check if identity exists (identityHash != 0x0)
    if (identityHash === ethers.ZeroHash) {
      return null;
    }

    return {
      identityHash: identityHash,
      maxTickets: Number(maxTickets),
      blocked: blocked,
      expiry: expiry,
    };
  } catch (error) {
    logger.error(`Failed to get identity: ${error}`);
    throw error;
  }
}

/**
 * Check if wallet is eligible (convenience function)
 */
export async function isEligible(walletAddress: string): Promise<boolean> {
  if (!oracleContract) {
    throw new Error("Contract not initialized");
  }

  try {
    const isEligibleFn = oracleContract.getFunction("isEligible");
    return await isEligibleFn(walletAddress);
  } catch (error) {
    logger.error(`Failed to check eligibility: ${error}`);
    return false;
  }
}

/**
 * Check blockchain connection health
 */
export async function checkBlockchainHealth(): Promise<{
  connected: boolean;
  blockNumber: number | null;
  oracleBalance: string | null;
}> {
  try {
    if (!provider || !wallet) {
      return { connected: false, blockNumber: null, oracleBalance: null };
    }

    const blockNumber = await provider.getBlockNumber();
    const balance = await getOracleBalance();

    return {
      connected: true,
      blockNumber,
      oracleBalance: balance,
    };
  } catch {
    return { connected: false, blockNumber: null, oracleBalance: null };
  }
}
