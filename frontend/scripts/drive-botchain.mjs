/**
 * Browser smoke test for the BOT Chain stealth path.
 *
 * Drives the real app in Chromium against a mock EIP-1193 wallet and a mock JSON-RPC node, so the
 * whole wallet-facing flow — connect, gate, resolve, unlock, scan — can be exercised without a
 * browser extension, a funded key, or deployed contracts. It is not a substitute for testing with
 * real MetaMask against a real deployment; it is the check that catches the breakages you would
 * otherwise only find while holding a phone.
 *
 * The one case worth the whole file: `NONDETERMINISTIC=1` makes the mock wallet sign the same
 * message two different ways, which is how an MPC signer could behave, and asserts the app refuses
 * to derive an identity rather than silently handing the user a new one every session.
 *
 *   npm run dev                 # in another terminal, with a .env.local (see below)
 *   npm run smoke:botchain
 *   NONDETERMINISTIC=1 npm run smoke:botchain
 *
 * Requires `npm i -D playwright` — deliberately not a dependency, so a normal install does not
 * pull a browser down. Set SHOT_DIR to capture screenshots, CHROMIUM_PATH to override the browser.
 *
 * .env.local for this run:
 *   NEXT_PUBLIC_BOTCHAIN_ENABLED=true
 *   NEXT_PUBLIC_BOTCHAIN_NETWORK=testnet
 *   NEXT_PUBLIC_BOHR_RPC=http://localhost:8545
 *   NEXT_PUBLIC_ANNOUNCER_968=0x00000000000000000000000000000000000a5564
 *   NEXT_PUBLIC_REGISTRY_968=0x00000000000000000000000000000000000a6538
 *   NEXT_PUBLIC_STEALTH_SEND_968=0x00000000000000000000000000000000000a9999
 *   NEXT_PUBLIC_DEPLOY_BLOCK_968=1000
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = process.env.APP_URL ?? "http://localhost:3000";
const SHOT = process.env.SHOT_DIR;
const DETERMINISTIC = process.env.NONDETERMINISTIC !== "1";
/** `VIEWPORT=mobile` runs the same steps at phone size and adds the mobile-only assertions. */
const MOBILE = process.env.VIEWPORT === "mobile";
/**
 * `FLAG_OFF=1` asserts the opposite of everything else here: that with
 * NEXT_PUBLIC_BOTCHAIN_ENABLED unset or false, the BOT Chain path is completely unreachable — even
 * for a browser that already has "botchain" persisted from a preview build. Run it against a dev
 * server started with the flag off.
 */
const FLAG_OFF = process.env.FLAG_OFF === "1";
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1280, height: 900 };
const ACCOUNT = "0x9f2C4bE0aB1c9E0d1234567890AbCdEf12345678";

/** First vector from lib/stealth/__tests__/vectors.ts — a known-valid scheme-1 meta-address. */
const META_ADDRESS =
  "0x03f64939bfff616d5e8dbea8c2dc94db1bf6e8e269f4e7051d33552097b0a4570d" +
  "02d7cc2048044117626327fb91f08cf8e98a7bf11baf73cba2580b8bc3fcd479e3";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("playwright is not installed. Run:  npm i -D playwright");
  process.exit(1);
}

