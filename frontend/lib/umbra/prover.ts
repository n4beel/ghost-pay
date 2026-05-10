import {
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";

let createProver: ReturnType<typeof getCreateReceiverClaimableUtxoFromPublicBalanceProver> | null = null;
let claimProver: ReturnType<typeof getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver> | null = null;
let registrationProver: ReturnType<typeof getUserRegistrationProver> | null = null;

export function getCreateProver() {
  if (!createProver) {
    createProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver();
  }
  return createProver;
}

export function getClaimProver() {
  if (!claimProver) {
    claimProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
  }
  return claimProver;
}

export function getRegistrationProver() {
  if (!registrationProver) {
    registrationProver = getUserRegistrationProver();
  }
  return registrationProver;
}
