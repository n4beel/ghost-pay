# Ghost Pay — Master Task List

Status legend: `[ ]` todo · `[x]` done · `[-]` skipped · `[~]` in progress

---

## PHASE 0 — Pre-build Setup ✅ COMPLETE

### Accounts & API Keys
- [x] RPC Fast — Beam app key obtained, Mainnet RPC app key obtained
- [x] Dune SIM API key → `DUNE_SIM_API_KEY` set
- [x] Covalent GoldRush API key → `COVALENT_API_KEY` set
- [x] Torque API key → `TORQUE_API_KEY` set
- [x] MagicBlock API URL → `https://payments.magicblock.app`
- [x] Google AI API key → `GOOGLE_AI_API_KEY` set
- [x] GitHub repo created → https://github.com/n4beel/ghost-pay
- [x] Follow @rpcfast on X ✓
- [x] Join RPC Fast Telegram ✓
- [x] **PUSD mint address** — `CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s` (Solana mainnet SPL, 6 decimals, confirmed via palmusd.com/pages/developers.html)
- [x] **RPC Fast Mainnet RPC key** — set in `frontend/.env.local` and `backend/.env`

### Project Bootstrap
- [x] `frontend/` — Next.js 16 + Tailwind v4 via `create-next-app`
- [x] `backend/` — NestJS 11 strict via Nest CLI
- [x] `programs/` — reserved (Anchor not needed yet; uses deployed programs)
- [x] All SDK packages installed (see `frontend/package.json`)
- [x] `globals.css` — Tailwind v4 design tokens, radar animation, skeleton shimmer
- [x] `layout.tsx` — Geist fonts + Ghost Pay metadata
- [x] `frontend/.env.local` — all keys set
- [x] `frontend/.env.example` — committed as template
- [x] `backend/.env` + `backend/.env.example` — all keys set
- [x] Full directory scaffold — all app routes, components, lib, hooks created
- [x] Initial commits pushed to GitHub

---

## PHASE 1 — Foundation ✅ COMPLETE

### Infrastructure
- [x] Backend port changed to 4000 (was conflicting with Next.js on 3000)
- [x] Tailwind v4 CSS layer bug fixed — `* { margin: 0; padding: 0 }` moved to `@layer base` so spacing utilities work
- [x] Hydration error fixed — `ConnectButton` now uses mounted guard (wallet detection is client-only)
- [x] TypeScript target set to ES2022 (BigInt literal support)

### Wallet Integration
- [x] `components/providers/WalletProvider.tsx` — wrap app with `@solana/wallet-adapter-react`
- [x] Auto-detect standard wallets (Phantom, Solflare, Backpack)
- [x] `components/ui/ConnectButton.tsx` — custom styled, SNS reverse lookup, disconnect dropdown
- [x] Show truncated address + `.sol` name when connected
- [x] Wallet in sidebar with disconnect option, mounted guard for hydration

### Umbra Client Setup
- [x] `lib/umbra/client.ts` — `initUmbraClient()` factory with RPC Fast endpoint
- [x] `lib/umbra/prover.ts` — two separate ZK provers (create UTXO + claim UTXO)
- [x] `lib/umbra/registration.ts` — `registerUser()` + `isUserRegistered()` + localStorage cache
- [x] `hooks/useUmbra.ts` — React hook exposing client, registration state machine

### Umbra Registration Flow
- [x] On wallet connect → check if user is registered (with localStorage cache)
- [x] If not → show registration banner with one-click register button
- [x] Handle registration errors gracefully (error state shown)
- [x] Persist registration state to localStorage

### Private Send / Receive / Shield / Unshield
- [x] `lib/umbra/send.ts` — `sendPrivate()` ZK UTXO creation
- [x] `lib/umbra/receive.ts` — `scanAndClaimUtxos()` UTXO scanner + claimer
- [x] `lib/umbra/shield.ts` — `shieldTokens(mint, amount)` wrapper
- [x] `lib/umbra/unshield.ts` — `unshieldTokens(mint, amount)` wrapper
- [x] `lib/umbra/compliance.ts` — stubs (full X25519 key exchange in Phase 3)

### SNS
- [x] `lib/sns.ts` — `resolveSnsDomain()` + `reverseResolveSns()` wrappers

