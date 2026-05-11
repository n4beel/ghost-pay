# Ghost Pay — Private Payments on Solana

> Pay anyone. Reveal nothing.

Ghost Pay is a **privacy-first payment infrastructure** on Solana. Send tokens with cryptographic guarantees — amounts hidden, senders anonymous, receivers unlinkable. Use `.sol` names as payment addresses. Run an entire payroll in one transaction, with every salary amount kept secret.

Built for the **Superteam Frontier Hackathon 2026** by a solo Pakistani developer.

---

## The Problem

Every public blockchain payment is a data leak. The moment you pay someone on Solana:

- The amount is permanently visible to anyone
- Your wallet is linked to theirs on-chain
- With enough transactions, your entire financial history is reconstructable

Mixers are clunky. ZK rollups sacrifice UX. Most "private" solutions still leave metadata on-chain.

## The Solution — A Closed Private Economy

Ghost Pay introduces a **two-pool model**: a public wallet visible on-chain, and a **private encrypted vault** visible only to you. Once funds enter the vault, they can circulate indefinitely without ever surfacing to the public chain.

```
Income arrives (public wallet)
    │
    ▼ Shield ──────────────────────────────────────────────
                                                           │
                                          [Private Encrypted Vault]
                                                           │
                              ┌────────────────────────────┘
                              │
                              ▼ Send from Vault (ZK proof)
                    Recipient's stealth UTXO
                              │
                              ▼ Claim All
                    Recipient's Private Vault
                              │
                              └──────────────► (loop continues)

    Unshield only to exit (DeFi, CEX) — and even then,
    only reveals you withdrew, not any counterparty.
```

**No unshield required to spend.** The vault is not just storage — it's a fully functional spending account. Send directly from your encrypted balance to any recipient. They receive a stealth UTXO they claim into their own vault. The loop is closed.

---

## Live Demo

