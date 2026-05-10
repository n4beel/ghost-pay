# Ghost Pay — Build Plan (7 days, solo)

**Deadline:** May 12, 2026 (11:59 UTC)
**Start:** May 6, 2026
**Buffer:** Day 7 is pure submission + polish — no new features after Day 6

---

## Setup (Before Day 1 — Do Today)

- [ ] Request RPC Fast hackathon plan via https://t.me/+SpMbJTPTakAxNjdi
- [ ] Sign up for Dune SIM API key at https://sim.dune.com
- [ ] Sign up for Covalent GoldRush API key at https://goldrush.dev
- [ ] Sign up for Torque at https://torque.so
- [ ] Get Umbra devnet access — check https://docs.umbraprivacy.com for faucet/devnet
- [ ] Confirm PUSD mint address from Palm USD Discord/hackathon resources
- [ ] Set up GitHub repo: `ghost-pay`
- [ ] Bootstrap Next.js 14 project with shadcn/ui

```bash
npx create-next-app@latest ghost-pay --typescript --tailwind --app
cd ghost-pay
npx shadcn@latest init
npm install @umbra-privacy/sdk @umbra-privacy/web-zk-prover
npm install @cloak.dev/sdk
npm install @bonfida/spl-name-service @solana/web3.js
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
npm install @covalenthq/client-sdk
pnpm add @ika.xyz/sdk   # stretch goal
```

---

## Day 1 — Foundation + Umbra Core (May 6)

**Goal:** Wallet connect works, Umbra registration works, shield/unshield works on devnet.

### Tasks
- [ ] Set up Next.js app with shadcn/ui theme (dark, minimal)
- [ ] Integrate Solana wallet adapter (Phantom/Solflare)
- [ ] Set up Umbra client initialization (`getUmbraClient`)
- [ ] Implement Umbra registration flow (3-step, idempotent)
- [ ] Implement **Shield** (public → encrypted balance deposit)
- [ ] Implement **Unshield** (encrypted balance → public withdrawal)
- [ ] Display encrypted balance on dashboard
- [ ] Wire up RPC Fast endpoint

### Key Files
```
app/
  layout.tsx              → WalletProvider + UmbraProvider
  dashboard/page.tsx      → Balance display
lib/
  umbra.ts                → Client initialization
  umbra-registration.ts   → Registration flow
components/
  ShieldModal.tsx         → Shield/Unshield UI
```

### Done Criteria
- Connect Phantom → register with Umbra → deposit 0.1 devnet USDC → see encrypted balance

---

## Day 2 — Private Send + SNS Resolution (May 7)

**Goal:** Private payment flow works end-to-end. `.sol` names resolve.

### Tasks
- [ ] Implement SNS resolution (`resolve()` + `performReverseLookup()`)
- [ ] Build `/send` page UI with `.sol` / address input field
- [ ] Implement Umbra UTXO send (`getPublicBalanceToReceiverClaimableUtxoCreatorFunction`)
- [ ] ZK prover integration (show loading state, 2–8s expected)
- [ ] Implement UTXO scanner (`getClaimableUtxoScannerFunction`)
- [ ] Implement UTXO claim to encrypted balance
- [ ] Display incoming UTXOs as "pending claims" in dashboard

### Key Files
```
app/send/page.tsx              → Send form
app/receive/page.tsx           → My address + QR code
lib/sns.ts                     → resolve(), reverseLookup()
lib/umbra-send.ts              → UTXO creation
lib/umbra-receive.ts           → Scanner + claimer
components/
  SendForm.tsx                 → .sol input with live resolution
  PendingClaims.tsx            → List UTXOs ready to claim
```

### Done Criteria
- Send 0.1 USDC from Wallet A to `wallet-b.sol` → Wallet B sees pending claim → claims to encrypted balance

---

## Day 3 — Portfolio Dashboard + Compliance (May 8)

**Goal:** Portfolio page shows real data. Viewing keys work.

### Tasks
- [ ] Build `/api/portfolio` route (Dune SIM for balances/activity)
- [ ] Build Covalent integration for USD pricing
- [ ] Build dashboard portfolio view (public balance + private balance + USD total)
- [ ] Build `/history` page (decode private tx history using viewing key)
- [ ] Build `/compliance` page (generate + export viewing key)
- [ ] Umbra compliance grant flow (`getComplianceGrantIssuerFunction`)
- [ ] Show last 10 transactions (Dune SIM activities endpoint)

### Key Files
```
app/api/portfolio/route.ts     → Dune SIM + Covalent server route
app/dashboard/page.tsx         → Full portfolio view
app/history/page.tsx           → Private tx history
app/compliance/page.tsx        → Viewing key management
lib/dune-sim.ts                → Dune SIM API wrapper
lib/covalent.ts                → GoldRush wrapper
lib/umbra-compliance.ts        → Viewing key functions
components/
  PortfolioCard.tsx             → Token balance rows
  ActivityFeed.tsx              → Transaction history
```

### Done Criteria
- Dashboard shows public USDC balance (from Dune), USD value (from Covalent), private encrypted balance (from Umbra)
- Compliance page generates a viewing key string

---

## Day 4 — Cloak Payroll + MagicBlock PER (May 9)

**Goal:** Two additional privacy routes integrated.

### Tasks

