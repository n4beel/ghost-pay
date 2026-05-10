# Ghost Pay — Design Brief

## Design Philosophy

**One sentence:** Minimal, cold, and precise — like a surveillance camera that works for you instead of against you.

Ghost Pay should feel like the UI was designed by a quant trading desk, not a startup. Every element earns its place. Nothing decorates. Privacy is the product, and the visual language communicates that without saying it.

Reference points:
- **Vercel dashboard** — information density without clutter
- **Phantom wallet** — dark, crypto-native, confident
- **Linear** — fast, purposeful, no fluff
- **Bloomberg Terminal** — data-first, monospace, earned trust
- **NOT:** shadcn defaults, rounded-everything, gradient buttons, hero animations

---

## Color System

```
Background layers (no pure black — pure black feels cheap):
  --bg-base:      #0A0A0A   ← page background
  --bg-surface:   #111111   ← cards, panels
  --bg-elevated:  #181818   ← modals, dropdowns, hover states
  --bg-overlay:   #1F1F1F   ← tooltips, popovers

Borders (barely visible — presence felt, not seen):
  --border-subtle:  #1E1E1E
  --border-default: #2A2A2A
  --border-strong:  #383838

Text:
  --text-primary:   #EBEBEB   ← headings, key values
  --text-secondary: #888888   ← labels, metadata
  --text-tertiary:  #444444   ← placeholders, disabled
  --text-inverse:   #0A0A0A   ← text on light surfaces

Accent — "Ghost Cyan" (privacy, stealth, clarity):
  --accent:         #00E5CC   ← primary action, live indicators
  --accent-dim:     #00E5CC1A ← accent backgrounds, subtle highlight
  --accent-glow:    0 0 20px #00E5CC33

Status:
  --success:  #1DB954   ← confirmed, shielded, claimed
  --warning:  #F5A623   ← pending, unconfirmed
  --danger:   #E53E3E   ← error, insufficient balance
  --privacy:  #7B5EA7   ← specifically for "private" indicators (purple = encrypted)
```

---

## Typography

**No Google Fonts.** Use system-native or self-hosted only — no external font calls leaking to Google.

```css
/* Display / UI text */
font-family: "Geist", "Inter", system-ui, -apple-system, sans-serif;

/* Addresses, amounts, hashes, keys */
font-family: "Geist Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace;
```

**Type scale:**
```
Display:   32px / weight 600 / tracking -0.02em
Heading:   20px / weight 500 / tracking -0.01em
Body:      14px / weight 400 / tracking 0
Label:     12px / weight 500 / tracking 0.04em / uppercase
Mono:      13px / weight 400 (for addresses/amounts)
Micro:     11px / weight 400 / tracking 0.02em (metadata, timestamps)
```

---

## Spacing & Layout

- 8px base grid — all spacing in multiples of 4 or 8
- Max content width: 1100px, centered
- Sidebar: 220px fixed (desktop), hidden on mobile
- Cards: no border-radius on main containers (0px or 2px max)
  - Exception: pill badges — 999px radius
  - Exception: small input fields — 4px radius
- Page padding: 24px (desktop), 16px (mobile)

**Density:** Medium. Not as dense as Bloomberg, not as airy as a marketing site. Show meaningful data without scrolling.

---

## Component Patterns

### Cards / Panels
```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: 0;           /* NO rounded corners on panels */
padding: 20px 24px;
```
No box-shadow. Borders define space, not shadows.

### Primary Button (one per page max)
```css
background: var(--accent);
color: var(--text-inverse);
border-radius: 2px;
padding: 10px 20px;
font: 13px/1 "Geist", sans-serif;
font-weight: 500;
letter-spacing: 0.02em;
text-transform: uppercase;

/* No gradient. No shadow. Hover = opacity 0.88. */
transition: opacity 120ms ease;
```

### Ghost Button (secondary actions)
```css
background: transparent;
border: 1px solid var(--border-default);
color: var(--text-secondary);
border-radius: 2px;
/* Hover: border-color → var(--border-strong), color → var(--text-primary) */
```

### Input Fields
```css
background: var(--bg-base);
border: 1px solid var(--border-default);
border-radius: 4px;
color: var(--text-primary);
font-size: 14px;
padding: 10px 12px;

/* Focus: border-color → var(--accent), no box-shadow ring */
/* Error: border-color → var(--danger) */
```

For wallet address / .sol inputs — use monospace font, slightly larger (15px).

### Amount Display
Large numbers should feel **weighty**:
```
font: 600 36px "Geist", sans-serif;
letter-spacing: -0.03em;
color: var(--text-primary);
```
Token symbol next to it: smaller, secondary color, monospace.

### Privacy Badge
```css
/* Inline pill showing "Private" status */
display: inline-flex;
align-items: center;
gap: 4px;
padding: 2px 8px;
border-radius: 999px;
background: #7B5EA71A;       /* --privacy at 10% opacity */
border: 1px solid #7B5EA740;
color: #A07EC8;
font-size: 11px;
font-weight: 500;
letter-spacing: 0.04em;
text-transform: uppercase;
```

### Transaction Row
```
[Icon] [Label / .sol name]    [amount]  [status badge]  [timestamp]
  16px   14px primary           mono     pill            micro
```
Row hover: `background: var(--bg-elevated)`. No border between rows — rely on 8px padding and subtle hover.

