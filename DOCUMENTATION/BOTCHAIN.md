# BOTCHAIN.md — BOT Chain listing integration

Read this before touching anything under `contracts/`, `frontend/lib/botchain/`, or the EVM
providers. It is the source of truth for the BOT Chain work: what it is, why it is shaped this way,
what is done, and what is next.

Full plan with rationale: https://claude.ai/code/artifact/954c8d12-353b-4885-aab3-110c6ae10212

---

## Why this exists

BOT Chain will list Ghost Pay in its ecosystem if the app lets a user connect a native BOT Chain
wallet and make at least one transaction. Confirmed by BOT Chain: **this must be on mainnet**, not
testnet.

The cheap way to satisfy that is a plain public transfer. We are not doing that. Ghost Pay's entire
claim is *pay anyone, reveal nothing*, and a fully transparent transfer inside it reads as a
contradiction to anyone who looks, including the person reviewing the listing and anyone later
evaluating an ecosystem grant.

Instead the one BOT Chain action is an **ERC-5564 stealth address send**. Pure secp256k1 in the
browser, no ZK circuits, no Umbra dependency, no port of the Solana confidential-transfer stack. The
sender derives a fresh one-time address from the recipient's published meta-address and sends a
normal transfer to it. Nobody watching the chain can tie that address back to the recipient.

**What this does and does not hide.** Recipients are unlinkable. Amounts stay public and the
sender's address is visible as the origin. That is a real subset of what Ghost Pay does on Solana.
Do not let banner or landing copy overclaim it — technical scrutiny is exactly what a listing review
is.

---

## Network facts

| | Mainnet | Testnet |
|---|---|---|
| Name | BOT Chain | Bohr |
| Chain ID | 677 (`0x2a5`) | 968 |
| RPC | `https://rpc.botchain.ai` | `https://rpc.bohr.life` |
| WebSocket | `wss://ws-rpc.botchain.ai` | not published |
| Explorer | `https://scan.botchain.ai` | `https://scan.bohr.life` |
| Currency | BOT | tBOT |
| Faucet | none, DEX swap or bridge | `https://faucet.botchain.ai/basic`, 10 tBOT / 24h, no KYC |

EVM L1, ~0.75s blocks. Docs at `https://dev-docs.botchain.ai` (the `json-rpc-endpoint` page
redirect-loops; the quick-guide page works). Toolchain support confirmed for Remix, Hardhat, Foundry,
ethers.js, web3.js. TheGraph and Covalent are listed as ecosystem indexers.

Decimals are assumed to be the EVM default of 18. Nothing in the docs states it. Confirm against a
real balance before mainnet.

---

## Status

### Done — P0, contracts and chain config

- `contracts/` — Foundry project. `ERC5564Announcer` and `ERC6538Registry` verbatim from the EIPs
  (neither is deployed on BOT Chain, so we deploy our own), plus `GhostPayStealthSend`, a forwarder
  that announces and delivers native BOT in one call. All three compile clean under solc 0.8.23.
- `frontend/lib/botchain/chain.ts` — viem definitions for both networks, explorer and faucet helpers.
- `frontend/lib/botchain/contracts.ts` — per-chain deployment addresses and ABIs.

### Done — P1, EVM wallet layer

- `ChainProvider` — persisted `solana | botchain` selection.
- `EvmProvider` — wagmi with `injected()` and `walletConnect()`.
- `ChainSwitcher`, `EvmConnectButton`, `WalletControl` — chain switching and EVM connect state.
- `Sidebar` — marks Solana-only pages with a `SOL` chip on BOT Chain, hides the Umbra badge there.

`next build` passes (14 routes), `tsc --noEmit` clean.

### Next — P2, stealth address library (~1.5 days)

This is the piece where a silent bug means lost funds. Build it against the ERC-5564 spec test
vectors, not by eyeballing the UI.

- `lib/stealth/keys.ts` — signature-derived spend and view keypairs, meta-address encode/decode.
- `lib/stealth/generate.ts` — sender side: ephemeral keypair, shared secret, stealth address, view tag.
- `lib/stealth/scan.ts` — `eth_getLogs` from the announcer's deploy block for history, view-tag
  filter, full derivation on survivors; `eth_subscribe` over the WebSocket RPC for live announcements.
- `lib/stealth/sweep.ts` — derive the stealth private key, transfer balance minus gas.

Then P3 (send/receive UI), P4 (mobile), P5 (gating, banner, landing), P6 (verify, mainnet cutover).

---

## The scheme, concretely

Scheme ID 1, secp256k1. The recipient holds a **spending** keypair and a **viewing** keypair; their
meta-address is both public keys concatenated, published once via `ERC6538Registry.registerKeys`.

