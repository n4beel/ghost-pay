// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.23;

/// @notice `ERC5564Announcer` contract to emit an `Announcement` event to broadcast information
/// about a transaction involving a stealth address. See
/// [ERC-5564](https://eips.ethereum.org/EIPS/eip-5564) to learn more.
contract ERC5564Announcer {
  /// @dev Emitted when something is sent to a stealth address.
  /// @param schemeId Identifier corresponding to the applied stealth address scheme, e.g. 1 for
  /// secp256k1, as specified in ERC-5564.
  /// @param stealthAddress The computed stealth address for the recipient.
  /// @param caller The caller of the `announce` function that emitted this event.
  /// @param ephemeralPubKey Ephemeral public key used by the sender to derive the `stealthAddress`.
  /// @param metadata An arbitrary field MUST include the view tag in the first byte.
  event Announcement(
    uint256 indexed schemeId,
    address indexed stealthAddress,
    address indexed caller,
    bytes ephemeralPubKey,
    bytes metadata
  );

  /// @dev Called by integrators to emit an `Announcement` event.
  /// @param schemeId Identifier corresponding to the applied stealth address scheme, e.g. 1 for
  /// secp256k1, as specified in ERC-5564.
  /// @param stealthAddress The computed stealth address for the recipient.
  /// @param ephemeralPubKey Ephemeral public key used by the sender.
  /// @param metadata An arbitrary field MUST include the view tag in the first byte.
  function announce(
    uint256 schemeId,
    address stealthAddress,
    bytes memory ephemeralPubKey,
    bytes memory metadata
  ) external {
    emit Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
  }
}