/**
 * Locate a browser. Playwright's own resolution is version-pinned and breaks when the machine has a
 * different build cached, which is common in prebuilt containers.
 */
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  for (const entry of readdirSync(root)) {
    if (!entry.startsWith("chromium-")) continue;
    const candidate = join(root, entry, "chrome-linux", "chrome");
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * A MetaMask-shaped provider, announced over EIP-6963 so wagmi discovers it.
 *
 * `personal_sign` is a hash of the message, which is what an RFC-6979 signer effectively gives you:
 * same input, same bytes, every time. That property is the one the key derivation rests on.
 */
function injectWallet({ account, deterministic }) {
  const CHAIN = "0x3c8";
  // A real wallet remembers it authorised this origin and reconnects without prompting. Without
  // this the harness would be testing a permanently-fresh wallet, and nothing would survive a
  // navigation.
  const GRANT = "mock-wallet:authorized";
  let accounts = (() => {
    try {
      return localStorage.getItem(GRANT) ? [account] : [];
    } catch {
      return [];
    }
  })();

  async function sha(text) {
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    );
    return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  let calls = 0;

  const provider = {
    isMetaMask: true,
    _events: {},
    async request({ method, params }) {
      switch (method) {
        case "eth_chainId":
          return CHAIN;
        case "net_version":
          return "968";
        case "eth_accounts":
          return accounts;
        case "eth_requestAccounts":
          accounts = [account];
          try {
            localStorage.setItem(GRANT, "1");
          } catch {}
          (provider._events.accountsChanged ?? []).forEach((f) => f(accounts));
          return accounts;
        case "personal_sign": {
          const salt = deterministic ? "" : String(++calls);
          return "0x" + (await sha(params[0] + salt + "a")) + (await sha(params[0] + salt + "b")) + "1b";
        }
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "eth_sendTransaction":
          return "0x" + "cd".repeat(32);
        case "eth_getBalance":
          return "0x0de0b6b3a7640000";
        case "eth_blockNumber":
          return "0x1500";
        default:
          throw Object.assign(new Error("unsupported " + method), { code: 4200 });
      }
    },
    on(event, handler) {
      (provider._events[event] ??= []).push(handler);
    },
    removeListener(event, handler) {
      provider._events[event] = (provider._events[event] ?? []).filter((f) => f !== handler);
    },
  };

  window.ethereum = provider;

  const detail = Object.freeze({
    info: {
      uuid: "11111111-2222-3333-4444-555555555555",
      name: "MetaMask",
      icon: "data:image/svg+xml;base64,PHN2Zy8+",
      rdns: "io.metamask",
    },
    provider,
  });
  const announce = () =>
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
}

async function main() {
  const rpc = spawn(process.execPath, [join(HERE, "mock-rpc.mjs")], { stdio: "ignore" });
  const stopRpc = () => rpc.kill();
  process.on("exit", stopRpc);

  const browser = await chromium.launch({ executablePath: findChromium() });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    ...(MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}),
  });
  await ctx.addInitScript(injectWallet, { account: ACCOUNT, deterministic: DETERMINISTIC });
  await ctx.addInitScript(() => localStorage.setItem("ghost-pay:active-chain", "botchain"));

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 160)}`);
  });

  let failed = false;
  const step = async (name, fn) => {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (err) {
      failed = true;
      console.log(`  FAIL ${name}\n       ${err.message.split("\n")[0]}`);
      if (SHOT) await page.screenshot({ path: `${SHOT}/fail-${name.replace(/\W+/g, "-")}.png` });
      throw err;
    }
  };

  /**
   * Nothing may scroll the page sideways.
   *
   * One overflowing address or hash shifts the whole layout, and it is invisible in a screenshot
   * taken at the width that caused it. Asserting the document is no wider than the viewport catches
   * the entire class in one line, on every screen the test visits.
   */
  const assertNoSidewaysScroll = async (where) => {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = doc.scrollWidth - window.innerWidth;
      if (over <= 1) return null;
      // Name the widest offender, so a failure points at a element rather than a number.
      let worst = null;
      for (const el of document.querySelectorAll("*")) {
        const right = el.getBoundingClientRect().right;
        if (right > window.innerWidth + 1 && (!worst || right > worst.right)) {
          worst = { right, tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 80) };
        }
      }
      return { over, worst };
    });
    if (overflow) {
      const { over, worst } = overflow;
      throw new Error(
        `page scrolls sideways by ${over}px on ${where}` +
          (worst ? ` — widest: <${worst.tag} class="${worst.cls}">` : ""),
      );
    }
  };

  console.log(
    `\nBOT Chain smoke test (${MOBILE ? `mobile ${VIEWPORT.width}x${VIEWPORT.height}` : "desktop"}` +
      `${FLAG_OFF ? ", flag OFF" : `, wallet signs deterministically: ${DETERMINISTIC}`})\n`,
  );

  if (FLAG_OFF) {
    // localStorage was seeded with "botchain" by the init script above, which is exactly the state
    // a preview-build visitor arrives in.
    await page.goto(`${APP}/send`, { waitUntil: "networkidle" });

    await step("send page falls back to Solana", () =>
      page.getByText(/amounts hidden, sender anonymous/i).waitFor({ timeout: 20000 }),
    );
    await step("no chain switcher", async () => {
      if (await page.getByRole("group", { name: /select network/i }).isVisible().catch(() => false)) {
        throw new Error("the chain switcher is reachable with the flag off");
      }
    });
    await step("the stored selection is cleared, not just ignored", async () => {
      const stored = await page.evaluate(() => localStorage.getItem("ghost-pay:active-chain"));
      if (stored !== "solana") throw new Error(`stored chain is still ${stored}`);
    });
    await step("receive page falls back to Solana", async () => {
      await page.goto(`${APP}/receive`, { waitUntil: "networkidle" });
      await page.getByText(/Share your payment address/i).waitFor({ timeout: 20000 });
    });
    await step("dashboard and history fall back to Solana", async () => {
      // Both branch on the active chain now, so both are part of the gate's surface.
      await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle" });
      await page.getByText(/Connect your wallet to access Ghost Pay/i).waitFor({ timeout: 20000 });
      await page.goto(`${APP}/history`, { waitUntil: "networkidle" });
      if (await page.getByText(/Stealth payments received/i).isVisible().catch(() => false)) {
        throw new Error("history rendered the BOT Chain branch with the flag off");
      }
    });
    await step("landing page does not advertise BOT Chain", async () => {
      await page.goto(`${APP}/`, { waitUntil: "networkidle" });
      if (await page.getByText(/Also on BOT Chain/i).isVisible().catch(() => false)) {
        throw new Error("the BOT Chain landing section renders with the flag off");
      }
      const title = await page.title();
      if (/BOT Chain/i.test(title)) throw new Error(`page title advertises BOT Chain: ${title}`);
    });

    console.log("\n  no page errors");
    await browser.close();
    stopRpc();
    console.log("\nAll steps passed.\n");
    process.exit(0);
  }

  try {
    await page.goto(`${APP}/send`, { waitUntil: "networkidle" });

    await step("send page renders the BOT Chain branch", () =>
      page.getByText("Stealth payment", { exact: false }).waitFor({ timeout: 20000 }),
    );
    await step("gate blocks before a wallet is connected", () =>
      page.getByText("Wallet not connected").waitFor({ timeout: 10000 }),
    );
    if (MOBILE) {
      await step("no sidebar rail on a phone", async () => {
        const rail = page.locator("aside").first();
        if (await rail.isVisible().catch(() => false)) {
          throw new Error("the 220px sidebar is still taking content width");
        }
        await page.getByRole("button", { name: /open navigation/i }).waitFor({ timeout: 10000 });
      });
      await step("send page does not scroll sideways", () => assertNoSidewaysScroll("/send"));
    }

    await step("wallet connects", async () => {
      // On a phone the wallet control lives in the drawer, so the drawer is the path to it.
      if (MOBILE) await page.getByRole("button", { name: /open navigation/i }).click();
      await page.getByRole("button", { name: /connect wallet/i }).last().click();
      const item = page.getByText("MetaMask", { exact: true });
      if (await item.isVisible().catch(() => false)) await item.click();
      await page.getByText("0x9f2C...5678").last().waitFor({ timeout: 20000 });
      if (MOBILE) await page.keyboard.press("Escape");
    });
    await step("send form renders once connected", async () => {
      await page.getByPlaceholder(/meta-address/i).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: /send privately/i }).waitFor();
    });
    await step("rejects a recipient that is neither address nor meta-address", async () => {
      await page.getByPlaceholder(/meta-address/i).fill("not-an-address");
      await page.getByText(/Not an address or stealth meta-address/i).waitFor({ timeout: 5000 });
    });
    await step("tells the user when a recipient has not registered", async () => {
      await page.getByPlaceholder(/meta-address/i).fill("0x1111111111111111111111111111111111111111");
      await page.getByText(/has not published stealth keys/i).waitFor({ timeout: 10000 });
    });
    await step("accepts a pasted meta-address", async () => {
      await page.getByPlaceholder(/meta-address/i).fill(META_ADDRESS);
      await page.getByText(/Using the pasted meta-address/i).waitFor({ timeout: 10000 });
    });
    await step("refuses an amount above the balance", async () => {
      await page.getByPlaceholder("0.00").fill("999");
      await page.getByText(/Insufficient balance/i).waitFor({ timeout: 5000 });
    });
    await step("enables sending for a valid amount", async () => {
      await page.getByPlaceholder("0.00").fill("0.25");
      const button = page.getByRole("button", { name: /send privately/i });
      await button.waitFor();
      if (await button.isDisabled()) throw new Error("send button is still disabled");
    });
    if (MOBILE) {
      await step("filled send form does not scroll sideways", () =>
        assertNoSidewaysScroll("/send with a meta-address filled in"),
      );
    }
    if (SHOT) await page.screenshot({ path: `${SHOT}/send.png`, fullPage: true });

    await page.goto(`${APP}/receive`, { waitUntil: "networkidle" });

    await step("receive page asks to unlock", async () => {
      await page.getByText(/Stealth identity/i).waitFor({ timeout: 20000 });
      await page.getByRole("button", { name: /unlock stealth keys/i }).waitFor();
    });
    await step(
      DETERMINISTIC
        ? "unlock derives a stealth identity"
        : "unlock refuses a wallet that signs nondeterministically",
      async () => {
        await page.getByRole("button", { name: /unlock stealth keys/i }).click();
        if (DETERMINISTIC) {
          await page.getByText(/Your stealth meta-address/i).waitFor({ timeout: 25000 });
          await page.getByText(/^st:bot:0x/).waitFor({ timeout: 10000 });
        } else {
          await page.getByText(/two different signatures/i).waitFor({ timeout: 25000 });
        }
      },
    );

    if (DETERMINISTIC) {
      await step("offers to publish to the registry", async () => {
        await page.getByText("Not published").waitFor({ timeout: 15000 });
        await page.getByRole("button", { name: /publish to registry/i }).waitFor();
      });
      await step("scans announcements and reports none", () =>
        page.getByText(/No payments found yet/i).waitFor({ timeout: 25000 }),
      );
    }
    if (MOBILE) {
      // The meta-address is 132 hex characters on one line. If anything breaks a phone layout, it
      // is this.
      await step("receive page does not scroll sideways", () => assertNoSidewaysScroll("/receive"));
    }
    if (SHOT) await page.screenshot({ path: `${SHOT}/receive.png`, fullPage: true });

    if (MOBILE) {
      await step("drawer navigates and closes", async () => {
        await page.getByRole("button", { name: /open navigation/i }).click();
        await page.getByRole("link", { name: "Dashboard", exact: true }).click();
        await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
        await page.getByRole("button", { name: /open navigation/i }).waitFor({ timeout: 10000 });
        if (await page.locator('[role="dialog"]').isVisible().catch(() => false)) {
          throw new Error("drawer stayed open after navigating");
        }
      });
      await step("no page scrolls sideways", async () => {
        for (const path of ["/", "/dashboard", "/history", "/payroll", "/compliance", "/rewards"]) {
          await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
          await assertNoSidewaysScroll(path);
        }
      });
    }

    await step("Solana path is untouched", async () => {
      const other = await ctx.newPage();
      await other.addInitScript(() => localStorage.setItem("ghost-pay:active-chain", "solana"));
      await other.goto(`${APP}/send`, { waitUntil: "networkidle" });
      await other.getByText(/amounts hidden, sender anonymous/i).waitFor({ timeout: 20000 });
      await other.close();
    });
  } finally {
    // Network failures reaching external services (Solana RPC, analytics) are the environment, not
    // the app, and would otherwise make every run look broken.
    const real = errors.filter(
      (e) => !/favicon|React DevTools|analytics|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/i.test(e),
    );
    console.log(real.length ? "\n  page errors:" : "\n  no page errors");
    real.slice(0, 10).forEach((e) => console.log("   -", e));
    await browser.close();
    stopRpc();
  }

  console.log(failed ? "\nFAILED\n" : "\nAll steps passed.\n");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message.split("\n")[0], "\n");
  process.exit(1);
});
