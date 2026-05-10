# Ghost Pay — Architecture

## Concept

Ghost Pay is a privacy-first payment platform on Solana. Users send and receive USDC/PUSD using their `.sol` name, with amounts and addresses hidden on-chain. Think: Venmo-level UX, cryptographic privacy under the hood.

**Core tagline:** *Pay anyone, reveal nothing.*

---

## Target Users

- Freelancers/contractors who don't want clients to see their full wallet history
- Businesses running private payroll on-chain
- Anyone transacting in PUSD (Shariah-compliant, no freeze risk)
- DeFi users wanting portfolio privacy

---

## User Flows

### 1. Onboarding
```
Connect Wallet → Umbra Registration (3-step ZK, idempotent) → Dashboard
```

### 2. Shield Assets (public → private)
```
Select token + amount → Umbra encryptedBalanceDeposit → Private balance updated
```

### 3. Send Private Payment
**Route A — Encrypted Balance Transfer (amounts hidden):**
```
Enter .sol name → SNS resolve → Umbra UTXO (ReceiverClaimable) → Relayer submit → Done
```
**Route B — MagicBlock PER (institutional/enterprise):**
```
Auth with MagicBlock → POST /v1/spl/transfer with bearer token → Done
```
**Route C — Cloak Batch/Payroll (multi-recipient):**
```
Upload CSV / add recipients → Cloak transact() with multiple outputs → Done
```

### 4. Receive & Claim
```
Scan for UTXOs (Umbra indexer) → Claim to encrypted balance → Or claim to public balance
```

### 5. Portfolio View
```
Dune SIM API: public balances + tx history
Covalent GoldRush: USD pricing + token metadata
Private balance: Umbra getEncryptedBalanceQuerier (client-side decrypt)
```

### 6. Compliance / Viewing Key
```
Generate hierarchical viewing key (Umbra) → Share with auditor → Auditor decrypts their slice only
```

### 7. Growth / Rewards
```
Every payment action → Torque custom event → User earns points on leaderboard
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 14 App                           │
│                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐  ┌──────────────┐  │
│  │   Frontend UI   │   │   API Routes     │  │  Middleware  │  │
│  │  (shadcn/ui)    │   │  (server-side)   │  │              │  │
│  └────────┬────────┘   └────────┬─────────┘  └──────────────┘  │
│           │                     │                               │
│  ┌────────▼────────────────────▼──────────────────────────┐    │
│  │                   Client-Side SDK Layer                  │    │
│  │                                                          │    │
│  │  @umbra-privacy/sdk    @cloak.dev/sdk    @ika.xyz/sdk   │    │
│  │  @bonfida/spl-name-service    @solana/web3.js           │    │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│  RPC Fast        │   │            External APIs                  │
│  (Solana RPC)    │   │                                          │
│  120M CU/month   │   │  Umbra Relayer (claim submissions)       │
│  500 req/s       │   │  Umbra Indexer (UTXO scanning)           │
│  Shredstream     │   │  MagicBlock PER REST API                 │
└──────────────────┘   │  Dune SIM API (portfolio analytics)      │
                        │  Covalent GoldRush (USD pricing)         │
                        │  Torque API (events/leaderboard)         │
                        └──────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes + SSR for API key safety |
| UI | shadcn/ui + Tailwind | Prebuilt, fast, professional |
| Wallet | `@solana/wallet-adapter-react` | Phantom/Solflare support |
| Privacy (primary) | `@umbra-privacy/sdk` | ZK proofs, encrypted balances, UTXO mixer |
| Privacy (batch) | `@cloak.dev/sdk` | Payroll/multi-recipient transfers |
| Privacy (enterprise) | MagicBlock PER REST API | Institutional route, TEE-backed |
| Custody (stretch) | `@ika.xyz/sdk` | Cross-chain dWallet (pre-alpha) |
| Identity | `@bonfida/spl-name-service` | `.sol` name resolution |
| Stablecoin | PUSD (Palm USD) + USDC | Primary payment tokens |
| ZK Proving | `@umbra-privacy/web-zk-prover` | Browser ZK (2-8s) or Node.js (1-3s) |
| Analytics | Dune SIM API + Covalent GoldRush | Portfolio data, USD pricing |
| Growth | Torque | Leaderboards, referral rewards |
| RPC | RPC Fast (Frankfurt) | High performance, hackathon plan |
| Language | TypeScript | Full type safety |

---

## Key Env Variables

```env
# RPC
RPC_FAST_ENDPOINT=https://...rpcfast.com/...

# Umbra
UMBRA_NETWORK=devnet                  # switch to mainnet for production
UMBRA_INDEXER_URL=https://utxo-indexer.api-devnet.umbraprivacy.com
UMBRA_RELAYER_URL=https://relayer.api.umbraprivacy.com

# MagicBlock
MAGICBLOCK_API_URL=https://...

# Dune SIM
SIM_API_KEY=...

# Covalent
COVALENT_API_KEY=...

# Torque
TORQUE_API_KEY=...

# Palm USD
PUSD_MINT_ADDRESS=...   # to be confirmed from hackathon resources
```

---

## Program IDs

| Contract | Network | Address |
|---|---|---|
| Umbra Program | Mainnet | `UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh` |
| Umbra Program | Devnet | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` |

---

## Supported Tokens (Phase 1)

| Token | Mainnet Mint | Notes |
|---|---|---|
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Umbra-native support |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | Umbra-native support |
| wSOL | `So11111111111111111111111111111111111111112` | Umbra-native support |
| PUSD | TBD | Palm USD — get mint from hackathon resources |

---

## Pages / Routes

```
/                    → Landing page (connect wallet CTA)
/dashboard           → Portfolio overview (public + private balances)
/send                → Send private payment (with .sol resolution)
/receive             → My private address / QR code
/history             → Private tx history (viewing key decrypt)
/payroll             → Batch payroll via Cloak (CSV upload)
/compliance          → Generate + export viewing keys
/rewards             → Torque leaderboard + referral link
/api/portfolio       → Server: Dune SIM + Covalent data
/api/magicblock/*    → Server: MagicBlock PER proxy (auth token protected)
/api/torque/*        → Server: Torque event relay
```

---

## Privacy Feature Matrix

| Feature | Umbra | Cloak | MagicBlock PER |
|---|---|---|---|
| Amounts hidden | Yes (encrypted) | Yes (UTXO) | Yes (TEE) |
| Sender unlinkable | Yes (UTXO mixer) | Yes (UTXO) | Partial |
| Receiver hidden | Yes (stealth) | Yes | No |
| Compliance/audit | Yes (viewing keys) | Yes | Yes |
| Batch/payroll | No | Yes | No |
| Enterprise SLA | No | No | Yes (TEE) |
| Devnet support | Yes | No (mainnet only) | Yes |

---

## Stretch: Ika MPC Integration

Ika (`@ika.xyz/sdk`) is pre-alpha. If accessible, integrate as a "cross-chain custody" feature:
- User creates an Ika dWallet that controls assets on BTC/ETH
- Ghost Pay can initiate cross-chain private payments via Ika signing
- This directly targets the "bridgeless capital markets" use case for the $15,000 prize

**Risk:** Pre-alpha APIs may be unstable. Treat as Day 5 bonus, not Day 1 priority.
