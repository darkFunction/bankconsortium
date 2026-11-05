/* Paladin Concept Demo — main app */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const DS = window.PAL_DS;

  /* ---------- icons ---------- */
  const Eye = ({ off }) => (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {off
        ? <><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" /><line x1="2" y1="2" x2="22" y2="22" /></>
        : <><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" /></>}
    </svg>
  );
  const LockIco = ({ s = 13 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
  const Shield = ({ s = 13 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9-4-0.8-7-4.6-7-9V6l7-3z" />
    </svg>
  );

  /* ---------- visibility (routed through the DataSource: the Option A/B seam) ---------- */
  function canSee(fact, viewer) { return DS.canSee(fact, viewer); }
  function activeFacts(scn, step) {
    return scn.facts.filter(f => f.from <= step && (f.until == null || step < f.until));
  }
  function viewerLabel(v, parties) {
    if (v === 'omniscient') return 'Omniscient';
    if (v === 'public') return 'Public';
    return (parties[v] || {}).name || v;
  }
  // Shorten Ethereum addresses / tx hashes (0x + 40 or 64 hex) for display.
  function shortHex(s) {
    return typeof s === 'string'
      ? s.replace(/0x[0-9a-fA-F]{40,}/g, m => m.slice(0, 6) + '…' + m.slice(-4))
      : s;
  }

  /* ---------- disclosure tiers (pub | perm | priv) ---------- */
  const TONE = {
    pub:  { cls: 'pub',  dot: 'var(--public)',     ink: 'var(--public-ink)' },
    perm: { cls: 'perm', dot: 'var(--consortium)', ink: 'var(--consortium-ink)' },
    priv: { cls: 'priv', dot: 'var(--private)',    ink: 'var(--private-ink)' },
  };

  /* ---------- ledger entry ---------- */
  function Entry({ fact, viewer, step }) {
    const visible = canSee(fact, viewer);
    const isNew = fact.from === step;
    if (!visible) {
      return (
        <div className={'entry redacted' + (isNew ? ' pop' : '')}>
          <div className="redrow"><LockIco s={12} /><span>Hidden from you</span></div>
        </div>
      );
    }
    const t = TONE[fact.kind] || TONE.priv;
    return (
      <div className={'entry ' + t.cls + (isNew ? ' pop' : '')}>
        <div className="erow">
          {fact.locked
            ? <span className={'lockwrap ' + (isNew ? 'snap' : '')} style={{ color: t.dot }}><LockIco s={12} /></span>
            : <span className="edot" style={{ background: t.dot }} />}
          <span className="etitle" style={{ color: t.ink }}>{fact.title}</span>
          {isNew && <span className="newtag">new</span>}
        </div>
        <div className="mono edet" style={{ color: t.ink }}>{shortHex(fact.detail)}</div>
      </div>
    );
  }

  /* ---------- column ---------- */
  function Column({ colId, scn, parties, viewer, step, colRef }) {
    const party = parties[colId] || { name: colId, role: '', kind: 'inst' };
    const groupDefs = scn.groups || {};
    const myGroups = party.groups || [];
    // A column is "yours" when its id matches the viewer, or when its party
    // declares it represents this viewer (e.g. ledger ⇒ consortium, sepolia ⇒ public).
    const isYou = viewer === colId || party.viewer === viewer;
    const isPub = party.kind === 'public';
    const isAuth = party.kind === 'authority';
    const isCons = party.kind === 'consortium';
    const facts = activeFacts(scn, step).filter(f => f.col === colId);
    const headTint = isYou ? 'var(--accent-soft)' : isPub ? 'var(--public-soft)' : isCons ? 'var(--consortium-soft)' : isAuth ? 'var(--authority-soft)' : '#fff';
    const dotColor = isPub ? 'var(--public)' : isCons ? 'var(--consortium)' : isAuth ? 'var(--authority)' : 'var(--ink)';
    return (
      <div className={'col' + (isYou ? ' you' : '')}>
        <div className="col-head" ref={colRef} style={{ background: headTint }}>
          <div className="ch-top">
            <span className="ndot" style={{ background: dotColor }} />
            <span className="ch-name">{party.name}</span>
            {isAuth && <span className="reg-ico" style={{ color: 'var(--authority)' }}><Shield s={14} /></span>}
            {isYou && <span className="youtag">VIEWING</span>}
          </div>
          <div className="ch-role" style={{ color: isPub ? 'var(--public-ink)' : 'var(--muted)' }}>{party.role}</div>
          {myGroups.length > 0 && (
            <div className="ch-groups">
              {myGroups.map(g => {
                const gd = groupDefs[g] || {};
                return <span key={g} className="gtag" title={'Member of ' + (gd.name || g)}><span className="ghex">⬡</span>{gd.short || gd.name || g}</span>;
              })}
            </div>
          )}
        </div>
        <div className="col-body">
          {facts.length === 0
            ? <div className="empty">—</div>
            : facts.map((f, i) => <Entry key={colId + i + f.title} fact={f} viewer={viewer} step={step} />)}
        </div>
      </div>
    );
  }

  /* ---------- flying token ---------- */
  function FlyChip({ flight, onDone }) {
    const [go, setGo] = useState(false);
    useEffect(() => {
      const r = setTimeout(() => setGo(true), 40);
      const t = setTimeout(onDone, 1000 + (flight.delay || 0) + 200);
      return () => { clearTimeout(r); clearTimeout(t); };
    }, []);
    const x = go ? flight.x1 : flight.x0;
    const y = go ? flight.y1 : flight.y0;
    // Redacted: the viewer can't see this transfer — show a lock, never the amount.
    return (
      <div className={'flychip ' + flight.tone + (flight.redacted ? ' redacted' : '') + (flight.shielded ? ' shielded' : '')}
        style={{ left: x, top: y, opacity: go ? 1 : 0.001, transitionDelay: (flight.delay || 0) + 'ms' }}>
        {flight.redacted ? <LockIco s={12} /> : flight.shielded ? <span className="shield-mark">▦</span> : null}
        {flight.redacted ? 'Private' : flight.label}
      </div>
    );
  }

  /* ---------- main ---------- */
  function App() {
    const load = (k, d) => { try { const v = localStorage.getItem('palDemo.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    // ?scenario=<id> (used by the index page) opens that use case at step 1.
    const urlScn = new URLSearchParams(window.location.search).get('scenario');
    const [scnId, setScnId] = useState(() => urlScn || load('scenario', 'simple-token'));
    const [step, setStep] = useState(() => (urlScn ? 0 : load('step', 0)));
    // Drop the parameter once read, so a reload keeps whatever tab the viewer moved to.
    useEffect(() => { if (urlScn) window.history.replaceState(null, '', window.location.pathname); }, []);
    const [viewer, setViewer] = useState(() => load('viewer', 'omniscient'));
    const [auto, setAuto] = useState(false);
    const [flights, setFlights] = useState([]);
    const [scenarios, setScenarios] = useState(() => DS.listScenariosSync ? DS.listScenariosSync() : []);
    const [recording, setRecording] = useState(() => DS.getRecordingSync ? DS.getRecordingSync(scnId) : null);
    const [loadErr, setLoadErr] = useState(null);
    const scn = recording;
    const last = scn ? scn.steps.length - 1 : 0;
    const cur = Math.min(step, last);
    const colRefs = useRef({});
    const stageRef = useRef(null);

    // load scenario list (sync for mock, async-capable for replay sources);
    // fall back to the first scenario if a stale/removed id is selected.
    useEffect(() => {
      Promise.resolve(DS.listScenarios()).then(list => {
        setScenarios(list);
        if (list.length && !list.some(s => s.id === scnId)) { setScnId(list[0].id); setStep(0); }
      });
    }, []);
    // load the active recording (sync for mock, fetched for replay)
    useEffect(() => {
      let alive = true;
      if (DS.getRecordingSync) { const r = DS.getRecordingSync(scnId); if (r) { setRecording(r); return; } }
      setRecording(null); setLoadErr(null);
      DS.getRecording(scnId).then(r => { if (alive) setRecording(r); }).catch(e => { if (alive) setLoadErr(String((e && e.message) || e)); });
      return () => { alive = false; };
    }, [scnId]);

    // clamp viewer / step to the loaded recording (fall back to its first viewer)
    useEffect(() => { if (scn && scn.viewers.indexOf(viewer) === -1) setViewer(scn.viewers[0]); }, [recording]);
    useEffect(() => { if (scn && step > last) setStep(last); }, [recording]);
    useEffect(() => { localStorage.setItem('palDemo.scenario', JSON.stringify(scnId)); }, [scnId]);
    useEffect(() => { localStorage.setItem('palDemo.step', JSON.stringify(step)); }, [step]);
    useEffect(() => { localStorage.setItem('palDemo.viewer', JSON.stringify(viewer)); }, [viewer]);

    const go = useCallback((n) => setStep(s => Math.max(0, Math.min(last, n))), [last]);
    const next = useCallback(() => setStep(s => Math.min(last, s + 1)), [last]);
    const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

    // keyboard
    useEffect(() => {
      const h = (e) => { if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); };
      window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [next, prev]);

    // autoplay
    useEffect(() => {
      if (!auto) return;
      if (step >= last) { setAuto(false); return; }
      const t = setTimeout(() => setStep(s => Math.min(last, s + 1)), 2600);
      return () => clearTimeout(t);
    }, [auto, step, last]);

    // motion on step change
    useEffect(() => {
      const m = scn && scn.steps[cur] && scn.steps[cur].motion;
      if (!m || !stageRef.current) return;
      const stageBox = stageRef.current.getBoundingClientRect();
      const center = (id) => {
        const el = colRefs.current[id]; if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - stageBox.left + r.width / 2, y: r.top - stageBox.top + r.height + 6 };
      };
      const fl = [];
      m.forEach((mv, i) => {
        const a = center(mv.from), b = center(mv.to); if (!a || !b) return;
        // A motion is a moving fact: redact it for viewers who can't see this tier.
        const seen = canSee({ kind: mv.tone, see: mv.see }, viewer);
        fl.push({ id: scnId + '-' + cur + '-' + i + '-' + viewer + '-' + Date.now(), label: mv.label, tone: mv.tone, redacted: !seen, shielded: mv.shielded, delay: i * 220, x0: a.x - 34, y0: a.y, x1: b.x - 34, y1: b.y });
      });
      if (fl.length) setFlights(f => f.concat(fl));
      // Fire on step change only (not viewer change); visibility is still
      // evaluated against whichever viewer is active at the moment we step.
    }, [scnId, cur]);

    if (!scn) return (<div className="pal app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}><div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, maxWidth: 460 }}>{loadErr ? <span>Couldn’t load <span className="mono">recordings/{scnId}.json</span> ({loadErr}).<br />Serve the project over HTTP (see BACKEND.md) — not a <span className="mono">file://</span> path.</span> : 'Loading…'}</div></div>);
    const PT = scn.parties || {};
    const groupLabels = scn.groupLabels || {};
    const stepData = scn.steps[cur];
    // Columns auto-group by party kind, in a fixed visual order. Each group is
    // driven by kind (never a hard-coded id), so any use case can have any mix.
    const GROUP_DEFS = [
      { key: 'primary',    label: groupLabels.primary    || 'Institutions',                kinds: ['inst', 'authority'] },
      { key: 'consortium', label: groupLabels.consortium || 'Permissioned consortium ledger', kinds: ['consortium'] },
      { key: 'public',     label: groupLabels.public     || 'Public ledgers',               kinds: ['public'] },
    ];
    const groups = GROUP_DEFS
      .map(g => ({ ...g, cols: scn.columns.filter(c => g.kinds.indexOf((PT[c] || {}).kind) !== -1) }))
      .filter(g => g.cols.length > 0);

    return (
      <div className="pal app">
        {/* header */}
        <div className="hdr">
          <a className="brand" href="index.html" title="Home" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="logo" />
            <span className="bname">Paladin</span><span className="bsub">Concept Demo</span>
          </a>
          <div className="tabs">
            {scenarios.map(s => (
              <button key={s.id} className={'tabbtn' + (s.id === scnId ? ' on' : '')} onClick={() => { setScnId(s.id); setStep(0); setAuto(false); }}>{s.name}</button>
            ))}
          </div>
          <div className="tagline">{scn.tagline}</div>
          <div className="spacer" />
          <a className="btn" href="findings.html" style={{ textDecoration: 'none' }}>Throughput findings</a>
          <button className="btn" onClick={() => { setAuto(a => !a); }}>{auto ? '❚❚ Pause' : '▶ Auto-play'}</button>
          <button className="btn ghost" onClick={() => { setStep(0); setAuto(false); }}>Reset</button>
        </div>

        {/* view-as bar */}
        <div className="vbar">
          <span className="vlabel">View as</span>
          <div className="vpills">
            {scn.viewers.map(v => {
              const vp = PT[v]; const isAuth = !!(vp && vp.kind === 'authority'); const isCons = !!(vp && vp.kind === 'consortium');
              return (
                <button key={v} className={'vpill' + (v === viewer ? ' on' : '') + (isAuth ? ' authority' : '') + (isCons ? ' consortium' : '') + (v === 'public' ? ' pub' : '')} onClick={() => setViewer(v)}>
                  {isAuth && <Shield s={12} />}
                  {viewerLabel(v, PT)}
                </button>
              );
            })}
          </div>
          <div className="spacer" />
          <div className="legend">
            <span className="lg"><span className="ndot" style={{ background: 'var(--public)' }} /> Public · public chain</span>
            <span className="lg"><span className="ndot" style={{ background: 'var(--consortium)' }} /> Permissioned · consortium-only</span>
            <span className="lg"><span className="ndot" style={{ background: 'var(--private)' }} /> Private · restricted</span>
            <span className="lg"><Eye off /> hidden from you</span>
          </div>
        </div>

        {/* stepper */}
        <div className="stepper">
          <div className="track" />
          {scn.steps.map((s, i) => {
            const done = i < cur, on = i === cur;
            return (
              <button key={i} className="stepnode" onClick={() => go(i)} title={s.title}>
                <span className={'sdot' + (on ? ' on' : done ? ' done' : '')}>{done ? '✓' : i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* columns */}
        <div className="stage" ref={stageRef}>
          {groups.length > 0 && (
            <div className="grouprow">
              {groups.map((g, gi) => (
                <React.Fragment key={g.key}>
                  {gi > 0 && <div className="gdiv" />}
                  <div className={'gcap gcap-' + g.key} style={{ flex: g.cols.length }}>{g.label}</div>
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="cols">
            {groups.map((g, gi) => (
              <React.Fragment key={g.key}>
                {gi > 0 && <div className="cols-div" />}
                {g.cols.map(c => <Column key={c} colId={c} scn={scn} parties={PT} viewer={viewer} step={cur} colRef={el => (colRefs.current[c] = el)} />)}
              </React.Fragment>
            ))}
          </div>
          {/* motion layer */}
          <div className="flylayer">
            {flights.map(fl => <FlyChip key={fl.id} flight={fl} onDone={() => setFlights(f => f.filter(x => x.id !== fl.id))} />)}
          </div>
        </div>

        {/* detail rail */}
        <div className="rail">
          <div className="rail-main">
            <div className="rail-meta">
              <span className="stepno">Step {String(cur + 1).padStart(2, '0')} / {String(scn.steps.length).padStart(2, '0')}</span>
              {stepData.badges.map(b => <span key={b} className={'badge badge-' + b}>{b === 'pub' ? 'Public' : b === 'perm' ? 'Permissioned' : 'Private'}</span>)}
              {viewer !== 'omniscient' && <span className="vhint">· viewing as {viewerLabel(viewer, PT)}</span>}
            </div>
            <h2 className="rail-title">{stepData.title}</h2>
            <p className="rail-plain">{stepData.plain}</p>
            <div className="mono rail-tech">{shortHex(stepData.tech)}</div>
          </div>
          <div className="rail-side">
            <div className="concept"><span className="ctitle">Why it matters</span>{scn.concept}</div>
            <div className="navbtns">
              <button className="btn" onClick={prev} disabled={cur === 0}>‹ Back</button>
              <button className="btn btn-pri" onClick={next} disabled={cur === last}>{stepData.motion ? 'Execute ⚡' : 'Next ›'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
