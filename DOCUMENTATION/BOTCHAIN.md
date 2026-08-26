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

Decimals are 18, confirmed against the node rather than assumed — a 10 tBOT faucet balance reads
as `10000000000000000000` from `eth_getBalance`. Nothing in BOT Chain's docs states it, so do not
let the comment in `chain.ts` drift back to a guess.

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

### Done — P5, gating, banner, landing

**The flag is now the only thing that decides.** It was not before. `WalletControl` checked it, but
`isBotChain` came straight from persisted state, so a browser holding `botchain` from a preview
build would have had `/send`, `/receive` and the sidebar rendering BOT Chain views behind a Solana
wallet control — a state neither chain works in. `lib/botchain/gate.ts` now owns the decision,
`ChainProvider` enforces it and rewrites a selection the flag no longer permits, and
`resolveActiveChain` is unit-tested. `npm run smoke:botchain:flagoff` asserts the whole thing end to
end against a browser seeded with `botchain`.

The site title and description are gated too. `NEXT_PUBLIC_*` inlines on the server as well, so a
production build with the flag off never claims a second chain — which matters more here than in the
UI, because search results and link previews outlive the deploy that produced them.

**`BotChainBanner`** rides with `BotChainGate`, so every BOT Chain screen states two things without
each page remembering to: which network (Bohr is a testnet, tBOT is worthless, here is the faucet),
and what stealth addresses actually hide.

**Landing.** A flag-gated section putting the two privacy models side by side — Solana:
recipient unlinkable, amount encrypted, sender anonymous; BOT Chain: recipient unlinkable, amount
public, sender public. The differences are stated rather than smoothed over, because a listing
review is exactly the audience that checks a privacy claim against the chain, and implying parity
is a claim two minutes on an explorer disproves.

### Done — first real MetaMask run, and what it found

The full loop worked on Bohr: unlock, publish, resolve a recipient by their plain address, send,
scan, claim. Five things came out of it.

- **`/dashboard` and `/history` now have BOT Chain branches.** They were marked as BOT Chain pages
  in the sidebar while rendering their Solana views, so a connected EVM wallet was told to connect
  a wallet. The dashboard shows the public balance and the unclaimed stealth total as two separate
  figures — never summed, because the second is not spendable from the first until claimed. History
  is incoming only: a stealth payment you *send* leaves nothing on chain tied to your identity, and
  an empty "sent" column would read as broken rather than as the point of the scheme.
- **A failing live watcher no longer presents as a failed scan.** Bohr's RPC has no
  `eth_newFilter`, so `watchEvent` errored and the receive page showed a red error above a list of
  payments it had loaded perfectly well. `watchEvent` now polls with `eth_getLogs` (`poll: true`),
  and a watcher failure surfaces as a quiet "press Rescan" line instead of a page error.
- **Swept addresses keep dust, and the UI now knows it.** EIP-1559 refunds the gap between
  `maxFeePerGas` and the price actually paid, so every sweep leaves a remainder. It was being
  offered as claimable, and claiming it failed — correctly, since it costs more to move than it is
  worth. `isDust()` recognises it and the row reads Claimed.
- **The wrong-network state is recoverable.** With Phantom also injecting an EVM provider, wagmi
  reconnected to it on Ethereum mainnet and the sidebar showed "Switch to Bohr Testnet" with no
  indication of which wallet was connected and no way out — it read as "not connected". It now
  names the connector and offers Disconnect.
- **Re-unlocking after an account switch is correct, not a bug.** Keys live in memory and are
  cleared on account change; anything else would leave one account's spending key reachable from
  another account's UI.

### Done — contract tests

`contracts/test/GhostPayStealthSend.t.sol` covers all five revert paths, atomicity of the
announcement and the transfer, payment to a smart account beyond the `transfer` stipend, and a fuzz
run over amounts.

All twelve pass. One failed on the first run and the test was wrong, not the contract:
`vm.recordLogs()` is not revert-aware — it returns entries emitted inside frames that later
reverted, which is an artefact of how Foundry's inspector collects them and not what the chain
does. Atomicity is now asserted through a counting announcer's storage, since state does roll back,
and the same forwarder is shown announcing on a successful send so the zero is a rollback rather
than a wiring mistake.

`foundry.toml` sets `no_match_path = "lib/**"`. Without it `forge test` runs forge-std's own suite,
which fails on filesystem permissions and mainnet RPC access and buries real failures under
twenty-one unrelated ones.

### Next — P6, verify and mainnet cutover

