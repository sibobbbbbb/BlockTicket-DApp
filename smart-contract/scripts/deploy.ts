import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting BlockTicket Smart Contract Deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deployment addresses will be saved here
  const deployedAddresses: any = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // 1. Deploy OracleConsumer
  console.log("1️⃣ Deploying OracleConsumer...");
  const OracleConsumer = await ethers.getContractFactory("OracleConsumer");
  const oracleConsumer = await OracleConsumer.deploy(deployer.address); // Deployer as initial oracle
  await oracleConsumer.waitForDeployment();
  const oracleAddress = await oracleConsumer.getAddress();
  
  console.log("   ✅ OracleConsumer deployed to:", oracleAddress);
  deployedAddresses.contracts.OracleConsumer = oracleAddress;

  // 2. Deploy EventRegistry
  console.log("\n2️⃣ Deploying EventRegistry...");
  const EventRegistry = await ethers.getContractFactory("EventRegistry");
  const eventRegistry = await EventRegistry.deploy();
  await eventRegistry.waitForDeployment();
  const registryAddress = await eventRegistry.getAddress();
  
  console.log("   ✅ EventRegistry deployed to:", registryAddress);
  deployedAddresses.contracts.EventRegistry = registryAddress;

  // 3. Deploy TicketNFT
  console.log("\n3️⃣ Deploying TicketNFT...");
  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy(
    "BlockTicket",                          // name
    "BTIX",                                 // symbol
    deployer.address,                       // admin
    "https://api.blockticket.io/metadata/" // baseURI (can be updated later)
  );
  await ticketNFT.waitForDeployment();
  const ticketAddress = await ticketNFT.getAddress();
  
  console.log("   ✅ TicketNFT deployed to:", ticketAddress);
  deployedAddresses.contracts.TicketNFT = ticketAddress;

  // 4. Deploy Marketplace
  console.log("\n4️⃣ Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    oracleAddress,
    registryAddress,
    ticketAddress
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("   ✅ Marketplace deployed to:", marketplaceAddress);
  deployedAddresses.contracts.Marketplace = marketplaceAddress;

  // 5. Setup Roles & Permissions
  console.log("\n5️⃣ Setting up roles and permissions...");

  // Grant MINTER_ROLE to Marketplace
  const MINTER_ROLE = await ticketNFT.MINTER_ROLE();
  console.log("   🔐 Granting MINTER_ROLE to Marketplace...");
  const grantTx = await ticketNFT.grantRole(MINTER_ROLE, marketplaceAddress);
  await grantTx.wait();
  console.log("   ✅ MINTER_ROLE granted");

  // Set Marketplace address in TicketNFT
  console.log("   🔗 Setting Marketplace address in TicketNFT...");
  const setMarketplaceTx = await ticketNFT.setMarketplace(marketplaceAddress);
  await setMarketplaceTx.wait();
  console.log("   ✅ Marketplace address set");

  // 6. Save Deployment Info
  console.log("\n6️⃣ Saving deployment information...");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = deployedAddresses.network === "unknown" 
    ? `chain-${deployedAddresses.chainId}` 
    : deployedAddresses.network;
  
  const filename = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(filename, JSON.stringify(deployedAddresses, null, 2));
  console.log("   ✅ Deployment info saved to:", filename);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   OracleConsumer :", oracleAddress);
  console.log("   EventRegistry  :", registryAddress);
  console.log("   TicketNFT      :", ticketAddress);
  console.log("   Marketplace    :", marketplaceAddress);
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Update oracle service with OracleConsumer address");
  console.log("   2. Update frontend with all contract addresses");
  console.log("   3. Verify contracts on Etherscan:");
  console.log(`      npx hardhat verify --network ${networkName} ${oracleAddress} "${deployer.address}"`);
  console.log(`      npx hardhat verify --network ${networkName} ${registryAddress}`);
  console.log(`      npx hardhat verify --network ${networkName} ${ticketAddress} "BlockTicket" "BTIX" "${deployer.address}" "https://api.blockticket.io/metadata/"`);
  console.log(`      npx hardhat verify --network ${networkName} ${marketplaceAddress} "${oracleAddress}" "${registryAddress}" "${ticketAddress}"`);
  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