### Layout & Navigation
- [x] `components/layout/Sidebar.tsx` — navigation links, wallet display, inline styles
- [x] `components/layout/PageShell.tsx` — `h-screen` layout, scrollable main
- [x] All pages created: dashboard, send, receive, payroll, history, compliance, rewards

### Base UI Components
- [x] `components/ui/Button.tsx` — primary / ghost / danger, inline styles
- [x] `components/ui/Input.tsx` — label, error, hint, mono, suffix
- [x] `components/ui/Badge.tsx` — private / pending / confirmed / error / default
- [x] `components/ui/Panel.tsx` — surface card, elevated variant, noPadding
- [x] `components/ui/Spinner.tsx` — radar-sweep animation for ZK proofs
- [x] `components/ui/RedactedValue.tsx` — `████████` blur reveal-on-click
- [x] `components/ui/Toast.tsx` — bottom-right toast via Radix

### API Routes (proxy layer)
- [x] `app/api/portfolio/route.ts` — Dune SIM proxy (balances + activities)
- [x] `app/api/pricing/route.ts` — Covalent GoldRush proxy (USD pricing)
- [x] `app/api/torque/route.ts` — Torque leaderboard + event push proxy
- [x] `app/api/magicblock/[...route]/route.ts` — MagicBlock PER proxy

### Lib Files
- [x] `lib/tokens.ts` — USDC, USDT, wSOL, PUSD token registry

> **Build verified:** 0 TypeScript errors, 14 routes compiled, spacing + layout confirmed working

---

## PHASE 2 — Live Data + Real Flows ✅ COMPLETE

### Dashboard — Real Data
- [x] `lib/umbra/balance.ts` — `queryEncryptedBalances()` using `getEncryptedBalanceQuerierFunction`
- [x] `hooks/useEncryptedBalance.ts` — React hook wrapping the balance querier with loading/refresh
- [x] `hooks/usePortfolio.ts` — fetches Dune SIM balances + Covalent pricing, merges USD values
- [x] Dashboard wired: private balance card shows real encrypted balance (redacted by default)
- [x] Dashboard wired: public balance card shows Dune SIM token balances + USD totals
- [x] `components/dashboard/PortfolioBar.tsx` — pure CSS horizontal bar chart by token allocation
- [x] Activity feed on dashboard — last 5 txs from Dune SIM with type labels

### Shield / Unshield Modals
- [x] `components/ShieldModal.tsx` — token picker + amount + ZK proof spinner + success toast
- [x] `components/UnshieldModal.tsx` — token picker + amount + MAX button + ZK proof spinner
- [x] Both modals wired to Shield / Unshield buttons on dashboard, refresh balance on success

### Pay Link Page
- [x] `app/pay/[address]/page.tsx` — public send-to page
- [x] Resolves SNS name if passed, shows avatar initial + display name
- [x] Full send form pre-filled with recipient, no redirect needed
- [x] Shows ConnectButton if not connected; shows "register first" if not Umbra registered

### Claim All
- [x] "Claim All" button on dashboard triggers `scanAndClaimUtxos` + refreshes encrypted balance

### History Page
- [x] Rewritten to use `usePortfolio` hook (shared data, no duplicate fetch)

---

## PHASE 3 — Compliance + Cloak Payroll (Day 3, May 8)

### Compliance Page (Full)
- [ ] `lib/umbra/compliance.ts` — implement `issueComplianceGrant()` with X25519 key exchange
- [ ] Scope selector: Full / Yearly / Monthly / Daily / Mint
- [ ] Active grants list with revoke buttons
- [ ] "Copy viewing key" — formatted mono string for auditor

### Cloak — Payroll
- [ ] `lib/cloak/client.ts` — connection + config
- [ ] `lib/cloak/payroll.ts` — `batchSend(recipients[])` wrapper
- [ ] Payroll page: CSV drag-and-drop → parse → preview table → SNS resolve per row → batch send
- [ ] Success screen with tx signatures

**Phase 3 done when:** Payroll CSV → Cloak batch send executes. Compliance viewing key generated.

---

## PHASE 4 — MagicBlock PER + Torque + Ika (Day 4, May 9)

