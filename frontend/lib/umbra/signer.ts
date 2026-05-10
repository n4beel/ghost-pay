import type { IUmbraSigner } from "@umbra-privacy/sdk/interfaces";
import { getTransactionEncoder, getTransactionDecoder } from "@solana/kit";
import { VersionedTransaction } from "@solana/web3.js";

// Uses adapter.signTransaction (web3.js VersionedTransaction path) instead of
// the Wallet Standard bridge, which can return different messageBytes than what
// was sent, causing "Transaction did not pass signature verification" on the RPC.
// Critical: we return decoded.messageBytes so the RPC receives exactly what was signed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createUmbraSignerFromAdapter(adapter: any, connectedAddress?: string): IUmbraSigner {
  if (!adapter?.wallet?.accounts?.length) {
    throw new Error("Wallet must be connected and expose at least one account.");
  }
  if (typeof adapter.signTransaction !== "function") {
    throw new Error("Wallet adapter must support signTransaction.");
  }

  const wallet = adapter.wallet;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = connectedAddress && wallet.accounts.length > 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (wallet.accounts.find((a: any) => a.address === connectedAddress) ?? wallet.accounts[0])
    : wallet.accounts[0];

  const address = (connectedAddress ?? account.address) as string;
  const encoder = getTransactionEncoder();
  const decoder = getTransactionDecoder();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signOne = async (transaction: any): Promise<any> => {
    const wireBytes = encoder.encode(transaction);
    const v1Tx = VersionedTransaction.deserialize(new Uint8Array(wireBytes));
    const signedV1Tx = await adapter.signTransaction(v1Tx);
    const signedWireBytes = signedV1Tx.serialize();
    const decoded = decoder.decode(signedWireBytes);
    return {
      ...transaction,
      messageBytes: decoded.messageBytes,
      signatures: { ...transaction.signatures, ...decoded.signatures },
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signMsgFeature = (wallet.features as any)?.["solana:signMessage"];

  return {
    address,
    signTransaction: signOne,
    signTransactions: (transactions: any[]) => Promise.all(transactions.map(signOne)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signMessage: async (message: any): Promise<any> => {
      if (!signMsgFeature) throw new Error("Wallet does not support signMessage");
      const [output] = await signMsgFeature.signMessage({ account, message });
      return { message, signature: output.signature, signer: address };
    },
  } as unknown as IUmbraSigner;
}
