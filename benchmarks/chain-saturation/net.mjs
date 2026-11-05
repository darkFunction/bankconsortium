// net.mjs — create / destroy a throwaway Besu QBFT network in plain Docker (NOT the Paladin kind
// cluster). Containers are named sat-v<i>, network "besu-sat"; validator 1's RPC is on 127.0.0.1:18545.
//
//   node net.mjs up   --validators 1 --block-ms 1000 [--parallel] [--accounts 512]
//   node net.mjs down
import { Wallet, keccak256, toUtf8Bytes } from "ethers";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const IMAGE = "hyperledger/besu:25.8.0"; // same as the Paladin cluster
const NET = "besu-sat";
const SUBNET = "172.31.250.0/24";
const ip = (i) => `172.31.250.${10 + i}`;
const args = Object.fromEntries(
  process.argv.slice(3).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : null)).filter(Boolean)
);
const sh = (cmd, a, opts = {}) => execFileSync(cmd, a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
const shQuiet = (cmd, a) => { try { return sh(cmd, a); } catch { return ""; } };

export const loadAccount = (i) => new Wallet(keccak256(toUtf8Bytes(`chain-saturation-sender-${i}`)));
export const CHAIN_ID = 4242;

function down() {
  const names = shQuiet("docker", ["ps", "-a", "--filter", "name=^sat-v", "--format", "{{.Names}}"]).split("\n").filter(Boolean);
  if (names.length) sh("docker", ["rm", "-f", ...names]);
  shQuiet("docker", ["network", "rm", NET]);
  console.log(`removed ${names.length} container(s) and network ${NET}`);
}

function up() {
  down();
  const V = Number(args.validators ?? 1);
  const blockMs = Number(args["block-ms"] ?? 1000);
  const parallel = !!args.parallel;
  const accounts = Number(args.accounts ?? 512);
  const dir = path.resolve("net");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const vals = Array.from({ length: V }, (_, i) => new Wallet(keccak256(toUtf8Bytes(`chain-saturation-validator-${i}`))));
  fs.writeFileSync(path.join(dir, "validators.json"), JSON.stringify(vals.map((w) => w.address.toLowerCase())));
  const extraData = sh("docker", ["run", "--rm", "-v", `${dir}:/net:z`, IMAGE, "rlp", "encode", "--from=/net/validators.json", "--type=QBFT_EXTRA_DATA"]).split("\n").pop();

  const qbft = { blockperiodseconds: Math.max(1, Math.round(blockMs / 1000)), epochlength: 30000, requesttimeoutseconds: 4 };
  // Besu 25.8 reads the EXPERIMENTAL key for sub-second periods (verified: the plain key is ignored).
  if (blockMs < 1000) Object.assign(qbft, args["ms-key"] === "plain" ? { blockperiodmilliseconds: blockMs } : { xblockperiodmilliseconds: blockMs });
  if (args["empty-period-s"]) qbft.xemptyblockperiodseconds = Number(args["empty-period-s"]); // as in the Paladin operator genesis
  const alloc = {};
  // deployer is account 0; load.mjs senders are accounts 1..N
  for (let i = 0; i <= accounts; i++) alloc[loadAccount(i).address.toLowerCase().slice(2)] = { balance: "0x" + (10n ** 30n).toString(16) };
  const genesis = {
    config: { chainId: CHAIN_ID, berlinBlock: 0, londonBlock: 0, shanghaiTime: 0, zeroBaseFee: true, qbft },
    nonce: "0x0", timestamp: "0x0", gasLimit: "0x29B92700" /* 700M, as the Paladin chain */, difficulty: "0x1",
    mixHash: "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    coinbase: "0x0000000000000000000000000000000000000000", extraData, alloc,
  };
  fs.writeFileSync(path.join(dir, "genesis.json"), JSON.stringify(genesis, null, 1));

  sh("docker", ["network", "create", "--subnet", SUBNET, NET]);
  const enodes = vals.map((w, i) => `enode://${w.signingKey.publicKey.slice(4)}@${ip(i)}:30303`);
  vals.forEach((w, i) => {
    fs.mkdirSync(path.join(dir, `v${i}`), { recursive: true });
    fs.writeFileSync(path.join(dir, `v${i}`, "key"), w.privateKey);
    const flags = [
      "--genesis-file=/net/genesis.json", `--data-path=/net/v${i}/data`, `--node-private-key-file=/net/v${i}/key`,
      "--rpc-http-enabled", "--rpc-http-host=0.0.0.0", "--rpc-http-api=ETH,NET,QBFT,TXPOOL,WEB3,ADMIN", "--host-allowlist=*",
      "--rpc-http-max-batch-size=5000", "--rpc-http-max-active-connections=200",
      "--min-gas-price=0", "--tx-pool-min-gas-price=0", "--tx-pool-max-prioritized=200000",
      "--tx-pool-max-future-by-sender=5000", "--tx-pool-layer-max-capacity=1000000000",
      "--data-storage-format=BONSAI", `--p2p-host=${ip(i)}`, "--logging=INFO",
      ...(V > 1 ? [`--bootnodes=${enodes.filter((_, j) => j !== i).join(",")}`] : []),
      ...(parallel ? ["--bonsai-parallel-tx-processing-enabled=true"] : []),
      ...(args["select-pct"] ? [`--poa-block-txs-selection-max-time=${args["select-pct"]}`] : []),
    ];
    sh("docker", [
      "run", "-d", "--name", `sat-v${i}`, "--network", NET, "--ip", ip(i), "-v", `${dir}:/net:z`, "--user", `${process.getuid()}:${process.getgid()}`,
      ...(i === 0 ? ["-p", "127.0.0.1:18545:8545"] : []), IMAGE, ...flags,
    ]);
  });
  fs.writeFileSync(path.join(dir, "params.json"), JSON.stringify({ validators: V, blockMs, parallel, selectPct: args["select-pct"] ?? "75 (default)", accounts, qbft }, null, 1));
  console.log(`started ${V} validator(s), block ${blockMs} ms, parallel=${parallel}, ${accounts} funded senders → http://127.0.0.1:18545`);
}

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "up") up();
  else if (process.argv[2] === "down") down();
  else console.log("usage: node net.mjs up|down [--validators N] [--block-ms 1000] [--parallel]");
}
