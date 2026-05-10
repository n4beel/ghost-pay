# Ghost Pay — SDK Integration Reference

## 1. Umbra SDK — Core Privacy Layer

**Package:** `@umbra-privacy/sdk` + `@umbra-privacy/web-zk-prover`
**Docs:** https://sdk.umbraprivacy.com | https://docs.umbraprivacy.com

### Setup

```typescript
import { getUmbraClient, createSignerFromWalletAccount, getUmbraRelayer } from "@umbra-privacy/sdk";
import { getCreateReceiverClaimableUtxoFromPublicBalanceProver } from "@umbra-privacy/web-zk-prover";

const client = getUmbraClient({
  signer: createSignerFromWalletAccount(walletAccount),
  network: "devnet",                    // or "mainnet"
  rpcUrl: process.env.RPC_FAST_ENDPOINT,
  rpcSubscriptionsUrl: process.env.RPC_FAST_WS_ENDPOINT,
  indexerApiEndpoint: "https://utxo-indexer.api-devnet.umbraprivacy.com",
});

const relayer = getUmbraRelayer({
  apiEndpoint: "https://relayer.api.umbraprivacy.com",
});

const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver();
```

### Registration (once per user, idempotent)

```typescript
const register = getUserRegistrationFunction({ client });
await register(); // 3-step: account init → X25519 key → ZK commitment
```

### Shield (public → encrypted balance)

```typescript
const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
const { queueSignature, callbackSignature } = await deposit({
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  amount: createU64(1_000_000n), // 1 USDC (6 decimals)
});
```

### Send Private Payment (UTXO — unlinkable)

```typescript
const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({ client }, { zkProver });
await createUtxo({
  receiverAddress: resolvedReceiverPublicKey, // from SNS lookup
  mint: USDC_MINT,
  amount: createU64(amount),
});
```

### Scan & Claim received UTXOs

```typescript
const scanner = getClaimableUtxoScannerFunction({ client });
const { received } = await scanner({ treeIndex: createU32(0), startInsertionIndex: createU32(0) });

const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction({ client }, { zkProver, relayer });
for (const utxo of received) {
  await claim({ utxo });
}
```

### Viewing Keys (compliance)

```typescript
// Hierarchical: Master → Mint → Yearly → Monthly → Daily
// Generate master viewing key, share scoped sub-key with auditor
const complianceGrantIssuer = getComplianceGrantIssuerFunction({ client });
await complianceGrantIssuer({ grantee: auditorPublicKey, scope: "monthly" });
```

### Program IDs

| Network | Address |
|---|---|
| Mainnet | `UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh` |
| Devnet | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` |

### Notes

- ZK proof generation: 2–8s in browser, 1–3s in Node.js — show a spinner
- Always use `U64` bigint branded types for amounts: `createU64(1_000_000n)`
- Relayer is required for claim operations
- Devnet indexer: `https://utxo-indexer.api-devnet.umbraprivacy.com`

---

## 2. Cloak SDK — Batch / Payroll Transfers

**Package:** `@cloak.dev/sdk`
**Docs:** https://cloak.mintlify.app
**Network:** Mainnet only

### Setup

```typescript
import { 
  CLOAK_PROGRAM_ID, 
  NATIVE_SOL_MINT,
  generateUtxoKeypair,
  createUtxo,
  createZeroUtxo,
  transact,
  fullWithdraw,
  partialWithdraw
} from "@cloak.dev/sdk";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection(process.env.RPC_FAST_ENDPOINT, "confirmed");
```

### Payroll — Send to Multiple Recipients

```typescript
// Each recipient gets a private UTXO
const recipients = [
  { address: recipientPubkey1, amount: 1_000_000 }, // 1 USDC
  { address: recipientPubkey2, amount: 2_000_000 }, // 2 USDC
];

const inputs = [createZeroUtxo(USDC_MINT)]; // deposit from public balance
const outputs = recipients.map(r => createUtxo(r.amount, r.address, USDC_MINT));

await transact(inputs, outputs, { connection, signer });
```

### Withdraw

