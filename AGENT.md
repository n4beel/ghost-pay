# AGENT.md — Ghost Pay

Read this first before touching any code or making any plan. It tells you what this project is, where everything lives, what conventions to follow, and what not to break.

---

## What This Project Is

**Ghost Pay** is a privacy-first payment platform on Solana built for the Colosseum Frontier Hackathon (deadline: May 12, 2026). It lets users send and receive tokens with cryptographic privacy — amounts hidden, sender/receiver unlinkable — using `.sol` names as payment addresses.

It targets 13 hackathon prize tracks simultaneously. See `SUBMISSION_CHECKLIST.md` for per-track requirements.

**Solo builder, Pakistani, backend+blockchain+AI background.**

---

## Planning Docs (read these before writing code)

All planning docs live in `DOCUMENTATION/`:

| File | Purpose |
|---|---|
| `DOCUMENTATION/ARCHITECTURE.md` | System design, user flows, component diagram, env vars, supported tokens |
| `DOCUMENTATION/SDK_INTEGRATIONS.md` | Copy-paste integration code for every SDK — read this before touching any SDK |
| `DOCUMENTATION/BUILD_PLAN.md` | Day-by-day strategy and risk mitigation |
| `DOCUMENTATION/TASKS.md` | Master task list with checkboxes — the source of truth for what's done and what's next |
| `DOCUMENTATION/DESIGN_BRIEF.md` | UI/UX system — colors, typography, component patterns, what NOT to do |
| `DOCUMENTATION/SUBMISSION_CHECKLIST.md` | Per-track submission fields, demo requirements, README template |

---

## Project Structure

```
ghost-pay/                          ← repo root
├── AGENT.md                        ← this file (read first)
├── DOCUMENTATION/                  ← all planning docs
│   ├── ARCHITECTURE.md
│   ├── BUILD_PLAN.md
│   ├── DESIGN_BRIEF.md
│   ├── SDK_INTEGRATIONS.md
│   ├── SUBMISSION_CHECKLIST.md
│   └── TASKS.md
├── frontend/                       ← Next.js 16 app (main codebase)
│   ├── .env.example                ← keys template (committed)
│   ├── .env.local                  ← actual keys (never commit)
│   ├── app/
│   │   ├── layout.tsx              ← root layout, fonts
│   │   ├── page.tsx                ← landing page
│   │   ├── dashboard/page.tsx
│   │   ├── send/page.tsx
│   │   ├── receive/page.tsx
│   │   ├── payroll/page.tsx
│   │   ├── history/page.tsx
│   │   ├── compliance/page.tsx
│   │   ├── rewards/page.tsx
│   │   ├── pay/[address]/page.tsx  ← public payment link
│   │   └── api/
│   │       ├── portfolio/route.ts  ← Dune SIM proxy
│   │       ├── pricing/route.ts    ← Covalent proxy
│   │       ├── magicblock/[...route]/route.ts
│   │       └── torque/route.ts
│   ├── components/
│   │   ├── ui/                     ← base components (NO shadcn)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Panel.tsx
│   │   │   ├── Spinner.tsx         ← radar sweep, NOT a circle
│   │   │   ├── RedactedValue.tsx   ← ████████ with reveal-on-click
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageShell.tsx
│   │   ├── providers/
│   │   │   └── WalletProvider.tsx
│   │   ├── dashboard/
│   │   │   ├── PrivateBalanceCard.tsx
│   │   │   ├── PublicBalanceCard.tsx
│   │   │   ├── PortfolioBar.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── PendingClaims.tsx
│   │   ├── send/
│   │   │   ├── RecipientInput.tsx
│   │   │   ├── AmountInput.tsx
│   │   │   └── RouteSelector.tsx
│   │   ├── ShieldModal.tsx
│   │   ├── UnshieldModal.tsx
│   │   └── PayrollUploader.tsx
│   ├── lib/
│   │   ├── umbra/
│   │   │   ├── client.ts           ← getUmbraClient() factory
│   │   │   ├── relayer.ts
│   │   │   ├── prover.ts
│   │   │   ├── registration.ts
│   │   │   ├── shield.ts
│   │   │   ├── unshield.ts
│   │   │   ├── send.ts
│   │   │   ├── receive.ts
│   │   │   └── compliance.ts
│   │   ├── cloak/
│   │   │   ├── client.ts
│   │   │   └── payroll.ts
│   │   ├── magicblock/
│   │   │   └── client.ts
│   │   ├── ika/
│   │   │   └── client.ts           ← stretch goal
│   │   ├── torque/
│   │   │   └── events.ts
│   │   ├── sns.ts
│   │   ├── dune-sim.ts
│   │   ├── covalent.ts
│   │   └── tokens.ts
│   ├── hooks/
│   │   ├── useUmbra.ts
│   │   └── useMagicBlock.ts
│   └── globals.css                 ← Tailwind v4 + design tokens
├── backend/                        ← reserved for standalone services
└── programs/                       ← reserved for Solana programs
```