---

## Deployments

### Bohr testnet (968) — 2026-08-26

| Contract | Address |
|---|---|
| `ERC5564Announcer` | `0x6212BB579339F6523FCC100F49e1136922a3f3Ce` |
| `ERC6538Registry` | `0x8d1B71628BBC0EDD95b652674BB0F81DeB6Cf767` |
| `GhostPayStealthSend` | `0xD4F25c861905DBe99f40A1361C167b404f4000A2` |
| Scan from block | `21243953` |

Deployed in blocks 21243965–21243966; the scan start is deliberately earlier. The script reads
`block.number` during simulation, before the transactions are mined, so the printed value is always
behind the real one. Early is the safe direction — a start block *after* the first announcement
would silently hide payments, whereas a few blocks early costs nine seconds of scanning on a
0.75s chain.

Deployment cost 0.0222 BOT at 20 gwei, 1,111,164 gas across the three.

The deployer holds no privileges afterwards: none of the three contracts has an owner, an admin
function, `selfdestruct` or `delegatecall`, and `GhostPayStealthSend` holds its announcer in an
`immutable`. The key is spent the moment the transaction lands.

### BOT Chain mainnet (677)

Not deployed. See P6.

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

**Deriving keys from an EVM wallet.** No EVM wallet hands you two keypairs. The Umbra Cash
pattern: user signs a fixed message once, hash the signature into a seed, derive
`p_spend = keccak256(seed ‖ "spend")` and `p_view = keccak256(seed ‖ "view")`, each reduced mod n
with a zero check. Deterministic, recoverable on any device, nothing to store. Mirrors the existing
`signMessage` registration flow in `lib/umbra/registration.ts`.

---

## Landmines

**Bo Wallet cannot be used. Settled.** Confirmed with BOT Chain: no browser extension and no
in-app dApp browser, so there is no way for a web page to reach it. MetaMask is the wallet for this
path, and the listing's "native wallet" requirement now rests entirely on BOT Chain accepting
MetaMask-with-BOT-Chain-added — the one open question that can still invalidate the integration.

This closes the MPC question with it. MetaMask signs per RFC-6979, so signature-derived keys are
deterministic by construction. `assertDeterministicDerivation` and the persisted meta-address check
both stay: they cost one extra signature, they are the difference between an error and someone
losing funds, and whatever wallet BOT Chain ships next is not required to be deterministic.

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
- With `NEXT_PUBLIC_BOTCHAIN_ENABLED` unset or `false`, the BOT Chain path does not exist: the
  wallet control is exactly the old `ConnectButton`, `isBotChain` is forced false, a stored
  selection is rewritten to `solana`, and neither the landing section nor the page title mentions a
  second chain. Ghost Pay is live; it stays that way until P6 passes. `lib/botchain/gate.ts` is the
  single place that decides — do not reintroduce a second read of the flag.
- Vercel scoping: flag `true` on Preview and Development, `false` (or absent) on Production until
  the cutover.

---

## Open questions for BOT Chain

1. **Does MetaMask with BOT Chain added satisfy the "native wallet" requirement?** This is the one
   that matters. Bo Wallet has no extension and no dApp browser, so no web application can connect
   it — meaning either MetaMask counts, or the listing requirement cannot be met by a web app at
   all. Ask before the mainnet deploy, not after.
2. Can they fund a reviewer wallet with mainnet BOT? There is no mainnet faucet, so a reviewer who
   cannot get BOT fails our integration for reasons unrelated to our code.
3. BotScan verifier URL and API key for `forge verify-contract`. Not in the public docs. Unverified
   bytecode behind a privacy app is a bad look for a listing review.
4. Does any BOT Chain RPC implement `eth_newFilter`? Bohr's does not, so live payment updates fall
   back to polling on Rescan. Workable, but worth knowing whether mainnet differs.

### Answered

- **Does Bo Wallet have a dApp browser or WalletConnect?** Neither. It cannot be reached from a web
  page.
- **Is Bo Wallet's MPC signing deterministic?** Moot — see above.
- **BOT decimals?** 18, confirmed from `eth_getBalance`.

---

## Setup

```sh
cd frontend && npm install
cp .env.example .env.local     # then fill in, see the BOT Chain block at the bottom
npm run dev
```

WalletConnect project ID is free from https://dashboard.reown.com. Without it the app falls back to
injected wallets only, which loses the QR path to MetaMask on a phone.

Contract deploy steps are in `contracts/README.md`. Testnet first, always.
