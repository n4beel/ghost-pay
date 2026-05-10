# Ghost Pay — Master Task List

Status legend: `[ ]` todo · `[x]` done · `[-]` skipped · `[~]` in progress

---

## PHASE 0 — Pre-build Setup (Do before Day 1)

### Accounts & API Keys
- [ ] Request RPC Fast hackathon plan → https://t.me/+SpMbJTPTakAxNjdi
- [ ] Create Dune SIM account → https://sim.dune.com → get `SIM_API_KEY`
- [ ] Create Covalent GoldRush account → https://goldrush.dev → get `COVALENT_API_KEY`
- [ ] Create Torque account → https://torque.so → get `TORQUE_API_KEY`
- [ ] Check Umbra devnet access → https://docs.umbraprivacy.com (faucet/devnet token info)
- [ ] Get PUSD mint address from Palm USD Discord or hackathon resources
- [ ] Create GitHub repo: `ghost-pay` (public)
- [ ] Follow @rpcfast on X (required for RPC Fast submission)
- [ ] Join RPC Fast Telegram: https://t.me/+SpMbJTPTakAxNjdi (required for submission)

### Project Bootstrap
- [ ] `npx create-next-app@latest ghost-pay --typescript --tailwind --app --no-src-dir`
- [ ] Delete default shadcn setup if present
- [ ] Install core dependencies:
  ```
  npm install geist
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  npm install @radix-ui/react-tooltip @radix-ui/react-select
  npm install @radix-ui/react-tabs @radix-ui/react-toast
  npm install @umbra-privacy/sdk @umbra-privacy/web-zk-prover
  npm install @cloak.dev/sdk
  npm install @bonfida/spl-name-service
  npm install @solana/web3.js
  npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
  npm install @solana/wallet-adapter-wallets @solana/wallet-adapter-base
  npm install @covalenthq/client-sdk
  pnpm add @ika.xyz/sdk   # stretch only
  ```
- [ ] Configure `tailwind.config.ts` with ghost-pay design tokens (see DESIGN_BRIEF.md)
- [ ] Set up `app/globals.css` with CSS variables from DESIGN_BRIEF.md
- [ ] Set up `app/layout.tsx` with GeistSans + GeistMono fonts
- [ ] Create `.env.local` from `.env.example`
- [ ] Create `.env.example` with all required keys listed (no values)
- [ ] Initial commit: `chore: bootstrap ghost-pay`

---

## PHASE 1 — Foundation (Day 1, May 6)

### Wallet Integration
- [ ] Create `components/providers/WalletProvider.tsx` — wrap app with `@solana/wallet-adapter-react`
- [ ] Support wallets: Phantom, Solflare, Backpack
- [ ] Create `components/ui/ConnectButton.tsx` — custom styled (no wallet-adapter default CSS)
- [ ] Show truncated address + `.sol` name when connected (reverse SNS lookup)
- [ ] Show wallet in sidebar with disconnect option

### Umbra Client Setup
- [ ] Create `lib/umbra/client.ts` — `getUmbraClient()` factory with RPC Fast endpoint
- [ ] Create `lib/umbra/relayer.ts` — `getUmbraRelayer()` pointing to official relayer
- [ ] Create `lib/umbra/prover.ts` — ZK prover initialization
- [ ] Create `lib/umbra/registration.ts` — `registerUser()` wrapper (idempotent 3-step)
- [ ] Create `hooks/useUmbra.ts` — React hook exposing client, registration state

### Umbra Registration Flow
- [ ] On wallet connect → check if user is registered
- [ ] If not → show registration modal with step indicator (1/3, 2/3, 3/3)
- [ ] Handle registration errors gracefully (retry button)
- [ ] Persist registration state to localStorage (avoid re-checking on every load)

### Shield / Unshield
- [ ] Create `lib/umbra/shield.ts` — `shieldTokens(mint, amount)` wrapper
- [ ] Create `lib/umbra/unshield.ts` — `unshieldTokens(mint, amount)` wrapper
- [ ] Create `components/ShieldModal.tsx` — token picker + amount input + confirm
- [ ] Create `components/UnshieldModal.tsx` — amount input + destination address
- [ ] Wire Shield/Unshield buttons to dashboard