**Sender:** generate ephemeral `(r, R)` → `s = r · P_view` → `s_h = keccak256(s)`, first byte is the
view tag → `P_stealth = P_spend + s_h · G` → address is last 20 bytes of the keccak of the
uncompressed point → send to it and announce `(R, viewTag)`.

**Recipient:** `s = p_view · R` for each announcement → compare view tags first (one byte discards
255 of every 256 non-matches before any curve multiplication) → on match derive and confirm →
spending key is `p_stealth = p_spend + s_h` mod n.

Use `@noble/curves` v2 directly (`secp256k1.Point`, `Point.fromBytes`, `.multiply`, `.add`,
`.toBytes`) plus viem's `keccak256`. ScopeLift's `stealth-address-sdk` is worth reading as reference
but makes assumptions about which chains exist.

**Deriving keys from an EVM wallet.** Bo Wallet will not hand you two keypairs. The Umbra Cash
pattern: user signs a fixed message once, hash the signature into a seed, derive
`p_spend = keccak256(seed ‖ "spend")` and `p_view = keccak256(seed ‖ "view")`, each reduced mod n
with a zero check. Deterministic, recoverable on any device, nothing to store. Mirrors the existing
`signMessage` registration flow in `lib/umbra/registration.ts`.

---

## Landmines

**MPC signing may not be deterministic.** *Unresolved and load-bearing.* Bo Wallet supports MPC
accounts. Signature-derived keys assume signing the same message twice returns the same bytes, which
holds for RFC-6979 signers but is not guaranteed for threshold schemes. If it does not hold, users
get different stealth keys every session and lose their funds. **Test this before writing P2:**
connect an MPC Bo Wallet account, sign the same message twice, compare bytes. Fallback is derive
once, encrypt under a wallet-derived secret, persist — and then a key export flow becomes mandatory,
because mobile webview storage is cleared more aggressively than desktop browser storage.

**Bo Wallet is mobile only.** iOS and Android app, no browser extension, so no `window.ethereum` on
desktop. Hence both connectors in `EvmProvider`: `injected()` covers MetaMask on desktop and Bo
Wallet's in-app dApp browser; `walletConnect()` covers phone-to-desktop pairing. Which of the two Bo
Wallet actually supports is still unknown — install it and find out.

**Ghost Pay has no mobile layout.** Four responsive breakpoint usages in the whole frontend, two of
them in `Button.tsx`. `PageShell` is `flex h-screen overflow-hidden` with a fixed 220px sidebar and
`p-8`. On a 390px phone that leaves ~100px of content. If the native wallet is mobile-only, the BOT
Chain path is a mobile path. That is what P4 is for, and it improves the Solana product too, since
Phantom and Solflare have in-app browsers.

**Next.js only inlines statically-written `process.env.NEXT_PUBLIC_*`.** `process.env[name]` reads as
undefined in the browser. Every contract address var in `lib/botchain/contracts.ts` is spelled out
literally on purpose. Do not refactor them into a loop.

**Native BOT only in v1.** ERC-20 stealth payments leave the recipient holding tokens at an address
with no gas to move them. Native transfers avoid this entirely — the recipient sweeps value minus
gas from the same address. Adding tokens means solving gas provisioning first.

**Mainnet contracts are permanent.** Deploy to Bohr, run the full flow, fix what breaks, and only
then touch 677.

---

## Don't break

- `lib/umbra/*`, `components/providers/WalletProvider.tsx`, `components/ui/ConnectButton.tsx` are
  Solana-only and currently unmodified by this work. Keep it that way.
- With `NEXT_PUBLIC_BOTCHAIN_ENABLED` unset or `false`, `WalletControl` renders exactly the old
  `ConnectButton` — no switcher, no behavioural change. Ghost Pay is live; the second chain stays
  invisible in production until P6 passes.
- Vercel scoping: flag `true` on Preview and Development, `false` (or absent) on Production until
  the cutover.

---

## Open questions for BOT Chain

1. Does Bo Wallet have a dApp browser, WalletConnect support, or both?
2. Is Bo Wallet's MPC signing deterministic?
3. Can they fund a reviewer wallet with mainnet BOT? There is no mainnet faucet, so a reviewer who
   cannot get BOT fails our integration for reasons unrelated to our code.
4. BotScan verifier URL and API key for `forge verify-contract`. Not in the public docs. Unverified
   bytecode behind a privacy app is a bad look for a listing review.
5. Does MetaMask-with-BOT-Chain-added count as "native wallet" for the listing check, if Bo Wallet
   turns out to be unreachable from a web dApp?

---

## Setup

```sh
cd frontend && npm install
cp .env.example .env.local     # then fill in, see the BOT Chain block at the bottom
npm run dev
```

WalletConnect project ID is free from https://dashboard.reown.com. Without it the app falls back to
injected wallets only and the Bo Wallet pairing path cannot be tested.

Contract deploy steps are in `contracts/README.md`. Testnet first, always.
