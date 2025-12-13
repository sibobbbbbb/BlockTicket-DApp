# 🚀 TODO: Smart Contract Integration Phase

This document outlines the technical steps Farhan must take once the Smart Contract (`.sol`) has been deployed to the Private Blockchain.

## 📦 Phase 1: Artifacts & Configuration
*Initial "Copy-Paste" steps to connect the Frontend with the Blockchain.*

- [ ] **Obtain ABI JSON**
    - Request the `Artifacts` or `ABI` file (JSON format) from the backend team.
    - Open the `src/contracts/TicketContractABI.json` file.
    - **Delete** the dummy content, and **Paste** the actual ABI from the backend.
- [ ] **Update Contract Address**
    - Request the deployed contract address (e.g., `0x5FbDB...`).
    - Open the `src/contracts/addresses.ts` file.
    - Update the `TICKET_CONTRACT_ADDRESS` variable with that address.
- [ ] **Configure Private Network (RPC)**
    - Ask the backend team: The *Chain ID* and *RPC URL* being used (Geth/Hardhat).
    - Open `src/utils/network.ts`.
    - Adjust `chainId` (e.g., `1337` or `31337`) and `rpcUrls`.
- [ ] **Setup IPFS Keys (Pinata)**
    - Register at [Pinata.cloud](https://www.pinata.cloud/) (Free).
    - Generate an API Key (JWT).
    - Open `src/utils/ipfs.ts` and paste the JWT Token into the `PINATA_JWT` constant.

## 📡 Phase 2: Data Fetching (Read Operations)
*Replacing Mock Data with real data from the Blockchain.*

- [ ] **Refactor `src/pages/Home.tsx`**
    - [ ] Remove `MOCK_EVENTS` and the dummy `setTimeout`.
    - [ ] Inside `useEffect`, call a view contract function (e.g., `getAllEvents()`).
    - [ ] Ensure data mapping from Solidity Struct (`uint256`, `string`) to TypeScript interface (`TicketEvent`) is correct.
        - *Note:* Numbers from the blockchain are usually `BigInt`, convert to `number` or `string` if necessary.
- [ ] **Refactor `src/pages/MyTickets.tsx`**
    - [ ] Call the contract function for user-owned tickets (e.g., `getTicketsByOwner(address)`).
    - [ ] Parse IPFS metadata if ticket data (image/location) is stored in off-chain JSON.
- [ ] **Refactor `src/components/OracleFeed.tsx`**
    - [ ] (Optional) If there is a `getExchangeRate()` function in the contract, call it to display the actual exchange rate stored on-chain.

## ⚡ Phase 3: Transaction Logic (Write Operations)
*Ensuring transaction send function parameters are correct.*

- [ ] **Update `buyTicket` Function in `Home.tsx`**
    - [ ] Check the function name in the ABI (is it `buyTicket`, `purchase`, or `mint`?).
    - [ ] Ensure the `value` parameter (ETH sent) is converted correctly: `ethers.parseEther(priceInEth)`.
- [ ] **Update `createEvent` Function in `Admin.tsx`**
    - [ ] Check the order of `createEvent` function parameters.
        - Example: `(string name, uint256 price, uint256 stock, string cid)`.
    - [ ] Ensure data types match (e.g., Price must be sent in Wei or IDR units as agreed with Oracle).

## 🛡️ Phase 4: Testing & Security Check
*Final validation before demo recording.*

- [ ] **Test Network Switching**
    - [ ] Try switching MetaMask network to *Mainnet*, then refresh the page. The application should automatically prompt to switch to *Localhost*.
- [ ] **Test Error Handling**
    - [ ] Try buying a ticket without sufficient ETH balance -> Ensure `toast.error` appears.
    - [ ] Try buying more tickets than available stock -> Ensure `toast.error` appears.
- [ ] **Test Oracle Flow**
    - [ ] (Simulation) Turn off the Oracle backend, does the Smart Contract have a fallback or clear error message?

## 🎥 Phase 5: Demo Recording Prep
- [ ] **Reset Chain:** Ask the backend team to reset/re-deploy the contract so the data is clean (Event 0, Ticket 0).
- [ ] **Pre-fill Data:** Use the Admin account to `createEvent` at least 2 events so the Home page is not empty when the demo starts.
- [ ] **Demo Scenario:**
    1.  Admin Login -> Create Event (Upload Image).
    2.  Switch User Account -> Buy Ticket (Show Loading Toast).
    3.  Open My Tickets -> Show NFT received.
    4.  Check ETH balance decreased.