### RPC Fast
- [ ] Set `NEXT_PUBLIC_RPC_ENDPOINT` in `.env.local` to RPC Fast URL
- [ ] Verify all SDK connections use this endpoint

### Layout & Navigation
- [ ] Create `components/layout/Sidebar.tsx` — navigation links, wallet display
- [ ] Create `components/layout/PageShell.tsx` — sidebar + main content wrapper
- [ ] Create `app/dashboard/page.tsx` — placeholder with balance cards
- [ ] Create `app/send/page.tsx` — placeholder
- [ ] Create `app/receive/page.tsx` — placeholder
- [ ] Create `app/payroll/page.tsx` — placeholder
- [ ] Create `app/history/page.tsx` — placeholder
- [ ] Create `app/compliance/page.tsx` — placeholder
- [ ] Create `app/rewards/page.tsx` — placeholder

### Base UI Components (no shadcn)
- [ ] `components/ui/Button.tsx` — primary + ghost variants (see DESIGN_BRIEF.md)
- [ ] `components/ui/Input.tsx` — base input, error state, mono variant
- [ ] `components/ui/Badge.tsx` — status pill (private, pending, confirmed)
- [ ] `components/ui/Panel.tsx` — surface card with border, no border-radius
- [ ] `components/ui/Spinner.tsx` — NOT a spinner: radar-sweep animation for ZK proofs
- [ ] `components/ui/RedactedValue.tsx` — `████████` with reveal-on-click (signature UI)
- [ ] `components/ui/Toast.tsx` — bottom-right toast via Radix

**Day 1 done when:** Connect Phantom → Umbra registration completes → Shield 0.1 devnet USDC → encrypted balance shows in dashboard (redacted by default)

---

## PHASE 2 — Private Send + Identity (Day 2, May 7)

### SNS Integration
- [ ] Create `lib/sns.ts` — `resolveDomain(name)`, `reverseLookup(pubkey)` wrappers
- [ ] Add error handling for unregistered domains
- [ ] Cache resolved addresses in memory for session duration

### Send Page
- [ ] Create `components/send/RecipientInput.tsx`
  - [ ] Accepts `.sol` name or raw address
  - [ ] Debounce 300ms then call `resolveDomain()`
  - [ ] Show green checkmark + resolved address on success
  - [ ] Show "Domain not found" error on failure
  - [ ] Mono font for address display
- [ ] Create `components/send/AmountInput.tsx`
  - [ ] Token selector dropdown (USDC, PUSD, wSOL)
  - [ ] Show available private balance for selected token
  - [ ] "Max" button
- [ ] Create `components/send/RouteSelector.tsx`
  - [ ] Option A: Umbra ZK Mixer (fully unlinkable)
  - [ ] Option B: MagicBlock PER (Enterprise TEE)
  - [ ] Visual difference: privacy badge colors differ per route
- [ ] Wire up `/send` page with all components

### Umbra Private Send
- [ ] Create `lib/umbra/send.ts` — `sendPrivate(recipient, mint, amount)` wrapper
  - [ ] Uses `getPublicBalanceToReceiverClaimableUtxoCreatorFunction`
  - [ ] Accepts resolved PublicKey from SNS
- [ ] Create `lib/umbra/receive.ts`
  - [ ] `scanForUtxos(treeIndex, startIndex)` — calls UTXO scanner
  - [ ] `claimUtxo(utxo)` — claims to encrypted balance
- [ ] Create ZK proof loading state (radar animation, "Generating proof..." text)
- [ ] Show transaction signature on success + link to Solana explorer

### Receive Page
- [ ] Display user's Umbra receiver address (for direct UTXO sends)
- [ ] QR code of receiver address (use `qrcode.react`)
- [ ] Display user's `.sol` name prominently if they have one
- [ ] "Share payment link" button — `ghost-pay.vercel.app/pay/[address]`
- [ ] Create `/pay/[address]/page.tsx` — public page where anyone can send to this address

