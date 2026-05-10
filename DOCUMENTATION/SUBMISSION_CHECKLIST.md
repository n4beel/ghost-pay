# Ghost Pay — Submission Checklist

All submissions go to **Superteam Earn** AND **Colosseum Frontier** portal.

**Deadline:** May 12, 2026 at 11:59 UTC

---

## Common Requirements (all tracks)

- [ ] Public GitHub repo: `https://github.com/[username]/ghost-pay`
- [ ] Deployed live URL (Vercel preferred)
- [ ] Demo video: Loom, max 5 minutes
- [ ] Colosseum Frontier submission profile link
- [ ] README.md with:
  - Problem solved + target users
  - How each integrated SDK/API is used
  - Build & run instructions
  - Deployed URL + program IDs

---

## Track-by-Track Submissions

### 1. Encrypt & Ika — $15,000
**Platform:** Superteam Earn
**Key Requirement:** Use Encrypt FHE or Ika MPC infrastructure
**What to show:** Ika dWallet creation + cross-chain signing demo (or Encrypt FHE encryption layer)
**Judging weight:** Integration depth 40%

Submission fields:
- [ ] Project title
- [ ] Project description (emphasize bridgeless capital markets use case)
- [ ] GitHub link
- [ ] Website/live URL
- [ ] Colosseum profile link
- [ ] Demo video link

---

### 2. Umbra SDK — $10,000
**Platform:** Superteam Earn
**Key Requirement:** Umbra SDK must be CORE to the product, not superficial
**What to show:** Registration → Shield → Private send (ZK proof) → Claim → Viewing key
**Judging:** Core integration, innovation, technical execution, commercial potential

Submission fields:
- [ ] Project title
- [ ] Project description
- [ ] GitHub link
- [ ] Project website (optional)
- [ ] "Did you submit to Colosseum?" → Yes
- [ ] Colosseum profile link
- [ ] Demo video link
- [ ] Presentation link (optional)
- [ ] Project Twitter (optional)

README must explicitly cover:
- [ ] How Umbra SDK is used (encrypted balances, UTXO mixer, viewing keys)
- [ ] Program IDs (`DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` on devnet)

---

### 3. Palm USD — $10,000
**Platform:** Superteam Earn
**Key Requirement:** Build utility with PUSD stablecoin
**What to show:** PUSD as payment token in Ghost Pay (shield, send, receive)
**Judging:** Technical execution 35%, product use case 30%, innovation 15%, traction 10%, team 10%
**Angle:** First privacy-preserving app for PUSD — targets Muslim-majority markets (UAE, Pakistan)

Submission fields:
- [ ] Project title + description (emphasize PUSD utility + Shariah-compliant + privacy angle)
- [ ] GitHub link
- [ ] Live URL
- [ ] Colosseum link
- [ ] Demo video (show PUSD payment specifically)

---

### 4. 100xDevs — $10,000
**Platform:** Superteam Earn
**Key Requirement:** Quality Solana app, any category
**What to show:** Full product quality, UX, real-world use case
**Judging:** Technical execution, innovation, real-world use, UX, completeness

- [ ] All standard fields
- [ ] Emphasize: production-ready, multiple integrated APIs, real use case

---

### 5. RPC Fast — $10,000 (in credits)
**Platform:** Superteam Earn
**Key Requirement:** Submit + optionally use RPC Fast infra
**Actions required:**
- [ ] Follow @rpcfast on X — provide your X handle
- [ ] Join Telegram: https://t.me/+SpMbJTPTakAxNjdi — provide your TG handle
- [ ] Get hackathon RPC plan during dev (contact via TG)

Submission fields:
- [ ] Project title
- [ ] GitHub link
- [ ] Project website
- [ ] X profile link
- [ ] Colosseum link
- [ ] Pitch deck / Loom link
- [ ] Telegram or email contact
- [ ] Confirmation of X follow
- [ ] Confirmation of TG join
- [ ] How app uses RPC Fast infra (optional but boosts Bonus Award eligibility):
  > "Ghost Pay uses RPC Fast Hackathon Plan as its Solana RPC provider for all Umbra SDK interactions, wallet balance queries, and transaction submissions. The 500 req/s rate limit and 120M CU/month plan supports concurrent ZK proof submissions and real-time UTXO scanning."

---

### 6. theMiracle Wallet Placement — $10,000 (in placement value)
**Platform:** Superteam Earn
**Key Requirement:** Design a benefit with 4 parts: Audience, Action, Incentive (min $5,000 value), Value
**No extra code needed — marketing deliverable**

Benefit design to write:
- **Audience:** Solana users in Solflare/MetaMask who have sent ≥1 SPL transfer
- **Action:** Click "Try Ghost Pay" → Connect wallet → Complete first private send
- **Incentive:** First 500 users get $10 USDC airdrop to their Ghost Pay private balance
- **Value:** Experience true financial privacy on Solana — pay anyone without revealing amounts or identity

- [ ] Submit benefit design
- [ ] GitHub + live URL
- [ ] Demo video

---

### 7. SNS Identity — $5,000
**Platform:** Superteam Earn
**Key Requirement:** Identity-focused project on Solana
**What to show:** `.sol` names as universal payment addresses, reverse lookup in history, agent identity
**Judging:** Innovation, technical merit, practicality, completeness, UX, founder potential

- [ ] All standard fields
- [ ] Emphasize: `.sol` as the primary UX primitive for private payments

---

