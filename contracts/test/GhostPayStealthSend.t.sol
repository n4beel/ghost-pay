// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {ERC5564Announcer} from "../src/ERC5564Announcer.sol";
import {GhostPayStealthSend} from "../src/GhostPayStealthSend.sol";
import {IERC5564Announcer} from "../src/interfaces/IERC5564Announcer.sol";

/// @notice An announcer that keeps a count, so a rollback is observable.
///
/// State reverts with the call; Foundry's log recorder does not. `vm.recordLogs()` returns entries
/// emitted inside frames that later reverted, which is an artefact of how the inspector collects
/// them and not what the chain does — a reverted transaction emits nothing. Counting in storage is
/// the only way to assert the real semantics from a test.
contract CountingAnnouncer is IERC5564Announcer {
  uint256 public count;

  function announce(uint256, address, bytes memory, bytes memory) external {
    count += 1;
  }
}

/// @notice Rejects everything sent to it, to exercise the transfer-failure path.
contract Rejector {
  receive() external payable {
    revert("no");
  }
}

/// @notice Accepts value but burns more than a 2300 gas stipend would allow.
contract HungrySmartAccount {
  uint256[] private ballast;

  receive() external payable {
    // Several cold SSTOREs — far beyond `transfer`'s stipend. A stealth address belonging to a
    // smart account must still be payable, which is why the forwarder uses `call` rather than
    // `transfer`.
    for (uint256 i = 0; i < 5; i++) {
      ballast.push(block.timestamp + i);
    }
  }
}

