// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * TicketNFT (ERC-721)
 * - Each tokenId represents exactly one event ticket.
 * - Minting is restricted to MINTER_ROLE (Marketplace).
 * - Redemption is restricted to CHECKIN_ROLE (gate scanner wallet).
 * - Transfers are restricted: only the configured `marketplace` can move tickets
 *   between users (blocks OpenSea / OTC transfers).
 */
contract TicketNFT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant CHECKIN_ROLE = keccak256("CHECKIN_ROLE");

    enum TicketStatus { VALID, USED, CANCELLED, REFUNDED }

    // tokenId counter
    uint256 public nextTokenId = 1;

    // configured marketplace allowed to transfer tickets
    address public marketplace;

    // ticket metadata stored on-chain
    mapping(uint256 => uint256) public eventIdOf;       // tokenId -> eventId
    mapping(uint256 => TicketStatus) public statusOf;   // tokenId -> status

    string private _baseTokenURI;

    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);
    event BaseURIUpdated(string oldURI, string newURI);

    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed to);
    event TicketUsed(uint256 indexed tokenId, uint256 indexed eventId);
    event TicketStatusChanged(uint256 indexed tokenId, TicketStatus oldStatus, TicketStatus newStatus);

    constructor(
        string memory name_,
        string memory symbol_,
        address admin_,
        string memory baseURI_
    ) ERC721(name_, symbol_) {
        require(admin_ != address(0), "TicketNFT: admin=0");
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _baseTokenURI = baseURI_;
    }

    // -----------------------------
    // Admin configuration
    // -----------------------------

    function setMarketplace(address newMarketplace) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMarketplace != address(0), "TicketNFT: marketplace=0");
        address old = marketplace;
        marketplace = newMarketplace;
        emit MarketplaceUpdated(old, newMarketplace);
    }

    function setBaseURI(string calldata newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        string memory old = _baseTokenURI;
        _baseTokenURI = newURI;
        emit BaseURIUpdated(old, newURI);
    }

    // -----------------------------
    // Minting
    // -----------------------------

    /**
     * Mint a new ticket NFT to `to` for a given `eventId`.
     * Only Marketplace (or whatever address you grant MINTER_ROLE) can mint.
     */
    function mintTo(address to, uint256 eventId) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "TicketNFT: to=0");

        tokenId = nextTokenId++;
        _safeMint(to, tokenId);

        eventIdOf[tokenId] = eventId;
        statusOf[tokenId] = TicketStatus.VALID;

        emit TicketMinted(tokenId, eventId, to);
    }

    // -----------------------------
    // Redemption (Check-in)
    // -----------------------------

    /**
     * Mark ticket as USED at the venue.
     * Only CHECKIN_ROLE (gate scanner wallet) can call this.
     */
    function useTicket(uint256 tokenId) external onlyRole(CHECKIN_ROLE) {
        _requireOwned(tokenId); // <-- replaces require(_exists(tokenId), ...)

        TicketStatus s = statusOf[tokenId];
        require(s == TicketStatus.VALID, "TicketNFT: not valid");

        statusOf[tokenId] = TicketStatus.USED;

        emit TicketUsed(tokenId, eventIdOf[tokenId]);
        emit TicketStatusChanged(tokenId, s, TicketStatus.USED);
    }   

    /**
     * Optional admin override for cancellations/refunds.
     * In a full system, this could be driven by EventRegistry / refunds logic.
     */
    function setStatus(uint256 tokenId, TicketStatus newStatus) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireOwned(tokenId); // <-- replaces require(_exists(tokenId), ...)

        TicketStatus old = statusOf[tokenId];
        statusOf[tokenId] = newStatus;
        emit TicketStatusChanged(tokenId, old, newStatus);
    }

    // -----------------------------
    // Anti-scalping: restrict transfers
    // -----------------------------
    /**
     * OpenZeppelin v5 transfer pipeline goes through _update().
     * We enforce:
     * - mint (from=0) is allowed
     * - burn (to=0) is allowed (if you ever add burn)
     * - any normal transfer must be initiated by `marketplace`
     * - and ticket must be VALID
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        // Only restrict normal transfers (not mint/burn)
        if (from != address(0) && to != address(0)) {
            require(marketplace != address(0), "TicketNFT: marketplace not set");
            require(msg.sender == marketplace, "TicketNFT: transfers only via marketplace");
            require(statusOf[tokenId] == TicketStatus.VALID, "TicketNFT: not transferable");
        }
    }

    // -----------------------------
    // Token metadata
    // -----------------------------

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // -----------------------------
    // Interface support
    // -----------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
