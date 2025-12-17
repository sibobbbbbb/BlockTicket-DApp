// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * EventRegistry
 * - Stores minimal on-chain event configuration.
 * - EO creates an event with sale windows, event time, base price, and ticket contract.
 * - EO (or registry owner) can cancel an event.
 *
 * Notes:
 * - basePriceWei is "price per ticket" in wei for simplicity.
 *   If you later want fiat pricing, basePrice can be "USD cents" and Marketplace uses a price feed.
 */
contract EventRegistry is Ownable {
    struct EventInfo {
        address organizer;        // EO wallet address
        address ticketContract;   // TicketNFT contract address (ERC-721)
        uint64 saleStart;         // unix seconds
        uint64 saleEnd;           // unix seconds
        uint64 eventStart;        // unix seconds
        uint256 basePriceWei;     // price per ticket (wei)
        bool cancelled;           // event cancellation flag
    }

    uint256 public nextEventId = 1;
    mapping(uint256 => EventInfo) private _events;

    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        address indexed ticketContract,
        uint64 saleStart,
        uint64 saleEnd,
        uint64 eventStart,
        uint256 basePriceWei
    );

    event EventCancelled(uint256 indexed eventId, bool cancelled);

    constructor() Ownable(msg.sender) {}

    // -----------------------------
    // Write functions
    // -----------------------------

    /**
     * EO creates an event.
     */
    function createEvent(
        address ticketContract,
        uint64 saleStart,
        uint64 saleEnd,
        uint64 eventStart,
        uint256 basePriceWei
    ) external returns (uint256 eventId) {
        require(ticketContract != address(0), "EventRegistry: ticket=0");
        require(saleStart < saleEnd, "EventRegistry: bad sale window");
        require(eventStart >= saleEnd, "EventRegistry: eventStart < saleEnd");
        require(basePriceWei > 0, "EventRegistry: price=0");

        eventId = nextEventId++;
        _events[eventId] = EventInfo({
            organizer: msg.sender,
            ticketContract: ticketContract,
            saleStart: saleStart,
            saleEnd: saleEnd,
            eventStart: eventStart,
            basePriceWei: basePriceWei,
            cancelled: false
        });

        emit EventCreated(
            eventId,
            msg.sender,
            ticketContract,
            saleStart,
            saleEnd,
            eventStart,
            basePriceWei
        );
    }

    /**
     * EO cancels event (or registry owner for admin override).
     * For assignment simplicity, both are allowed.
     */
    function setCancelled(uint256 eventId, bool cancelled) external {
        EventInfo storage e = _events[eventId];
        require(e.organizer != address(0), "EventRegistry: no such event");
        require(
            msg.sender == e.organizer || msg.sender == owner(),
            "EventRegistry: not authorized"
        );

        e.cancelled = cancelled;
        emit EventCancelled(eventId, cancelled);
    }

    /**
     * Optional: allow registry owner to update ticket contract if needed.
     * You can delete this if you want a stricter immutability story.
     */
    function setTicketContract(uint256 eventId, address newTicketContract) external onlyOwner {
        require(newTicketContract != address(0), "EventRegistry: ticket=0");
        EventInfo storage e = _events[eventId];
        require(e.organizer != address(0), "EventRegistry: no such event");
        e.ticketContract = newTicketContract;
        // could emit another event, omitted for minimalism
    }

    // -----------------------------
    // Read functions
    // -----------------------------

    function getEvent(uint256 eventId) external view returns (EventInfo memory) {
        return _events[eventId];
    }

    function organizerOf(uint256 eventId) external view returns (address) {
        return _events[eventId].organizer;
    }

    function ticketContractOf(uint256 eventId) external view returns (address) {
        return _events[eventId].ticketContract;
    }

    function isSaleOpen(uint256 eventId) external view returns (bool) {
        EventInfo memory e = _events[eventId];
        if (e.organizer == address(0)) return false;
        if (e.cancelled) return false;
        return (block.timestamp >= e.saleStart && block.timestamp <= e.saleEnd);
    }

    function isEventCancelled(uint256 eventId) external view returns (bool) {
        return _events[eventId].cancelled;
    }
}