### Pending Claims
- [ ] Create `components/dashboard/PendingClaims.tsx`
  - [ ] Poll Umbra indexer every 30s for new UTXOs
  - [ ] Show count badge: "3 pending claims"
  - [ ] One-click "Claim All" button
  - [ ] Individual claim buttons per UTXO
- [ ] Auto-trigger scan on page load

**Day 2 done when:** Wallet A sends 0.1 USDC to `wallet-b.sol` privately → Wallet B dashboard shows pending claim → Wallet B claims → encrypted balance increases

---

## PHASE 3 — Portfolio + Compliance (Day 3, May 8)

### Dune SIM Integration
- [ ] Create `app/api/portfolio/route.ts`
  - [ ] Fetch Solana token balances: `GET /v1/solana/balances/{wallet}`
  - [ ] Fetch activity feed: `GET /v1/solana/activities/{wallet}?limit=20`
  - [ ] Return merged JSON response
- [ ] Cache response for 30s (use Next.js `revalidate`)

### Covalent GoldRush Integration
- [ ] Create `app/api/pricing/route.ts`
  - [ ] `client.BalanceService.getTokenBalancesForWalletAddress("solana-mainnet", wallet)`
  - [ ] Extract USD values per token
  - [ ] Return total portfolio USD value

### Dashboard — Full Build
- [ ] Create `components/dashboard/PrivateBalanceCard.tsx`
  - [ ] Shows encrypted balance (redacted by default)
  - [ ] Reveal button → decrypt using Umbra encrypted balance querier
  - [ ] Per-token breakdown (USDC, PUSD, wSOL)
- [ ] Create `components/dashboard/PublicBalanceCard.tsx`
  - [ ] Data from Dune SIM
  - [ ] USD value from Covalent
- [ ] Create `components/dashboard/PortfolioBar.tsx`
  - [ ] Horizontal bar chart (pure CSS, no chart library)
  - [ ] Shows token allocation by USD value
- [ ] Create `components/dashboard/ActivityFeed.tsx`
  - [ ] Last 10 transactions from Dune SIM activities endpoint
  - [ ] Private txs shown as "Private Transfer [REDACTED]"
  - [ ] Public txs shown with amounts

### History Page
- [ ] Create `app/history/page.tsx`
  - [ ] Full activity list (Dune SIM, paginated)
  - [ ] Filter: All / Private / Public
  - [ ] Private entries show redacted amounts by default with reveal

### Compliance Page
- [ ] Create `lib/umbra/compliance.ts`
  - [ ] `issueComplianceGrant(grantee, scope)` — calls Umbra grant issuer
  - [ ] `generateViewingKey()` — derives and returns scoped viewing key string
  - [ ] `revokeGrant(grantee)` — revocation
- [ ] Create `app/compliance/page.tsx`
  - [ ] Generate viewing key button → shows key as copyable mono string
  - [ ] Scope selector: Full history / Yearly / Monthly / Daily
  - [ ] "Share with auditor" — copies formatted key + instructions
  - [ ] Active grants list with revoke buttons
  - [ ] Explainer: "Your auditor can decrypt only the scope you grant"

**Day 3 done when:** Dashboard shows real Dune SIM balance data + USD values from Covalent + private balance card with reveal + compliance page generates a viewing key

---

## PHASE 4 — Cloak Payroll + MagicBlock PER (Day 4, May 9)

### Cloak — Payroll Feature
- [ ] Create `lib/cloak/client.ts` — connection + config setup
- [ ] Create `lib/cloak/payroll.ts`
  - [ ] `batchSend(recipients: {address, amount, mint}[])` wrapper
  - [ ] Uses `generateUtxoKeypair`, `createZeroUtxo`, `createUtxo`, `transact`
  - [ ] Pre-resolves all `.sol` names via SNS before calling Cloak
- [ ] Create `app/payroll/page.tsx`
  - [ ] CSV drag-and-drop upload zone (no library — use native File API)
  - [ ] Parse CSV: columns `name, wallet_or_sol_name, amount, token`
  - [ ] Preview table: show all recipients before sending
  - [ ] SNS resolution status per row (resolving... / resolved / not found)
  - [ ] Total amount summary
  - [ ] "Send Payroll" button → Cloak batch transact
  - [ ] Success screen: list all recipients with tx signatures
