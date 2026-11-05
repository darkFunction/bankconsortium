# Native BN254 verification throughput (measured 2026-11-05)

How fast can a validator verify Groth16 proofs (Zeto-style private payments) natively, outside the EVM, and does that
scale across cores? This uses Besu 25.8's own native BN254 library (gnark-crypto via besu-native), through `evmtool`.

Hardware: this laptop, AMD Ryzen 7 7700 (8 cores / 16 threads, Zen 3 as reported by evmtool), 32 GB.

## Single core

```shell
docker run --rm --cpus=1 --entrypoint /opt/besu/bin/evmtool hyperledger/besu:25.8.0 \
  benchmark --native altBn128 --warm-time=3 --exec-time=5
```

| Operation | Time per call |
|---|---|
| ecAdd | 3.2 µs |
| ecMul | 35–36 µs |
| 2-pair pairing check | 298 µs |
| **4-pair pairing check** (the core of a Groth16 verification) | **424 µs** |
| 6-pair pairing check | 552 µs |

A Groth16 verification is one 4-pair pairing check plus one scalar multiplication per public input. With about 6
public inputs for a 2-in/2-out transfer, that's about **0.42 + 6 × 0.036 ≈ 0.65 ms per proof on one core**.

## All cores (independent processes, one core each)

```shell
for i in $(seq 1 $N); do docker run --rm --cpus=1 --entrypoint /opt/besu/bin/evmtool hyperledger/besu:25.8.0 \
  benchmark --native altBn128 --pattern='4 pairings' --warm-time=5 --exec-time=10 & done; wait
```

| Processes | Time per check (each process) | Aggregate 4-pair checks/s | Scaling |
|---|---|---|---|
| 1 | 424 µs | 2,357 | — |
| 8 (one per physical core) | 460–465 µs | **17,335** | 92% of linear |
| 16 (with hyperthreads) | 808–836 µs | **19,368** | hyperthreading adds +12% |

## What this means

- **About 11,000–12,000 Groth16 verifications/s on this 8-core laptop** (0.65 ms per proof, 92% scaling). A 64-core
  server should manage roughly 8× that. That's an *estimate*, assuming the same near-linear scaling.
- **Compare:** inside Besu's EVM, a Zeto-like transfer costs ~1.2 ms of *serial* execution, and the block-commit cycle
  limits it to ~317/s per chain (`chain-saturation.jsonl`). Verification is stateless, so a ledger that verifies
  proofs in parallel, outside the serial EVM, gets ~35–40× more on the same hardware.