```typescript
// Full withdrawal (entire private balance to public)
await fullWithdraw(utxos, recipientPublicKey, { connection, signer });

// Partial withdrawal (keep change private)
await partialWithdraw(utxos, recipientPublicKey, withdrawAmount, { connection, signer });
```

### Ghost Pay Integration: Payroll Feature

- User uploads CSV: `[{ name, wallet_or_sol_name, amount }]`
- App resolves `.sol` names via SNS
- Batch into single `transact()` call
- This is the core differentiator for the Cloak track

---

## 3. MagicBlock Private Payments API — Enterprise Route

**Type:** REST API (no npm package)
**Docs:** https://docs.magicblock.gg
**Demo:** https://github.com/magicblock-labs/private-payments-demo

### Authentication Flow

```typescript
// Step 1: Get challenge
const { challenge } = await fetch(`${MAGICBLOCK_API}/v1/spl/challenge`).then(r => r.json());

// Step 2: Sign challenge with wallet
const signature = await wallet.signMessage(Buffer.from(challenge));

// Step 3: Exchange for bearer token
const { token } = await fetch(`${MAGICBLOCK_API}/v1/spl/login`, {
  method: "POST",
  body: JSON.stringify({ challenge, signature, publicKey: wallet.publicKey.toBase58() }),
}).then(r => r.json());
```

### Key Endpoints

```typescript
// Public balance (no auth needed)
GET /v1/spl/balance?mint={mintAddress}&wallet={walletAddress}

// Private balance (requires auth)
GET /v1/spl/private-balance
Headers: { Authorization: "Bearer {token}" }

// Deposit (public → private ephemeral rollup)
POST /v1/spl/deposit
Body: { mint, amount }

// Private transfer
POST /v1/spl/transfer
Headers: { Authorization: "Bearer {token}" }
Body: { recipient, mint, amount, private: true }

// Withdraw (private → public)
POST /v1/spl/withdraw
Body: { mint, amount }

// Swap quote
GET /v1/swap/quote?inputMint={}&outputMint={}&amount={}

// Execute swap
POST /v1/swap/swap
Body: { inputMint, outputMint, amount }
```

### Ghost Pay Integration

- Store bearer token in memory (server-side session) — never expose client-side
- Use `/api/magicblock/*` Next.js routes as a proxy
- Present as "Enterprise Transfer" option in the Send UI
- Show TEE-backed privacy badge for this route

---

## 4. SNS — Identity Resolution

**Package:** `@bonfida/spl-name-service`
**Install:** `npm install @solana/web3.js @bonfida/spl-name-service`
**Docs:** https://sns.guide

### Resolve `.sol` → Public Key

```typescript
import { resolve, performReverseLookup, getDomainKey } from "@bonfida/spl-name-service";
import { Connection } from "@solana/web3.js";

const connection = new Connection(process.env.RPC_FAST_ENDPOINT);

// Forward: "alice.sol" → PublicKey
const ownerPublicKey = await resolve(connection, "alice"); // no .sol suffix

// Reverse: PublicKey → "alice.sol"
const { domainName } = await performReverseLookup(connection, ownerPublicKey);
```

### Ghost Pay Integration

- Every send input field accepts either a raw address OR a `.sol` name
- Resolve on blur/debounce with 300ms delay
- Show green checkmark + resolved address when `.sol` resolves
- Display sender's `.sol` name in history if they have one

---

## 5. Dune SIM API — Portfolio Analytics

**Base URL:** `https://api.sim.dune.com/v1`
**Auth:** `X-Sim-Api-Key: {API_KEY}` header
**Docs:** https://docs.sim.dune.com
**Free tier:** 1M compute units, 5 RPS

### Key Endpoints for Ghost Pay

```typescript
const headers = { "X-Sim-Api-Key": process.env.SIM_API_KEY };

// Wallet token balances (includes Solana)
GET /v1/solana/balances/{walletAddress}

// Transaction history
GET /v1/solana/transactions/{walletAddress}?limit=50

// Activities (decoded: swaps, transfers, approvals)
GET /v1/solana/activities/{walletAddress}
```

### Ghost Pay Integration (`/api/portfolio` route)

