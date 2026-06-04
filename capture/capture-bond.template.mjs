/*
 * capture-bond.template.mjs — REPLAY-MODE capture script (TEMPLATE)
 * ----------------------------------------------------------------------------
 * Purpose: run the REAL bond-issuance flow against a local Paladin stack ONCE,
 * snapshotting ledger state after each operation, and emit recordings/bond.json
 * in the exact shape the frontend already renders.
 *
 * The demo itself has NO execute API — it just plays back this file. All the
 * "doing" happens here, at capture time. Stepping back in the UI is therefore
 * always safe (it's array indexing), because nothing is ever re-run.
 *
 * HOW TO USE
 *   1. Copy this next to the official example: paladin/examples/bond/
 *   2. Reuse that example's imports + client/identity setup verbatim (it is the
 *      source of truth for SDK package name and node URLs). Replace the TODOs.
 *   3. `node capture-bond.template.mjs` → writes ../recordings/bond.json
 *   4. Open the demo with ?source=recording  (see datasource.js / BACKEND.md)
 *
 * This is OPTION A (declared visibility): we write the same `see: [...]` lists
 * the authored mock uses. The capture script is the one place that *asserts*
 * who is in each privacy group — which is information you already have here,
 * because you created the groups. See BACKEND.md for the Option-B upgrade
 * (capture what each node's RPC actually returns, per viewer).
 * ----------------------------------------------------------------------------
 */

import { writeFileSync } from 'node:fs';

// TODO: copy these from examples/bond (PaladinClient, NotoFactory, PenteFactory,
// TransactionType, the newBondTracker/newBondSubscription helpers, etc.)
// import PaladinClient, { NotoFactory, PenteFactory, ... } from "@lfdt-paladin/paladin-sdk";

// TODO: copy the node + identity setup from examples/bond:
//   const paladin1 = new PaladinClient({ url: "http://127.0.0.1:31548" });  // issuer node
//   const paladin2 = new PaladinClient({ url: "http://127.0.0.1:31648" });  // custodian node
//   const paladin3 = new PaladinClient({ url: "http://127.0.0.1:31748" });  // investor node
//   const [cashIssuer]   = paladin1.getVerifiers("cashIssuer@node1");
//   const [bondIssuer]   = paladin1.getVerifiers("bondIssuer@node1");
//   const [bondCustodian]= paladin2.getVerifiers("bondCustodian@node2");
//   const [investor]     = paladin3.getVerifiers("investor@node3");

// ----- the recording we are building -----
const recording = {
  id: 'bond',
  name: 'Bond DvP',
  tagline: 'yyyPublic Sepolia USDC \u21c4 private Noto bond, settled atomically',
  concept: 'Noto + Pente: the notary \u2014 and the regulator as a group observer \u2014 can see balances and positions. The outside world sees only state hashes and the public USDC leg.',
  columns: ['issuer', 'custodian', 'investor', 'regulator', 'sepolia', 'base'],
  viewers: ['omniscient', 'issuer', 'custodian', 'investor', 'regulator', 'public'],
  // Self-contained party catalogue — a new use case is just a new recording.
  // kind: 'inst' (participant) | 'authority' (oversight; shield) | 'public' (public ledger)
  parties: {
    issuer:    { name: 'Bond Depository',     role: 'Issuer',              kind: 'inst' },
    custodian: { name: 'Bank B',              role: 'Custodian \u00b7 notary', kind: 'inst' },
    investor:  { name: 'Bank A',              role: 'Investor',            kind: 'inst' },
    regulator: { name: 'Regulator',           role: 'Oversight authority', kind: 'authority' },
    sepolia:   { name: 'Ethereum Sepolia',    role: 'Public L1 network',   kind: 'public' },
    base:      { name: 'Paladin base ledger', role: 'Shared EVM \u00b7 public', kind: 'public' },
  },
  // groupLabels: { primary: 'Institutions', public: 'Public ledgers' }, // optional override
  steps: [],
  facts: [],
};

// Append a fact that becomes visible at the CURRENT step index.
// `see` is the privacy-group membership (+ regulator observer). Omit for public.
function fact(col, kind, title, detail, opts = {}) {
  recording.facts.push({
    col, kind, title, detail,
    from: recording.steps.length, // appears at the step we are about to push
    ...(kind === 'priv' ? { see: opts.see || [] } : {}),
    ...(opts.until != null ? { until: opts.until } : {}),
    ...(opts.locked ? { locked: true } : {}),
  });
}

// Record a step's narrative + optional token motion.
function step(meta) { recording.steps.push(meta); }

// Privacy-group membership shorthands (you KNOW these — you created the groups).
const GROUP_A = ['issuer', 'custodian', 'regulator']; // Pente: issuer + custodian (+ regulator observer)
const GROUP_B = ['investor', 'custodian', 'regulator']; // Pente: investor + custodian (+ regulator observer)