- [ ] Handle Cloak mainnet-only constraint: show clear note in UI

### MagicBlock PER — Enterprise Route
- [ ] Create `lib/magicblock/client.ts`
  - [ ] `getChallenge()` — GET /v1/spl/challenge
  - [ ] `login(challenge, signature, publicKey)` — POST /v1/spl/login → returns token
  - [ ] `getPrivateBalance(token, mint)` — GET /v1/spl/private-balance
  - [ ] `privateTransfer(token, recipient, mint, amount)` — POST /v1/spl/transfer
  - [ ] `deposit(token, mint, amount)` — POST /v1/spl/deposit
  - [ ] `withdraw(token, mint, amount)` — POST /v1/spl/withdraw
- [ ] Create `app/api/magicblock/[...route]/route.ts`
  - [ ] Proxy all MagicBlock calls server-side (bearer token never hits client)
  - [ ] Auth session stored in HTTP-only cookie
- [ ] Create `hooks/useMagicBlock.ts` — auth state, token management
- [ ] Wire "MagicBlock PER" route option in `/send` page
  - [ ] On selection → trigger auth flow (sign challenge) if not already authed
  - [ ] Show TEE badge: "Hardware-secured · Intel TDX"
  - [ ] On send → POST /api/magicblock/transfer

**Day 4 done when:** CSV with 2 recipients → Cloak batch send executes on mainnet. MagicBlock PER route works in `/send` page.

---

## PHASE 5 — Torque + PUSD + Ika (Day 5, May 10)

### Torque — Growth Mechanics
- [ ] Create `lib/torque/events.ts`
  - [ ] `trackEvent(userWallet, eventName, metadata)` — POST to Torque API
  - [ ] Events to fire:
    - `private_payment_sent` (on every Umbra/Cloak send)
    - `shield_completed` (on every shield)
    - `payroll_executed` (on every Cloak batch)
    - `claim_completed` (on every UTXO claim)
- [ ] Add event calls to all send/shield/claim flows
- [ ] Set up Torque campaign in dashboard:
  - [ ] Leaderboard: "Top private senders this week"
  - [ ] Metric: `private_payment_sent` event count
- [ ] Create `app/api/torque/leaderboard/route.ts` — fetch leaderboard from Torque API
- [ ] Create `app/rewards/page.tsx`
  - [ ] Leaderboard table (rank, .sol name or truncated address, count)
  - [ ] User's own rank highlighted
  - [ ] Referral link: `ghost-pay.vercel.app/?ref=[wallet]`
  - [ ] "Copy referral link" button

### PUSD — Palm USD Support
- [ ] Add PUSD mint to `lib/tokens.ts` token registry
- [ ] Add PUSD to Umbra shield flow token selector
- [ ] Add PUSD to send flow token selector
- [ ] Show PUSD balance in dashboard
- [ ] Note mainnet-only in UI if devnet not available

### Ika MPC — Cross-Chain (Stretch)
- [ ] Attempt `pnpm add @ika.xyz/sdk` — check if installable
- [ ] Read Ika docs at https://docs.ika.xyz for Solana pre-alpha API
- [ ] If accessible:
  - [ ] Create `lib/ika/client.ts` — dWallet creation
  - [ ] Create UI: "Cross-Chain Wallet" section in dashboard
  - [ ] Create dWallet → show cross-chain addresses (BTC, ETH, SOL)
- [ ] If blocked:
  - [ ] Add placeholder UI: "Cross-chain transfers powered by Ika — Coming soon"
  - [ ] Note Ika integration in README regardless (shows intent for Encrypt & Ika track)

**Day 5 done when:** Payment fires Torque event. PUSD appears in token selectors. Ika attempted.

---

## PHASE 6 — Polish + Demo Prep (Day 6, May 11)

### Error Handling
- [ ] Umbra: ZK proof failure → retry button + error toast
- [ ] Umbra: Insufficient balance → clear message
- [ ] SNS: Domain not found → inline error
- [ ] MagicBlock: Auth expired → re-trigger login silently
- [ ] RPC errors → "Network issue, please try again" toast
- [ ] Cloak: Mainnet tx failure → show error + link to explorer