```typescript
// app/api/portfolio/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  
  const [balances, activities] = await Promise.all([
    fetch(`https://api.sim.dune.com/v1/solana/balances/${wallet}`, { headers }),
    fetch(`https://api.sim.dune.com/v1/solana/activities/${wallet}?limit=20`, { headers }),
  ]);
  
  return Response.json({ balances: await balances.json(), activities: await activities.json() });
}
```

---

## 6. Covalent GoldRush — USD Pricing & Token Metadata

**Chain:** `solana-mainnet`
**Auth:** API key as query param or SDK
**Docs:** https://goldrush.dev/docs
**Install:** `npm install @covalenthq/client-sdk`

```typescript
import { CovalentClient } from "@covalenthq/client-sdk";

const client = new CovalentClient(process.env.COVALENT_API_KEY);

// Token balances with USD prices
const { data } = await client.BalanceService.getTokenBalancesForWalletAddress(
  "solana-mainnet",
  walletAddress
);

// Or REST:
GET https://api.covalenthq.com/v1/solana-mainnet/address/{wallet}/balances_v2/?key={API_KEY}
```

### Ghost Pay Integration

- Use for the "Total Portfolio Value" USD number in dashboard
- Combine with Dune SIM: Dune for raw balances, Covalent for USD pricing
- Show token logos from Covalent's metadata

---

## 7. Torque — Growth & Leaderboard

**Docs:** https://docs.torque.so
**Integration:** API + dashboard config (no-code leaderboard setup)

### Custom Events

```typescript
// Fire event on every private payment
await fetch("https://api.torque.so/v1/events", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.TORQUE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    userWallet: senderPublicKey,
    eventName: "private_payment_sent",
    metadata: { token: "USDC", timestamp: Date.now() },
  }),
});
```

### Ghost Pay Integration

- Fire `private_payment_sent` event on every Umbra/Cloak send
- Configure leaderboard: "Most private payments this week"
- Prizes: top 3 users get small USDC rewards (fund from project treasury)
- Show leaderboard on `/rewards` page via Torque embed or API

---

## 8. RPC Fast — Infrastructure

**Docs:** https://docs.rpcfast.com
**Hackathon Plan:** Contact via https://t.me/+SpMbJTPTakAxNjdi
**Features:** 120M CU/month, 500 req/s, Shredstream/Yellowstone gRPC, Frankfurt

### Setup

```typescript
// Replace this in all SDK initializations:
const RPC_ENDPOINT = process.env.RPC_FAST_ENDPOINT; // get from RPC Fast team
const connection = new Connection(RPC_ENDPOINT, "confirmed");
```

### Submission Note

- Follow @rpcfast on X
- Join their Telegram community
- Mention RPC Fast usage in README: "Using RPC Fast Hackathon Plan for 120M CU/month, 500 req/s"

---

## 9. Palm USD (PUSD) — Stablecoin

**Website:** https://www.palmusd.com
**Type:** SPL token (or Token-2022) — Shariah-compliant, no freeze/blacklist

### Integration Steps

1. Get PUSD mint address from Palm USD hackathon resources / Discord
2. Add to Umbra's supported token list (if available on devnet)
3. Add PUSD as selectable token in Ghost Pay send/shield flow
4. Standard SPL transfer for non-private flows

### Pitch for Track

- Ghost Pay is the first privacy-preserving payment app for PUSD
- No freeze + no visibility = truly free private money
- Target: Muslim-majority markets (UAE, Pakistan, Saudi Arabia)

---

## 10. Ika MPC — Cross-Chain Custody (Stretch Goal)

**Package:** `@ika.xyz/sdk` (`pnpm add @ika.xyz/sdk`)
**Docs:** https://docs.ika.xyz
**Status:** Pre-Alpha — Solana integration live but unstable

### Concept for Ghost Pay

- User creates an Ika dWallet on Solana that controls BTC/ETH natively
- Ghost Pay can initiate a "cross-chain private payment": pay in BTC, settle on Solana
- Targets the Encrypt & Ika track's "bridgeless capital markets" use case

### De-risking Strategy

- Build without Ika first (Days 1–4)
- Attempt Ika integration on Day 5 only if ahead of schedule
- Fallback: show Ika as a "coming soon" feature in the UI if integration fails
- Even surface-level integration may qualify for the $15,000 track