### 8. KAST Pakistan — $5,000
**Platform:** Superteam Earn
**Key Requirement:** Pakistani builder, building on Solana
**Judging:** Innovation, execution, design, clarity

- [ ] All standard fields
- [ ] Confirm Pakistani builder status
- [ ] Note: PUSD angle is especially relevant for Pakistan market

---

### 9. Dune Analytics — $6,000
**Platform:** Superteam Earn
**Key Requirement:** Must use Dune SIM endpoints + clear demo
**Judging:** Fulfillment 50%, quality 20%, creativity & UX 20%, innovation 10%
**What to show:** Portfolio dashboard powered by SIM API (balances, transactions, activities)

- [ ] All standard fields
- [ ] Demo video MUST clearly show Dune SIM API being called (network tab or logs)
- [ ] README must list which SIM endpoints are used

SIM endpoints used:
- `/v1/solana/balances/{address}` — dashboard portfolio
- `/v1/solana/activities/{address}` — transaction history

---

### 10. MagicBlock Privacy — $5,000
**Platform:** Superteam Earn
**Key Requirement:** Build privacy-first system using Ephemeral Rollups or Private Payments API
**What to show:** MagicBlock PER route in Ghost Pay (Enterprise Transfer mode)
**Judging:** Technology 40%, impact 30%, creativity & UX 30%

- [ ] All standard fields
- [ ] Demo video shows MagicBlock PER transfer specifically (auth flow + private send)

---

### 11. Cloak — $5,010
**Platform:** Superteam Earn
**Key Requirement:** Deep integration of Cloak SDK
**What to show:** Payroll feature (batch disbursement to multiple recipients via Cloak)
**Judging:** Integration depth 40%, product quality 30%, real-world use 30%

- [ ] All standard fields
- [ ] Demo video shows CSV payroll upload → Cloak batch transact → recipients receive

---

### 12. Torque MCP — $3,000
**Platform:** Superteam Earn
**Key Requirement:** Custom events through Torque, show live activity/engagement
**What to show:** Events firing on each payment, leaderboard active
**Judging:** Live activity, community engagement, integration depth

- [ ] All standard fields
- [ ] Show Torque campaign dashboard screenshot in submission
- [ ] Demo must show event firing + leaderboard updating

---

### 13. Covalent GoldRush — $3,000 USDC
**Platform:** Superteam Earn
**Key Requirement:** Use GoldRush API endpoints
**What to show:** USD pricing + token metadata in portfolio dashboard

- [ ] All standard fields
- [ ] Specify: using `solana-mainnet` chain, `getTokenBalancesForWalletAddress`

---

## README Template

```markdown
# Ghost Pay — Private Payments on Solana

> Pay anyone, reveal nothing.

## Problem

Every transaction on Solana is public. Wallet addresses, amounts, and payment 
history are visible to anyone. Ghost Pay brings financial privacy to Solana — 
you send and receive money using your .sol name, with amounts and addresses 
cryptographically hidden.

## Target Users

- Freelancers/contractors who want payment privacy
- Businesses running private payroll on-chain
- PUSD users (Shariah-compliant, no freeze risk)

## How It Works

1. **Shield** — Move tokens from your public wallet into an encrypted balance
2. **Send** — Type a .sol name → Ghost Pay resolves it → sends a private UTXO
3. **Claim** — Recipients scan for incoming UTXOs and claim to their private balance
4. **Compliance** — Generate a scoped viewing key to share with auditors

## Integrated SDKs & APIs

| Integration | Purpose | Track |
|---|---|---|
| Umbra SDK `@umbra-privacy/sdk` | Core privacy: encrypted balances, ZK UTXO mixer, viewing keys | Umbra ($10K) |
| Cloak SDK `@cloak.dev/sdk` | Batch payroll disbursement | Cloak ($5K) |
| MagicBlock PER REST API | Enterprise private transfers (TEE-backed) | MagicBlock ($5K) |
| Ika SDK `@ika.xyz/sdk` | Cross-chain dWallet custody | Encrypt & Ika ($15K) |
| SNS `@bonfida/spl-name-service` | .sol name resolution for all payments | SNS ($5K) |
| Palm USD (PUSD) | Shariah-compliant stablecoin support | Palm USD ($10K) |
| Dune SIM API | Portfolio balances and transaction activity | Dune ($6K) |
| Covalent GoldRush | USD pricing and token metadata | Covalent ($3K) |
| Torque | Growth mechanics: leaderboards and events | Torque ($3K) |
| RPC Fast | Solana RPC infrastructure | RPC Fast ($10K credits) |

## Program IDs

| Contract | Network | Address |
|---|---|---|
| Umbra | Devnet | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` |
| Umbra | Mainnet | `UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh` |

## Build & Run

\`\`\`bash
git clone https://github.com/[username]/ghost-pay
cd ghost-pay
npm install
cp .env.example .env.local
# Fill in API keys (see .env.example)
npm run dev
\`\`\`

## Live Demo

https://ghost-pay.vercel.app
```

---

## X / Social Posts (post same day as submission)

**Umbra track:**
> "Built Ghost Pay for @UmbraPrivacy SDK hackathon — private payments on Solana with ZK proofs. Send to any .sol name, amounts stay hidden. @Colosseum_org #Frontier"

**General:**
> "Ghost Pay is live — private payments on @solana. Pay anyone with your .sol name. No one sees your amounts or history. Built with @UmbraPrivacy @MagicBlock_gg @JupiterExchange @cloak_finance for @Colosseum_org Frontier Hackathon. [link]"
