# BlockTicket Smart Contracts

Smart contracts for NFT-based ticketing system with anti-scalping mechanisms and KYC integration.

## 📋 Contracts

This project deploys 4 core smart contracts to Ganache local blockchain:

| Contract | Purpose |
|----------|---------|
| **OracleConsumer** | KYC data storage and verification |
| **EventRegistry** | Event creation and management |
| **TicketNFT** | ERC-721 ticket NFTs with status tracking |
| **Marketplace** | Primary sale and controlled resale |

> 💡 **Note**: Contract addresses are generated during deployment and will be unique for each Ganache instance. After deploying, addresses will be saved to `deployments/ganache.json`.

---

## ⚙️ Tech Stack

- Solidity 0.8.20
- Hardhat (development framework)
- OpenZeppelin (security libraries)
- TypeScript + ethers.js v6
- **Ganache** (local blockchain with GUI)

---

## 🚀 Quick Start

### Prerequisites

1. **Ganache GUI** installed ([Download here](https://trufflesuite.com/ganache/))
2. **Node.js** v16+ and npm
3. **Ganache running** on default settings

### Setup Steps

**1. Install Dependencies**
```bash
npm install
```

**2. Setup Ganache**

1. Launch **Ganache GUI**
2. Click **"QUICKSTART"** (Ethereum)
3. Note the **RPC Server**: `http://127.0.0.1:7545`
4. Click **first account** → **🔑 key icon** → Copy private key

**3. Configure Environment**
```bash
cp .env.example .env
# Edit .env and paste your Ganache private key
```

**`.env` should contain:**
```env
GANACHE_RPC_URL=http://127.0.0.1:7545
GANACHE_PRIVATE_KEY=your_ganache_private_key_without_0x
```

**4. Compile Contracts**
```bash
npm run compile
```

**5. Run Tests**
```bash
npm test
```

**6. Deploy to Ganache**
```bash
npm run deploy
```

---

## 📦 Available Commands

```bash
npm run compile      # Compile contracts
npm test             # Run test suite
npm run clean        # Clean build artifacts
npm run deploy       # Deploy to Ganache
```

---

## 📂 Project Structure

```
smart-contract/
├── contracts/          # Solidity contracts
│   ├── OracleConsumer.sol
│   ├── EventRegistry.sol
│   ├── TicketNFT.sol
│   └── Marketplace.sol
├── scripts/           # Deployment scripts
│   └── deploy.ts
├── test/              # Test files
│   └── deployment.test.ts
├── deployments/       # Deployed addresses (gitignored)
│   └── ganache.json
├── hardhat.config.ts  # Hardhat configuration
└── .env               # Environment variables (gitignored)
```

---

## 🔑 Getting Private Key from Ganache

1. Open Ganache
2. Click on first account (index 0)
3. Click 🔑 (key icon)
4. Copy private key **WITHOUT** `0x` prefix
5. Paste to `.env`

---

## 📝 Network Configuration

**Current Setup**: Ganache Local Blockchain

| Parameter | Value |
|-----------|-------|
| **Network** | Ganache Local |
| **Chain ID** | 1337 |
| **RPC URL** | http://127.0.0.1:7545 |
| **Accounts** | 10 pre-funded (100 ETH each) |

---

## 🔐 Security

- OpenZeppelin libraries (battle-tested)
- ReentrancyGuard protection
- Access control with roles
- Input validation on all functions

⚠️ **Important**: Never commit `.env` file to git. It contains private keys.

---

