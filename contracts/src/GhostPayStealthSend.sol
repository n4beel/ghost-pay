// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IERC5564Announcer} from "./interfaces/IERC5564Announcer.sol";

/// @title GhostPayStealthSend
/// @notice Forwarder that announces an ERC-5564 stealth payment and delivers the native token to
/// the stealth address in a single transaction.
/// @dev Without this, a stealth payment costs the sender two signatures and produces two unrelated
/// transaction hashes. This collapses both into one call so the payment reads as one event on the
/// explorer and the recipient's funds and the announcement can never diverge: if either half
/// reverts, both revert.
contract GhostPayStealthSend {
  /// @notice The ERC-5564 announcer singleton this contract announces through.
  IERC5564Announcer public immutable ANNOUNCER;

  /// @notice Scheme ID 1 is secp256k1, per ERC-5564.
  uint256 public constant SCHEME_ID = 1;

  /// @notice Thrown when the native token transfer to the stealth address fails.
  error TransferFailed();

  /// @notice Thrown when no value is attached, which would announce a payment that never arrived.
  error ZeroValue();

  /// @notice Thrown when the stealth address is the zero address.
  error InvalidStealthAddress();

  /// @notice Thrown when the ephemeral public key is not a 33 byte compressed secp256k1 point.
  error InvalidEphemeralPubKey();

  /// @notice Thrown when metadata is empty, since its first byte must be the view tag.
  error MissingViewTag();

  /// @notice Emitted alongside the announcement so indexers can read the amount without tracing.
  /// @param stealthAddress The one-time address that received the payment.
  /// @param sender The account that funded the payment.
  /// @param amount Amount of the native token delivered.
  event StealthPaymentSent(
    address indexed stealthAddress, address indexed sender, uint256 amount
  );

  constructor(IERC5564Announcer announcer) {
    ANNOUNCER = announcer;
  }

  /// @notice Announce and fund a stealth payment in one transaction.
  /// @param stealthAddress The stealth address derived by the sender from the recipient's stealth
  /// meta-address.
  /// @param ephemeralPubKey The 33 byte compressed ephemeral public key.
  /// @param metadata Scheme metadata. The first byte MUST be the view tag, per ERC-5564.
  function send(
    address stealthAddress,
    bytes calldata ephemeralPubKey,
    bytes calldata metadata
  ) external payable {
    if (msg.value == 0) revert ZeroValue();
    if (stealthAddress == address(0)) revert InvalidStealthAddress();
    if (ephemeralPubKey.length != 33) revert InvalidEphemeralPubKey();
    if (metadata.length == 0) revert MissingViewTag();

    // Announce before transferring. The recipient scans announcements to discover the payment, so
    // an announcement that outlives a failed transfer would be worse than the reverse: the whole
    // call reverts either way, but ordering keeps the announcer's event log strictly a superset of
    // delivered payments within a successful transaction.
    ANNOUNCER.announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata);

    // A plain `call` rather than `transfer`, so the stealth address can be a smart account without
    // being starved by the 2300 gas stipend.
    (bool ok,) = stealthAddress.call{value: msg.value}("");
    if (!ok) revert TransferFailed();

    emit StealthPaymentSent(stealthAddress, msg.sender, msg.value);
  }
}
