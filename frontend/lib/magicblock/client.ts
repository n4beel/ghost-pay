import { Transaction, VersionedTransaction } from "@solana/web3.js";

const MB_PROXY = "/api/magicblock";
// Mock API only accepts the devnet USDC mint regardless of which token is selected
const MOCK_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

type SignMsgFn = (msg: Uint8Array) => Promise<Uint8Array>;

export interface MagicBlockTransferResult {
  signature: string;
  mock: true;
}

async function getChallenge(pubkey: string): Promise<string> {
  const res = await fetch(
    `${MB_PROXY}/v1/spl/challenge?pubkey=${pubkey}&cluster=devnet&mock=true`
  );
  if (!res.ok) throw new Error(`MagicBlock challenge failed: ${res.status}`);
  const data = await res.json();
  return data.challenge as string;
}

async function login(
  pubkey: string,
  challenge: string,
  signMessage: SignMsgFn,
): Promise<string> {
  const encoded = new TextEncoder().encode(challenge);
  const signatureBytes = await signMessage(encoded);
  const signature = Buffer.from(signatureBytes).toString("base64");

  const res = await fetch(`${MB_PROXY}/v1/spl/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pubkey, challenge, signature, cluster: "devnet", mock: true }),
  });
  if (!res.ok) throw new Error(`MagicBlock login failed: ${res.status}`);
  const data = await res.json();
  return data.token as string;
}

async function requestTransfer(
  token: string,
  from: string,
  to: string,
  amountMicro: number,
): Promise<{ transactionBase64: string; version: string }> {
  const res = await fetch(`${MB_PROXY}/v1/spl/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from,
      to,
      mint: MOCK_USDC_MINT,
      amount: amountMicro,
      visibility: "private",
      fromBalance: "base",
      toBalance: "base",
      cluster: "devnet",
      mock: true,
    }),
  });
  if (!res.ok) throw new Error(`MagicBlock transfer request failed: ${res.status}`);
  const data = await res.json();
  return { transactionBase64: data.transactionBase64 as string, version: data.version as string };
}

export async function magicBlockTransfer(
  from: string,
  to: string,
  _mint: string,
  amount: number,
  signMessage: SignMsgFn,
): Promise<MagicBlockTransferResult> {
  // Step 1: challenge
  const challenge = await getChallenge(from);

  // Step 2: sign challenge + login
  const authToken = await login(from, challenge, signMessage);

  // Step 3: build unsigned tx — amount converted to micro units (USDC 6 decimals)
  const amountMicro = Math.round(amount * 1_000_000);
  const { transactionBase64, version } = await requestTransfer(authToken, from, to, amountMicro);

  // Step 4: verify tx deserializes (proves bytes are valid) — mock tx has fake
  // accounts so it cannot be signed or submitted on-chain.
  const txBytes = Buffer.from(transactionBase64, "base64");
  if (version === "v0") {
    VersionedTransaction.deserialize(txBytes);
  } else {
    Transaction.from(txBytes);
  }

  // Step 5: return mock signature — the TEE auth + tx structure is the demo deliverable
  const sig = "5mock" + Buffer.from(from).toString("hex").slice(0, 55) + "PER";
  return { signature: sig, mock: true };
}
