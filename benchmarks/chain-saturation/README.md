# Chain saturation benchmark

Measures how many transactions **one Besu QBFT chain** can execute per second, independent of Paladin.
On a laptop, Paladin can't generate enough load to find that limit. The transactions are synthetic,
but each one does the same expensive on-chain work as the real Paladin transaction type and uses about the
same gas (`Synthetic.sol`: BN254 pairing/ecMul/ecAdd for Zeto, ecrecover for Noto and Pente, plus fresh
storage slots). Results and interpretation: [`../FINDINGS.md`](../FINDINGS.md) §4a–4b.

```shell
npm install
node net.mjs up --validators 1 --block-ms 1000          # throwaway network: containers sat-v*, RPC 127.0.0.1:18545
node load.mjs --type payment --rate 1500 --seconds 30    # zk | noto | pente | payment (= 2 zk + 2 pente per payment) | eth (plain transfer)
node net.mjs down
```

`net.mjs up` options:
- `--validators N`
- `--block-ms` (sub-second periods use Besu's experimental `xblockperiodmilliseconds`, which Besu 25.8 honours)
- `--empty-period-s S` (adds `xemptyblockperiodseconds`, as in the Paladin genesis)
- `--parallel` (Bonsai parallel transaction processing)
- `--select-pct P` (`--poa-block-txs-selection-max-time`)

`load.mjs` offers load faster than the chain can absorb and reads capacity from the validators'
`Produced block … pending` log lines. It only counts blocks produced while a backlog remained, merges the logs
from all validators (QBFT rotates the proposer), and waits for the pool to drain before and after each run.
It appends one JSON line per run to `results-raw/results.jsonl`; the copy from 2026-11-04 is
`../results/chain-saturation.jsonl`.

Re-run it on the hardware you would actually deploy. On this 16-core laptop the chain saturates at about
100–115 Mgas/s in every configuration tried.

Files need the `:z` SELinux relabel to be mounted into containers on Fedora; `net.mjs` already does this.
