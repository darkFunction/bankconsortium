# Throughput boundaries: private bank-to-bank cash + side effect on Paladin

*Measured 2026-11-04 on Paladin v0.15.0 (kind, 4 Paladin + 4 Besu nodes, one 16-core / 30 GiB laptop).
Raw results are in [`results/`](results/); the harnesses are `sam-dvp/src/bench.ts` and `src/prims.ts` (see `RUNBOOK.md` §4).*

Below, **measured** means observed in these runs; **estimate** means derived from measured costs plus a
stated assumption. Read the caveats at the end before quoting any number.

## 1. Headline

- **The maximalist DvP peaks at about 0.7 DvP/s**, at 4–6 trades in flight, then collapses. This is not a
  hardware limit: the whole cluster used about 2 of 16 cores at the peak. The limit is the single
  oversight Pente group that every bond operation goes through, and its coordinating node's Postgres.
- **The building blocks are much faster and scale with the number of bank pairs.** With 1 s blocks, a
  Noto transfer, a Zeto transfer and a bilateral Pente call each confirm in about 1.0 s, and throughput
  rises linearly with independent pairs: 16–25 ops/s at 32 pairs, still on the same laptop.
- **The recommended design is now built and measured** (`sam-private-payment`; §3a). A private Zeto payment
  plus an atomic private side effect settles in **2 rounds, about 2.2 s**, using 3 base-ledger transactions
  (0.95M gas). It scales linearly with bank pairs (3.0/s at 8 pairs, 5.8/s at 16, 7.0/s at 32) until
  each bank's proving saturates at about **3.5 payments/s per paying bank per cash token**.
- **At network scale, the shared base ledger is the ceiling, not the banks' nodes.** Each bank brings its
  own node, so private capacity grows with the network. But every Besu node re-executes every
  transaction, and ZK verification makes each payment expensive to execute. For an atomic
  "Zeto cash + Pente side effect" payment, block import measured **10–17 ms per payment**, which caps the
  **whole network at about 60–100 payments/s on this hardware** (roughly 100–150 on fast servers), whether
  it has 4 nodes or 20. Better hardware buys about 1.5–2× (single-thread
  speed); going further needs batching, parallel execution, or more than one chain.

- **One chain, saturated directly** (§4a): a standalone Besu 25.8 chain on this laptop sustains about
  **100–115 Mgas/s whatever the configuration**. That's 114 design-C payments/s with 1 validator and 90/s
  with 4, about 320 Zeto-like or about 940 Noto-like transactions/s. Parallel execution, block period and
  block-building budget made no difference. **2,000 private payments/s doesn't fit on one chain**, except
  for plain Noto-style transfers on server hardware (§4b).
- **The 1 s latency per step is a configuration artefact.** The Paladin genesis's `xemptyblockperiodseconds`
  makes Besu fall back to once-a-second checks whenever its pool is momentarily empty, which closed-loop
  Paladin traffic always causes. Without it, transactions land in about 0.3 s (§4a).

## 2. What each building block costs (measured)

1 s blocks; each "pair" is a separate bank sub-account pair; directions alternate A→B / B→A.

| Building block | Base txs | Gas | Latency p50 | Throughput at 8 / 16 / 32 pairs | Node CPU per op | Block import per tx (follower) |
|---|---|---|---|---|---|---|
| **Noto transfer** (basic, notary = issuing bank) | 1 | 117k | 1.0 s | 7.3 / 14.6 / 16.7 ops/s | ~22 ms | ~2.5 ms |
| **Zeto_Anon transfer** (ZK) | 1 | 322k | 1.0 s → 2.0 s at 32 | 7.2 / 12.0 / 14.3 ops/s | **~310 ms** (proof) | ~5–8 ms |
| **Pente call, one group per pair** | 1 | 146k | 1.0–1.2 s | 6.4 / 13.5 / **25.5** ops/s | ~55–80 ms | ~3.5 ms |
| **Pente call, one shared group** (single lane) | 1 | 146k | 1.2 s → **6.3 s** at 32 | 6.9 / **9.7** / 3.2 ops/s | ~50–90 ms | ~3.5 ms |
| *Maximalist DvP (hooks + Atom)* | *8* | *2.76M* | *5.5 s → 18.5 s at 8* | *peak 0.7 DvP/s at C=6* | *~2.2 s* | — |

