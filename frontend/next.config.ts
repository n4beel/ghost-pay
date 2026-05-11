import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 / Turbopack auto-injects `next/dist/compiled/buffer` (feross/buffer v5)
  // for any free `Buffer` reference in browser bundles. v5 lacks `readBigInt64LE`
  // which the Cloak SDK calls internally. Force `buffer` imports to resolve to the
  // npm `buffer@6.x` package (which implements the BigInt methods).
  turbopack: {
    resolveAlias: {
      buffer: {
        browser: "buffer",
        default: "node:buffer",
      },
    },
  },
};

export default nextConfig;
