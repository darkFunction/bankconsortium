# Primitive: pente-shared — 2026-11-04T18:49:11.576Z (sweep)

10 ops/worker · 16 CPUs host

| C (pairs) | settled/attempted | retries | ops/s | steady ops/s | p50 s | p90 s | p99 s | gas/op | base txs/op | cluster CPU-ms/op | busiest container (cores) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 10/10 | 0 | 0.95 | 0.89 | 1.01 | 1.21 | 1.21 | 145,834 | 1.0 | 231 | paladin-node3-0/paladin 0.04 |
| 2 | 20/20 | 0 | 1.83 | 1.90 | 1.01 | 1.21 | 1.21 | 145,836 | 1.0 | 184 | paladin-node3-0/paladin 0.07 |
| 4 | 40/40 | 0 | 3.66 | 3.93 | 1.01 | 1.22 | 1.22 | 145,836 | 1.0 | 128 | paladin-node3-0/paladin 0.11 |
| 8 | 80/80 | 0 | 6.93 | 7.78 | 1.21 | 1.22 | 1.42 | 145,838 | 1.0 | 149 | paladin-node3-0/postgres 0.23 |
| 16 | 159/160 | 0 | 9.71 | 10.22 | 1.41 | 2.42 | 2.63 | 145,836 | 1.0 | 165 | paladin-node2-0/postgres 0.37 |
| 32 | 303/320 | 0 | 3.17 | 3.50 | 6.25 | 18.93 | 21.14 | 145,828 | 1.0 | 442 | paladin-node2-0/postgres 0.55 |

## CPU-ms per op by container (C=32)

- paladin-node1-0/paladin: 3 ms · 0.01 cores
- paladin-node1-0/postgres: 1 ms · 0.00 cores
- besu-node1-0/besu: 12 ms · 0.04 cores
- paladin-node2-0/paladin: 53 ms · 0.17 cores
- paladin-node2-0/postgres: 173 ms · 0.55 cores
- besu-node2-0/besu: 12 ms · 0.04 cores
- paladin-node3-0/paladin: 38 ms · 0.12 cores
- paladin-node3-0/postgres: 125 ms · 0.40 cores
- besu-node3-0/besu: 13 ms · 0.04 cores
- paladin-node4-0/paladin: 3 ms · 0.01 cores
- paladin-node4-0/postgres: 1 ms · 0.00 cores
- besu-node4-0/besu: 10 ms · 0.03 cores

## Errors

- C=16: `pente-shared failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x53cfabdd23d47ba7360ff13c632ba7252021ad54`
- C=32: `pente-shared failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x53cfabdd23d47ba7360ff13c632ba7252021ad54`
