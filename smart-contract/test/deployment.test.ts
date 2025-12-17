import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BlockTicket Deployment", function () {
  let oracleConsumer: Contract;
  let eventRegistry: Contract;
  let ticketNFT: Contract;
  let marketplace: Contract;
  
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy OracleConsumer
    const OracleConsumer = await ethers.getContractFactory("OracleConsumer");
    oracleConsumer = await OracleConsumer.deploy(owner.address);
    await oracleConsumer.waitForDeployment();

    // Deploy EventRegistry
    const EventRegistry = await ethers.getContractFactory("EventRegistry");
    eventRegistry = await EventRegistry.deploy();
    await eventRegistry.waitForDeployment();

    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy(
      "BlockTicket",
      "BTIX",
      owner.address,
      "https://api.blockticket.io/metadata/"
    );
    await ticketNFT.waitForDeployment();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(
      await oracleConsumer.getAddress(),
      await eventRegistry.getAddress(),
      await ticketNFT.getAddress()
    );
    await marketplace.waitForDeployment();

    // Setup roles
    const MINTER_ROLE = await ticketNFT.MINTER_ROLE();
    await ticketNFT.grantRole(MINTER_ROLE, await marketplace.getAddress());
    await ticketNFT.setMarketplace(await marketplace.getAddress());
  });

  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      expect(await oracleConsumer.getAddress()).to.be.properAddress;
      expect(await eventRegistry.getAddress()).to.be.properAddress;
      expect(await ticketNFT.getAddress()).to.be.properAddress;
      expect(await marketplace.getAddress()).to.be.properAddress;
    });

    it("Should set correct owner for OracleConsumer", async function () {
      expect(await oracleConsumer.owner()).to.equal(owner.address);
    });

    it("Should set correct owner for EventRegistry", async function () {
      expect(await eventRegistry.owner()).to.equal(owner.address);
    });

    it("Should set correct name and symbol for TicketNFT", async function () {
      expect(await ticketNFT.name()).to.equal("BlockTicket");
      expect(await ticketNFT.symbol()).to.equal("BTIX");
    });

    it("Should grant MINTER_ROLE to Marketplace", async function () {
      const MINTER_ROLE = await ticketNFT.MINTER_ROLE();
      expect(
        await ticketNFT.hasRole(MINTER_ROLE, await marketplace.getAddress())
      ).to.be.true;
    });

    it("Should set Marketplace address in TicketNFT", async function () {
      expect(await ticketNFT.marketplace()).to.equal(await marketplace.getAddress());
    });

    it("Should have correct immutable addresses in Marketplace", async function () {
      expect(await marketplace.oracle()).to.equal(await oracleConsumer.getAddress());
      expect(await marketplace.registry()).to.equal(await eventRegistry.getAddress());
      expect(await marketplace.tickets()).to.equal(await ticketNFT.getAddress());
    });
  });

  describe("Basic Functionality", function () {
    it("Should allow creating an event", async function () {
      const saleStart = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const saleEnd = saleStart + 86400; // 24 hours later
      const eventStart = saleEnd + 3600; // 1 hour after sale ends
      const basePrice = ethers.parseEther("0.01");

      const tx = await eventRegistry.createEvent(
        await ticketNFT.getAddress(),
        saleStart,
        saleEnd,
        eventStart,
        basePrice
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.undefined;
    });

    it("Should allow oracle to update identity", async function () {
      const identityHash = ethers.keccak256(ethers.toUtf8Bytes("user1"));
      const maxTickets = 4;
      const blocked = false;
      const expiry = 0;

      await oracleConsumer.updateIdentity(
        addr1.address,
        identityHash,
        maxTickets,
        blocked,
        expiry
      );

      const identity = await oracleConsumer.getIdentity(addr1.address);
      expect(identity[0]).to.equal(identityHash);
      expect(identity[1]).to.equal(maxTickets);
    });
  });
});