**Cloak (Payroll):**
- [ ] Build `/payroll` page with CSV upload
- [ ] Parse CSV: `[{ name, wallet_or_sol_name, amount }]`
- [ ] Resolve all `.sol` names via SNS
- [ ] Batch into Cloak `transact()` call (mainnet)
- [ ] Show success screen with all recipients

**MagicBlock PER:**
- [ ] Build `/api/magicblock/*` proxy routes (protect bearer token server-side)
- [ ] Implement challenge → login → token flow
- [ ] Add "Enterprise Transfer" option to `/send` page
- [ ] Show TEE privacy badge when this route is selected
- [ ] Wire up `/v1/spl/transfer` call

### Key Files
```
app/payroll/page.tsx              → CSV upload + batch send
app/api/magicblock/route.ts       → Proxy: challenge/login/transfer
lib/cloak.ts                      → Cloak transact wrapper
lib/magicblock.ts                 → PER API client
components/
  PayrollUploader.tsx             → CSV drag-drop
  EnterpriseTransferBadge.tsx     → TEE indicator
```

### Done Criteria
- Upload CSV with 2 recipients → Cloak batch sends on mainnet
- Switch to Enterprise mode in send → MagicBlock PER route used

---

## Day 5 — Torque + PUSD + Growth (May 10)

**Goal:** Growth mechanics live. PUSD supported.

### Tasks

**Torque:**
- [ ] Set up Torque campaign/leaderboard in their dashboard
- [ ] Fire `private_payment_sent` event on every Umbra/Cloak send
- [ ] Build `/rewards` page with leaderboard embed or API response
- [ ] Add referral link generation

**PUSD:**
- [ ] Add PUSD mint to token list
- [ ] Enable PUSD shield/send in Umbra flow
- [ ] Add PUSD balance to portfolio dashboard

**Ika (stretch):**
- [ ] Attempt `@ika.xyz/sdk` integration
- [ ] Create a dWallet — if successful, show "Cross-Chain" feature
- [ ] If blocked, add placeholder UI: "Ika cross-chain coming soon"

### Key Files
```
app/rewards/page.tsx          → Leaderboard + referral
lib/torque.ts                 → Event firing wrapper
lib/tokens.ts                 → Token list with PUSD
```

### Done Criteria
- Send a payment → Torque event fires → leaderboard updates
- PUSD appears as payment option

---

## Day 6 — Polish + Hardening (May 11)

**Goal:** App is demo-ready. All edge cases handled. No crashes.

### Tasks
- [ ] Error handling: failed ZK proofs, RPC errors, SNS not found
- [ ] Loading states: ZK proof spinner (2–8s), skeleton screens
- [ ] Mobile responsive check (shadcn is responsive, verify key flows)
- [ ] Add wallet not connected state to all pages
- [ ] README.md (see SUBMISSION_CHECKLIST.md for required sections)
- [ ] Record demo video (5 minutes max):
  1. Connect wallet
  2. Shield USDC
  3. Send private payment to `.sol` name (show ZK proof generating)
  4. Recipient claims
  5. Portfolio view with Dune SIM data
  6. Payroll CSV upload
  7. Viewing key generation
  8. Rewards/leaderboard

### Polish Checklist
- [ ] Dark mode looks good (shadcn default)
- [ ] All buttons have loading states
- [ ] Error toasts for failures (shadcn `useToast`)
- [ ] Privacy icons/badges are clear
- [ ] Landing page explains the product in 10 seconds

---

## Day 7 — Submissions (May 12)

**Goal:** Submit to all tracks before 11:59 UTC.

### Morning: Final checks
- [ ] Deploy to Vercel (or Railway/Fly.io)
- [ ] Test deployed app with real wallet
- [ ] Ensure devnet works end-to-end

### Afternoon: Submit all tracks (see SUBMISSION_CHECKLIST.md)

**Submission order by prize value:**
1. Encrypt & Ika — $15,000
2. Umbra — $10,000
3. Palm USD — $10,000
4. 100xDevs — $10,000
5. RPC Fast — $10,000
6. theMiracle — $10,000
7. SNS — $5,000
8. KAST Pakistan — $5,000
9. Dune — $6,000
10. MagicBlock — $5,000
11. Cloak — $5,010
12. Torque — $3,000
13. Covalent — $3,000

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Umbra ZK proof too slow in browser | Medium | Use Node.js server-side proving (1-3s) or Web Worker |
| Cloak mainnet-only blocks dev | High | Build Cloak features last, test on mainnet with small amounts |
| Ika pre-alpha breaks | High | Treat as bonus, not critical path |
| MagicBlock API not documented | Medium | Use demo repo as reference; contact team on Discord |
| PUSD mint not on devnet | Medium | Show PUSD in UI but note "mainnet only" in demo |
| RPC Fast access delayed | Low | Use public devnet RPC during dev, swap before submission |

---

## Daily Checkpoint

Each day end: commit all code, push to GitHub, note blockers.

| Day | Commit Tag | Expected State |
|---|---|---|
| 1 | `v0.1-umbra-core` | Shield/unshield works |
| 2 | `v0.2-private-send` | End-to-end private payment works |
| 3 | `v0.3-portfolio` | Dashboard + compliance done |
| 4 | `v0.4-cloak-magicblock` | All 3 privacy routes working |
| 5 | `v0.5-growth` | Torque + PUSD + Ika attempt |
| 6 | `v0.6-polish` | Demo-ready |
| 7 | `v1.0-submission` | All submitted |
