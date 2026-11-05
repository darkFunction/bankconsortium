# Primitive: pente-pair — 2026-11-04T18:47:40.136Z (sweep)

10 ops/worker · 16 CPUs host

| C (pairs) | settled/attempted | retries | ops/s | steady ops/s | p50 s | p90 s | p99 s | gas/op | base txs/op | cluster CPU-ms/op | busiest container (cores) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 10/10 | 0 | 0.95 | 0.91 | 1.01 | 1.21 | 1.21 | 145,838 | 1.0 | 334 | paladin-node3-0/paladin 0.10 |
| 2 | 20/20 | 0 | 1.83 | 1.90 | 1.01 | 1.21 | 1.21 | 145,837 | 1.0 | 231 | paladin-node3-0/paladin 0.12 |
| 4 | 40/40 | 0 | 3.60 | 4.03 | 1.01 | 1.21 | 1.22 | 145,836 | 1.0 | 167 | paladin-node3-0/paladin 0.19 |
| 8 | 71/74 | 0 | 6.39 | 6.30 | 1.02 | 1.21 | 1.22 | 145,828 | 1.0 | 155 | paladin-node3-0/paladin 0.30 |
| 16 | 150/153 | 0 | 13.46 | 14.99 | 1.02 | 1.22 | 1.22 | 145,834 | 1.0 | 138 | paladin-node3-0/paladin 0.53 |
| 32 | 292/301 | 0 | 25.52 | 25.07 | 1.21 | 1.22 | 1.24 | 145,834 | 1.0 | 126 | paladin-node3-0/paladin 0.82 |

## CPU-ms per op by container (C=32)

- paladin-node1-0/paladin: 1 ms · 0.03 cores
- paladin-node1-0/postgres: 0 ms · 0.01 cores
- besu-node1-0/besu: 7 ms · 0.18 cores
- paladin-node2-0/paladin: 22 ms · 0.56 cores
- paladin-node2-0/postgres: 19 ms · 0.48 cores
- besu-node2-0/besu: 7 ms · 0.19 cores
- paladin-node3-0/paladin: 32 ms · 0.82 cores
- paladin-node3-0/postgres: 24 ms · 0.62 cores
- besu-node3-0/besu: 7 ms · 0.19 cores
- paladin-node4-0/paladin: 1 ms · 0.04 cores
- paladin-node4-0/postgres: 0 ms · 0.01 cores
- besu-node4-0/besu: 4 ms · 0.11 cores

## Errors

- C=8: `pente-pair failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x95ee10cf72d315c59543b972b276532c560f2137`
- C=16: `pente-pair failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x95ee10cf72d315c59543b972b276532c560f2137`
- C=32: `pente-pair failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x95ee10cf72d315c59543b972b276532c560f2137`
- C=32: `pente-pair failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0xcf0b9fae67cf46443a2075f3e3b42108287bf849`
- C=32: `pente-pair failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x4046dec46706d334c1c47ef88f23520fb61f304d`
