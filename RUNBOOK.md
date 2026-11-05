# Runbook: environment, new recordings, DvP stress test

`BACKEND.md` describes the original *plan* (a capture template under `capture/`).
What actually got built is a little different, and this file documents that.
Each use case is a standalone TypeScript example in the Paladin repo. It drives
the real flow on a 4-node cluster, probes every node to see who can read what,
and writes the recording itself.

## 1. Where everything lives

| Thing | Location |
|---|---|
| UI + published recordings | this repo (`paladin-demo.html`, `app.jsx`, `recordings/`) |
| Backend / capture scripts | `~/Code/tutorials/paladin/examples/sam-*` |
| Paladin source + SDK | `~/Code/tutorials/paladin` (clone of LFDT-Paladin/paladin @ `47bfed5c9`) |
| Cluster | kind cluster `paladin`, **Docker** provider, Paladin operator **v0.15.0** (helm) |
| 4th node manifest | `~/Code/tutorials/paladin/examples/sam-noto/k8s/node4.yaml` |

> ⚠️ The `sam-*` folders are **untracked** in the Paladin clone. A `git clean -fdx`
> there would delete all of the backend work. Commit them to a branch, or move them
> here; they depend on `file:../../sdk/typescript` and `file:../common`, so they
> would need those paths adjusted.

| Example | Writes | Nodes |
|---|---|---|
| `sam-simple-token-transfer` | `simple-token.json` | 3 |
| `sam-noto` | `noto-bond.json` | 4 |
| `sam-zeto` | `zeto-kyc.json` | 4 |
| `sam-stablecoin` | `stablecoin.json` | 4 |
| `sam-dvp` | `dvp.json` (+ `npm run bench`, see §4) | 4 |
| `sam-private-payment` | `private-payment.json` (+ `npm run bench`) | 3 (node1 = Bank C, the outsider) |