### MagicBlock PER
- [ ] `lib/magicblock/client.ts` — challenge/login/balance/transfer/deposit/withdraw
- [ ] `hooks/useMagicBlock.ts` — auth state, session cookie via API proxy
- [ ] Wire MagicBlock route in `/send` — sign challenge on selection, show TEE badge

### Torque — Events
- [ ] `lib/torque/events.ts` — `trackEvent(wallet, eventName, metadata)` POST wrapper
- [ ] Fire events: `private_payment_sent`, `shield_completed`, `payroll_executed`, `claim_completed`
- [ ] Wire into all send/shield/claim flows

### Ika MPC
- [ ] Attempt `pnpm add @ika.xyz/sdk` — check if installable
- [ ] If accessible: `lib/ika/client.ts` — dWallet creation, cross-chain addresses UI
- [ ] If blocked: placeholder UI with Ika branding + note in README

**Phase 4 done when:** MagicBlock PER route works in send. Torque events fire. Ika attempted.

---

## PHASE 5 — Polish + Error Handling (Day 5, May 10)

### Error Handling
- [ ] ZK proof failure → retry button + error toast
- [ ] Insufficient balance → clear message
- [ ] SNS domain not found → inline error (already partially done)
- [ ] MagicBlock auth expired → silent re-login
- [ ] RPC errors → "Network issue" toast
- [ ] Cloak mainnet tx failure → show error + explorer link

### Loading States
- [ ] ZK proof: radar animation (already exists), "Generating zero-knowledge proof..." text
- [ ] UTXO scan: subtle pulse
- [ ] Portfolio data: skeleton screens (CSS shimmer, already exists)

### Landing Page Polish
- [ ] Add "First private payments app supporting PUSD (Shariah-compliant)" tagline
- [ ] Add SDK logos row (Umbra, Cloak, MagicBlock, RPC Fast)

### Mobile Responsiveness
- [ ] Sidebar collapses to bottom nav on mobile (≤768px)
- [ ] All forms usable at 390px width
- [ ] Dashboard cards stack vertically on mobile

**Phase 5 done when:** App is demo-ready with no crashes on golden path.

---

## PHASE 6 — README + Demo Video + Submissions (Days 6–7, May 11–12)

### README.md
- [ ] Complete README with SDK integrations table, build instructions, screenshots
- [ ] Highlight each track integration explicitly

### Demo Video (max 5 minutes)
- [ ] Landing page (30s)
- [ ] Connect Phantom (20s)
- [ ] Umbra registration (30s)
- [ ] Shield 1 USDC → encrypted balance card (30s)
- [ ] Send to `.sol` → ZK proof radar → success (45s)
- [ ] Claim incoming UTXO (30s)
- [ ] Portfolio dashboard + Dune SIM data (20s)
- [ ] CSV payroll → Cloak batch send (45s)
- [ ] Compliance viewing key (20s)
- [ ] Rewards leaderboard (20s)
- [ ] MagicBlock enterprise route (15s)

### Deploy
- [ ] Push final code to GitHub
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Test deployed URL end-to-end

### Colosseum + Superteam Submissions (May 12, before 11:59 UTC)
- [ ] Colosseum Frontier project page created + filled
- [ ] **Encrypt & Ika** — $15,000
- [ ] **Umbra** — $10,000
- [ ] **Palm USD** — $10,000
- [ ] **100xDevs** — $10,000
- [ ] **RPC Fast** — $10,000 credits
- [ ] **theMiracle** — $10,000 (write wallet placement benefit doc)
- [ ] **Dune** — $6,000
- [ ] **SNS** — $5,000
- [ ] **KAST Pakistan** — $5,000
- [ ] **MagicBlock** — $5,000
- [ ] **Cloak** — $5,010
- [ ] **Torque** — $3,000
- [ ] **Covalent** — $3,000
- [ ] X post tagging all sponsors

---

## Ongoing / Any Time

- [ ] Keep GitHub commits clean and frequent (judges look at commit history)
- [ ] Every evening: push code + update this TASKS.md with `[x]` completions
- [ ] If blocked on an SDK: open issue on its GitHub, ask in their Telegram/Discord
- [ ] Do not add new features after Phase 5 — polish only
