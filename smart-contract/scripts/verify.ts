import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  console.log("🔍 Verifying contracts on Etherscan...\n");

  // Read deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const networkName = (await hre.ethers.provider.getNetwork()).name;
  const filename = path.join(deploymentsDir, `${networkName}.json`);

  if (!fs.existsSync(filename)) {
    console.error(`❌ Deployment file not found: ${filename}`);
    console.log("Please deploy contracts first using: npm run deploy:sepolia");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(filename, "utf8"));
  const contracts = deploymentInfo.contracts;

  console.log("📋 Found deployed contracts:");
  console.log(JSON.stringify(contracts, null, 2));
  console.log();

  // Verify OracleConsumer
  console.log("1️⃣ Verifying OracleConsumer...");
  try {
    await hre.run("verify:verify", {
      address: contracts.OracleConsumer,
      constructorArguments: [deploymentInfo.deployer]
    });
    console.log("   ✅ OracleConsumer verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.error("   ❌ Verification failed:", error.message, "\n");
    }
  }

  // Verify EventRegistry
  console.log("2️⃣ Verifying EventRegistry...");
  try {
    await hre.run("verify:verify", {
      address: contracts.EventRegistry,
      constructorArguments: []
    });
    console.log("   ✅ EventRegistry verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.error("   ❌ Verification failed:", error.message, "\n");
    }
  }

  // Verify TicketNFT
  console.log("3️⃣ Verifying TicketNFT...");
  try {
    await hre.run("verify:verify", {
      address: contracts.TicketNFT,
      constructorArguments: [
        "BlockTicket",
        "BTIX",
        deploymentInfo.deployer,
        "https://api.blockticket.io/metadata/"
      ]
    });
    console.log("   ✅ TicketNFT verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.error("   ❌ Verification failed:", error.message, "\n");
    }
  }

  // Verify Marketplace
  console.log("4️⃣ Verifying Marketplace...");
  try {
    await hre.run("verify:verify", {
      address: contracts.Marketplace,
      constructorArguments: [
        contracts.OracleConsumer,
        contracts.EventRegistry,
        contracts.TicketNFT
      ]
    });
    console.log("   ✅ Marketplace verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.error("   ❌ Verification failed:", error.message, "\n");
    }
  }

  console.log("🎉 Verification process completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
