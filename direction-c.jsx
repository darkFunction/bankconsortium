// Direction C — Institution ledger columns: each party's own view, redaction shows privacy
(function () {
  const e = React.createElement;

  function LockIco() {
    return e('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      e('rect', { x: 4, y: 11, width: 16, height: 10, rx: 2 }), e('path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }));
  }

  function Entry({ kind, title, detail }) {
    if (kind === 'redacted')
      return e('div', { style: { border: '1px dashed var(--line-2)', borderRadius: 9, padding: '10px 11px', background: 'repeating-linear-gradient(135deg,#fafbfc,#fafbfc 6px,#f2f3f6 6px,#f2f3f6 12px)', color: 'var(--faint)' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 } }, e(LockIco, null), 'Private — hidden'),
        e('div', { style: { fontSize: 10.5, marginTop: 3 } }, detail));
    const pub = kind === 'pub';
    return e('div', { style: { border: '1px solid ' + (pub ? 'var(--public-line)' : 'var(--private-line)'), background: pub ? 'var(--public-soft)' : 'var(--private-soft)', borderRadius: 9, padding: '10px 11px' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
        e('span', { className: 'ndot', style: { background: pub ? 'var(--public)' : 'var(--private)', width: 7, height: 7 } }),
        e('div', { style: { fontSize: 12.5, fontWeight: 600, color: pub ? 'var(--public-ink)' : 'var(--private-ink)', whiteSpace: 'nowrap' } }, title)),
      e('div', { className: 'mono', style: { fontSize: 11, color: pub ? 'var(--public-ink)' : 'var(--private-ink)', opacity: .85, paddingLeft: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, detail));
  }

  function Column({ dot, name, role, you, pub, entries, dim }) {
    return e('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, border: you ? '1.5px solid var(--accent)' : '1px solid var(--line)', background: '#fff', boxShadow: you ? '0 0 0 4px var(--accent-soft)' : 'var(--shadow-sm)', opacity: dim ? .5 : 1, overflow: 'hidden' } },
      e('div', { style: { padding: '12px 13px', borderBottom: '1px solid var(--line)', background: pub ? 'var(--public-soft)' : you ? 'var(--accent-soft)' : '#fff' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
          e('span', { className: 'ndot', style: { background: dot } }),
          e('div', { style: { fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap' } }, name),
          you && e('span', { style: { marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: '.05em', color: 'var(--accent-ink)', background: '#fff', border: '1px solid var(--accent-line)', borderRadius: 999, padding: '1px 7px' } }, 'YOU')),
        e('div', { style: { fontSize: 11.5, color: pub ? 'var(--public-ink)' : 'var(--muted)', marginTop: 2, paddingLeft: 15 } }, role)),
      e('div', { style: { padding: 11, display: 'flex', flexDirection: 'column', gap: 8 } },
        entries.map((en, i) => e(Entry, Object.assign({ key: i }, en))))
    );
  }

  const STEPS = ['Cash', 'Group A', 'Bond', 'Issue', 'Distribute', 'Subscribe', 'Lock', 'Atom', 'Swap', 'Settled'];

  function DirectionC() {
    const cur = 8;
    return e('div', { className: 'pal', style: { width: 1300, height: 900, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      // header
      e('div', { style: { height: 60, flex: 'none', display: 'flex', alignItems: 'center', gap: 18, padding: '0 24', borderBottom: '1px solid var(--line)', background: '#fff' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
          e('div', { style: { width: 22, height: 22, borderRadius: 6, background: 'var(--accent)' } }),
          e('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Paladin'), e('div', { style: { fontSize: 13, color: 'var(--muted)' } }, 'Concept Demo')),
        e('div', { style: { display: 'flex', gap: 4, background: 'var(--app-bg)', padding: 4, borderRadius: 10, border: '1px solid var(--line)' } },
          e('button', { className: 'tabbtn on' }, 'Bond DvP'), e('button', { className: 'tabbtn' }, 'Zeto transfer')),
        e('div', { style: { flex: 1 } }),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)' } }, 'Viewing as',
          e('div', { className: 'btn', style: { height: 32, borderColor: 'var(--accent-line)', background: 'var(--accent-soft)', color: 'var(--accent-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--accent)' } }), 'Bank A', e('span', { style: { color: 'var(--accent)' } }, '▾'))),
        e('div', { style: { display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 } },
          e('span', { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--public-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--public)' } }), 'Public'),
          e('span', { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--private-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--private)' } }), 'Private'))),

      // stepper strip
      e('div', { style: { height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 0, padding: '0 24', borderBottom: '1px solid var(--line)', background: '#fcfcfe' } },
        STEPS.map((s, i) => {
          const done = i < cur, on = i === cur;
          return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 7 } },
            e('span', { style: { width: 22, height: 22, borderRadius: 999, fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : done ? 'var(--public)' : '#fff', color: on || done ? '#fff' : 'var(--faint)', border: on || done ? 'none' : '1.5px solid var(--line-2)' } }, done ? '✓' : i + 1),
            e('span', { style: { fontSize: 12, fontWeight: on ? 600 : 400, color: on ? 'var(--accent-ink)' : 'var(--muted)' } }, s),
            i < STEPS.length - 1 && e('span', { style: { width: 16, height: 2, margin: '0 8px', background: i < cur ? 'var(--public)' : 'var(--line-2)' } }));
        })),

      // columns
      e('div', { style: { flex: 1, display: 'flex', gap: 14, padding: '18px 24px', background: 'var(--app-bg)', minHeight: 0 } },
        e(Column, {
          dot: 'var(--private)', name: 'Bond Depository', role: 'Issuer',
          entries: [
            { kind: 'redacted', detail: 'Bond tracker — Issuer ⇄ Custodian group' },
            { kind: 'pub', title: 'State anchor', detail: 'group A root → base ledger' },
          ]
        }),
        e(Column, {
          dot: 'var(--private)', name: 'Bank B', role: 'Custodian · notary',
          entries: [
            { kind: 'priv', title: 'Subscription (with you)', detail: 'DvP · 100 USDC ⇄ 100 BOND' },
            { kind: 'redacted', detail: 'Bond custody — other group' },
            { kind: 'pub', title: 'USDC +100 (incoming)', detail: 'unlock on execute' },
          ]
        }),
        e(Column, {
          dot: 'var(--accent)', name: 'Bank A', role: 'Investor', you: true,
          entries: [
            { kind: 'pub', title: 'USDC wallet', detail: 'Sepolia · 100 locked for swap' },
            { kind: 'priv', title: 'BOND +100 (incoming)', detail: 'delivers on execute' },
            { kind: 'priv', title: 'Subscription contract', detail: 'investor ⇄ custodian' },
          ]
        }),
        e(Column, {
          dot: 'var(--public)', name: 'Ethereum Sepolia', role: 'Public L1 network', pub: true,
          entries: [
            { kind: 'pub', title: 'USDC · ERC-20', detail: 'all balances fully public' },
            { kind: 'pub', title: 'Bank A: 100 locked', detail: 'escrowed for the swap' },
          ]
        }),
        e(Column, {
          dot: 'var(--public)', name: 'Paladin base ledger', role: 'Shared EVM · public', pub: true,
          entries: [
            { kind: 'pub', title: 'Atom · DvP', detail: 'executed — all or nothing' },
            { kind: 'pub', title: 'Bond Tracker', detail: 'supply 1000 → 900' },
            { kind: 'pub', title: 'State roots', detail: 'hashes only — no amounts' },
          ]
        })
      ),

      // bottom rail
      e('div', { style: { height: 132, flex: 'none', borderTop: '1px solid var(--line)', background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20 } },
        e('div', { style: { flex: 1 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 } },
            e('span', { style: { fontSize: 12, color: 'var(--muted)' } }, 'Step 09 / 10'),
            e('span', { className: 'badge badge-priv' }, 'Private'), e('span', { className: 'badge badge-pub' }, 'Public'),
            e('span', { style: { fontSize: 12, color: 'var(--muted)' } }, '· you are viewing as Bank A')),
          e('h2', { style: { fontSize: 19, marginBottom: 4 } }, 'Execute the atomic swap (DvP)'),
          e('p', { style: { fontSize: 13, color: 'var(--ink-2)', margin: 0, maxWidth: 760, lineHeight: 1.45 } },
            'Notice the redacted cards: the issuer-side bond tracker is hidden from you, yet the public base ledger still proves the swap happened. Switch ', e('b', null, 'Viewing as'), ' to see the same moment through another institution\u2019s eyes.')),
        e('div', { style: { display: 'flex', gap: 8 } }, e('button', { className: 'btn' }, '‹ Back'), e('button', { className: 'btn btn-pri' }, 'Execute swap ⚡')))
    );
  }
  window.DirectionC = DirectionC;
})();