### Loading States
- [ ] ZK proof: radar animation + "Generating zero-knowledge proof..." (2-8s)
- [ ] UTXO scan: subtle pulse on "Checking for payments..."
- [ ] Portfolio data: skeleton screens (CSS shimmer, no library)
- [ ] SNS resolution: spinner next to input during lookup

### Landing Page (`app/page.tsx`)
- [ ] Hero: "Pay anyone. Reveal nothing."
- [ ] 3 feature rows: Private Payments / Payroll / Compliance
- [ ] "Launch App" CTA → /dashboard
- [ ] Tagline about PUSD support ("First private app for Shariah-compliant stablecoins")
- [ ] No animations, no blobs — static, confident

### Mobile Responsiveness
- [ ] Sidebar collapses to bottom nav on mobile
- [ ] All forms usable on 390px width
- [ ] Dashboard cards stack vertically on mobile

### README.md
- [ ] Write complete README using template from SUBMISSION_CHECKLIST.md
- [ ] Include all SDK integrations table
- [ ] Include program IDs
- [ ] Include build + run instructions
- [ ] Include screenshots (take after polish)

### Demo Video (max 5 minutes)
Script:
1. Open app → landing page (30s)
2. Connect Phantom wallet (20s)
3. Umbra registration (30s) — show the 3 steps
4. Shield 1 USDC → show encrypted balance card (30s)
5. Send to `.sol` name → show ZK proof radar animation → success (45s)
6. Switch wallet → claim incoming UTXO (30s)
7. Show portfolio dashboard with Dune SIM data (20s)
8. Show payroll page: upload CSV → batch send (45s)
9. Show compliance page: generate viewing key (20s)
10. Show rewards leaderboard (20s)
11. Show MagicBlock enterprise route (15s)
Total: ~5 minutes

**Day 6 done when:** App is demo-ready with no crashes on golden path. README complete. Video recorded.

---

## PHASE 7 — Submissions (Day 7, May 12)

### Deploy
- [ ] Push final code to GitHub
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Test deployed URL end-to-end (Phantom on mainnet if applicable)
- [ ] Verify all API keys work in production (Vercel env vars set)

### Colosseum Submission
- [ ] Create project on Colosseum Frontier portal
- [ ] Fill all required fields
- [ ] Save Colosseum project URL

### Superteam Earn Submissions (in prize order)
- [ ] **Encrypt & Ika** — $15,000 → Submit by 11:59 UTC
- [ ] **Umbra** — $10,000 → Submit by 11:59 UTC
- [ ] **Palm USD** — $10,000 → Submit by 11:59 UTC
- [ ] **100xDevs** — $10,000 → Submit by 11:59 UTC
- [ ] **RPC Fast** — $10,000 credits → Submit by 11:59 UTC
- [ ] **theMiracle** — $10,000 → Write benefit design + submit
- [ ] **Dune** — $6,000 → Submit by 11:59 UTC
- [ ] **SNS** — $5,000 → Submit by 11:59 UTC
- [ ] **KAST Pakistan** — $5,000 → Submit by 11:59 UTC
- [ ] **MagicBlock** — $5,000 → Submit by 11:59 UTC
- [ ] **Cloak** — $5,010 → Submit by 11:59 UTC
- [ ] **Torque** — $3,000 → Submit by 11:59 UTC
- [ ] **Covalent** — $3,000 → Submit by 11:59 UTC

### Social
- [ ] Post to X (use template from SUBMISSION_CHECKLIST.md)
- [ ] Tag all relevant sponsors in the post
- [ ] Post to any relevant Telegram groups

---

## Ongoing / Any Time

- [ ] Keep GitHub commits clean and frequent (judges look at commit history)
- [ ] Every evening: push code + update this TASKS.md with `[x]` completions
- [ ] If blocked on an SDK: open issue on its GitHub, ask in their Telegram/Discord
- [ ] Do not add new features after Day 5 — polish only