What limits each one:

- **Noto** scales linearly until one node's Postgres saturates: node2's sidecar Postgres hit 0.86 cores
  at 16 concurrent senders on that node. That's an untuned 1 GiB sidecar, so a real database moves the knee.
- **Zeto** levels off at about **7 transfers/s per sending node per token contract**, even though that
  node used only about 2.3 cores. The likely cause is that Paladin assembles each token's transactions
  on one sequencer per node, and the proof is generated during assembly, so proving is serial per
  (node, token). *Inference, not verified.* If correct, faster cores raise it, and splitting a bank's
  cash over several token contracts multiplies it.
- **Pente, one group per pair**, is the best-scaling primitive: a lane per pair, linear growth, flat latency.
- **Pente, one shared group**, peaks at about 10 tx/s with about 16 in flight, then *collapses*
  (latency ×5, throughput ÷3). Concurrent transactions race for the group's state (`PenteInputNotAvailable`,
  `Input state … not found`). Retries absorb this up to about 8 in flight; beyond that the coordinator thrashes.
  This is the pattern that limits the DvP: there each bond operation is a hook in one shared group,
  which gives about 3 hooked operations/s.

## 3. Minimal transaction graphs for "pay + side effect"

| Design | Base txs / payment | Proofs | Serialises on | Atomic? | Who sees the amount |
|---|---|---|---|---|---|
| A. Zeto transfer; side effect done separately | 1 | 1 | payer's token | no | payer, payee |
| B. Noto transfer; side effect done separately | 1 | 0 | issuer's notary | no | payer, payee, issuer |
| **C. Zeto lock delegated to the pair's Pente group → one group tx runs the side effect *and* releases the cash** (the pattern of `examples/bond` `BondSubscription.distribute()`) | **2** | 2 | **the pair's group** | **yes** | cash: A and B; side effect: group |
| C′. Same as C with Noto cash | 2–3 (V0 needs `prepareUnlock`) | 0 | pair group + issuer's notary | yes | + issuer |
| D. Noto hooks, hook = side effect | 1 | 0 | **one group per token, for every pair** | yes | notary + hook group |

**Recommendation: design C (or C′ if the cash issuer may see interbank flows).** It's the smallest
graph that keeps the payment and side effect atomic without a shared lane: there's no Atom deployment
(957k gas per trade), and each bank pair only ever contends with itself. **Avoid D** (and any shared
oversight group on the critical path) beyond low volume. Give regulators oversight asynchronously, or
through per-pair groups, instead.

## 3a. Design C, built and measured

`examples/sam-private-payment`. The contract is `contracts/PrivateSettlement.sol`; the replay tab is
"Private payment + side effect (2 rounds)".

```
round 1 (parallel):  Bank B: Zeto lock(amount, delegate = the A⇄B group)          base tx  346k gas
                     Bank B: group.bid(tradeId, units)  (pins what B pays for)     base tx  146k gas
then:                Bank B: prepareTransferLocked(→ Bank A)  (ZK proof, off-chain)  no tx     ~0.2 s
round 2:             Bank A: group.settle(tradeId, units, cash, transferLocked)    base tx  457k gas
                       └─ bond A→B in the private register  +  Zeto.transferLocked as a Pente
                          external call → ONE base-ledger tx (verified: its logs come from both
                          the group contract and the Zeto contract)
```

Visibility, checked on every node: only Bank A and Bank B can read the bond register or value the cash.
Bank C, a consortium member with a node on the same chain, is denied the group and values every balance at 0.

Sweep (one bilateral group per pair, 10 payments per pair, 1 s blocks):

