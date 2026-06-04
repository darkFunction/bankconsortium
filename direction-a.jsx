// Direction A — Topology map + split step inspector
(function () {
  const e = React.createElement;

  function Eye({ off }) {
    return e('svg', { className: 'ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      off
        ? [e('path', { key: 1, d: 'M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6' }), e('line', { key: 2, x1: 2, y1: 2, x2: 22, y2: 22 })]
        : [e('path', { key: 1, d: 'M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z' }), e('circle', { key: 2, cx: 12, cy: 12, r: 3 })]
    );
  }
  function Lock() {
    return e('svg', { className: 'ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      e('rect', { x: 4, y: 11, width: 16, height: 10, rx: 2 }), e('path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }));
  }

  function Node({ x, y, w, h, dot, title, role, holds }) {
    return e('div', { className: 'node', style: { left: x, top: y, width: w, minHeight: h } },
      e('div', { className: 'nh' },
        e('span', { className: 'ndot', style: { background: dot } }),
        e('div', null,
          e('div', { className: 'ntitle' }, title),
          e('div', { className: 'nrole' }, role))),
      holds && e('div', { style: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' } },
        holds.map((hd, i) => e('span', { key: i, className: 'chip mono ' + hd.cls }, hd.label)))
    );
  }

  const STEPS = [
    'Issue cash — USDC on Ethereum Sepolia',
    'Form Issuer ⇄ Custodian privacy group',
    'Deploy bond — Noto token + Pente hooks',
    'Issue bond units to custodian',
    'Open distribution · allow-list Bank A',
    'Bank A subscribes (Investor ⇄ Custodian)',
    'Lock cash + lock bond, prepare unlocks',
    'Assemble the Atom (bind both legs)',
    'Execute atomic swap — Delivery vs Payment',
    'Settled · public anchors updated',
  ];

  function DirectionA() {
    const cur = 8; // 0-indexed -> step 09
    return e('div', { className: 'pal', style: { width: 1300, height: 900, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      // ---------- header ----------
      e('div', { style: { height: 60, flex: 'none', display: 'flex', alignItems: 'center', gap: 18, padding: '0 24', borderBottom: '1px solid var(--line)', background: '#fff' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
          e('div', { style: { width: 22, height: 22, borderRadius: 6, background: 'var(--accent)' } }),
          e('div', { style: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 15 } }, 'Paladin'),
          e('div', { style: { fontSize: 13, color: 'var(--muted)' } }, 'Concept Demo')),
        e('div', { style: { display: 'flex', gap: 4, background: 'var(--app-bg)', padding: 4, borderRadius: 10, border: '1px solid var(--line)' } },
          e('button', { className: 'tabbtn on' }, 'Bond DvP'),
          e('button', { className: 'tabbtn' }, 'Zeto transfer')),
        e('div', { style: { flex: 1 } }),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)' } }, 'Viewing as',
          e('div', { className: 'btn', style: { height: 32 } }, e('span', { className: 'ndot', style: { background: 'var(--ink)' } }), 'Omniscient', e('span', { style: { color: 'var(--faint)' } }, '▾'))),
        e('div', { style: { display: 'flex', gap: 12, alignItems: 'center', paddingLeft: 4, fontSize: 12 } },
          e('span', { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--public-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--public)' } }), 'Public'),
          e('span', { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--private-ink)' } }, e('span', { className: 'ndot', style: { background: 'var(--private)' } }), 'Private'))
      ),

      // ---------- map ----------
      e('div', { style: { height: 470, flex: 'none', position: 'relative', padding: '6px 24px 0', background: 'linear-gradient(180deg,#fbfcfe,#f6f7fa)' } },
        e('div', { style: { position: 'relative', width: 1252, height: 460, margin: '0 auto' } },
          // svg edges
          e('svg', { width: 1252, height: 460, style: { position: 'absolute', inset: 0 }, fill: 'none' },
            e('defs', null,
              e('marker', { id: 'arrA', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' }, e('path', { d: 'M0,0 L6,3 L0,6', fill: 'none', stroke: 'var(--private)', strokeWidth: 1.4 }))),
            // base band
            e('rect', { x: 0, y: 352, width: 1252, height: 96, rx: 12, fill: 'var(--public-soft)', stroke: 'var(--public-line)' }),
            // anchor lines (public, dashed) to base
            e('path', { d: 'M178,144 V352', stroke: 'var(--public-line)', strokeWidth: 1.5, strokeDasharray: '4 4' }),
            e('path', { d: 'M588,318 V352', stroke: 'var(--public-line)', strokeWidth: 1.5, strokeDasharray: '4 4' }),
            e('path', { d: 'M1026,156 V352', stroke: 'var(--public-line)', strokeWidth: 1.5, strokeDasharray: '4 4' }),
            // private edges (amber)
            e('path', { d: 'M296,92 H470', stroke: 'var(--private)', strokeWidth: 2 }),
            e('path', { d: 'M588,144 V214', stroke: 'var(--private)', strokeWidth: 2 }),
            // public edge sepolia->investor
            e('path', { d: 'M900,120 C 820,150 770,250 706,262', stroke: 'var(--public)', strokeWidth: 2 })
          ),
          // pills on edges
          e('div', { style: { position: 'absolute', left: 312, top: 78, } }, e('span', { className: 'pill pill-priv' }, 'Pente · bond tracker')),
          e('div', { style: { position: 'absolute', left: 610, top: 168 } }, e('span', { className: 'pill pill-priv' }, 'Pente · subscription')),
          e('div', { style: { position: 'absolute', left: 738, top: 188 } }, e('span', { className: 'pill pill-pub' }, 'Public ERC-20')),

          // nodes
          e(Node, { x: 60, y: 40, w: 236, h: 104, dot: 'var(--private)', title: 'Bond Depository', role: 'Issuer', holds: [{ label: 'BOND · Noto', cls: 'chip-priv' }] }),
          e(Node, { x: 470, y: 40, w: 236, h: 104, dot: 'var(--private)', title: 'Bank B', role: 'Custodian · notary', holds: [{ label: 'BOND ×1000', cls: 'chip-priv' }] }),
          e(Node, { x: 900, y: 28, w: 252, h: 128, dot: 'var(--public)', title: 'Ethereum Sepolia', role: 'Public network', holds: [{ label: 'USDC ×100k', cls: 'chip-pub' }, { label: 'ERC-20', cls: 'chip-pub' }] }),
          e(Node, { x: 470, y: 214, w: 236, h: 104, dot: 'var(--accent)', title: 'Bank A', role: 'Investor', holds: [{ label: 'USDC ×100', cls: 'chip-pub' }] }),

          // DvP card straddling the base band
          e('div', { style: { position: 'absolute', left: 360, top: 320, width: 530, background: '#fff', border: '1.5px solid var(--accent-line)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: '12px 16px' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 } },
              e('span', { style: { display: 'inline-flex', width: 22, height: 22, borderRadius: 6, background: 'var(--accent)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 } }, '⚡'),
              e('div', { style: { fontWeight: 600, fontSize: 14 } }, 'Atom executed'),
              e('span', { className: 'badge badge-pub' }, 'On base ledger'),
              e('span', { style: { marginLeft: 'auto' } }, e('span', { className: 'mono', style: { fontSize: 11, color: 'var(--muted)' } }, 'atom 0x9f…3a'))),
            e('div', { style: { display: 'flex', gap: 10 } },
              e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--public-soft)' } },
                e('span', { className: 'ndot', style: { background: 'var(--public)' } }), e('span', { className: 'mono', style: { fontSize: 12, color: 'var(--public-ink)', fontWeight: 600 } }, 'USDC 100 → Custodian'), e('span', { style: { marginLeft: 'auto', fontSize: 10.5, color: 'var(--public-ink)' } }, 'public')),
              e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--private-soft)' } },
                e(Lock, null), e('span', { className: 'mono', style: { fontSize: 12, color: 'var(--private-ink)', fontWeight: 600 } }, 'BOND 100 → Bank A'), e('span', { style: { marginLeft: 'auto', fontSize: 10.5, color: 'var(--private-ink)' } }, 'private')))
          ),
          // base band caption
          e('div', { style: { position: 'absolute', left: 18, top: 364, fontSize: 12, fontWeight: 600, color: 'var(--public-ink)' } }, 'Paladin base ledger'),
          e('div', { style: { position: 'absolute', left: 18, top: 384, fontSize: 11, color: 'var(--public-ink)', opacity: .8 } }, 'shared EVM'),
          e('div', { style: { position: 'absolute', right: 18, top: 366, display: 'flex', gap: 6 } },
            e('span', { className: 'chip chip-pub mono' }, 'Bond Tracker'), e('span', { className: 'chip chip-pub mono' }, 'state roots'))
        )
      ),

      // ---------- inspector ----------
      e('div', { style: { flex: 1, display: 'flex', gap: 18, padding: '16px 24px 20px', borderTop: '1px solid var(--line)', background: '#fff', minHeight: 0 } },
        // step list
        e('div', { style: { width: 372, flex: 'none', display: 'flex', flexDirection: 'column' } },
          e('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 } },
            e('h3', { style: { fontSize: 14 } }, 'Bond issuance · DvP'),
            e('span', { style: { fontSize: 12, color: 'var(--muted)' } }, 'step 09 / 10')),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' } },
            STEPS.map((s, i) => {
              const done = i < cur, on = i === cur;
              return e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: on ? 'var(--accent-soft)' : 'transparent', border: on ? '1px solid var(--accent-line)' : '1px solid transparent' } },
                e('span', { style: { width: 20, height: 20, flex: 'none', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : done ? 'var(--public)' : 'var(--app-bg)', color: on || done ? '#fff' : 'var(--faint)', border: on || done ? 'none' : '1px solid var(--line-2)' } }, done ? '✓' : i + 1),
                e('span', { style: { fontSize: 12.5, fontWeight: on ? 600 : 400, color: on ? 'var(--accent-ink)' : done ? 'var(--ink-2)' : 'var(--muted)', lineHeight: 1.25 } }, s));
            }))
        ),
        // detail
        e('div', { className: 'panel', style: { flex: 1, padding: 20, display: 'flex', flexDirection: 'column', minWidth: 0 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
            e('span', { className: 'badge badge-priv' }, 'Private'), e('span', { style: { color: 'var(--faint)' } }, '+'), e('span', { className: 'badge badge-pub' }, 'Public'),
            e('span', { style: { marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' } }, 'Delivery vs Payment')),
          e('h2', { style: { fontSize: 21, marginBottom: 8 } }, 'Execute the atomic swap'),
          e('p', { style: { fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)', margin: '0 0 16px', maxWidth: 560 } },
            'The custodian fires the Atom. In a single base-ledger transaction it unlocks ', e('b', null, '100 USDC'), ' to the custodian and ', e('b', null, '100 BOND units'), ' to Bank A — all or nothing. Neither party can be left short.'),
          e('div', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 } }, 'Who can see this'),
          e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
            [['Bond Depository', true, 'bond leg'], ['Bank B · Custodian', true, 'both legs'], ['Bank A · Investor', true, 'both legs'], ['Ethereum Sepolia', true, 'USDC leg only']].map((r, i) =>
              e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--app-bg)' } },
                e('span', { style: { color: r[1] ? 'var(--public)' : 'var(--faint)' } }, e(Eye, { off: !r[1] })),
                e('span', { style: { fontSize: 12.5, fontWeight: 500 } }, r[0]),
                e('span', { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' } }, r[2])))),
          e('div', { style: { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 } },
            e('span', { className: 'mono', style: { fontSize: 11, color: 'var(--muted)' } }, 'cashLockId 0x41a9 · bondLockId 0x7c02'),
            e('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8 } },
              e('button', { className: 'btn' }, '‹ Back'),
              e('button', { className: 'btn btn-pri' }, 'Execute swap ⚡')))
        )
      )
    );
  }
  window.DirectionA = DirectionA;
})();
