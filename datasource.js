/* Paladin Concept Demo — data source layer.
 *
 * The app talks to a DataSource, never to scenario data directly. The source of
 * truth is the captured/authored RECORDINGS in ./recordings (one JSON per use
 * case). A recording is fully self-describing:
 *   { id, name, tagline, concept, parties{}, columns[], viewers[], steps[], facts[] }
 *
 * Interface:
 *   listScenarios() -> Promise<[{id,name}]>   (from recordings/index.json)
 *   getRecording(id) -> Promise<Recording>    (from recordings/<id>.json)
 *   canSee(fact, viewer) -> boolean           the redaction rule  ◀── Option A/B seam
 *
 * Replay-first: the UI never executes anything; back/forward is pure indexing.
 * Override the folder with ?recordings=<baseUrl>. Must be served over HTTP.
 * See BACKEND.md for the capture pipeline and the Option-B (per-node) seam.
 */
(function () {
  // ---- Option A visibility: declared via each fact's `see` list ----
  // Three tiers of disclosure:
  //   pub  — on a genuinely public chain (e.g. Sepolia): everyone, incl. outsiders
  //   perm — on the permissioned consortium ledger: every consortium member, but
  //          NOT the public (this is what makes "permissioned ≠ public" visible)
  //   priv — restricted to an explicit `see` list (private groups / holdings)
  function declaredCanSee(fact, viewer) {
    if (viewer === 'omniscient') return true;     // demo god-view
    if (fact.kind === 'pub') return true;          // public chain = everyone
    if (viewer === 'public') return false;         // outsider sees only pub
    if (fact.kind === 'perm') return true;         // permissioned: any consortium viewer
    return !!(fact.see && fact.see.indexOf(viewer) !== -1);
  }

  // ---- RecordingSource: load self-describing recordings over HTTP ----
  function createRecordingSource(baseUrl) {
    baseUrl = (baseUrl || 'recordings').replace(/\/$/, '');
    const cache = {};
    let manifest = null;
    return {
      kind: 'recording',
      visibilityModel: 'declared',
      async listScenarios() {
        if (!manifest) {
          // recordings/index.json: [{ id, name, tagline }]
          manifest = await fetch(baseUrl + '/index.json').then(r => r.json());
        }
        return manifest.map(m => ({ id: m.id, name: m.name }));
      },
      async getRecording(id) {
        if (!cache[id]) cache[id] = await fetch(baseUrl + '/' + id + '.json').then(r => {
          if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
          return r.json();
        });
        return cache[id];
      },
      canSee: declaredCanSee,
    };
  }

  /* =========================================================
   *  Option B seam — REAL per-node visibility (later)
   *  -------------------------------------------------------
   *  Instead of declaring `see`, capture (per step) what EACH node's RPC
   *  actually returns, store it on the fact (e.g. fact.views[viewer]), and
   *  override canSee to read it:
   *
   *      function perNodeCanSee(fact, viewer) {
   *        if (viewer === 'omniscient') return true;
   *        const v = fact.views && fact.views[viewer];
   *        return !!(v && v.seen);
   *      }
   *
   *  Nothing else changes — the redaction call site already routes through
   *  DataSource.canSee.
   * ========================================================= */

  const params = new URLSearchParams(location.search);
  window.PAL_DS = createRecordingSource(params.get('recordings'));
  window.PAL_createRecordingSource = createRecordingSource;
})();
