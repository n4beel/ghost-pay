import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    server: {
      deps: {
        // The reference SDK ships ESM with extensionless directory imports, which Node's own
        // resolver rejects. Vite's resolver handles them, so it has to go through the transform
        // pipeline rather than being externalised.
        inline: ["@scopelift/stealth-address-sdk"],
      },
    },
  },
});