/* ===========================================================================
 * DRIVE THE REAL FLOW + SNAPSHOT
 * Each block: (1) perform the real SDK op, (2) read state, (3) push step+facts.
 * The RPCs noted in comments are where the *real* values come from — replace
 * the hard-coded strings with the receipt/state you read back.
 * ========================================================================= */
async function main() {

  // --- Step 0: cash on Sepolia (public ERC-20; not a Paladin domain) ---
  // READ: ethers/viem against the Sepolia RPC → usdc.balanceOf(bankA)
  step({ title: 'Issue cash on Ethereum Sepolia',
         plain: 'Bank A holds a public USDC balance on Ethereum Sepolia \u2014 the cash leg.',
         tech: `ERC-20 USDC \u00b7 balanceOf(BankA) = /*TODO from Sepolia RPC*/`,
         badges: ['pub'] });
  fact('sepolia', 'pub', 'USDC \u00b7 ERC-20', 'public stablecoin contract');
  fact('sepolia', 'pub', 'Bank A wallet', '/*TODO*/ USDC', { until: 8 });
  fact('investor', 'pub', 'USDC on Sepolia', '/*TODO*/ (public)', { until: 6 });

  // --- Step 1: issuer+custodian privacy group ---
  // DO:   PenteFactory(paladin1,"pente").newPrivacyGroup({members:[bondIssuer,bondCustodian]})
  // READ: group.address (anchored hash on base ledger) via the receipt
  step({ title: 'Form the Issuer \u21c4 Custodian privacy group',
         plain: 'A private EVM group (Pente). Only members \u2014 and the regulator observer \u2014 see inside; the base ledger stores only a hash.',
         tech: 'PenteFactory.newPrivacyGroup({ members:[issuer,custodian] })',
         badges: ['priv'] });
  fact('issuer', 'priv', 'Privacy group A', 'Pente \u00b7 with Bank B', { see: GROUP_A });
  fact('custodian', 'priv', 'Privacy group A', 'Pente \u00b7 with Depository', { see: GROUP_A });
  fact('base', 'pub', 'Group A state root', 'hash only'); // READ: group hash on base chain

  // --- Step 2: deploy bond (Noto + private tracker via hooks) + public tracker ---
  // DO:   deploy BondTrackerPublic (public tx) ; newBondTracker(group) ; NotoFactory.newNoto(notaryMode:"hooks")
  step({ title: 'Deploy the bond \u2014 Noto token + private tracker',
         plain: 'A Noto bond token with policy in a private ERC-20 tracker (hooks). A public tracker advertises face value & maturity.',
         tech: 'Noto.newNoto({ notary:custodian, notaryMode:"hooks" })',
         badges: ['priv', 'pub'] });
  fact('issuer', 'priv', 'Private bond tracker', 'ERC-20 hooks \u00b7 mint/transfer policy', { see: GROUP_A });
  fact('base', 'pub', 'Noto BOND contract', 'deployed');                 // READ: notoBond.address
  fact('base', 'pub', 'Public bond tracker', 'face 1 \u00b7 maturity /*TODO*/'); // READ: trackerPublic

  // --- Step 3: mint 1000 to custodian ---
  // DO:   notoBond.mint({to:bondCustodian, amount:1000})
  // READ: custodian-node domain receipt / pstate_queryStates for BOND balance
  step({ title: 'Issue bond units to the custodian',
         plain: 'The issuer mints 1,000 units into the custodian\u2019s care. The public ledger only learns issuance started.',
         tech: 'notoBond.mint({ to:custodian, amount:1000 })',
         badges: ['priv', 'pub'] });
  fact('custodian', 'priv', 'BOND custody', '1,000 units', { see: GROUP_A, until: 8 });
  fact('issuer', 'pub', 'Public supply (read)', 'sees only the aggregate');
  fact('regulator', 'priv', 'Bond positions', 'read-only \u00b7 1,000 issued', { see: ['regulator'] });
  fact('regulator', 'priv', 'Oversight access', 'observer in groups A & B', { see: ['regulator'] });
  fact('base', 'pub', 'Bond Tracker supply', '1,000 issued', { until: 8 });

  // --- Step 4: open distribution + allow-list investor (private) ---
  step({ title: 'Open distribution \u00b7 allow-list Bank A',
         plain: 'The custodian opens subscription and privately allow-lists Bank A.',
         tech: 'bondTracker.beginDistribution(...) \u00b7 investorList.addInvestor(BankA)',
         badges: ['priv'] });
  fact('issuer', 'priv', 'Investor allow-list', 'Bank A approved', { see: GROUP_A });

  // --- Step 5: investor+custodian privacy group + subscription ---
  // DO:   PenteFactory(paladin3).newPrivacyGroup({members:[investor,bondCustodian]}) ; newBondSubscription(...)
  step({ title: 'Bank A subscribes',
         plain: 'Bank A + custodian open a second group and record a 100-unit subscription. The issuer is not a member.',
         tech: 'newPrivacyGroup({ members:[investor,custodian] }) \u00b7 BondSubscription(units:100)',
         badges: ['priv', 'pub'] });
  fact('custodian', 'priv', 'Privacy group B', 'Pente \u00b7 with Bank A', { see: GROUP_B });
  fact('investor', 'priv', 'Privacy group B', 'Pente \u00b7 with Bank B', { see: GROUP_B });
  fact('investor', 'priv', 'Subscription', '100 units requested', { see: GROUP_B });
  fact('base', 'pub', 'Group B state root', 'hash only');

  // --- Step 6: lock cash (Sepolia) + lock bond (Noto), prepare unlocks ---
  // DO:   notoCash.lock(...) ; prepareUnlock(...) → cashLockId ; notoBond.lock(...) ; prepareUnlock(...) → bondLockId
  step({ title: 'Lock the cash and lock the bond',
         plain: 'Both legs escrowed. Bank A locks 100 USDC on Sepolia (public); the custodian locks 100 bond units privately and prepares an unlock.',
         tech: 'lock(...) \u00b7 prepareUnlock(...) \u2192 cashLockId, bondLockId',
         badges: ['priv', 'pub'] });
  fact('sepolia', 'pub', 'Escrow lock', 'Bank A \u00b7 100 USDC locked', { until: 8 });
  fact('investor', 'pub', 'USDC locked', '100 escrowed for swap', { until: 8, locked: true });
  fact('custodian', 'priv', 'BOND lock', '100 units \u2192 Bank A (prepared)',
       { see: ['issuer', 'custodian', 'investor', 'regulator'], until: 8, locked: true });

  // --- Step 7: assemble the Atom ---
  // DO:   AtomFactory.create([cashUnlock, bondUnlock]) → atomAddress
  step({ title: 'Assemble the Atom (bind both legs)',
         plain: 'One immutable Atom binds both prepared transfers \u2014 all-or-nothing.',
         tech: `AtomFactory.create([...]) \u2192 atom /*TODO atomAddress*/`,
         badges: ['pub'] });
  fact('base', 'pub', 'Atom \u00b7 DvP', 'binds both legs \u00b7 immutable');

  // --- Step 8: execute the swap (DvP) — the climax + token motion ---
  // DO:   delegateLock(...) x2 ; atom.execute()
  // READ: balances after: BankA BOND, custodian USDC (Sepolia), tracker supply
  step({ title: 'Execute the atomic swap (DvP)',
         plain: 'The custodian fires the Atom: 100 USDC to the custodian and 100 bond units to Bank A, atomically.',
         tech: 'atom.execute() \u2192 unlock USDC \u00b7 unlock BOND \u00b7 tracker.supply\u2212\u2212',
         badges: ['priv', 'pub'],
         motion: [ { label: 'USDC 100', tone: 'pub', from: 'sepolia', to: 'custodian' },
                   { label: 'BOND 100', tone: 'priv', from: 'custodian', to: 'investor' } ] });
  fact('custodian', 'priv', 'BOND custody', '900 units', { see: GROUP_A });
  fact('custodian', 'pub', 'USDC received', '100 on Sepolia');
  fact('investor', 'priv', 'BOND holding', '100 units received', { see: GROUP_B });
  fact('investor', 'pub', 'USDC on Sepolia', '/*TODO after*/');
  fact('sepolia', 'pub', 'Transfer', 'Bank A \u2192 Bank B \u00b7 100 USDC');
  fact('sepolia', 'pub', 'Bank A wallet', '/*TODO after*/ USDC');
  fact('regulator', 'priv', 'DvP verified', '100 units \u21c4 100 USDC', { see: ['regulator'] });
  fact('base', 'pub', 'Atom executed \u2713', 'all-or-nothing settled');
  fact('base', 'pub', 'Bond Tracker supply', 'available 900');

  // --- Step 9: settled ---
  step({ title: 'Settled \u00b7 public anchors updated',
         plain: 'Trade done. Public tracker shows 900 available; both group state roots re-anchored as fresh hashes.',
         tech: 'state roots updated \u00b7 public tracker available = 900',
         badges: ['pub'] });

  writeFileSync(new URL('../recordings/bond.json', import.meta.url), JSON.stringify(recording, null, 2));
  console.log(`wrote bond.json: ${recording.steps.length} steps, ${recording.facts.length} facts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
