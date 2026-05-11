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
- [x] **PUSD mint address** — `CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s`
- [x] **RPC Fast Mainnet RPC key** — set in `frontend/.env.local` and `backend/.env`

### Project Bootstrap
- [x] `frontend/` — Next.js 16 + Tailwind v4
- [x] `backend/` — NestJS 11 strict
- [x] All SDK packages installed
- [x] Design system + layout complete
- [x] All API proxy routes created
- [x] Initial commits pushed to GitHub

---

## PHASE 1 — Foundation ✅ COMPLETE

- [x] Wallet integration (Phantom, Solflare, Backpack)
- [x] Umbra client + ZK provers + registration flow
- [x] Private send / receive / shield / unshield
- [x] SNS resolution (forward + reverse)
- [x] All pages scaffolded with navigation
- [x] Full UI component library

---

## PHASE 2 — Live Data + Real Flows ✅ COMPLETE

- [x] Real encrypted balance (Umbra)
- [x] Real public portfolio (Dune SIM + Covalent pricing)
- [x] Shield / Unshield modals wired
- [x] Pay link page (`/pay/[address]`)
- [x] Claim All with elapsed timer
- [x] History page

---

## PHASE 3 — Compliance + Cloak Payroll ✅ COMPLETE

### Compliance
- [x] `lib/umbra/compliance.ts` — `issueComplianceGrant()` with X25519 key exchange + `assertX25519PublicKey` / `assertRcEncryptionNonce`
- [x] Active grants list with revoke buttons (localStorage persistence)
- [-] Scope selector (Full/Yearly/Monthly) — skipped, basic grant sufficient for track

### Cloak Payroll
- [x] `lib/cloak/payroll.ts` — one `transact()` deposit + `partialWithdraw()` chain per recipient
- [x] `lib/buffer-polyfill.ts` — patches both compiled Buffer and npm Buffer@6 for BigInt methods
- [x] `instrumentation-client.ts` — polyfill applied at boot
- [x] Payroll page: CSV drag-and-drop → SNS resolve → preview → batch send → results
- [x] 409 conflict (already-claimed UTXOs) silently swallowed in receive.ts
- [x] Claim All elapsed timer on dashboard + receive page

---

## PHASE 4 — MagicBlock PER + Torque ✅ COMPLETE

### MagicBlock PER
- [x] `lib/magicblock/client.ts` — challenge → signMessage → login → transfer (mock mode)
- [x] MagicBlock proxy (`/api/magicblock/[...route]`) with query string forwarding
- [x] MagicBlock route wired in `/send` — uses `signMessage` from `useWallet()`
- [-] `hooks/useMagicBlock.ts` — not needed, flow implemented inline

### Torque Events + Incentive
- [x] `lib/torque/events.ts` — `trackEvent()` fire-and-forget, correct payload format (`userPubkey`, `eventName`, `timestamp`, `data`)
- [x] Events fired: `private_payment_sent`, `shield_completed`, `claim_completed`, `payroll_executed`, `compliance_grant_issued`
- [x] Correct ingest URL: `https://ingest.torque.so/events` with `x-api-key` header (discovered via Torque MCP)
- [x] Incentive created: **Ghost Pay Weekly Payment Leaderboard** (ID: `cmp0upf32031kk01hxee3x927`)
- [x] Leaderboard endpoint wired in rewards page (eval-results, project `cmozo5pxf0266k01hc7zscq54`)
- [x] Claim link shown for top-3 wallet if connected

### Ika MPC
- [-] Skipped — pre-alpha, no SDK available in npm

---

## PHASE 5 — Polish ✅ COMPLETE (essentials)

- [x] Basic error handling + toasts on all flows
- [x] Loading skeletons on dashboard
- [x] ZK proof spinner (radar animation)
- [x] NotConnectedView on all pages
- [-] Mobile sidebar collapse — skipped (desktop-first demo)
- [-] Full mobile responsiveness — skipped

### Landing Page
- [ ] Add SDK logos row (Umbra, Cloak, MagicBlock, Torque, RPC Fast, Dune, SNS, Covalent)
- [ ] Add PUSD + Pakistani builder tagline

---

## PHASE 6 — README + Deploy + Submissions 🔴 TODO

### README.md
- [ ] Track integrations table (each SDK → what we built)
- [ ] Build instructions
- [ ] Screenshots / GIFs

### Deploy
- [ ] Push final code to GitHub
- [ ] `vercel --prod` deploy
- [ ] Test deployed URL end-to-end

### Demo Video (max 5 min)
- [ ] Record screen: landing → connect → register → shield → send → claim → payroll → compliance → rewards → MagicBlock route
- [ ] Upload to YouTube/Loom

### Colosseum + Superteam Submissions (May 12, before 11:59 UTC)
- [ ] Colosseum Frontier project page created + filled
- [ ] **Umbra** — $10,000
- [ ] **Cloak** — $5,010
- [ ] **MagicBlock** — $5,000
- [ ] **Torque** — $3,000
- [ ] **Dune** — $6,000
- [ ] **SNS** — $5,000
- [ ] **Covalent** — $3,000
- [ ] **RPC Fast** — $10,000 credits
- [ ] **Palm USD** — $10,000
- [ ] **100xDevs** — $10,000
- [ ] **KAST Pakistan** — $5,000
- [ ] **Encrypt & Ika** — $15,000 (placeholder UI + README note)
- [ ] **theMiracle** — $10,000 (write wallet placement benefit doc, ~2h)
- [ ] X post tagging all sponsors