| Pairs | Settled | Payments/s (steady) | p50 / p90 latency | Gas/payment | Chain import/payment | Node CPU/payment |
|---|---|---|---|---|---|---|
| 1 | 9/10 | 0.37 | 2.2 / 2.4 s | 949k | ~10 ms | ~0.85 s |
| 4 | 39/40 | 1.59 | 2.2 / 2.2 s | 949k | ~11 ms | ~0.75 s |
| 8 | 78/80 | 2.96 | 2.2 / 2.4 s | 949k | ~14 ms | ~0.74 s |
| 16 | 154/160 | 5.76 | 2.6 / 2.9 s | 949k | ~17 ms | ~0.76 s |
| 32 | 298/310 | 6.99 | 4.1 / 5.1 s | 949k | ~18 ms | ~0.78 s |

- **Knee:** about 7 payments/s with two paying banks. That's each bank's proving lane (about 7 proofs/s,
  and 2 proofs per payment) saturating on both nodes, exactly as predicted from the Zeto building block.
  More banks, or more cash token contracts per bank, add lanes.
- **Without the bid** (buyer trusts seller on quantity): 2 base txs, about 803k gas, same latency.
  The bid runs in parallel with the lock, so it costs gas and chain time, not latency.
- **Reliability:** 3.5% of payments failed (22/620) on Paladin v0.15 state races (`Failed to query states by IDs`
  on prepare; `no contract deployed at` on group txs). Retries never rescued one. **A failed payment leaves
  the buyer's cash locked to the group**, because this PoC contract has no refund path. Production needs a
  buyer-callable `refund(tradeId, preparedTransferBackToBuyer)` for unsettled trades; the group then
  releases the escrow, and whichever of settle/refund lands first wins.
- **Consent gap:** the seller should check the prepared cash output (value and owner) off-chain before
  calling `settle`. The contract can't, because amounts are ZK-hidden from it too. This check isn't implemented here.

## 4. Extrapolation: 20 banks, and better hardware (estimates)

Network throughput is bounded by the smallest of three things:

```
  (a) Σ over banks of each bank's send capacity       ← grows with every bank you add
  (b) per-pair lane capacity × pairs in use           ← grows with pairs; only binds on hot pairs
  (c) the base ledger's sequential execution rate     ← FIXED: every node re-executes every tx
```

| | (a) per bank | (a) 20 banks | (b) per pair | (c) chain ceiling |
|---|---|---|---|---|
| **Design C, Zeto cash**, this laptop (**measured**) | **~3.5/s** per cash token (measured knee); ~20/s CPU-bound with tokens sharded on 16 cores (0.75 CPU-s/payment) | 70/s (1 token per bank) → ~400/s (sharded) | ≤ ~10/s, and keep ≤ ~8 in flight | **~60–100/s** (1000 ms ÷ 10–17 ms measured) |
| Design C, Zeto, server-class cores | ~2× | 140 → 1000/s | ~2× (if lane-bound) | **~100–130/s** |
| Design C′, Noto cash, this laptop | not proof-bound (~20 ms CPU) | high (DB-bound) | ≤ ~10/s | **~110/s** (~9 ms per payment) |
| Plain Noto transfer (B), this laptop | ~20/s per node before its DB saturates | ~400/s | — | **~400/s** (~2.5 ms) |
| Gas-limit view (700M gas per 1 s block) | | | | 820 design-C payments/s; **not the binding limit**, because execution time binds first |

What that means:

- **Twenty banks don't make the system 5× faster than four.** They add private capacity, but under even
  load the shared chain becomes the limit at about 60–130 atomic ZK payments/s. With one cash token
  per bank, the 20 banks' proving capacity (~70/s) and the chain ceiling (~65/s) are roughly balanced.
- **More validators don't add capacity; they add consensus messages** (QBFT traffic grows with the
  square of the validator count). Keep 4–7 validators and run the other banks' Besu nodes as
  non-validating followers. Every follower still has to keep up with import.
