# Private payment + atomic side effect — 2026-11-04T19:25:13.666Z (sweep)

With buyer bid (3 base txs, 2 rounds) · 10 payments/worker · one bilateral group per pair · host 16 CPUs

| C (pairs) | settled/attempted | payments/s | steady | p50 s | p90 s | p99 s | gas/payment | base txs/payment | cluster CPU-ms/payment | busiest container (cores) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 9/10 | 0.37 | — | 2.2 | 2.4 | 2.4 | 949k | 3.2 | 1348 | paladin-node3-0/paladin 0.29 |
| 2 | 20/20 | 0.90 | 0.96 | 2.2 | 2.2 | 2.2 | 949k | 3.0 | 1114 | paladin-node3-0/paladin 0.35 |
| 4 | 39/40 | 1.58 | 1.59 | 2.2 | 2.2 | 2.2 | 949k | 3.1 | 1074 | paladin-node3-0/paladin 0.62 |
| 8 | 78/80 | 3.16 | 2.96 | 2.2 | 2.4 | 2.6 | 949k | 3.1 | 1076 | paladin-node3-0/paladin 1.20 |
| 16 | 154/160 | 5.07 | 5.76 | 2.6 | 2.9 | 4.1 | 949k | 3.1 | 1120 | paladin-node3-0/paladin 1.99 |
| 32 | 298/310 | 2.08 | 6.99 | 4.1 | 5.1 | 5.7 | 949k | 3.1 | 1221 | paladin-node3-0/paladin 0.87 |

## Per phase (p50 / p90 s, retries)

| phase | C=1 | C=2 | C=4 | C=8 | C=16 | C=32 | mean gas |
|---|---|---|---|---|---|---|---|
| cash.lock | 1.0 / 1.2 | 1.0 / 1.0 | 1.0 / 1.2 | 1.2 / 1.2 | 1.2 / 1.4 | 1.8 / 2.6 | 346,327 |
| group.bid | 1.0 / 1.2 | 1.0 / 1.0 | 1.0 / 1.2 | 1.2 / 1.2 | 1.2 / 1.4 | 1.0 / 1.4 | 145,841 |
| cash.prepare | 0.2 / 0.2 | 0.2 / 0.2 | 0.2 / 0.4 | 0.4 / 0.6 | 0.6 / 0.8 | 1.4 / 1.6 | — |
| group.settle | 1.0 / 1.0 | 1.0 / 1.0 | 0.8 / 1.0 | 0.8 / 1.0 | 0.8 / 1.2 | 0.8 / 1.4 | 457,275 |

## CPU-ms per payment by container (C=32)

- paladin-node1-0/paladin: 8 ms · 0.02 cores
- paladin-node1-0/postgres: 3 ms · 0.01 cores
- besu-node1-0/besu: 46 ms · 0.09 cores
- paladin-node2-0/paladin: 358 ms · 0.74 cores
- paladin-node2-0/postgres: 114 ms · 0.24 cores
- besu-node2-0/besu: 48 ms · 0.10 cores
- paladin-node3-0/paladin: 420 ms · 0.87 cores
- paladin-node3-0/postgres: 129 ms · 0.27 cores
- besu-node3-0/besu: 54 ms · 0.11 cores
- paladin-node4-0/paladin: 9 ms · 0.02 cores
- paladin-node4-0/postgres: 3 ms · 0.01 cores
- besu-node4-0/besu: 28 ms · 0.06 cores

## Errors

- C=1 cash.prepare: cash prepareTransferLocked reverted: PD011814: Domain reverted transaction on assemble: PD210134: Failed to query states by IDs. Wanted: 1, Found: 0
- C=4 group.settle: settle failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x50411c80a46eeabaf39d4ad3e220e10b698214a3
- C=8 cash.prepare: cash prepareTransferLocked reverted: PD011814: Domain reverted transaction on assemble: PD210134: Failed to query states by IDs. Wanted: 1, Found: 0
- C=16 cash.prepare: cash prepareTransferLocked reverted: PD011814: Domain reverted transaction on assemble: PD210134: Failed to query states by IDs. Wanted: 1, Found: 0
- C=16 group.settle: settle failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x91139b14c60f59383c21b99e14f3c89a83fd6224
- C=32 cash.prepare: cash prepareTransferLocked reverted: PD011814: Domain reverted transaction on assemble: PD210134: Failed to query states by IDs. Wanted: 1, Found: 0
- C=32 group.bid: bid failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x352e1db5e50bdcb4f692c10ccc031b3eed323e6c
- C=32 group.settle: timeout (120s) waiting for settle
- C=32 group.bid: bid failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0x1a8048cb72f87005813e9c77362f60f827054a76
- C=32 group.settle: settle failed: PD011814: Domain reverted transaction on assemble: no contract deployed at 0xd7037592626ad7e7a9b03d2c50216f96a114c65e
