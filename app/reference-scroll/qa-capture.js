/* Local review utility. This module is requested only with ?qaCapture=1.
 * Captures the exact WebGL canvas, never the surrounding page or browser. */
const ALLOWED_ORIGIN = 'http://127.0.0.1:8971';
const RECEIVER = 'http://127.0.0.1:8973/capture';
const MAX_PNG_BYTES = 6 * 1024 * 1024;

export function installQACapture({ renderer, scene, camera, getState = () => ({}) }) {
  if (location.origin !== ALLOWED_ORIGIN || new URLSearchParams(location.search).get('qaCapture') !== '1') return null;
  const existing = document.getElementById('qa-capture-panel');
  if (existing) return null;
  const panel = document.createElement('aside');
  panel.id = 'qa-capture-panel';
  panel.setAttribute('aria-label', 'Local WebGL frame review');
  panel.style.cssText = 'position:fixed;z-index:2147483646;right:16px;bottom:16px;max-width:min(290px,calc(100vw - 32px));padding:12px 14px;background:#fff;color:#24282c;border:1px solid #c7ccd0;border-radius:4px;font:11px/1.45 system-ui,sans-serif;box-shadow:0 3px 20px #0001;pointer-events:auto;';
  const label = document.createElement('p');
  label.textContent = 'LOCAL REVIEW · WEBGL ONLY';
  label.style.cssText = 'font-size:9px;letter-spacing:.08em;margin:0 0 8px;color:#66717a;';
  const button = document.createElement('button');
  button.type = 'button';button.id = 'qa-save-review-frame';button.textContent = 'Save review frame';
  button.style.cssText = 'background:#253643;color:#fff;border:0;border-radius:3px;padding:9px 12px;cursor:pointer;font:12px system-ui,sans-serif;';
  const status = document.createElement('p');
  status.id = 'qa-capture-status';status.setAttribute('role', 'status');status.setAttribute('aria-live', 'polite');
  status.textContent = 'Exact canvas pixels. Page text and UI are excluded.';
  status.style.cssText = 'margin:8px 0 0;overflow-wrap:anywhere;color:#66717a;';
  panel.append(label, button, status);document.body.append(panel);

  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const rounded = value => { const number = finite(value);return number === null ? null : Math.round(number * 1000000) / 1000000; };
  const vector = object => object && ['x', 'y', 'z'].every(key => finite(object[key]) !== null) ? [object.x, object.y, object.z].map(rounded) : null;
  const datasetJSON = key => { try { return JSON.parse(document.body.dataset[key] || 'null'); } catch { return null; } };
  const chapterName = value => ['Intro', 'Disassembly', 'Particles', 'Presentation', 'Straps', 'Images', 'Colors', 'Parts', 'Footer'].includes(value) ? value : 'Unknown';

  async function capture() {
    button.disabled = true;status.textContent = 'Saving WebGL frame…';panel.dataset.captureState = 'saving';
    try {
      // Rendering and copying happen in this click task before the next RAF.
      // Keep native canvas size, camera, material state and alpha unchanged.
      renderer.render(scene, camera);
      const png = renderer.domElement.toDataURL('image/png');
      if (!png.startsWith('data:image/png;base64,')) throw new Error('Canvas did not return a PNG.');
      if ((png.length - 22) * 0.75 > MAX_PNG_BYTES) throw new Error('Frame exceeds the 6 MB local review limit.');
      const state = getState() || {};
      const tb = datasetJSON('tourbillon') || {};
      const studio = datasetJSON('studio') || {};
      const editorial = datasetJSON('editorialWatches') || {};
      const reassembly = datasetJSON('reassembly') || {};
      const selected = datasetJSON('kimiConfiguration') || {};
      const configuration = {};
      for (const [key, values] of Object.entries({ dial: ['ink', 'blue', 'silver'], hardware: ['silver', 'graphite', 'champagne'], bracelet: ['silver', 'graphite'] })) {
        if (values.includes(selected[key])) configuration[key] = selected[key];
      }
      const diagnostics = {
        kind: 'webgl-only', version: 1, capturedAt: new Date().toISOString(),
        asset: ['assets/kimi_openheart_exterior_v2.glb','assets/kimi_machining_exterior_v3.glb'].includes(window.__EXTERIOR?.asset) ? window.__EXTERIOR.asset : 'unknown',
        studio: ['atelier','edge'].includes(studio.style) ? studio.style : 'baseline',
        movementAsset: document.body.dataset.movementAsset || 'assets/omega_321_r46f.glb',
        grainFrame: new URLSearchParams(location.search).get('grainFrame')==='stable'?'stable':'legacy',
        editorialLOD: datasetJSON('editorialLOD')?.applied===true ? '20' : 'source',
        chapter: chapterName(state.chapter || document.body.dataset.section),
        phase: rounded(state.phase ?? document.body.dataset.phase),
        progress: rounded(state.progress ?? document.body.dataset.progress),
        canvas: { width: renderer.domElement.width, height: renderer.domElement.height, pixelRatio: rounded(renderer.getPixelRatio()) },
        camera: { position: vector(camera.position), up: vector(camera.up), fov: rounded(camera.fov), aspect: rounded(camera.aspect) },
        configuration,
        render: { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, frame: finite(state.frame) },
        reducedMotion: document.body.dataset.reducedMotion === 'true',
        frontOcclusion: document.body.dataset.frontOcclusion === 'true',
        editorial: { instances: finite(editorial.instances), visibleInstances: finite(editorial.visibleInstances), visibleGeometryTriangles: finite(editorial.visibleGeometryTriangles), continuouslyAnimating: Boolean(editorial.continuouslyAnimating) },
        reassembly: { active: Boolean(reassembly.active), units: finite(reassembly.units), groups: finite(reassembly.groups), landed: finite(reassembly.landed), travelling: finite(reassembly.travelling), heroMix: rounded(reassembly.heroMix), visible: rounded(reassembly.visible) },
        tourbillon: { parts: finite(tb.parts), visible: Boolean(tb.visible), active: Boolean(tb.active), concealedRear: Boolean(tb.concealedRear), detail: rounded(tb.detail), cageAngle: rounded(tb.angles?.cage), balanceAngle: rounded(tb.angles?.balance) }
      };
      const abort = new AbortController();const timeout = setTimeout(() => abort.abort(), 10000);
      let response;
      try {
        response = await fetch(RECEIVER, { method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ png, diagnostics }), signal: abort.signal });
      } finally { clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Local capture receiver rejected the frame.');
      status.textContent = 'Saved ' + result.png;
      panel.dataset.captureState = 'saved';panel.dataset.captureFile = result.png;
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'Receiver timed out. Start the local receiver on port 8973.' : error.message === 'Failed to fetch' ? 'Receiver unavailable. Start the local receiver on port 8973.' : error.message;
      panel.dataset.captureState = 'error';
    } finally { button.disabled = false; }
  }
  button.addEventListener('click', capture);
  return { dispose() { button.removeEventListener('click', capture);panel.remove(); } };
}