**App:** [https://ghost-pay.vercel.app](https://ghost-pay.vercel.app)  
**GitHub:** [https://github.com/n4beel/ghost-pay](https://github.com/n4beel/ghost-pay)  
**Pay Link example:** `https://ghost-pay.vercel.app/pay/alice.sol`

---

## Feature Overview

| Feature | Description |
|---|---|
| **Shield** | Deposit public tokens into your encrypted vault (one-time bootstrapping) |
| **Send (Public)** | Send from public wallet → creates stealth UTXO for recipient, breaking on-chain link |
| **Send (Vault)** | Send from encrypted vault → ZK proof debits your vault, credits recipient's stealth UTXO — no public balance touched |
| **Claim All** | Scan the chain for incoming stealth UTXOs and claim them to your vault |
| **Unshield** | Exit the private pool to public wallet (DeFi, CEX ramps) |
| **Payroll** | Upload a CSV of recipients + amounts → Cloak disperses salaries privately in one transaction |
| **Compliance** | Generate scoped viewing keys for auditors — selective transparency on your terms |
| **Rewards** | Leaderboard of top private payment senders, powered by Torque incentive events |
| **Pay Links** | `ghost-pay.vercel.app/pay/alice.sol` — shareable payment pages that work with any `.sol` name or wallet address |
| **Portfolio** | Public balance shown via Dune SIM simulation + Covalent USD pricing |
| **Activity Log** | Persistent local activity history for all private operations |
| **PUSD support** | Palm USD stablecoin natively supported across all flows |

---

## SDK Integration Map

| SDK | Role | Integration Depth |
|---|---|---|
| **Umbra** | Core privacy engine — stealth UTXOs, encrypted vault, ZK proofs, viewing keys | Registration, shield, send (public→stealth), send (vault→stealth), claim, unshield, compliance grants |
| **Cloak** | Batch payroll — one deposit fans out to N private stealth UTXOs | CSV upload → private multi-disbursement → each recipient gets an unlinkable UTXO |
| **MagicBlock PER** | Enterprise TEE route — institutional alternative to ZK proofs | Toggle on Send page switches from ZK to PER-backed transfer; proxied via Next.js API route |
| **SNS** | Human-readable identity — pay `alice.sol` instead of a 44-char pubkey | All recipient inputs resolve `.sol` → wallet address via `@bonfida/spl-name-service` |
| **Dune SIM** | Transparent contrast — shows what the public chain sees | Portfolio page: simulates public token balances; History: on-chain activity (proving the vault hides everything) |
| **Covalent** | USD price enrichment for public portfolio | GoldRush API: token metadata + spot prices → `$X.XX` totals on portfolio card |
| **Torque** | Growth & incentive layer | Custom events per action (shield, send, claim, payroll) → leaderboard rewards top senders |
| **RPC Fast** | High-performance RPC backbone | All Umbra ZK proof submissions, `@solana/kit` connections, UTXO scans — every on-chain call routes through RPC Fast |
| **Palm USD (PUSD)** | Native USD stablecoin | `PUSD` token in the registry — selectable in Send, Shield, Payroll, and pay-link flows |
| **Encrypt / Ika** | Custodial key management (pre-alpha) | UI scaffolded; README integration note; will activate when SDK ships |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App                       │
│                                                         │
│  /dashboard   /send   /receive   /payroll   /history    │
│  /compliance  /rewards  /pay/[address]                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  Client Hooks                     │  │
│  │  useUmbra  usePortfolio  useEncryptedBalance      │  │
│  │  useWallet (wallet-adapter)                       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    lib/                           │  │
│  │  umbra/         cloak/         magicblock/        │  │
│  │  ├─client.ts    ├─client.ts    └─client.ts        │  │
│  │  ├─send.ts      └─payroll.ts                      │  │
│  │  ├─send-from-vault.ts    sns.ts                   │  │
│  │  ├─shield.ts             tokens.ts                │  │
│  │  ├─receive.ts            activity-log.ts          │  │
│  │  ├─compliance.ts         torque/events.ts         │  │
│  │  └─balance.ts                                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │               API Routes (server-side)            │  │
│  │  /api/portfolio  →  Dune SIM                      │  │
│  │  /api/pricing    →  Covalent GoldRush             │  │
│  │  /api/torque     →  Torque Events                 │  │
│  │  /api/magicblock →  MagicBlock PER                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                    RPC Fast (Solana)
                           │
         ┌─────────────────┴──────────────────┐
         │                                    │
   Umbra Program                        Cloak Program
   (mainnet + devnet)               (mainnet batch payroll)
         │
   SNS Program (name resolution)
```

### Privacy Model

Ghost Pay uses **Umbra's UTXO-based privacy model** on Solana:

1. **Shield**: Your tokens are deposited into an on-chain encrypted balance. The amount is hidden using MXE (Multi-party Execution Environment) — only you can read it.
2. **Send (Public → Stealth)**: A stealth UTXO is created at a one-time address derived from the recipient's public key. No link exists between sender and recipient in the transaction.
3. **Send (Vault → Stealth)**: A ZK proof is generated client-side proving you have sufficient encrypted balance. The proof is submitted with a new stealth UTXO for the recipient. Your encrypted balance decreases, the recipient's claimable UTXO appears — with no on-chain link between you.
4. **Claim**: Recipient scans the chain, finds UTXOs addressed to them, and merges them into their encrypted balance.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Solana wallet browser extension (Phantom, Solflare, or Backpack)

### Install & Run

```bash
git clone https://github.com/n4beel/ghost-pay
cd ghost-pay/frontend
npm install
cp .env.example .env.local
# Fill in your API keys (see Environment Variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Solana RPC — RPC Fast endpoint (required)
NEXT_PUBLIC_RPC_ENDPOINT=https://solana-rpc.rpcfast.com?api_key=YOUR_KEY
NEXT_PUBLIC_RPC_WS_ENDPOINT=wss://beam.rpcfast.com?api_key=YOUR_KEY

# Umbra network
NEXT_PUBLIC_UMBRA_NETWORK=mainnet

# Palm USD mint
NEXT_PUBLIC_PUSD_MINT=CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s

# Server-side only (never NEXT_PUBLIC_)
SIM_API_KEY=               # Dune SIM API key
COVALENT_API_KEY=          # Covalent GoldRush API key
TORQUE_API_KEY=            # Torque API key
MAGICBLOCK_API_URL=        # MagicBlock PER endpoint
```

### Build for Production

```bash
npm run build
npm start
```

---

## Supported Tokens

| Token | Mint | Decimals |
|---|---|---|
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |
| wSOL | `So11111111111111111111111111111111111111112` | 9 |
| PUSD | `CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s` | 6 |

---

## Payroll — Private Batch Disbursement

The Payroll page (powered by **Cloak**) lets teams pay multiple recipients in a single transaction with every salary amount hidden:

1. Upload a CSV: `address_or_sns,amount,token`
2. Ghost Pay validates each recipient, resolves `.sol` names via SNS
3. Cloak creates one aggregated deposit that fans out to N individual stealth UTXOs
4. Each recipient claims their payment independently — no one sees the other salaries

**Example CSV:**

```csv
alice.sol,2500,USDC
bob.sol,1800,USDC
carol.sol,3200,USDC
```

One transaction. Three private salaries. Zero leakage.

---

## Compliance & Viewing Keys

Ghost Pay supports **selective transparency** via Umbra's compliance grants:

- Generate a scoped viewing key for any time range
- Share with auditors, tax authorities, or compliance officers
- The key reveals only your transactions — not the counterparty's wallet or their other activity
- Revocable at any time

This makes Ghost Pay **regulator-ready** without sacrificing privacy by default.

---

## Pay Links

Any wallet or `.sol` name gets a shareable pay link:

```
https://ghost-pay.vercel.app/pay/alice.sol
https://ghost-pay.vercel.app/pay/9xQeWvG...
```

The recipient connects their wallet on that page and sends — the payment goes through Umbra's stealth UTXO system automatically. The sender never learns the recipient's actual wallet address unless they already know it.

---

## Hackathon Track Submissions

### Main Track — Superteam Frontier

Ghost Pay demonstrates that **financial privacy is not in conflict with usability**. The closed private loop solves the fundamental objection to privacy tools — "I still have to unshield to spend, so what's the point?" — by making the vault itself a spending account. Every feature has been designed for real-world use: payroll, pay links, `.sol` identity, compliance keys, and a portfolio view showing exactly what the public chain sees (and doesn't see).

The UX is deliberately minimal: no jargon, no technical steps, no address copying. Connect a wallet, press Send, send privately.

---

### Umbra — Core Privacy Infrastructure

**Integration depth:** All seven Umbra capabilities are implemented end-to-end.

| Umbra Feature | Ghost Pay Implementation |
|---|---|
| Registration | One-time on-chain registration on first dashboard visit — guided banner with single-click Register button |
| Shield | `ShieldModal` — deposit from public wallet to encrypted balance using ZK deposit prover |
| Send (public) | `lib/umbra/send.ts` — `getPublicBalanceToReceiverClaimableUtxoCreatorFunction` creates stealth UTXO from public funds |
| Send (vault) | `lib/umbra/send-from-vault.ts` — `getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction` + `getCreateReceiverClaimableUtxoFromEncryptedBalanceProver` — ZK proof debits encrypted balance |
| Claim | `lib/umbra/receive.ts` — `scanAndClaimUtxos` scans for all incoming stealth UTXOs and merges to vault |
| Unshield | `UnshieldModal` — withdraw from encrypted balance back to public wallet |
| Compliance | `lib/umbra/compliance.ts` — viewing key generation and grant management |

The Send page includes a **Source toggle** (Public Wallet / Private Vault) that makes the two send paths explicit to users, with inline narrative explaining what each means for privacy. Available balance is shown for the selected source, with a MAX button.

**Innovation**: The vault-to-vault payment loop (send from vault → recipient claims to their vault) means funds never need to surface publicly after initial shielding. Ghost Pay is the first payment UI to expose this flow as a first-class product feature.

---

### Cloak — Private Payroll

**Integration depth:** Full batch disbursement pipeline.

Ghost Pay's Payroll page is built entirely on Cloak:

- `lib/cloak/payroll.ts` wraps Cloak's SDK
- CSV upload with address validation and SNS resolution
- Preview table shows recipients and amounts before submission
- Cloak's one-deposit-to-N-withdrawals pattern means the on-chain footprint is a single transaction, not N individual sends
- Each recipient's amount is hidden from all other recipients
- Success logs a `payroll` event to the local activity log

**Real-world use case**: Any team paying contractors, researchers, or remote employees in crypto. No one on the team can reconstruct a colleague's salary from on-chain data.

---

### MagicBlock — Enterprise TEE Route

**Integration depth:** Alternative send route with TEE-backed confidentiality.

The Send page includes a **Route selector** (Umbra ZK / MagicBlock TEE):

- Umbra route: client-side ZK proof, maximum decentralization
- MagicBlock route: server-side TEE execution via MagicBlock PER, institutional compliance posture

Switching routes on the Send page preserves all other state (recipient, amount, token). The MagicBlock route is proxied through `app/api/magicblock/[...route]/route.ts` to keep the API URL server-side.

**Use case**: Institutional actors who need auditability guarantees that ZK proofs alone can't provide, or compliance environments that require a trusted execution attestation trail.

---

### SNS — .sol Identity

**Integration depth:** All recipient inputs resolve SNS names.

```typescript
// lib/sns.ts
export async function resolveSnsDomain(domain: string): Promise<string | null>
export function isSolDomain(input: string): boolean
```

SNS resolution applies to:
- Send page recipient input
- Payroll CSV (`alice.sol,2500,USDC` — parsed and resolved before submission)
- Pay links (`/pay/alice.sol` — resolved on page load, displays name + truncated resolved address)

If a `.sol` name is not found, the UI shows `alice.sol (not found)` rather than silently failing. This eliminates address copy-paste errors and the risk of sending to a wrong address.

---

### Dune SIM — On-Chain Analytics

**Integration depth:** Public portfolio simulation + transparent contrast.

`lib/dune-sim.ts` powers the **Public Balance** card on the Dashboard:

- Fetches token balances for the connected wallet via Dune SIM
- Displays a stacked portfolio bar with per-token breakdown
- USD totals are enriched by Covalent (see below)

The contrast between the Public Balance (fully visible) and Private Balance (encrypted, requires click-to-reveal) makes the product's value proposition tangible to new users without any explanation needed.

The History page includes an **On-chain** section below the local activity log showing raw Dune SIM transactions — demonstrating that Umbra ZK operations are completely opaque to chain observers. The on-chain entries show no amounts, no counterparties, and no readable operation type for any private transaction.

---

### Covalent — Token Pricing

**Integration depth:** USD enrichment for public portfolio.

`lib/covalent.ts` + `app/api/pricing/route.ts`:

- Fetches spot prices for USDC, USDT, wSOL, PUSD, and any other token in the user's portfolio
- Enriches Dune SIM balances with USD values
- Powers the `$X,XXX.XX` total on the Public Balance card
- Token metadata (name, decimals, logo URL) used in the portfolio breakdown bar

---

### Torque — Growth & Incentive Layer

**Integration depth:** Custom events at every action, leaderboard on Rewards page.

`lib/torque/events.ts` emits a custom event for every meaningful user action:

| Event | Trigger |
|---|---|
| `shield_completed` | Successful shield transaction |
| `send_completed` | Successful send (public or vault) |
| `claim_completed` | Successful claim (with count of UTXOs claimed) |
| `payroll_completed` | Successful payroll batch |
| `register_completed` | Umbra registration |

The **Rewards page** fetches the Torque leaderboard and displays top senders ranked by private payment volume. This creates a flywheel: users compete to send more privately, increasing the total privacy set (and thus the privacy of all participants — a positive network externality).

---

### RPC Fast — Performance Infrastructure

**Integration depth:** All Solana RPC calls route through RPC Fast.

```env
NEXT_PUBLIC_RPC_ENDPOINT=https://solana-rpc.rpcfast.com?api_key=...
NEXT_PUBLIC_RPC_WS_ENDPOINT=wss://beam.rpcfast.com?api_key=...
```

Every `@solana/kit` connection, UTXO scan, ZK proof submission, and transaction confirmation call uses the RPC Fast endpoint. This is critical for Ghost Pay because:

- **UTXO scans** (`scanAndClaimUtxos`) query many program accounts in sequence — high request volume
- **ZK proof submission** requires fast finality confirmation — latency compounds across the proving pipeline
- **Payroll** submits large transactions that need reliable broadcast and confirmation

RPC Fast's 500 req/s limit and 120M compute units/month handle Ghost Pay's workload without rate-limiting.

---

### Palm USD (PUSD) — Native Stablecoin

**Integration depth:** First-class token support throughout all flows.

PUSD (`CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s`) is registered as a native token in `lib/tokens.ts`:

```typescript
PUSD: {
  mint: process.env.NEXT_PUBLIC_PUSD_MINT ?? "CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s",
  decimals: 6,
  symbol: "PUSD",
  name: "Palm USD",
}
```

It appears in every token selector: Send page, Shield modal, Unshield modal, Payroll CSV parser, and pay-link flows. PUSD is a natural fit for Ghost Pay — a stablecoin with no freeze risk, designed for permissionless payments, used inside a privacy layer where no one can monitor balances or flows.

**Use case**: Cross-border payroll in PUSD — stable value, privacy-preserving, no custodian risk.

---

### 100xDevs — Open Track

Ghost Pay is a complete, production-deployed application built entirely solo. The codebase covers:

- 8 full application pages with live functionality
- 9 SDK integrations, each used meaningfully (not just initialized)
- A novel product feature (vault-to-vault send) that closes the privacy loop
- Shareable pay links that work without any technical knowledge
- CSV payroll that abstracts all ZK complexity from the operator
- A compliance system that makes the app viable for regulated entities

Every design decision prioritizes the non-technical user: amounts are hidden by default, actions have plain-English labels ("Send Privately" not "Generate UTXO"), and the registration flow has a single button with a progress indicator.

---

### KAST Pakistan — Pakistani Builders Track

Built by a **solo Pakistani developer** specializing in backend, blockchain, and AI systems. This is my first Solana-ecosystem project — built end-to-end in under two weeks for the Frontier hackathon.

Ghost Pay addresses a real problem for Pakistani users: international payments in crypto are increasingly monitored, creating risks for freelancers receiving legitimate payment. A privacy-preserving payment layer that is usable by non-technical users directly addresses this gap.

Contact: na268666@gmail.com

---

### Encrypt & Ika — Custodial Key Management (Upcoming)

The Ika dWallet SDK is currently in pre-alpha (access pending). Ghost Pay has scaffolded the integration path in `lib/ika/client.ts`. Once the SDK ships:

- Ika dWallet will serve as the key management layer for users who want hardware-grade key custody without a hardware wallet
- The Send page will add a third route: ZK (Umbra) / TEE (MagicBlock) / dWallet (Ika)
- This unlocks institutional users who require HSM-equivalent security guarantees

The UI scaffold is live. The integration will activate as soon as the Ika SDK reaches public availability.

---

## Design System

Ghost Pay uses a custom dark design system with no component libraries (no shadcn, no MUI):

- **Typography**: Geist Sans (UI) + Geist Mono (amounts, addresses, hashes)
- **Accent**: `#00E5CC` (cyan) — used for interactive elements and private indicators
- **Panels**: flat, no box-shadow, 1px borders
- **Private values**: encrypted by default (`****`) with click-to-reveal scramble animation
- **ZK proof state**: radar sweep animation during proof generation
- **Badges**: `Private` (cyan) and `Confirmed` (muted) — applied consistently to distinguish private vs. public operations

---

## Closing Note

Ghost Pay exists because financial privacy is a human right, not a feature for power users. The goal was to build the simplest possible interface on top of the most powerful privacy infrastructure on Solana — something a freelancer, payroll admin, or compliance officer could use on day one without understanding ZK proofs.

The closed private loop is the core thesis: **if you can spend from the vault, you never need to unshield**. That single property changes the economics of privacy adoption from "worth the hassle" to "always on."

---

*Built with Umbra · Cloak · MagicBlock · SNS · Dune SIM · Covalent · Torque · RPC Fast · Palm USD · Solana*  
*Superteam Frontier Hackathon 2026 · Solo submission · Pakistani builder*
