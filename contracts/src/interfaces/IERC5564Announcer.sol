// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.23;

/// @notice Interface for the ERC-5564 stealth address announcer singleton.
interface IERC5564Announcer {
  /// @notice Emitted when a stealth payment is announced.
  /// @param schemeId Stealth address scheme identifier. 1 is secp256k1, per ERC-5564.
  /// @param stealthAddress The computed one-time address the payment was sent to.
  /// @param caller The account that called `announce`.
  /// @param ephemeralPubKey Compressed ephemeral public key used to derive the shared secret.
  /// @param metadata First byte MUST be the view tag. Remaining bytes are scheme defined.
  event Announcement(
    uint256 indexed schemeId,
    address indexed stealthAddress,
    address indexed caller,
    bytes ephemeralPubKey,
    bytes metadata
  );

  function announce(
    uint256 schemeId,
    address stealthAddress,
    bytes memory ephemeralPubKey,
    bytes memory metadata
  ) external;
}
