// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console2} from "forge-std/Script.sol";
import {ERC5564Announcer} from "../src/ERC5564Announcer.sol";
import {ERC6538Registry} from "../src/ERC6538Registry.sol";
import {GhostPayStealthSend} from "../src/GhostPayStealthSend.sol";
import {IERC5564Announcer} from "../src/interfaces/IERC5564Announcer.sol";

/// @notice Deploys the three contracts Ghost Pay needs for stealth sends on BOT Chain.
/// @dev Run against Bohr testnet first:
///   forge script script/Deploy.s.sol --rpc-url bohr --broadcast
/// Then mainnet, only once the full flow passes on testnet:
///   forge script script/Deploy.s.sol --rpc-url botchain --broadcast
contract Deploy is Script {
  function run() external {
    uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

    vm.startBroadcast(deployerKey);

    ERC5564Announcer announcer = new ERC5564Announcer();
    ERC6538Registry registry = new ERC6538Registry();
    GhostPayStealthSend stealthSend =
      new GhostPayStealthSend(IERC5564Announcer(address(announcer)));

    vm.stopBroadcast();

    console2.log("chain id                ", block.chainid);
    console2.log("ERC5564Announcer        ", address(announcer));
    console2.log("ERC6538Registry         ", address(registry));
    console2.log("GhostPayStealthSend     ", address(stealthSend));
    console2.log("");
    console2.log("Add these to frontend/.env.local:");
    console2.log("NEXT_PUBLIC_ANNOUNCER_%s=%s", vm.toString(block.chainid), vm.toString(address(announcer)));
    console2.log("NEXT_PUBLIC_REGISTRY_%s=%s", vm.toString(block.chainid), vm.toString(address(registry)));
    console2.log("NEXT_PUBLIC_STEALTH_SEND_%s=%s", vm.toString(block.chainid), vm.toString(address(stealthSend)));
    // The scanner starts here instead of at genesis. Without it the frontend treats the deployment
    // as unconfigured, because walking a chain with ~0.75s blocks from block zero is a hung tab
    // rather than a slow scan. One block earlier than the deployment, so a reorg or an
    // off-by-one at the boundary cannot drop the first announcement.
    console2.log(
      "NEXT_PUBLIC_DEPLOY_BLOCK_%s=%s",
      vm.toString(block.chainid),
      vm.toString(block.number > 0 ? block.number - 1 : 0)
    );
  }
}
