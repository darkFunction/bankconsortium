// Direction B — Layered worlds: public base slab at the bottom, private groups float above
(function () {
  const e = React.createElement;

  function NodeMini({ dot, title, role, w }) {
    return e('div', { style: { background: '#fff', border: '1px solid var(--line-2)', borderRadius: 9, boxShadow: 'var(--shadow-sm)', padding: '9px 11px', width: w || 'auto' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
        e('span', { className: 'ndot', style: { background: dot } }),
        e('div', { style: { fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' } }, title)),
      role && e('div', { style: { fontSize: 11, color: 'var(--muted)', marginTop: 2, paddingLeft: 16, whiteSpace: 'nowrap' } }, role));
  }

  const STEPS = ['Cash', 'Group A', 'Bond', 'Issue', 'Distribute', 'Subscribe', 'Lock', 'Atom', 'Swap', 'Settled'];

  function DirectionB() {
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
          e('div', { className: 'btn', style: { height: 32 } }, e('span', { className: 'ndot', style: { background: 'var(--accent)' } }), 'Bank A', e('span', { style: { color: 'var(--faint)' } }, '▾'))),
        e('div', { style: { display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 } },
          e('span', { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--public-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--public)' } }), 'Public'),
          e('span', { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--private-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--private)' } }), 'Private'))),

      // stage
      e('div', { style: { height: 622, flex: 'none', position: 'relative', overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% -10%, #fff, #f1f3f8 70%)' } },
        e('div', { style: { position: 'relative', width: 1252, height: 612, margin: '0 auto' } },
          // axis label
          e('div', { style: { position: 'absolute', left: 8, top: 18, fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--private-ink)', textTransform: 'uppercase' } }, '▲ Private — visible only to group members'),
          e('div', { style: { position: 'absolute', left: 8, top: 590, fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--public-ink)', textTransform: 'uppercase' } }, '▼ Public — the single shared base ledger'),

          // drop lines (svg)
          e('svg', { width: 1252, height: 612, style: { position: 'absolute', inset: 0 }, fill: 'none' },
            e('path', { d: 'M340,330 V470', stroke: 'var(--private-line)', strokeWidth: 1.5, strokeDasharray: '5 5' }),
            e('path', { d: 'M930,360 V470', stroke: 'var(--private-line)', strokeWidth: 1.5, strokeDasharray: '5 5' }),
            // bridge between sepolia + base
            e('path', { d: 'M270,520 H300', stroke: 'var(--public)', strokeWidth: 2.5 }),
            // USDC rising from sepolia to swap zone
            e('path', { d: 'M135,470 C 135,360 560,420 600,470', stroke: 'var(--public)', strokeWidth: 2, strokeDasharray: '6 5' })
          ),

          // base slabs
          e('div', { style: { position: 'absolute', left: 300, top: 470, width: 952, height: 116, borderRadius: 14, background: 'linear-gradient(180deg,var(--public-soft),#def0e7)', border: '1.5px solid var(--public-line)' } },
            e('div', { style: { padding: '12px 16px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                e('span', { className: 'ndot', style: { background: 'var(--public)' } }),
                e('div', { style: { fontWeight: 700, fontSize: 15, color: 'var(--public-ink)' } }, 'Paladin base ledger'),
                e('span', { style: { fontSize: 12, color: 'var(--public-ink)', opacity: .75 } }, 'shared EVM — one source of truth')),
              e('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                ['Bond Tracker (public)', 'Atom · DvP', 'state root: group A', 'state root: group B', 'Noto contract'].map((c, i) =>
                  e('span', { key: i, className: 'chip chip-pub mono' }, c))))),

          // sepolia island
          e('div', { style: { position: 'absolute', left: 0, top: 470, width: 270, height: 116, borderRadius: 14, background: 'linear-gradient(180deg,var(--public-soft),#def0e7)', border: '1.5px solid var(--public-line)' } },
            e('div', { style: { padding: '12px 14px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } }, e('span', { className: 'ndot', style: { background: 'var(--public)' } }), e('div', { style: { fontWeight: 700, fontSize: 14, color: 'var(--public-ink)' } }, 'Ethereum Sepolia')),
              e('div', { style: { fontSize: 11, color: 'var(--public-ink)', opacity: .8, marginTop: 2 } }, 'public L1 network'),
              e('div', { style: { display: 'flex', gap: 6, marginTop: 10 } }, e('span', { className: 'chip chip-pub mono' }, 'USDC ERC-20'), e('span', { className: 'chip chip-pub mono' }, 'Bank A wallet')))),
          e('div', { style: { position: 'absolute', left: 250, top: 444, fontSize: 10.5, fontWeight: 600, color: 'var(--public-ink)', background: '#fff', border: '1px solid var(--public-line)', borderRadius: 999, padding: '2px 8px' } }, 'bridge'),

          // bubble 1 — issuer + custodian
          e('div', { style: { position: 'absolute', left: 120, top: 78, width: 440, height: 250, borderRadius: 20, background: 'rgba(176,121,26,0.07)', border: '1.5px dashed var(--private-line)' } },
            e('div', { style: { position: 'absolute', top: -12, left: 18, background: '#fff', border: '1px solid var(--private-line)', borderRadius: 999, padding: '3px 11px', fontSize: 11.5, fontWeight: 600, color: 'var(--private-ink)' } }, 'Privacy group · Issuer ⇄ Custodian (Pente)'),
            e('div', { style: { padding: '34px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 } },
              e('div', { style: { display: 'flex', gap: 12 } },
                e(NodeMini, { dot: 'var(--private)', title: 'Bond Depository', role: 'Issuer', w: 180 }),
                e(NodeMini, { dot: 'var(--private)', title: 'Bank B', role: 'Custodian · notary', w: 180 })),
              e('div', { style: { background: '#fff', border: '1px solid var(--private-line)', borderRadius: 9, padding: '10px 12px' } },
                e('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--private-ink)' } }, 'Private bond tracker'),
                e('div', { style: { fontSize: 11, color: 'var(--muted)', marginTop: 2 } }, 'ERC-20 hooks · enforces mint/transfer policy · BOND ×1000')))),

          // bubble 2 — investor + custodian
          e('div', { style: { position: 'absolute', left: 700, top: 110, width: 460, height: 250, borderRadius: 20, background: 'rgba(176,121,26,0.07)', border: '1.5px dashed var(--private-line)' } },
            e('div', { style: { position: 'absolute', top: -12, left: 18, background: '#fff', border: '1px solid var(--private-line)', borderRadius: 999, padding: '3px 11px', fontSize: 11.5, fontWeight: 600, color: 'var(--private-ink)' } }, 'Privacy group · Investor ⇄ Custodian (Pente)'),
            e('div', { style: { padding: '34px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 } },
              e('div', { style: { display: 'flex', gap: 12 } },
                e(NodeMini, { dot: 'var(--accent)', title: 'Bank A', role: 'Investor', w: 190 }),
                e(NodeMini, { dot: 'var(--private)', title: 'Bank B', role: 'Custodian', w: 190 })),
              e('div', { style: { background: '#fff', border: '1px solid var(--accent-line)', borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 } },
                e('div', null, e('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--accent-ink)' } }, 'Subscription · DvP in progress'),
                  e('div', { style: { fontSize: 11, color: 'var(--muted)', marginTop: 2 } }, 'swap 100 USDC ⇄ 100 BOND')),
                e('span', { className: 'badge badge-priv', style: { marginLeft: 'auto' } }, 'locked')))),

          // floating swap token
          e('div', { style: { position: 'absolute', left: 470, top: 408, display: 'flex', gap: 8, alignItems: 'center', background: '#fff', borderRadius: 999, border: '1.5px solid var(--accent-line)', boxShadow: 'var(--shadow)', padding: '6px 12px' } },
            e('span', { style: { width: 18, height: 18, borderRadius: 5, background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, '⚡'),
            e('span', { style: { fontSize: 12.5, fontWeight: 600 } }, 'Atomic swap'), e('span', { className: 'mono', style: { fontSize: 11, color: 'var(--muted)' } }, 'USDC ⇄ BOND'))
        )
      ),

      // inspector — horizontal timeline + detail strip
      e('div', { style: { flex: 1, borderTop: '1px solid var(--line)', background: '#fff', padding: '16px 24px', display: 'flex', flexDirection: 'column', minHeight: 0 } },
        e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 } },
          e('div', { style: { flex: 1 } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 } },
              e('span', { style: { fontSize: 12, color: 'var(--muted)' } }, 'Step 09 / 10'),
              e('span', { className: 'badge badge-priv' }, 'Private'), e('span', { className: 'badge badge-pub' }, 'Public')),
            e('h2', { style: { fontSize: 19, marginBottom: 4 } }, 'Execute the atomic swap (DvP)'),
            e('p', { style: { fontSize: 13, color: 'var(--ink-2)', margin: 0, maxWidth: 720, lineHeight: 1.45 } },
              'One base-ledger transaction settles both legs at once. USDC moves on the public side; the bond moves privately inside the group — atomically bound so neither can happen without the other.')),
          e('div', { style: { display: 'flex', gap: 8 } }, e('button', { className: 'btn' }, '‹ Back'), e('button', { className: 'btn btn-pri' }, 'Execute ⚡'))),
        // stepper
        e('div', { style: { position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', padding: '0 4px' } },
          e('div', { style: { position: 'absolute', left: 18, right: 18, top: 13, height: 2, background: 'var(--line-2)' } }),
          STEPS.map((s, i) => {
            const done = i < cur, on = i === cur;
            return e('div', { key: i, style: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 } },
              e('span', { style: { width: 26, height: 26, borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : done ? 'var(--public)' : '#fff', color: on || done ? '#fff' : 'var(--faint)', border: on || done ? 'none' : '1.5px solid var(--line-2)', boxShadow: on ? '0 0 0 4px var(--accent-soft)' : 'none' } }, done ? '✓' : i + 1),
              e('span', { style: { fontSize: 11, fontWeight: on ? 600 : 400, color: on ? 'var(--accent-ink)' : 'var(--muted)' } }, s));
          }))
      )
    );
  }
  window.DirectionB = DirectionB;
})();
