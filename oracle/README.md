# BlockTicket Oracle Service

Oracle service for BlockTicket DApp providing exchange rate data and KYC verification.

## Features

- **Exchange Rate**: Real-time ETH/IDR and ETH/USD rates from CoinGecko
- **KYC Verification**: User identity verification with blockchain attestation
- **Anti-Scalping**: Wallet blocking and ticket purchase limits

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **Blockchain**: [ethers.js](https://ethers.org/) v6 - Ethereum library
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed
- Private Ethereum network running (Geth/Hardhat)
- OracleConsumer contract deployed

### Installation

```bash
cd oracle
bun install
```

### Configuration

1. Copy environment template:

```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:

```env
# Server
PORT=3001

# Blockchain
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=1337
ORACLE_PRIVATE_KEY=your_private_key_here

# Contract (after deployment)
ORACLE_CONSUMER_ADDRESS=0x...

# KYC
KYC_HASH_SALT=your_secret_salt
```

### Running

Development (with hot reload):

```bash
bun dev
```

Production:

```bash
bun start
```

## API Endpoints

### Health Check

```
GET /health
```

### Exchange Rate

```
GET /api/rate              # Get current ETH/IDR/USD rates
GET /api/rate/convert?eth=0.05  # Convert ETH to fiat
GET /api/rate/cached       # Get cached rate (debug)
```

### KYC Verification

```
POST /api/kyc/verify       # Submit KYC verification
GET /api/kyc/status/:wallet  # Check KYC status
POST /api/kyc/block/:wallet  # Block wallet (admin)
POST /api/kyc/unblock/:wallet  # Unblock wallet (admin)
```

## API Examples

### Get Exchange Rate

```bash
curl http://localhost:3001/api/rate
```

Response:

```json
{
  "success": true,
  "data": {
    "eth_idr": 52500000,
    "eth_usd": 3250,
    "lastUpdated": "2025-12-16T10:30:00Z",
    "source": "coingecko"
  }
}
```

### Submit KYC Verification

```bash
curl -X POST http://localhost:3001/api/kyc/verify \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "fullName": "John Doe",
    "idNumber": "3201234567890001",
    "email": "john@example.com"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "walletAddress": "0x123...",
    "identityHash": "0xabc...",
    "maxTickets": 4,
    "blocked": false,
    "expiry": 1735689600,
    "txHash": "0xdef..."
  }
}
```

### Check KYC Status

```bash
curl http://localhost:3001/api/kyc/status/0x1234567890123456789012345678901234567890
```

## Project Structure

```
oracle/
├── src/
│   ├── index.ts              # Entry point & Hono server
│   ├── config/
│   │   └── env.ts            # Environment configuration
│   ├── services/
│   │   ├── exchangeRate.ts   # CoinGecko integration
│   │   ├── kycService.ts     # KYC verification logic
│   │   └── blockchainWriter.ts  # Smart contract interaction
│   ├── routes/
│   │   ├── rate.ts           # Exchange rate endpoints
│   │   └── kyc.ts            # KYC endpoints
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── utils/
│       └── logger.ts         # Logging utility
├── contracts/
│   └── OracleConsumerABI.json  # Contract ABI
├── package.json
├── tsconfig.json
└── .env.example
```

## Security Considerations

1. **Private Key**: Never commit `.env` to git
2. **KYC Data**: Only `identityHash` is stored on-chain, not PII
3. **Rate Limiting**: Consider adding rate limiting in production
4. **Authentication**: Add API keys for admin endpoints in production

## License

MIT