contract GhostPayStealthSendTest is Test {
  ERC5564Announcer internal announcer;
  GhostPayStealthSend internal stealthSend;

  address internal sender = address(0xA11CE);
  address internal stealth = address(0xB0B);

  bytes internal ephemeralKey =
    hex"0367859cd7885e3bd54c0f6bd7dea9c33b853a9615210d0d2fb2fc62b17686fa0e";
  bytes internal metadata = hex"f5";

  event Announcement(
    uint256 indexed schemeId,
    address indexed stealthAddress,
    address indexed caller,
    bytes ephemeralPubKey,
    bytes metadata
  );

  event StealthPaymentSent(
    address indexed stealthAddress, address indexed sender, uint256 amount
  );

  function setUp() public {
    announcer = new ERC5564Announcer();
    stealthSend = new GhostPayStealthSend(IERC5564Announcer(address(announcer)));
    vm.deal(sender, 100 ether);
  }

  /// @dev The wiring that cannot be changed after deployment. A wrong announcer here would mean
  /// every payment announces into the void, discoverable only by a recipient who never finds one.
  function test_AnnouncerIsImmutablyWired() public view {
    assertEq(address(stealthSend.ANNOUNCER()), address(announcer));
    assertEq(stealthSend.SCHEME_ID(), 1);
  }

  function test_DeliversValueToTheStealthAddress() public {
    vm.prank(sender);
    stealthSend.send{value: 1 ether}(stealth, ephemeralKey, metadata);

    assertEq(stealth.balance, 1 ether);
    // The forwarder must never retain value; anything left here is stranded permanently.
    assertEq(address(stealthSend).balance, 0);
  }

  function test_AnnouncesWithTheCallerAsSender() public {
    // `caller` is the announcer's `msg.sender`, which is the forwarder — not the person paying.
    // Recipients scan on scheme and stealth address, so this is correct, but it is worth pinning:
    // an indexer that filtered announcements by payer would silently return nothing.
    vm.expectEmit(true, true, true, true, address(announcer));
    emit Announcement(1, stealth, address(stealthSend), ephemeralKey, metadata);

    vm.prank(sender);
    stealthSend.send{value: 1 ether}(stealth, ephemeralKey, metadata);
  }

  function test_EmitsPaymentEventWithTheRealSender() public {
    vm.expectEmit(true, true, false, true, address(stealthSend));
    emit StealthPaymentSent(stealth, sender, 1 ether);

    vm.prank(sender);
    stealthSend.send{value: 1 ether}(stealth, ephemeralKey, metadata);
  }

  function test_PaysSmartAccountsBeyondTheTransferStipend() public {
    // `transfer` would revert here. The recipient of a stealth payment may well be a smart account,
    // and starving it of gas would make the payment undeliverable for no good reason.
    HungrySmartAccount account = new HungrySmartAccount();

    vm.prank(sender);
    stealthSend.send{value: 1 ether}(address(account), ephemeralKey, metadata);

    assertEq(address(account).balance, 1 ether);
  }

  function test_RevertsOnZeroValue() public {
    // Announcing a payment that never arrived would put a phantom entry in every recipient's scan.
    vm.prank(sender);
    vm.expectRevert(GhostPayStealthSend.ZeroValue.selector);
    stealthSend.send{value: 0}(stealth, ephemeralKey, metadata);
  }

  function test_RevertsOnZeroStealthAddress() public {
    vm.prank(sender);
    vm.expectRevert(GhostPayStealthSend.InvalidStealthAddress.selector);
    stealthSend.send{value: 1 ether}(address(0), ephemeralKey, metadata);
  }

  function test_RevertsOnWrongEphemeralKeyLength() public {
    // Anything but a 33 byte compressed point leaves the recipient unable to derive the shared
    // secret, so the payment would be unspendable rather than merely unannounced.
    bytes memory tooShort = hex"0367859cd7885e3bd54c0f6bd7dea9c33b853a9615210d0d2fb2fc62b17686fa";
    bytes memory tooLong = bytes.concat(ephemeralKey, hex"00");

    vm.startPrank(sender);
    vm.expectRevert(GhostPayStealthSend.InvalidEphemeralPubKey.selector);
    stealthSend.send{value: 1 ether}(stealth, tooShort, metadata);

    vm.expectRevert(GhostPayStealthSend.InvalidEphemeralPubKey.selector);
    stealthSend.send{value: 1 ether}(stealth, tooLong, metadata);
    vm.stopPrank();
  }

  function test_RevertsOnEmptyMetadata() public {
    // ERC-5564 requires the first metadata byte to be the view tag. Without it a recipient must
    // run the full derivation on every announcement ever emitted.
    vm.prank(sender);
    vm.expectRevert(GhostPayStealthSend.MissingViewTag.selector);
    stealthSend.send{value: 1 ether}(stealth, ephemeralKey, hex"");
  }

  function test_RevertsWhenTheStealthAddressRejectsValue() public {
    Rejector rejector = new Rejector();

    vm.prank(sender);
    vm.expectRevert(GhostPayStealthSend.TransferFailed.selector);
    stealthSend.send{value: 1 ether}(address(rejector), ephemeralKey, metadata);
  }

  /// @dev The property the whole contract exists for: the announcement and the money are atomic.
  /// A failed transfer must take the announcement with it, or recipients scan for payments that
  /// were never delivered.
  ///
  /// Asserted through the announcer's own storage rather than through `vm.recordLogs()`. Foundry's
  /// recorder is not revert-aware — it returns entries from frames that later reverted — so a
  /// log-based version of this test fails against a contract that is behaving correctly.
  function test_FailedTransferRollsBackTheAnnouncement() public {
    CountingAnnouncer counting = new CountingAnnouncer();
    GhostPayStealthSend forwarder = new GhostPayStealthSend(counting);
    Rejector rejector = new Rejector();

    vm.prank(sender);
    try forwarder.send{value: 1 ether}(address(rejector), ephemeralKey, metadata) {
      revert("expected revert");
    } catch {}

    assertEq(counting.count(), 0, "announcement survived a failed transfer");
    assertEq(sender.balance, 100 ether, "value was not returned");

    // And the same forwarder does announce when the transfer succeeds, so the zero above is a
    // rollback rather than a wiring mistake.
    vm.prank(sender);
    forwarder.send{value: 1 ether}(stealth, ephemeralKey, metadata);
    assertEq(counting.count(), 1);
  }

  function testFuzz_ForwardsAnyNonZeroAmount(uint96 amount) public {
    vm.assume(amount > 0);
    vm.deal(sender, amount);

    vm.prank(sender);
    stealthSend.send{value: amount}(stealth, ephemeralKey, metadata);

    assertEq(stealth.balance, amount);
    assertEq(address(stealthSend).balance, 0);
  }
}
