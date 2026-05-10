"use client";

// Re-exports the shared Umbra context so all pages call useUmbra() as before
// but only one initialization (and wallet signature) happens per wallet session.
export { useUmbraContext as useUmbra } from "@/components/providers/UmbraProvider";
