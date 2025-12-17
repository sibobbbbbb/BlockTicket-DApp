// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./OracleConsumer.sol";
import "./EventRegistry.sol";
import "./TicketNFT.sol";

/**
 * Marketplace
 * - Primary sales: buyPrimary(eventId, qty)
 * - Controlled resale: listTicket / cancelListing / buyResale
 *
 * Security / anti-scalping:
 * - Oracle-assisted KYC gating (identityHash + blocked flag + optional expiry)
 * - Per-identity purchase limits (stops multi-wallet spam)
 * - Tickets can only move via this Marketplace (enforced in TicketNFT)
 * - Optional resale rules: price cap + max resales + royalty to organizer
 */
contract Marketplace is Ownable, ReentrancyGuard, ERC721Holder {
    OracleConsumer public immutable oracle;
    EventRegistry public immutable registry;
    TicketNFT public immutable tickets;

    // per event, per identityHash -> number of tickets bought in primary sale
    mapping(uint256 => mapping(bytes32 => uint32)) public purchasedByIdentity;

    // resale listing stored by tokenId (escrow model)
    struct Listing {
        address seller;
        uint256 priceWei;
        bool active;
    }
    mapping(uint256 => Listing) public listings;

    // resale count per ticket tokenId
    mapping(uint256 => uint8) public resaleCount;

    struct EventConfig {
        bool resaleEnabled;
        uint16 resaleCapBps;  // e.g. 11000 = 110% of base price
        uint8  maxResales;    // 0 = unlimited
        uint16 royaltyBps;    // e.g. 500 = 5% to organizer on resale
    }
    mapping(uint256 => EventConfig) public eventConfig;

    event PrimaryPurchased(uint256 indexed eventId, address indexed buyer, uint32 qty, uint256 paidWei);

    event EventConfigUpdated(
        uint256 indexed eventId,
        bool resaleEnabled,
        uint16 resaleCapBps,
        uint8 maxResales,
        uint16 royaltyBps
    );

    event TicketListed(uint256 indexed tokenId, uint256 indexed eventId, address indexed seller, uint256 priceWei);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event TicketResold(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed seller,
        address buyer,
        uint256 priceWei,
        uint256 royaltyWei
    );

    constructor(address oracle_, address registry_, address tickets_)
        Ownable(msg.sender)
    {
        require(oracle_ != address(0) && registry_ != address(0) && tickets_ != address(0), "Marketplace: addr=0");
        oracle = OracleConsumer(oracle_);
        registry = EventRegistry(registry_);
        tickets = TicketNFT(tickets_);
    }

    // ------------------------------------------------------------
    // Helpers (KYC gating)
    // ------------------------------------------------------------

    function _requireKycEligible(address buyer)
        internal
        view
        returns (bytes32 identityHash, uint32 maxTickets)
    {
        (bytes32 idHash, uint32 maxT, bool blocked, uint64 expiry) = oracle.getIdentity(buyer);

        require(idHash != bytes32(0), "Marketplace: KYC required");
        require(!blocked, "Marketplace: blocked");
        if (expiry != 0) require(block.timestamp <= expiry, "Marketplace: KYC expired");

        return (idHash, maxT);
    }

    // ------------------------------------------------------------
    // Organizer / Admin config
    // ------------------------------------------------------------

    /**
     * Configure resale rules for an event.
     * Who can call?
     * - Event organizer OR marketplace owner (admin override).
     */
    function setEventConfig(
        uint256 eventId,
        bool resaleEnabled,
        uint16 resaleCapBps,
        uint8 maxResales,
        uint16 royaltyBps
    ) external {
        EventRegistry.EventInfo memory e = registry.getEvent(eventId);
        require(e.organizer != address(0), "Marketplace: invalid event");
        require(msg.sender == e.organizer || msg.sender == owner(), "Marketplace: not authorized");

        // sensible bounds
        require(resaleCapBps >= 10000, "Marketplace: cap < 100%");
        require(resaleCapBps <= 20000, "Marketplace: cap too high"); // arbitrary guardrail
        require(royaltyBps <= 2000, "Marketplace: royalty too high"); // <= 20%

        eventConfig[eventId] = EventConfig({
            resaleEnabled: resaleEnabled,
            resaleCapBps: resaleCapBps,
            maxResales: maxResales,
            royaltyBps: royaltyBps
        });

        emit EventConfigUpdated(eventId, resaleEnabled, resaleCapBps, maxResales, royaltyBps);
    }

    // ------------------------------------------------------------
    // Primary sale
    // ------------------------------------------------------------

    /**
     * Buy tickets from the primary sale.
     * - Enforces sale window + not cancelled
     * - Enforces oracle KYC + per-identity max tickets
     * - Mints tickets directly to buyer wallet
     *
     * Pricing: uses EventRegistry.basePriceWei for simplicity.
     */
    function buyPrimary(uint256 eventId, uint32 qty) external payable nonReentrant {
        require(qty > 0, "Marketplace: qty=0");

        EventRegistry.EventInfo memory e = registry.getEvent(eventId);
        require(e.organizer != address(0), "Marketplace: invalid event");
        require(!e.cancelled, "Marketplace: event cancelled");
        require(block.timestamp >= e.saleStart && block.timestamp <= e.saleEnd, "Marketplace: sale closed");

        // Optional safety: ensure this marketplace is for that ticket contract
        require(e.ticketContract == address(tickets), "Marketplace: wrong ticket contract");

        (bytes32 identityHash, uint32 maxTickets) = _requireKycEligible(msg.sender);

        uint32 already = purchasedByIdentity[eventId][identityHash];
        require(already + qty <= maxTickets, "Marketplace: exceeds per-person limit");

        uint256 required = e.basePriceWei * qty;
        require(msg.value >= required, "Marketplace: insufficient payment");

        // mint tickets
        for (uint32 i = 0; i < qty; i++) {
            tickets.mintTo(msg.sender, eventId);
        }
        purchasedByIdentity[eventId][identityHash] = already + qty;

        // refund excess
        if (msg.value > required) {
            (bool okRefund,) = msg.sender.call{value: msg.value - required}("");
            require(okRefund, "Marketplace: refund failed");
        }

        // payout to organizer (EO)
        (bool okPay,) = e.organizer.call{value: required}("");
        require(okPay, "Marketplace: payout failed");

        emit PrimaryPurchased(eventId, msg.sender, qty, required);
    }

    // ------------------------------------------------------------
    // Resale (controlled) - Escrow listings
    // ------------------------------------------------------------

    /**
     * List a ticket for resale.
     * Escrow model:
     * - Seller must approve marketplace first (approve tokenId or setApprovalForAll).
     * - Marketplace transfers the ticket into escrow (to itself) when listing is created.
     *
     * Rules:
     * - Event must not be cancelled
     * - Resale must be enabled for event
     * - Price must be <= basePrice * resaleCapBps
     * - Optional: max resales per ticket
     */
    function listTicket(uint256 tokenId, uint256 priceWei) external nonReentrant {
        require(priceWei > 0, "Marketplace: price=0");
        Listing storage L = listings[tokenId];
        require(!L.active, "Marketplace: already listed");

        require(tickets.ownerOf(tokenId) == msg.sender, "Marketplace: not owner");
        require(tickets.statusOf(tokenId) == TicketNFT.TicketStatus.VALID, "Marketplace: ticket not valid");

        uint256 eventId = tickets.eventIdOf(tokenId);
        EventRegistry.EventInfo memory e = registry.getEvent(eventId);
        require(e.organizer != address(0), "Marketplace: invalid event");
        require(!e.cancelled, "Marketplace: event cancelled");
        require(block.timestamp < e.eventStart, "Marketplace: event already started");

        EventConfig memory cfg = eventConfig[eventId];
        require(cfg.resaleEnabled, "Marketplace: resale disabled");

        if (cfg.maxResales != 0) {
            require(resaleCount[tokenId] < cfg.maxResales, "Marketplace: resale limit reached");
        }

        // enforce price cap
        uint256 capPrice = (e.basePriceWei * uint256(cfg.resaleCapBps)) / 10000;
        require(priceWei <= capPrice, "Marketplace: price exceeds cap");

        // require approval first (clear UX)
        bool approved =
            tickets.getApproved(tokenId) == address(this) ||
            tickets.isApprovedForAll(msg.sender, address(this));
        require(approved, "Marketplace: approve marketplace first");

        // move ticket into escrow
        tickets.safeTransferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            priceWei: priceWei,
            active: true
        });

        emit TicketListed(tokenId, eventId, msg.sender, priceWei);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory L = listings[tokenId];
        require(L.active, "Marketplace: not listed");
        require(L.seller == msg.sender, "Marketplace: not seller");

        // clear listing
        listings[tokenId].active = false;

        // return ticket from escrow to seller
        tickets.safeTransferFrom(address(this), msg.sender, tokenId);

        emit ListingCancelled(tokenId, msg.sender);
    }

    /**
     * Buy a listed ticket.
     * - Optional: enforce KYC for buyers too (enabled here)
     * - Transfers from escrow to buyer
     * - Pays seller and optionally royalty to EO
     */
    function buyResale(uint256 tokenId) external payable nonReentrant {
        Listing memory L = listings[tokenId];
        require(L.active, "Marketplace: not listed");

        uint256 eventId = tickets.eventIdOf(tokenId);
        EventRegistry.EventInfo memory e = registry.getEvent(eventId);
        require(e.organizer != address(0), "Marketplace: invalid event");
        require(!e.cancelled, "Marketplace: event cancelled");
        require(block.timestamp < e.eventStart, "Marketplace: event already started");

        // enforce KYC for resale buyer too (helps prevent scalper loops)
        _requireKycEligible(msg.sender);

        require(msg.value >= L.priceWei, "Marketplace: insufficient payment");

        // mark listing inactive first (reentrancy safety)
        listings[tokenId].active = false;

        EventConfig memory cfg = eventConfig[eventId];

        uint256 royaltyWei = 0;
        if (cfg.royaltyBps != 0) {
            royaltyWei = (L.priceWei * uint256(cfg.royaltyBps)) / 10000;
        }
        uint256 sellerWei = L.priceWei - royaltyWei;

        // pay seller
        (bool okSeller,) = L.seller.call{value: sellerWei}("");
        require(okSeller, "Marketplace: seller payout failed");

        // pay royalty to organizer (optional)
        if (royaltyWei != 0) {
            (bool okRoyalty,) = e.organizer.call{value: royaltyWei}("");
            require(okRoyalty, "Marketplace: royalty payout failed");
        }

        // refund excess
        if (msg.value > L.priceWei) {
            (bool okRefund,) = msg.sender.call{value: msg.value - L.priceWei}("");
            require(okRefund, "Marketplace: refund failed");
        }

        // increment resale count
        resaleCount[tokenId] += 1;

        // transfer ticket from escrow to buyer
        tickets.safeTransferFrom(address(this), msg.sender, tokenId);

        emit TicketResold(tokenId, eventId, L.seller, msg.sender, L.priceWei, royaltyWei);
    }
}
