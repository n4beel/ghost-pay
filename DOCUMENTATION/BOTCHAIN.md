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

### Done — P2, stealth address library

`frontend/lib/stealth/`, 109 tests, `npm test`.

- `crypto.ts` — scheme 1 primitives. Every byte-level convention lives here.
- `keys.ts` — signature-derived spend and view keypairs, meta-address encode/decode and `st:` URIs.
- `generate.ts` — sender side: ephemeral keypair, shared secret, stealth address, view tag, ERC-5564
  native-token metadata.
- `scan.ts` — chunked `eth_getLogs` from the announcer's deploy block, view-tag filter, full
  derivation on survivors; `watchAnnouncements` for live announcements.
- `sweep.ts` — derive the stealth private key, quote the fee, transfer balance minus gas.

**The interop decision.** ERC-5564 says "the secret is hashed" without saying which encoding of the
point gets hashed, so two implementations can both follow the spec exactly and derive different
addresses. We hash the **33 byte compressed** shared secret, matching ScopeLift's
`stealth-address-sdk` — the implementation wallets and indexers were built against. That choice is
not a comment, it is a test: `__tests__/reference.test.ts` runs our code and that SDK side by side
over randomised inputs, and `__tests__/vectors.ts` freezes SDK-generated known-answer vectors so the
pin survives the dev dependency being dropped. There are no ERC-5564 hex vectors to test against;
this is the closest thing that exists.

Key derivation is the one place we diverge, deliberately: ScopeLift splits the signature into
halves, we hash it into a seed with `"spend"` and `"view"` domain separators as
[the plan](https://claude.ai/code/artifact/954c8d12-353b-4885-aab3-110c6ae10212) specifies. Nothing
on-chain depends on it — it only decides where a user's keys come from — but it does mean Ghost Pay
keys are recoverable in Ghost Pay, not in another ERC-5564 wallet. `KEY_VECTORS` pins it so an
accidental edit fails loudly instead of orphaning funds.

`assertDeterministicDerivation(sigA, sigB)` is the guard for the MPC landmine below. The receive
flow must call it — sign the message twice, compare — before letting a user take funds against
derived keys.

Test setup is vitest: `npm test`, `npm run test:watch`, `npm run typecheck`. `next build` needs
`NEXT_PUBLIC_RPC_ENDPOINT` set (the Solana connection is constructed at build time), so run it with
a populated `.env.local`.

### Done — P3, send and receive UI

- `lib/botchain/registry.ts` — ERC-6538 lookup and registration, treating anything read out of the
  registry as untrusted until it decodes.
- `lib/botchain/amount.ts` — native-amount parsing that rejects what `parseEther` would silently
  coerce (exponents, signs, >18 decimals).
- `StealthProvider` — derives the identity from a signature and holds it in memory only.
- `useStealthPayments` — history scan plus a live watcher, with per-address balances so "claimed"
  reflects the chain rather than local bookkeeping.
- `BotChainGate` — the four preconditions (connected, right network, deployed, funded) in one place.
- `StealthSendForm`, `StealthReceivePanel` — the send and receive flows.
- `/send` and `/receive` branch on `useChain()` at the top. The Solana components are untouched.

**Two determinism guards, not one.** The receive flow signs the message twice and compares, which
catches a signer that randomises per call. It also stores the derived *meta-address* (public, and
published to the registry anyway) per account and compares on every later unlock, which catches a
signer that is stable within a session but drifts across them. The first check alone would pass a
wallet that loses the user their funds a day later.

**Smoke test.** `npm run smoke:botchain` drives the real app in Chromium against a mock EIP-1193
wallet and a mock JSON-RPC node — connect, gate, resolve a recipient, unlock, scan — with no
extension, no funded key and no deployment. `NONDETERMINISTIC=1 npm run smoke:botchain` makes the
mock wallet sign the same message two different ways and asserts the app refuses to derive an
identity. Needs `npm i -D playwright`, deliberately not a dependency. See the header of
`scripts/drive-botchain.mjs` for the `.env.local` it expects.

It is not a substitute for MetaMask against a real Bohr deployment. It is what catches the
breakages you would otherwise only find while holding a phone.

### Done — P4, mobile

The app had four responsive breakpoint usages before this, two of them in `Button.tsx`. It now
works from 320px up.

- `PageShell` — the 220px rail collapses below `md` into a Radix Dialog drawer behind a top bar.
  Radix rather than a hand-rolled panel, for the focus trap, escape handling and scroll lock.
- Height is `100dvh`, not `100vh`. On mobile Safari and Chrome `100vh` is the viewport with the
  browser chrome retracted, so an `h-screen` layout with `overflow-hidden` hides its own footer
  under the address bar with no way to scroll to it.
- Touch targets are raised to 44px under `@media (pointer: coarse)` — matching the input device
  rather than the screen width, so the deliberate desktop density survives a small laptop window.
  Inputs go to 16px there too: anything smaller makes iOS Safari zoom on focus and never zoom back.
- Landing page, dashboard cards, and every list row are responsive. `html, body` have
  `overflow-x: hidden` so one long hash can never drag the layout sideways.

**The check that matters.** `npm run smoke:botchain:mobile` runs the whole flow at 390x844 and
asserts, on every page it visits, that `scrollWidth <= innerWidth` — naming the widest offending
element when it is not. Horizontal overflow is the entire class of mobile layout bug, it is
invisible in a screenshot taken at the width that caused it, and this catches it in one assertion.
Verified clean at 320, 360, 390, 414 and 768px.

The drawer is also asserted to close on navigation, and the desktop pass still runs unchanged.

### Next — P5, gating, banner, landing

Then P6 (verify, mainnet cutover).

**Open item, deliberately deferred.** `/dashboard` and `/history` are marked as BOT Chain pages in
the sidebar but still render their Solana views. Either give them a BOT Chain branch or flag them
`SOL`; right now the nav overstates what works.

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
- `STEALTH_KEY_MESSAGE` in `lib/stealth/keys.ts` is permanent. Change a character and every existing
  user derives different keys, with no error and no way back to the funds at the old ones.
- The conventions in `lib/stealth/crypto.ts` are pinned by `__tests__/reference.test.ts` and
  `__tests__/vectors.ts`. If those fail, do not update the expectations — find out which side moved.
- `isDeployed()` requires a non-zero deploy block as well as the three addresses. Without it the
  scanner has no start point, and walking ~0.75s blocks from genesis is a hung tab, not a slow scan.
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
