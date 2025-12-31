import { z } from "zod";

/**
 * Environment configuration schema with Zod validation
 */
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Blockchain
  RPC_URL: z.string().url().default("http://127.0.0.1:7545"),
  CHAIN_ID: z.coerce.number().default(1337),
  ORACLE_PRIVATE_KEY: z
    .string()
    .min(64, "Private key must be at least 64 characters"),

  // Contract Addresses
  ORACLE_CONSUMER_ADDRESS: z.string().startsWith("0x").length(42),

  // Exchange Rate
  COINGECKO_API_URL: z
    .string()
    .url()
    .default("https://api.coingecko.com/api/v3"),
  RATE_CACHE_TTL_SECONDS: z.coerce.number().default(300),
  RATE_UPDATE_INTERVAL_MS: z.coerce.number().default(300000),

  // KYC
  KYC_DEFAULT_MAX_TICKETS: z.coerce.number().default(4),
  KYC_EXPIRY_DAYS: z.coerce.number().default(365),
  KYC_HASH_SALT: z.string().min(8, "Salt must be at least 8 characters"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(Bun.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());

    // In development, show which vars are missing
    if (Bun.env.NODE_ENV !== "production") {
      console.error(
        "\n📝 Tip: Copy .env.example to .env and fill in the values"
      );
    }

    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
