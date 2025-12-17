// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * OracleConsumer
 * Stores oracle-fed KYC attestations:
 *   wallet -> { identityHash, maxTickets, blocked, expiry }
 *
 * IMPORTANT:
 * - Do NOT store personal info on-chain.
 * - identityHash should be a salted hash computed off-chain.
 *
 * Typical workflow:
 * 1) User completes KYC off-chain.
 * 2) Backend/oracle decides: verified + limit + blocked flag.
 * 3) Oracle writes the result here via updateIdentity().
 * 4) Marketplace checks this contract before selling tickets.
 */
contract OracleConsumer is Ownable {
    struct OracleIdentity {
        bytes32 identityHash; // salted hash, NOT PII
        uint32  maxTickets;   // per-event max allowed (or global policy)
        bool    blocked;      // flagged scalper / fraud
        uint64  expiry;       // unix seconds (0 = never expires)
    }

    /// @notice trusted oracle address that can update KYC attestations
    address public oracle;

    mapping(address => OracleIdentity) private _identities;

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event IdentityUpdated(
        address indexed wallet,
        bytes32 identityHash,
        uint32 maxTickets,
        bool blocked,
        uint64 expiry
    );

    modifier onlyOracle() {
        require(msg.sender == oracle, "OracleConsumer: not oracle");
        _;
    }

    constructor(address initialOracle) Ownable(msg.sender) {
        require(initialOracle != address(0), "OracleConsumer: oracle=0");
        oracle = initialOracle;
        emit OracleUpdated(address(0), initialOracle);
    }

    /// @notice owner can rotate oracle key if needed
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "OracleConsumer: oracle=0");
        address old = oracle;
        oracle = newOracle;
        emit OracleUpdated(old, newOracle);
    }

    /**
     * @notice oracle posts KYC attestation result for a wallet
     * @dev onlyOracle: prevents users from faking verification
     */
    function updateIdentity(
        address wallet,
        bytes32 identityHash,
        uint32 maxTickets,
        bool blocked,
        uint64 expiry
    ) external onlyOracle {
        require(wallet != address(0), "OracleConsumer: wallet=0");
        require(identityHash != bytes32(0), "OracleConsumer: idHash=0");
        _identities[wallet] = OracleIdentity(identityHash, maxTickets, blocked, expiry);

        emit IdentityUpdated(wallet, identityHash, maxTickets, blocked, expiry);
    }

    /// @notice read attestation for Marketplace checks
    function getIdentity(address wallet)
        external
        view
        returns (bytes32 identityHash, uint32 maxTickets, bool blocked, uint64 expiry)
    {
        OracleIdentity memory o = _identities[wallet];
        return (o.identityHash, o.maxTickets, o.blocked, o.expiry);
    }

    /// @notice convenience: true if wallet is currently eligible to purchase
    function isEligible(address wallet) external view returns (bool) {
        OracleIdentity memory o = _identities[wallet];
        if (o.identityHash == bytes32(0)) return false;
        if (o.blocked) return false;
        if (o.expiry != 0 && block.timestamp > o.expiry) return false;
        return true;
    }
}