- **Better hardware raises (a) almost linearly and (c) only modestly.** Block import runs on roughly one
  core per node, so only single-thread speed helps: perhaps 1.5–2× from a laptop to a fast server.
  The real ceiling therefore sits around **100–150 atomic ZK payments/s, or a few hundred non-atomic
  Noto payments/s**, unless the design changes.
- **Ways past the chain ceiling** (none measured yet):
  - **batching or netting**: one Atom or group transaction can settle many payments, and Zeto's batch
    circuits (already deployed on this cluster) take up to 10 inputs/outputs per proof, so the
    verification cost is spread across payments;
  - **cheaper verification**: Noto instead of Zeto where the issuer may see amounts;
  - **Besu parallel transaction execution**: experimental;
  - **more than one base ledger**: shard by currency or business line.
- **Latency is mostly block time.** Each sequential base-ledger step costs one block. A 250 ms block time
  would cut design C to under 1 s and the DvP to about 1.5 s; it doesn't change the ceilings above,
  which are set by execution time and sequencing.

## 4a. One chain, saturated (measured)

`benchmarks/chain-saturation/`: a throwaway Besu 25.8 QBFT network in plain Docker, flooded with pre-signed
synthetic transactions that do the same expensive on-chain work and gas as the real ones:
- **Zeto-like**, 355k gas: a 4-pair BN254 pairing, 5 ecMul and 5 ecAdd, 4 new slots, a 1 KB proof blob.
- **Noto-like**, 120k gas: one ecrecover and 4 new slots.
- **Pente-like**, 146k gas: two ecrecovers and 5 new slots.
- **Payment mix:** 2 Zeto-like + 2 Pente-like per payment, which is design C's chain work.

Capacity is read from the producers' own logs, counting only blocks produced while a backlog was pending.
512 senders, 16 contracts, 30 s of offered load above capacity per run.

| Config | Zeto-like tx/s | Noto-like tx/s | Pente-like tx/s | **Design-C payments/s** | Mgas/s |
|---|---|---|---|---|---|
| 1 validator, 1 s blocks | 317 | 935 | 799 | **114** | 111–116 |
| 1 validator, parallel execution on | 315 | 945 | — | 114 | 111–113 |
| 4 validators (same host) | 259 | 600 | — | **90** | 71–91 |
| 4 validators, parallel on | 257 | 557 | — | 83 | 66–90 |
| 1 validator: 100% build window / 2 s / 500 ms / 250 ms period | — | — | — | 98 / 99 / 103 / 114 | 98–113 |

**Besu's floor per transaction** (run 2026-11-05, `--type eth`): plain value transfers to fresh addresses, 21k gas and no
contract code, sustained **2,247 tx/s with 1 validator** (47 Mgas/s, 3,303 tx per block at 1.47 s) and **1,724 tx/s with
4 validators** (1.63 s blocks). That's about 0.45 ms of serial block pipeline per transaction even with nothing to execute,
so no Besu-based ledger gets past about 2,000 payments/s per chain on this hardware, however cheap the payment.
(One of the 512 senders was unfunded in these two runs, which rejected 0.2% of offered transactions; it doesn't affect
the saturated rate, and `net.mjs` now funds it.)

What it shows:
- **Capacity is a gas rate, about 100–115 Mgas/s on this laptop**, the same for every transaction type and
  configuration. Within a block-building window Besu executes at about 300 Mgas/s (about 1.2 ms per
  Zeto-like transaction). Building, importing and persisting the block stretch every saturated block cycle
  to about 1.8 s, whatever the configured period or build budget.
- **Parallel transaction execution gave nothing** (−0 to −7%), even though every transaction writes
  distinct storage slots, which is the best case for it.
- **4 validators cost about 20–35%.** On real hardware with a dedicated box per validator that's probably
  less, because here they also competed for one host's CPU.