### ZK Proof Loading State
This is a distinctive Ghost Pay moment (2–8 seconds while the ZK proof generates). Make it feel intentional:
```
A small animated "radar sweep" icon (CSS-only, no library)
Text below: "Generating proof..." in secondary color
Then: "Broadcasting..." 
Then: green checkmark
```
Do NOT use a spinner. Use a pulse or scan animation that references "stealth" visually.

---

## Layout: Key Pages

### Dashboard
```
┌─ Sidebar ──────────┐  ┌─ Main ─────────────────────────────────┐
│                    │  │  ┌─────────────────┐  ┌──────────────┐ │
│  ◎  Ghost Pay      │  │  │  Private Balance │  │ Public Bal.  │ │
│                    │  │  │  ████████████   │  │  $1,204.00   │ │
│  Dashboard         │  │  │  [HIDDEN]   🔒  │  │  USDC + wSOL │ │
│  Send              │  │  │  [Reveal]       │  └──────────────┘ │
│  Receive           │  │  └─────────────────┘                   │
│  Payroll           │  │                                        │
│  History           │  │  Recent Activity (Dune SIM)            │
│  Compliance        │  │  ─────────────────────────────────     │
│  Rewards           │  │  → Shielded   0.5 USDC  •  2m ago     │
│                    │  │  ← Received   [PRIVATE] •  1h ago      │
│  ─────────────     │  │  → Sent       [PRIVATE] •  3h ago      │
│  Connected:        │  │                                        │
│  abc...xyz.sol     │  │  Portfolio (Covalent)                  │
│                    │  │  USDC  ████████████  $800  66%         │
└────────────────────┘  │  PUSD  ████          $300  25%         │
                        │  SOL   ██            $104   9%         │
                        └────────────────────────────────────────┘
```

### Send Page
```
┌─────────────────────────────────────────────────┐
│  Send Private Payment                           │
│                                                 │
│  To                                             │
│  ┌─────────────────────────────────────────┐   │
│  │  alice.sol                          ✓   │   │
│  └─────────────────────────────────────────┘   │
│  Resolved: 7xKq...m9Rd                         │
│                                                 │
│  Amount                                         │
│  ┌───────────────────────┐  ┌──────────────┐   │
│  │  100                  │  │  USDC ▾      │   │
│  └───────────────────────┘  └──────────────┘   │
│                                                 │
│  Route                                          │
│  ● Umbra (ZK Mixer)      — Fully unlinkable     │
│  ○ MagicBlock (PER)      — Enterprise TEE       │
│                                                 │
│  [SEND PRIVATELY ↗]                             │
│                                                 │
│  🔒 Private   Amount hidden · Sender anonymous  │
└─────────────────────────────────────────────────┘
```

---

## Micro-interactions

- **Input focus:** Border transitions to accent cyan, 120ms ease. No glow ring.
- **Button click:** Scale 0.97 for 100ms, then back. No ripple.
- **Row hover:** Background transitions 80ms. Instant feel.
- **Balance reveal:** Blur filter removes (1.2s ease-out). Not a flash — a slow de-fog.
- **Success state:** Row slides in from right, 200ms. Green dot pulses once. Done.
- **Error toast:** Appears bottom-right, slides up 160ms. Auto-dismisses at 4s.

---

## What to Avoid

- ❌ `rounded-xl` or `rounded-2xl` on cards
- ❌ Gradient text (`bg-clip-text`)
- ❌ Purple-to-pink gradients on buttons
- ❌ Glassmorphism on everything (use sparingly: modal backdrops only)
- ❌ Bounce animations, floating elements, parallax
- ❌ Emojis in the UI (except the lock icon — that one earns its place)
- ❌ Hero sections with animated blobs
- ❌ "Made with ❤️" footers
- ❌ shadcn `<Card>` with its default rounded-lg shadow look

---

## Implementation: No shadcn

Use **Radix UI primitives** (unstyled) for accessible components + raw Tailwind for styling:

```bash
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-select
npm install @radix-ui/react-tabs
npm install @radix-ui/react-toast
```

No component library. Write your own `<Button>`, `<Input>`, `<Badge>`, `<Panel>`. 
Each component is ≤50 lines. None of them have "AI generated" in their DNA.

**Tailwind config additions:**
```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      "ghost-bg":      "#0A0A0A",
      "ghost-surface": "#111111",
      "ghost-border":  "#2A2A2A",
      "ghost-accent":  "#00E5CC",
      "ghost-privacy": "#7B5EA7",
    },
    fontFamily: {
      sans: ["Geist", "Inter", "system-ui"],
      mono: ["Geist Mono", "JetBrains Mono", "ui-monospace"],
    },
    borderRadius: {
      DEFAULT: "2px",   // override shadcn defaults
    },
  },
}
```

---

## Fonts Setup (no external requests)

```bash
npm install geist
```

```typescript
// app/layout.tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export default function RootLayout({ children }) {
  return (
    <html className={`${GeistSans.variable} ${GeistMono.variable}`}>
      ...
    </html>
  );
}
```

Geist is Vercel's open-source font. Self-hosted, zero external requests, professional, not overused yet in crypto.

---

## The "Ghost" Visual Identity

One recurring motif throughout the UI: **the hidden value**.

Anywhere there's a private balance, amount, or address:
- Show `████████` (literal block characters) by default
- Add a small eye-slash icon to the right
- On hover: show `[Reveal]` text in accent color
- On click: blur-filter fades out revealing the number

This pattern — the redacted value — becomes Ghost Pay's signature visual. It communicates privacy without explaining it.
