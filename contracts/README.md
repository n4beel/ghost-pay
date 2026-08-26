# Ghost Pay stealth contracts (BOT Chain)

Three contracts back the BOT Chain stealth send path.

| Contract | Purpose |
| --- | --- |
| `ERC5564Announcer` | ERC-5564 announcer singleton. Emits the `Announcement` events recipients scan. Verbatim from the EIP. |
| `ERC6538Registry` | ERC-6538 stealth meta-address registry. Verbatim from the EIP. |
| `GhostPayStealthSend` | Forwarder that announces and delivers native BOT in one transaction. |

The first two are deployed at identical canonical addresses on Ethereum, Arbitrum, Base, Optimism,
Polygon, Gnosis and Scroll. Neither is on BOT Chain, so we deploy our own. Matching the canonical
`0x5564…5564` / `0x6538…6538` addresses would need the deterministic deployment proxy present and
funded on chain 677; treat that as a stretch, not a requirement.

## Deploy

```sh
export DEPLOYER_PRIVATE_KEY=0x...
export BOHR_RPC_URL=https://rpc.bohr.life
export BOTCHAIN_RPC_URL=https://rpc.botchain.ai

forge install foundry-rs/forge-std --no-git   # first time only

# Testnet first. Always.
forge script script/Deploy.s.sol --rpc-url bohr --broadcast

# Mainnet, only once the full flow passes on Bohr. These contracts are permanent.
forge script script/Deploy.s.sol --rpc-url botchain --broadcast
```

The script prints the env lines to paste into `frontend/.env.local`, including the deploy block,
which the announcement scanner uses as its starting point instead of walking from genesis.

## Verify

Verification needs BotScan's verifier URL and API key, which are not in the public docs yet. Ask
BOT Chain for them and set `BOTSCAN_API_KEY` and `BOTSCAN_VERIFIER_URL`, then:

```sh
forge verify-contract <address> src/ERC5564Announcer.sol:ERC5564Announcer --chain 677
```

Unverified bytecode behind a privacy app is a bad look for a listing review, so do not skip this.

## Note on `GhostPayStealthSend`

Announcing and transferring separately costs the sender two signatures and produces two unrelated
transaction hashes for what is one payment. The forwarder collapses them, so the listing reviewer
gets a single hash to check, and the announcement can never outlive a failed transfer.

It handles native BOT only. ERC-20 stealth payments leave the recipient holding tokens at an address
with no gas to move them, which needs a separate answer and is deliberately out of scope for v1.