**Important:** This is Next.js **16** with Tailwind **v4**.
- Tailwind v4: no `tailwind.config.ts` — tokens are defined in `globals.css` via `@theme`
- Next.js 16: App Router, same conventions as v14/v15 for routing and API routes

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes for server-side SDK calls |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS | Custom config only, NO shadcn |
| UI primitives | Radix UI (unstyled) | For a11y: Dialog, Dropdown, Tooltip, Select, Tabs, Toast |
| Fonts | Geist + Geist Mono | Self-hosted via `geist` npm package |
| Wallet | `@solana/wallet-adapter-react` | Phantom, Solflare, Backpack |
| Privacy (primary) | `@umbra-privacy/sdk` | ZK proofs, encrypted balances, UTXO mixer |
| Privacy (batch) | `@cloak.dev/sdk` | Payroll/multi-recipient (mainnet only) |
| Privacy (enterprise) | MagicBlock PER REST API | TEE-backed, proxy via API routes |
| Custody (stretch) | `@ika.xyz/sdk` | Pre-alpha, attempt Day 5 |
| Identity | `@bonfida/spl-name-service` | `.sol` name resolution |
| Analytics | Dune SIM API | Balances + activity feed |
| Pricing | Covalent GoldRush | USD values, token metadata |
| Growth | Torque API | Custom events + leaderboard |
| RPC | RPC Fast | 120M CU/mo, 500 req/s |

---

## Environment Variables

```env
# Solana RPC (RPC Fast)
NEXT_PUBLIC_RPC_ENDPOINT=          # public — safe to expose
NEXT_PUBLIC_RPC_WS_ENDPOINT=       # public — WebSocket endpoint

# Umbra
UMBRA_NETWORK=devnet               # devnet | mainnet
UMBRA_INDEXER_URL=https://utxo-indexer.api-devnet.umbraprivacy.com

# MagicBlock (server-side only — never NEXT_PUBLIC_)
MAGICBLOCK_API_URL=

# Dune SIM (server-side only)
SIM_API_KEY=

# Covalent (server-side only)
COVALENT_API_KEY=

# Torque (server-side only)
TORQUE_API_KEY=

# Palm USD
NEXT_PUBLIC_PUSD_MINT=             # public — token mint address
```

**Rule:** Any key that starts without `NEXT_PUBLIC_` is server-only. Never read these in client components.

---

## Token Registry (`lib/tokens.ts`)

```typescript
export const TOKENS = {
  USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, symbol: "USDC" },
  USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, symbol: "USDT" },
  wSOL: { mint: "So11111111111111111111111111111111111111112",  decimals: 9, symbol: "wSOL" },
  PUSD: { mint: process.env.NEXT_PUBLIC_PUSD_MINT ?? "",       decimals: 6, symbol: "PUSD" },
};
```

---

## Umbra Program IDs

| Network | Program ID |
|---|---|
| Devnet | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` |
| Mainnet | `UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh` |

---

## Design Rules (enforce these — see DESIGN_BRIEF.md for full details)

- NO shadcn components. Write UI from scratch using Radix primitives.
- NO `rounded-xl` or `rounded-2xl` on panels/cards. Max `rounded-sm` (2px).
- NO gradient buttons. Primary button: solid `#00E5CC` background.
- NO box-shadow on cards. Borders define space.
- Private values ALWAYS display as `████████` by default, with a reveal mechanism.
- ZK proof loading state: radar sweep animation, NOT a spinner.
- Monospace font for all addresses, amounts, hashes, and keys.
- Color tokens are CSS variables — always use `var(--bg-surface)` etc., never hardcode hex in components.

