# BlockTicket Smart Contracts

Smart contracts for NFT-based ticketing system with anti-scalping mechanisms and KYC integration.

## 📋 Deployed Contracts

| Contract | Address (Sepolia) | Purpose |
|----------|-------------------|---------|
| **OracleConsumer** | `0xAb1e9c1dCfc127FBbF1277D2B95a9e423f23440c` | KYC data storage |
| **EventRegistry** | `0x10E5D86fB3970f07C7ADB3575a31D94340154E85` | Event management |
| **TicketNFT** | `0xE3121be9eCFF122579Abb97ddba052360b7BF330` | ERC-721 ticket NFTs |
| **Marketplace** | `0x928B2cDDc2056A5872b17D8ac80c97EE1dC5C347` | Ticket buying/selling |

🔗 **View on Etherscan**: [OracleConsumer](https://sepolia.etherscan.io/address/0xAb1e9c1dCfc127FBbF1277D2B95a9e423f23440c) | [EventRegistry](https://sepolia.etherscan.io/address/0x10E5D86fB3970f07C7ADB3575a31D94340154E85) | [TicketNFT](https://sepolia.etherscan.io/address/0xE3121be9eCFF122579Abb97ddba052360b7BF330) | [Marketplace](https://sepolia.etherscan.io/address/0x928B2cDDc2056A5872b17D8ac80c97EE1dC5C347)

---

## ⚙️ Tech Stack

- Solidity 0.8.20
- Hardhat (development framework)
- OpenZeppelin (security libraries)
- TypeScript + ethers.js v6

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your private key & RPC URL
```

### 3. Compile Contracts
```bash
npm run compile
```

### 4. Run Tests
```bash
npm test
```

**Expected**: 9 tests passing ✅

---

## 📦 Deployment

Contracts are already deployed to Sepolia testnet. See addresses above.

**If you need to redeploy:**
```bash
# Setup .env first!
npm run deploy:sepolia
npm run verify:sepolia
```

---

## 🔑 Environment Variables

Your `.env` file should contain:

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_private_key_without_0x
ETHERSCAN_API_KEY=your_api_key_for_verification
```

**Get Sepolia ETH**: https://sepoliafaucet.com/

---

## 📂 Project Structure

```
smart-contract/
├── contracts/          # Solidity contracts
├── scripts/           # Deployment scripts
├── test/              # Test files
├── deployments/       # Deployed addresses
└── hardhat.config.ts  # Hardhat configuration
```

---

## 🎯 How It Works

1. **OracleConsumer** - Stores KYC verification data from oracle service
2. **EventRegistry** - Event organizers create events here
3. **TicketNFT** - Tickets as NFTs with limited transfers (anti-scalping)
4. **Marketplace** - Users buy tickets, controlled resale with price caps

**Key Features**:
- ✅ KYC verification before ticket purchase
- ✅ NFT tickets with status tracking
- ✅ Anti-scalping: transfer restrictions + price caps
- ✅ Role-based access control (admin, minter, check-in)

---

## 🔐 Security

- OpenZeppelin libraries (battle-tested)
- ReentrancyGuard protection
- Access control with roles
- Verified on Etherscan ✅

---

## 📝 Notes

- Network: **Sepolia Testnet** (Chain ID: 11155111)
- All contracts verified on Etherscan
- Gas cost for deployment: ~0.003 ETH
- TypeChain types generated for frontend integration

---

## 🤝 Integration

**For Oracle Service**:
```env
ORACLE_CONSUMER_ADDRESS=0xAb1e9c1dCfc127FBbF1277D2B95a9e423f23440c
```

**For Frontend**:
Copy addresses from the table above + ABIs from `artifacts/contracts/`

---

## ⚡ Quick Commands

```bash
npm run compile           # Compile contracts
npm test                  # Run tests
npm run clean             # Clean artifacts
npm run deploy:sepolia    # Deploy to Sepolia
npm run verify:sepolia    # Verify on Etherscan
```

---

**Questions?** Check contract source code in `contracts/` or view on Etherscan (links above).
