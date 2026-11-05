# Rayls and Nightfall_4: throughput investigation

*2026-11-05. **Not measured.** Running Rayls's stack locally was blocked by this session's permission
settings, so everything here comes from reading the open-source code, the vendor's own documentation and
public reports. Derived figures are marked **estimate**. Vendor sources are shallow-cloned (read, not built
or run) in `~/Code/rayls-eval/vendor/`.*

## Rayls in one paragraph

Each bank runs a **Privacy Node**: its own single-operator EVM chain (`axyl`: Reth execution, Narwhal/Bullshark
consensus), where it can run any Solidity. Between banks, cash moves with **Enygma**. The bank's relayer
collects its customers' outgoing transfers, proves a **batch** with one Groth16 proof (gnark), and submits it to
the shared **Private Network Hub**. The hub is **Hyperledger Besu with QBFT and ~5 s blocks**, and keeps an
encrypted (Pedersen) balance per *bank* per token. The receiving bank's relayer decrypts the batch and mints to
its customers on its own Privacy Node. The vendor's "10k+ TPS" claim is for a single Privacy Node, meaning
transfers *inside* one bank, not between banks.

## Throughput between banks

**Structural limit: one batch per bank, per token, per hub block.**
- The nullifier is `Poseidon(bank secret, hub block number)` (`docs/learn/protocols/enygma/state-management.md`;
  `EnygmaV1.sol` rejects a reused nullifier).
- The relayer runs one cycle per token: fetch up to 1,000 queued transfers, prove, submit, wait, then send a
  finalization transaction (`rayls-sovereign-relayer/private-relayer/source/service/enygma.go`). It processes
  2 tokens at a time by default (`PRIVACY_NODE_EXECUTOR_ENYGMA_MAX_CONCURRENT_RESOURCE_IDS=2`).
- The vendor puts one cycle at about 17 s for k=4 (1 s state fetch, ~5 s proof, ~10 s hub submission), and
  end-to-end transfer latency at **20–60 s** (`docs/build/advanced/enygma-privacy.md`).
- Proof generation takes ~2 s for k=2 and ~10 s for k=6 (`privacy-node-components.md`). Verifying a batch costs
  ~250k gas.
- The vendor rates the hub at **~100–500 TPS**, and adding validators adds resilience, not throughput
  (`hub-components.md`).

| Mode | Per bank, per token | 20 banks, one token (**estimate**) | Latency |
|---|---|---|---|
| **No batching** (1 payment per batch) | ≤ 0.2/s at the 5 s block limit; ~0.06/s at the vendor's 17 s cycle | **~1–4 payments/s** | 20–60 s |
| Batching (up to 1,000 per batch) | up to ~1,000 per 17–30 s cycle | ~700–1,200/s; the hub's gas fits within Besu capacity | 20–60 s, all payments in a batch settle together |

Sharding cash over several token contracts multiplies both rows, as with Zeto. Batches aren't netted: each
batch moves one bank's outgoing total to each destination bank. But the hub only ever sees per-bank aggregates,
and every payment in a batch settles at the same moment. That is settlement batching, and it's how Rayls gets
its throughput.

**Independent evidence.** Brazil's central bank Drex pilot, phase 1:
- The privacy solutions tested (Rayls, Anonymous Zether, Starlight) kept transactions anonymous, but limited what
  authorities could see, at the cost of other functionality.
- The Drex platform as a whole reached up to **125 TPS**, which the central bank warned may not be enough for a
  national financial system.
- I found no Rayls-specific TPS figure from the central bank.

## Privacy and blast radius

- **The operator can decrypt everything, by design** (`docs/learn/governance/decryption.md`).
  - Each bank's view private key is encrypted to the operator's ML-KEM key and **stored on the hub chain**.
  - At startup, the operator's Governance Listener recovers every bank's key, derives every pair's shared secret,
    and decrypts all payment messages, which are also on the hub chain.
  - So one operator key decrypts all history. That's the same blast-radius class as a TEE.
  - Using ML-KEM protects against future quantum decryption, not against key theft.
  - Bank keys can be rotated. I found no threshold scheme or rotation for the operator's key.
- **Pairwise secrets are static:** each bank pair agrees one shared secret and reuses it for every message, so
  there's no forward secrecy.
- **Anonymity set ≤ 6 banks per batch, however large the network** (`maxAnonymityBanks`, `getAnonymityIndex` in
  `enygma/service/batcher.go`).
- **Solidity between banks is asynchronous.** A transfer can carry up to 5 "callables", executed on the
  destination chain after its mint. Atomic DvP goes through a separate ZkDvP note pool on the hub
  (~400k gas, ~10 s per swap, per the vendor).

## Nightfall_4 (EY, open source, CC0)

**Yes, it's a shielded pool:** UTXO commitments and nullifiers, a UltraPlonk proof from each client, and a ZK-ZK
rollup (`doc/nf_4.md`).
- **Proof batching cuts on-chain cost to ~6,000 gas per transfer.** A proposer assembles a block of **64** transfers
  and proves the whole block once.
  - On the Besu chain we measured (~100 Mgas/s), that's ~16,000 transfers/s of chain capacity.
  - So the chain is no longer the limit. This is the "proof-level batching" lever in `FINDINGS.md` §4b.
- **The bottleneck moves to the proposer.**
  - One proposer is active at a time (round-robin).
  - A block proof needs **144 cores and 750 GB of RAM**, and its proving time isn't published.
  - Reaching 2,000 transfers/s would mean proving a 64-transfer block every 32 ms.
  - Block assembly waits up to **120 s** for a block to fill: first check after 15 s, target 25% full
    (`nightfall.toml`).
- **Clients prove one transaction at a time**, taking "some seconds" each, so a bank needs many client instances
  to send in parallel.
- **Not programmable.** It supports deposit, transfer, withdraw, and an atomic two-party swap of different tokens
  matched in the same block (a DvP), but no Solidity logic over private state.
- **Access** is gated by X.509 certificates, with a sanctions-list check.
- **Maturity:** its README says it is experimental and shouldn't be used for significant-value transactions. EY
  disclaims ownership and liability.

## What measuring Rayls would take

1. Build `rayls-sovereign-cli` (Go) from source.
2. Run `rayls init --full --members 4 --no-blockscout`. That pulls about a dozen public images from Rayls's AWS ECR
   (hub, relayers, gnark proof API, Privacy Nodes, governance) and needs no testnet funds.
3. Drive `crossTransfer()` at increasing rates with batching effectively off (one payment per cycle), then on.
   Record per-payment latency, throughput, proof time per k, and hub gas per batch.