---

## Coding Conventions

- All Umbra amounts use branded `U64` bigint: `createU64(1_000_000n)` — never plain numbers
- Server-only code lives in `app/api/` routes or `lib/` files imported only by routes
- Client components: no API keys, no server-only imports
- Async server components for data fetching where possible (no `useEffect` for initial load)
- Keep `lib/` files framework-agnostic (no React imports in `lib/`)
- Use `hooks/` for React-specific state wrapping SDK calls

---

## What's Intentionally NOT in This Project

- No database — everything on-chain or in-memory
- No auth system — wallet signature IS the auth
- No shadcn — see DESIGN_BRIEF.md
- No chart libraries — use CSS-only bar charts
- No animation libraries — CSS transitions only
- No Dum.fun integration — involves betting/gambling (excluded)
- No Jupiter Prediction Markets — same reason

---

## Hackathon Tracks Being Targeted

| Track | Prize | What to show |
|---|---|---|
| Encrypt & Ika | $15,000 | Ika dWallet or Encrypt FHE integration |
| Umbra | $10,000 | Core: registration, shield, ZK send, claim, viewing keys |
| Palm USD | $10,000 | PUSD as payment token throughout |
| 100xDevs | $10,000 | Overall quality and execution |
| RPC Fast | $10,000 credits | RPC Fast as infra provider |
| theMiracle | $10,000 | Wallet placement benefit design (marketing deliverable) |
| Dune | $6,000 | Dune SIM for portfolio analytics |
| SNS | $5,000 | .sol names as payment addresses |
| KAST Pakistan | $5,000 | Pakistani builder |
| MagicBlock | $5,000 | Enterprise PER transfer route |
| Cloak | $5,010 | Payroll batch disbursement |
| Torque | $3,000 | Growth events + leaderboard |
| Covalent | $3,000 | USD pricing + token metadata |

---

## External Resources

| Resource | URL |
|---|---|
| Umbra SDK docs | https://sdk.umbraprivacy.com |
| Umbra developer docs | https://docs.umbraprivacy.com |
| Umbra SDK llms.txt | https://sdk.umbraprivacy.com/llms.txt |
| Cloak SDK docs | https://cloak.mintlify.app |
| MagicBlock docs | https://docs.magicblock.gg |
| MagicBlock PER demo | https://github.com/magicblock-labs/private-payments-demo |
| Ika docs | https://docs.ika.xyz |
| SNS docs | https://sns.guide |
| Dune SIM docs | https://docs.sim.dune.com |
| Covalent GoldRush | https://goldrush.dev/docs |
| Torque docs | https://docs.torque.so |
| RPC Fast docs | https://docs.rpcfast.com |
| Palm USD | https://www.palmusd.com |

---

## Current Build Status

```
Phase 0 (Setup):     [~] In progress
Phase 1 (Day 1):     [ ] Not started
Phase 2 (Day 2):     [ ] Not started
Phase 3 (Day 3):     [ ] Not started
Phase 4 (Day 4):     [ ] Not started
Phase 5 (Day 5):     [ ] Not started
Phase 6 (Day 6):     [ ] Not started
Phase 7 (Day 7):     [ ] Not started
```

### Phase 0 Completed So Far
- [x] GitHub repo created: https://github.com/n4beel/ghost-pay
- [x] DOCUMENTATION/ folder with all planning docs
- [x] frontend/ bootstrapped: Next.js 16 + Tailwind v4
- [x] All npm packages installed (see frontend/package.json)
- [x] globals.css with design tokens + animations
- [x] layout.tsx with metadata + Geist fonts
- [x] .env.example created
- [x] .env.local with DUNE_SIM_API_KEY, COVALENT_API_KEY, RPC_FAST_API_KEY
- [x] Full directory scaffold: app routes, components, lib, hooks
- [x] backend/ and programs/ directories created

### Phase 0 Pending (user action required)
- [ ] RPC Fast endpoint URL — message https://t.me/+SpMbJTPTakAxNjdi, they reply with your HTTP + WS endpoints
- [ ] Torque API key — sign up at https://torque.so
- [ ] PUSD mint address — email hello@palmusd.com or check Palm USD Discord
- [ ] MagicBlock API URL — check https://docs.magicblock.gg for PER API base URL
