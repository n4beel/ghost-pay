import { createServer } from "node:http";

// Minimal JSON-RPC node for driving the BOT Chain UI locally. Answers only what the app asks for.
const CHAIN_ID = "0x3c8";            // 968
const HEAD = "0x1500";               // 5376
const ONE_ETHER = "0x0de0b6b3a7640000";

// abi.encode(bytes("")) -> offset 0x20, length 0. Decoding a bare "0x" would throw in viem.
const EMPTY_BYTES = "0x" + "20".padStart(64, "0") + "0".repeat(64);

const state = { registered: null, logs: [] };

function handle(method, params) {
  switch (method) {
    case "eth_chainId": return CHAIN_ID;
    case "net_version": return "968";
    case "eth_blockNumber": return HEAD;
    case "eth_getBalance": return ONE_ETHER;
    case "eth_getTransactionCount": return "0x0";
    case "eth_gasPrice": return "0x3b9aca00";
    case "eth_estimateGas": return "0x5208";
    case "eth_getLogs": return state.logs;
    case "eth_call": return state.registered ?? EMPTY_BYTES;
    case "eth_getBlockByNumber":
      return { number: HEAD, hash: "0x" + "11".repeat(32), parentHash: "0x" + "22".repeat(32),
               timestamp: "0x66000000", baseFeePerGas: "0x3b9aca00", gasLimit: "0x1c9c380",
               gasUsed: "0x0", transactions: [], miner: "0x" + "00".repeat(20),
               difficulty: "0x0", extraData: "0x", logsBloom: "0x" + "00".repeat(256),
               nonce: "0x0000000000000000", sha3Uncles: "0x" + "00".repeat(32),
               size: "0x0", stateRoot: "0x" + "00".repeat(32),
               receiptsRoot: "0x" + "00".repeat(32), transactionsRoot: "0x" + "00".repeat(32),
               uncles: [] };
    case "eth_feeHistory":
      return { oldestBlock: HEAD, baseFeePerGas: ["0x3b9aca00", "0x3b9aca00"], gasUsedRatio: [0.5],
               reward: [["0x3b9aca00"]] };
    case "eth_maxPriorityFeePerGas": return "0x3b9aca00";
    case "eth_sendRawTransaction": return "0x" + "ab".repeat(32);
    default:
      throw new Error(`mock-rpc: unhandled ${method}`);
  }
}

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("content-type", "application/json");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    if (req.method === "OPTIONS") return res.end("{}");

    // Control plane, so the test can flip mock state mid-run.
    if (req.url === "/__set") {
      Object.assign(state, JSON.parse(body));
      console.log("[mock] state ->", Object.keys(JSON.parse(body)).join(","));
      return res.end("{}");
    }

    let payload;
    try { payload = JSON.parse(body); } catch { return res.end('{"error":"bad json"}'); }
    const batch = Array.isArray(payload) ? payload : [payload];
    const out = batch.map((call) => {
      try {
        return { jsonrpc: "2.0", id: call.id, result: handle(call.method, call.params) };
      } catch (err) {
        console.log("[mock] ERROR", call.method, err.message);
        return { jsonrpc: "2.0", id: call.id, error: { code: -32601, message: err.message } };
      }
    });
    res.end(JSON.stringify(Array.isArray(payload) ? out : out[0]));
  });
}).listen(8545, () => console.log("mock-rpc on :8545"));
