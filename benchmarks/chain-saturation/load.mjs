// load.mjs — saturate the throwaway chain with pre-signed synthetic transactions and measure the
// sustained inclusion rate. Keeps a backlog in the tx pool so every block is limited by the chain
// (block-building time / execution), not by supply.
//
//   node load.mjs --type zk|noto|pente|payment|eth --seconds 60 [--rate 3000] [--contracts 16] [--label x]
//
// "payment" = the measured private-payment mix per payment: 2 × zk-like (lock, settle's
// transferLocked) + 2 × pente-like (bid, settle's transition) — i.e. design C's chain work.
// "eth" = a plain value transfer to a fresh address (21k gas): Besu's floor cost per transaction.
import { Interface, Wallet, hexlify, id as keccakId, randomBytes } from "ethers";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { CHAIN_ID, loadAccount } from "./net.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : null)).filter(Boolean)
);
const RPC = args.rpc ?? "http://127.0.0.1:18545";
const TYPE = args.type ?? "zk";
const SECONDS = Number(args.seconds ?? 60);
const RATE = Number(args.rate ?? { zk: 800, pente: 3000, noto: 4000, payment: 1600, eth: 8000 }[TYPE]); // offered tx/s (must exceed capacity)
const SENDERS = Number(args.senders ?? 512);
const CONTRACTS = Number(args.contracts ?? 16);
const GAS = { zk: 450000, noto: 160000, pente: 190000, eth: 21000 };
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 23)}]`, ...a);

const syn = JSON.parse(fs.readFileSync(new URL("./Synthetic.json", import.meta.url)));
const iface = new Interface(syn.abi);

let rid = 0;
async function rpc(method, params = []) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++rid, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}
async function rpcBatch(calls) {
  const body = calls.map(([method, params]) => ({ jsonrpc: "2.0", id: ++rid, method, params }));
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function poolSize() {
  const st = await rpc("txpool_besuStatistics");
  return Number(st.localCount ?? 0) + Number(st.remoteCount ?? 0);
}

async function deployContracts() {
  const deployer = loadAccount(0);
  let nonce = parseInt(await rpc("eth_getTransactionCount", [deployer.address, "pending"]), 16);
  const raws = [];
  for (let i = 0; i < CONTRACTS; i++) raws.push(await deployer.signTransaction({ type: 0, data: syn.bytecode, gasLimit: 3_000_000, gasPrice: 0, nonce: nonce++, chainId: CHAIN_ID }));
  const hashes = (await rpcBatch(raws.map((r) => ["eth_sendRawTransaction", [r]]))).map((x) => {
    if (x.error) throw new Error(`deploy: ${x.error.message}`);
    return x.result;
  });
  const addrs = [];
  for (const h of hashes) {
    let rc;
    while (!(rc = await rpc("eth_getTransactionReceipt", [h]))) await sleep(250);
    if (rc.status !== "0x1") throw new Error("deploy failed (pairing self-check in constructor?)");
    addrs.push(rc.contractAddress);
  }
  return addrs;
}

// A real-looking signature for ecrecover (cost is identical whatever is signed).
const sigWallet = Wallet.createRandom();
const H = keccakId("synthetic");
const SIG = sigWallet.signingKey.sign(H);
const PROOF = hexlify(randomBytes(1024)); // ~ Groth16 proof + public inputs calldata

let idSeq = 0;
function calldata(kind) {
  const id = keccakId(`tx-${process.pid}-${++idSeq}`);
  if (kind === "zk") return iface.encodeFunctionData("zk", [id, PROOF]);
  return iface.encodeFunctionData(kind, [id, H, SIG.v, SIG.r, SIG.s]);
}
const kindsFor = (type) => (type === "payment" ? ["zk", "pente", "zk", "pente"] : [type]);

async function main() {
  const params = fs.existsSync("net/params.json") ? JSON.parse(fs.readFileSync("net/params.json")) : {};
  log(`chain: ${JSON.stringify(params)} · load: ${TYPE} @ ${RATE} tx/s offered for ${SECONDS}s · ${SENDERS} senders · ${CONTRACTS} contracts`);
  for (let w = 0; (await poolSize()) > 0; w++) {
    if (w % 10 === 0) log(`waiting for leftover pool to drain (${await poolSize()} pending)…`);
    await sleep(1000);
  }
  const contracts = await deployContracts();
  // sanity: each synthetic call succeeds and costs what we expect
  for (const k of ["zk", "noto", "pente"]) {
    const g = parseInt(await rpc("eth_estimateGas", [{ from: loadAccount(1).address, to: contracts[0], data: calldata(k) }]), 16);
    log(`  ${k}-like: ${g.toLocaleString()} gas`);
  }

  const senders = Array.from({ length: SENDERS }, (_, i) => loadAccount(i + 1));
  const nonces = (await rpcBatch(senders.map((w) => ["eth_getTransactionCount", [w.address, "pending"]]))).map((x) => parseInt(x.result, 16));
  const total = Math.ceil(RATE * SECONDS);
  const kinds = kindsFor(TYPE);
  log(`pre-signing ${total.toLocaleString()} txs…`);
  const t0s = Date.now();
  const raws = new Array(total);
  for (let i = 0; i < total; i++) {
    const s = i % SENDERS;
    const kind = kinds[i % kinds.length];
    raws[i] = await senders[s].signTransaction({
      type: 0, chainId: CHAIN_ID, nonce: nonces[s]++, gasPrice: 0, gasLimit: GAS[kind],
      ...(kind === "eth" ? { to: hexlify(randomBytes(20)), value: 1n } : { to: contracts[s % CONTRACTS], data: calldata(kind) }),
    });
  }
  log(`signed in ${((Date.now() - t0s) / 1000).toFixed(1)}s`);

  const startBlock = parseInt(await rpc("eth_blockNumber"), 16);
  // Offer load at RATE tx/s in 100 ms ticks (nonce order per sender is preserved by index order).
  const tSend = Date.now();
  let sent = 0, rejected = 0;
  const sendErrors = new Map();
  const perTick = Math.max(1, Math.round(RATE / 10));
  while (sent < total) {
    const due = Math.min(total, Math.round(((Date.now() - tSend) / 1000) * RATE) + perTick);
    if (due > sent) {
      const chunk = raws.slice(sent, due);
      sent = due;
      for (let i = 0; i < chunk.length; i += 1000) {
        const res = await rpcBatch(chunk.slice(i, i + 1000).map((r) => ["eth_sendRawTransaction", [r]]));
        for (const x of res) if (x.error) { rejected++; sendErrors.set(x.error.message, (sendErrors.get(x.error.message) ?? 0) + 1); }
      }
    }
    await sleep(100);
  }
  const sendSecs = (Date.now() - tSend) / 1000;
  log(`offered ${sent.toLocaleString()} txs in ${sendSecs.toFixed(1)}s (${(sent / sendSecs).toFixed(0)}/s achieved) · rejected ${rejected}${sendErrors.size ? " " + JSON.stringify([...sendErrors].slice(0, 3)) : ""}`);

  // Wait for the pool to drain (or stall). Capacity itself comes from the producer log below.
  let lastPending = Infinity, lastChange = Date.now(), included = 0;
  for (;;) {
    const st = await poolSize().catch(() => lastPending);
    if (st === 0) { lastPending = 0; break; }
    if (st < lastPending) lastChange = Date.now();
    lastPending = st;
    if (Date.now() - lastChange > 60000) { log(`pool stalled at ${st} pending`); break; }
    await sleep(1000);
  }
  included = sent - rejected - (lastPending === Infinity ? 0 : Math.min(lastPending, sent));
  // Capacity is measured from the producer's own log: ms-precision timestamps, txs per block and the
  // pending backlog. Only blocks produced while a backlog remained count — i.e. chain-limited blocks.
  const prod = [];
  try {
    // QBFT rotates the proposer: merge "Produced block" lines from EVERY validator's log.
    const names = execFileSync("docker", ["ps", "--filter", "name=^sat-v", "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    const logs = names
      .map((nm) => execFileSync("docker", ["logs", "--since", `${Math.ceil((Date.now() - tSend) / 1000) + 30}s`, nm], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }))
      .join("\n");
    const re = /^(\S+ \S+)\+00:00 .*Produced block #([\d,]+) \/ (\d+) tx \/ (\d+) pending \/ ([\d,]+) \(([\d.]+)%\) gas/gm;
    for (const m of logs.matchAll(re)) prod.push({ t: Date.parse(m[1].replace(" ", "T") + "Z"), n: Number(m[2].replace(/,/g, "")), txs: Number(m[3]), pending: Number(m[4]), gas: Number(m[5].replace(/,/g, "")), pct: Number(m[6]) });
  } catch (e) {
    log("could not read producer log:", e.message);
  }
  prod.sort((a, b) => a.n - b.n);
  for (let i = prod.length - 1; i >= 0; i--) if (prod[i].n <= startBlock) prod.splice(i, 1);
  // saturated run: consecutive blocks that left a backlog behind; rate = txs in blocks (i+1..j) / (t_j - t_i)
  const sat = prod.filter((b) => b.pending > 0 && b.txs > 0);
  let tps = NaN, winBlocks = 0, interval = NaN, txsMed = NaN, gasPct = NaN;
  if (sat.length >= 3) {
    const win = sat.slice(1); // first saturated block's start time is unknown → use it as t0
    const tx = win.reduce((a, b) => a + b.txs, 0);
    const span = (sat[sat.length - 1].t - sat[0].t) / 1000;
    tps = tx / span;
    winBlocks = win.length;
    interval = span / win.length;
    const sorted = win.map((b) => b.txs).sort((a, b) => a - b);
    txsMed = sorted[Math.floor(sorted.length / 2)];
    gasPct = win.reduce((a, b) => a + b.pct, 0) / win.length;
  }
  const gasPerSec = sat.slice(1).reduce((a, b) => a + b.gas, 0) / Math.max(1e-9, (sat.length >= 3 ? (sat[sat.length - 1].t - sat[0].t) / 1000 : NaN));
  const txsPerBlock = { median: txsMed };
  const window = { length: winBlocks };
  const blockInterval = interval;
  const med = (x) => x;
  const buildMs = [];
  const perPayment = TYPE === "payment" ? 4 : 1;
  const result = {
    at: new Date().toISOString(), label: args.label ?? "", chain: params, type: TYPE, offeredRate: RATE, seconds: SECONDS,
    offered: sent, rejected, included,
    sustainedTxPerSec: tps, sustainedPaymentsPerSec: TYPE === "payment" ? tps / perPayment : undefined,
    gasPerSec, blocks: window.length, blockIntervalS: blockInterval,
    txsPerBlock, avgBlockGasPct: gasPct, saturatedBlocks: winBlocks,
    drained: included >= sent - rejected,
  };
  log(
    `RESULT ${TYPE}: ${tps.toFixed(0)} tx/s sustained${TYPE === "payment" ? ` = ${(tps / 4).toFixed(0)} payments/s` : ""} · ` +
      `${(gasPerSec / 1e6).toFixed(0)} Mgas/s · ${winBlocks} saturated blocks @ ${blockInterval.toFixed(2)}s · ${txsMed} tx/block (median) · ${gasPct.toFixed(0)}% of gas limit` +
      `${result.drained ? "" : " · DID NOT DRAIN"}`
  );
  fs.mkdirSync("results-raw", { recursive: true });
  fs.appendFileSync("results-raw/results.jsonl", JSON.stringify(result) + "\n");
}

main().catch((e) => {
  console.error("load aborted:", e?.stack ?? e);
  process.exit(1);
});