Node ↔ party mapping (all 4-node examples): node1 = CSD / notary / issuer,
node2 = Bank A, node3 = Bank B, node4 = Regulator.
Host ports are `31548` / `31648` / `31748` for nodes 1 to 3 (kind NodePort mappings), and
`31848` for node4 (needs a port-forward, because kind can't add host mappings after creation).

> There is **also** a Podman-provider kind cluster called `paladin`
> (`podman ps -a`). Its QBFT consensus stalled at block 164 on 1 June, and it
> has none of the later state. It binds the same host ports. **Don't start it.**

## 2. Bring the environment back up

```shell
sudo systemctl start docker
docker start paladin-control-plane paladin-worker     # no-op if already running
kind export kubeconfig --name paladin                 # API port/creds change on restart
kubectl get pods -n paladin -w                        # wait: besu-node1..4, paladin-node1..4 Ready (2/2)
```

If node4 is missing (`kubectl get paladin -n paladin`), re-apply it:

```shell
kubectl apply -f ~/Code/tutorials/paladin/examples/sam-noto/k8s/node4.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Ready paladin/node4 -n paladin --timeout=300s
kubectl get paladinregistrations -n paladin           # node4 PUBLISHED = 2
```

node4's RPC is only needed by the capture scripts (`npm run start`), not by the benchmark:

```shell
kubectl port-forward -n paladin svc/paladin-node4 31848:8548   # leave running
```

**After a long shutdown (verified 2026-11-04), expect three problems:**

1. *Paladin pods CrashLoopBackOff* with `listen unix /app/jna/p.1.sock: bind: address already in use`.
   That's a stale socket in the pod's scratch (emptyDir) volume, so delete the pods to get fresh ones (data is on PVCs):
   `kubectl delete pod -n paladin paladin-node1-0 paladin-node2-0 paladin-node3-0 paladin-node4-0`
2. *The chain doesn't advance* (`eth_blockNumber` is stuck, Besu logs say "Moved to round N"), and
   `admin_peers` is empty. Besu resolves its static peers' DNS names only at startup, so if it came up before
   CoreDNS it never connects. Delete the Besu pods: `kubectl delete pod -n paladin besu-node{1,2,3,4}-0`
3. *mTLS between nodes fails* (`certificate signed by unknown authority`). cert-manager rotated the
   self-signed transport certificates, but the registry still publishes the old ones. Make the operator
   republish them by clearing its record of the publish transaction:
   ```shell
   for n in node1 node2 node3 node4; do
     kubectl patch paladinregistration $n -n paladin --subresource=status --type=json \
       -p '[{"op":"remove","path":"/status/publishTxs/grpc"}]'
   done
   ```
   This will recur every time the certificates renew (roughly every 60 days).

Health checks:

```shell
j='-H content-type:application/json'
# chain is producing blocks (run twice; the number must increase within ~10 s)
curl -s $j -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' http://127.0.0.1:31545
# node1 sees its peers, and can resolve the Regulator on node4
curl -s $j -d '{"jsonrpc":"2.0","id":1,"method":"transport_peers","params":[]}' http://127.0.0.1:31548
curl -s $j -d '{"jsonrpc":"2.0","id":1,"method":"ptx_resolveVerifier","params":["regulator@node4","ecdsa:secp256k1","eth_address"]}' http://127.0.0.1:31548
```

## 3. Make a new recording

1. **Start from `sam-dvp`.** It's the most complete template: 4 nodes, per-node
   probes, PASS/FAIL visibility checks, and `see` lists derived from what each node actually returned.
   ```shell
   cd ~/Code/tutorials/paladin/examples
   cp -r sam-dvp sam-<usecase> && cd sam-<usecase>
   rm -rf node_modules recordings visibility-report.json bench-results src/bench.ts
   # package.json: rename, drop the "bench" script · README.md: rewrite
   npm install
   ```
2. **Edit `src/index.ts`.** Keep the same structure:
   - drive the flow with the SDK;
   - call `snapshot()` after each interesting step (it asks *every* node for the balance or state);
   - add `check()`s that assert the privacy story you want to tell;
   - build the recording, deriving each `see` list from the snapshots (not hand-written);
   - write `recordings/<id>.json`.
3. **Run it:** `npm run start`. It exits non-zero if any visibility check fails.
   **Don't publish a recording from a failing run**, because the UI would then show
   something the nodes didn't actually enforce.
4. **Publish it to the demo:**
   ```shell
   cp ~/Code/tutorials/paladin/examples/sam-<usecase>/recordings/<id>.json ~/"Code/Bank consortium/recordings/"
   ```
   Then add `{ "id", "name", "tagline" }` to `recordings/index.json`.
5. **Preview:** `python3 -m http.server 8000` in this repo, then open
   <http://localhost:8000/paladin-demo.html>.

Fields that `BACKEND.md` doesn't cover but the UI already supports (see `dvp.json` for examples):
fact `kind: "perm"` (visible to consortium members, not the public); party
`kind: "consortium"` with `viewer: "<viewerId>"`; top-level `groups` plus per-party
`groups: [...]` (privacy-group chips); and on motion entries, `see: [...]` and `shielded: true`.

**Re-capturing an existing use case** (for example after a cluster reset) just means re-running
`npm run start` in its folder and copying the JSON across. Addresses change; amounts don't.

**Version caveat:** the cluster runs Paladin **v0.15.0**, while the local SDK is newer.
The Noto lock, prepare-unlock and delegate flows have to use the V0 private ABI
(`src/abis/INotoPrivate_V0.json`), which is why `sam-dvp` calls `prepareUnlock`/`delegateLock`
through raw `ptx.sendTransaction` and not through the SDK helpers. Upgrading the cluster
would let you drop that, but it would also change the numbers in §4.

## 4. Stress-testing the DvP

`examples/sam-dvp/src/bench.ts` (`npm run bench`) runs **the exact trade modelled in
`dvp.json`**, many times and concurrently, and measures what it costs.

Each trade:

| # | Phase | Who / node | On the base ledger? |
|---|---|---|---|
| 1 | `bond.lock` (400) | Bank A / node2 → CSD notary → oversight Pente group | yes |
| 2 | `bond.prepareUnlock` (→ Bank B) | Bank A / node2 → notary → hook | yes |
| 3 | `cash.lock` (10,000) | Bank B / node3 (ZK proof) | yes |
| 4 | `cash.prepareTransferLocked` (→ Bank A) | Bank B / node3 (ZK proof) | no (prepared only) |
| 5 | `atom.create` | CSD / node1 | yes |
| 6 | `bond.delegateLock` (→ Atom) | Bank A / node2 → notary → hook | yes |
| 7 | `cash.delegateLock` (→ Atom) | Bank B / node3 | yes |
| 8 | `atom.execute` | Bank B / node3 | yes, and both legs settle here atomically |

The bond and cash legs (1–2 and 3–4) run in parallel, as two independent banks would.
The two delegations (6 and 7) are also parallel. `--sequential-legs` reproduces the strictly
serial order used by `index.ts`.

**Setup is not timed.** Setup deploys fresh contracts and gives each worker its own pair of
sub-accounts (`bankA-w<i>@node2` and `bankB-w<i>@node3`), pre-funded, so concurrent trades never
compete for the same UTXOs. All workers still share the CSD notary, the single oversight group and
the CSD's settlement key, just as the modelled deployment would. That shared path is part of what's
being measured.

### How to run

```shell
cd ~/Code/tutorials/paladin/examples/sam-dvp
npm run bench -- --concurrency 1 --trades-per-worker 3 --label smoke    # sanity check
npm run bench -- --concurrency 1,2,4,8,16 --trades-per-worker 10 --label sweep
npm run bench -- --concurrency <knee> --duration 600 --label sustained  # is it actually sustainable?
npm run bench -- --concurrency 1,4,<knee> --notary-mode basic --label no-hooks   # cost of the oversight hook
```

Options: `--concurrency a,b,c` · `--trades-per-worker N` | `--duration S` · `--warmup N`
(default 1 per worker, not measured) · `--notary-mode hooks|basic` · `--sequential-legs` ·
`--bond-amount` / `--cash-amount` · `--besu URL` (default node1 Besu, `:31545`) ·
`--block-period-ms` (default 1000; see the block-time note below) · `--poll-ms` (default 200) ·
`--step-timeout-s` (default 300) · `--label` · `--out DIR`.

Each run writes `bench-results/<timestamp>-<label>.json` (every trade, every phase, every tx hash)
and a `.md` summary with:

- **Throughput:** settled DvP/s, both overall and *steady-state*. Steady-state counts completions
  between the 10th and 90th percentile completion times, which strips out ramp-up and drain.
- **Latency:** end-to-end p50, p90 and p99, plus p50 and p90 for each phase, so you can see where the time goes.
- **Base-ledger footprint:** gas per DvP (from the receipts of each phase, cross-checked by scanning
  every block in the run), base-ledger transactions per DvP, and peak block utilisation.
- **Chain gas ceiling:** `blockGasLimit ÷ gas-per-DvP × blocks/s`. This is the most the *chain*
  could carry before Paladin's off-chain work, ZK proving or EVM execution time get involved.
- **Host CPU** during each level. kind runs on this machine, so ~100% means the laptop itself is the bottleneck.
- **Ledger cross-check:** for every worker, the bond Bank B received and the cash Bank A received must
  both equal settled trades × amount. That confirms every counted DvP really moved both legs.

### Reading the numbers honestly

- **Method:** sweep the concurrency first. Throughput rises until some shared resource saturates,
  then flattens while latency keeps climbing; that point is the knee. Then run `--duration` at or
  just below the knee for 5–10 minutes. If throughput holds and p99 stays flat, that's your
  *sustainable* rate. If it decays, something (DB growth, a backlog) isn't keeping up.
- **This is one laptop.** Eight JVM/Go processes and four Postgres sidecars share 16 cores in a single
  kind worker. The measured DvP/s is a **floor** for real hardware, not a property of Paladin.
  The gas ceiling *is* a property of the chain configuration (700M gas per block).
- **Paladin traffic sees ~1 s blocks, not 100 ms.** Besu does apply the operator's 100 ms
  `xblockperiodmilliseconds`, but the genesis also sets `xemptyblockperiodseconds: 10`. Whenever the
  pool is momentarily empty (which closed-loop Paladin traffic always causes), Besu falls back to
  once-per-second checks, so each sequential base-ledger step costs about 1 s. Removing the empty-block
  period brings inclusion down to about 0.3 s (reproduced on a standalone chain; `benchmarks/FINDINGS.md` §4a).
  It costs a few empty blocks per second and needs a genesis change on every node.
- **Expected hot spots:**
  - Every bond operation runs through the one oversight Pente group (CSD + Regulator).
    That's a single serialised state machine, so at high concurrency it's the most likely knee.
    `--notary-mode basic` removes it and shows what it costs.
  - Both Zeto proofs run on node3's CPU, because Bank B is one node.
  - `atom.create` is always signed by the CSD's single key, so its nonces are serialised.
- **Paladin's "fast" claims** are mostly about the private-transaction pipeline: it can sequence
  dependent private transactions without waiting for blocks. Each DvP here produces 7 base-ledger
  transactions, and at least 5 of them wait on one another (bond lock → prepareUnlock → atom.create
  → delegate → execute), so per-trade latency will never be "instant". Throughput (concurrent trades)
  is the number to compare.

### Building-block benchmark (`npm run prims`)

`src/prims.ts` measures single operations, so composite designs can be costed from them:
`--scenario zeto | noto | pente-pair | pente-shared` with `--concurrency` = number of independent
bank pairs (directions alternate A→B / B→A) and `--ops-per-worker N`. Results so far, plus the
extrapolation to 20 banks and to better hardware, are in [`benchmarks/FINDINGS.md`](benchmarks/FINDINGS.md).

### Chain-only saturation (`benchmarks/chain-saturation/`)

This measures what one Besu chain can execute per second, with Paladin out of the picture, using a
throwaway Docker network (containers `sat-v*`; the Paladin cluster is untouched). See its README.