- **Latency fix:** Besu honours sub-second periods (the experimental key works; the plain
  `blockperiodmilliseconds` key is ignored). But with `xemptyblockperiodseconds` set, as in the Paladin
  operator genesis, a transaction that arrives while the pool is empty waits for a once-per-second
  check. That reproduced the Paladin chain's 1.11 s cadence exactly. Without the empty-block period,
  transactions were included in about 0.3 s, at the cost of a few empty blocks per second. That would
  cut each sequential Paladin step from about 1 s to about 0.3 s. Throughput is unaffected.

## 4b. What 2,000 private payments/s would take

The chain's cost is gas, so the requirement converts directly:

| Payment design (one per payment) | Gas | Gas/s needed for 2,000/s | × this laptop's chain (~115 Mgas/s) | Proving CPU needed (all banks) |
|---|---|---|---|---|
| Design C: Zeto + atomic side effect (built) | 0.95M | 1.9 Ggas/s | **~17×** | ~1,500 cores (0.75 CPU-s each) |
| C′: Noto own-liability deposits + atomic side effect (est.) | ~0.5M | ~1.0 Ggas/s | ~9× | negligible |
| Plain Zeto transfer, side effect separate | 0.32M | 0.64 Ggas/s | ~6× | ~600 cores |
| Plain Noto transfer (own-liability) | 0.12M | 0.24 Ggas/s | **~2×** | negligible |

- **On one chain**, only plain Noto-style transfers come near 2,000/s, and only if server-class single-thread
  speed delivers the remaining ~2×. That's plausible but unmeasured. Anything ZK, or atomic with a side
  effect, is 6–17× short. Parallel execution and tuning don't close it (measured), and adding validators
  makes it slightly worse.
- **The way to 2,000/s is several base ledgers.** Design C at about 110/s per chain (laptop) or perhaps
  200/s per chain (server) means roughly **10–18 chains**; C′ means about 5–9. Banks are partitioned (by
  currency, region or business line), and atomic settlement only works *within* a chain.
- **Proving is the other wall for Zeto:** 2,000 design-C payments/s needs about 1,500 CPU cores of proving
  across the network (about 75 per bank with 20 banks). With Noto own-liability that cost disappears.
- **Batching at the proof level** (one proof and one transaction covering several outputs from the same
  payer) is the only lever that cuts *both* walls. It's untested here, and you've ruled out settlement batching.

## 5. Caveats and open questions

- **Block time is effectively 1 s for Paladin traffic.** The 100 ms period *is* applied, but the genesis's
  empty-block period makes Besu wait up to 1.1 s whenever its pool is momentarily empty (§4a). All
  Paladin latencies here are therefore about 1 s per sequential step; throughput figures aren't affected.
- **Chain saturation used synthetic transactions** that are gas- and precompile-matched to the real ones,
  not the real contracts (replaying real Paladin transactions at volume isn't possible: each spends
  unique states). Real Zeto verification runs a few more scalar multiplications than the proxy.
- **One laptop.** All nodes share one machine and an untuned sidecar Postgres per node. Node-side
  numbers are floors; the chain-import costs are the most hardware-independent figures here.
- **Short runs:** 10 ops per worker, roughly 10–60 s per level. Sustained runs (`--duration 600`) haven't
  been done, so "sustainable" isn't established yet.
- **Paladin v0.15 races:** `PenteInputNotAvailable`, `Input state not found`, `no contract deployed at`,
  and Zeto `Failed to query states by IDs` on prepare. They appear at moderate concurrency and need
  client retries; reliability under load is itself a finding. A newer Paladin may behave differently;
  untested.
- **Chain ceilings are estimates.** Import cost was inferred from a follower node's CPU (block import
  plus some RPC and gossip overhead), and assumes block import is effectively single-threaded. A
  chain-only replay test would pin these down.
- **Design C is a PoC.** It has no refund path and no seller-side check of the prepared cash (§3a), and the
  bond register is a toy. Its throughput and latency are measured; its chain ceiling is extrapolated from
  import cost at up to 7 payments/s, not observed at saturation.
