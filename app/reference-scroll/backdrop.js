/* Reference background companion. No dependencies, model edits or render-loop hooks.
 * White field: the-watch.pretty.js:2985–2993; particle motion:2916–2918.
 * The Canvas2D filaments are a restrained approximation of the source curl trails.
 * Call initReferenceBackdrop() once, then updateReferenceBackdrop({ darkStage,
 * phase: 0..1 (or { p }), section, time: elapsedSeconds, reduced }).
 */
(function referenceBackdropModule(global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const smooth = (a, b, value) => {
    const t = clamp((value - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  let instance = null;

  function initReferenceBackdrop() {
    if (instance) return instance.api;
    if (!document.body) return null;

    const canvas = document.createElement('canvas');
    canvas.id = 'reference-backdrop';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;touch-action:pan-y;';
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    document.body.insertBefore(canvas, document.body.firstChild);

    const field = document.createElement('canvas');
    const fieldCtx = field.getContext('2d', { alpha: false });
    if (!fieldCtx) { canvas.remove(); return null; }
    const media = global.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = global.matchMedia('(pointer: coarse)');
    const state = {
      darkStage: 0, phase: 0, section: 'Intro', reduced: media.matches,
      width: 1, height: 1, scale: 1, mobile: false, dirty: true, resized: true,
      frame: 0, lastDraw: -Infinity, anchorTime: 0, anchorNow: performance.now(),
      image: null, columns: null, rows: null, ribbons: [], drawCount: 0,
      disposed: false, lastCost: 0
    };

    // Stable seeds give scrubbing and reduced-motion captures the same composition.
    function seed(index) {
      const n = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
      return n - Math.floor(n);
    }

    function resize() {
      const width = Math.max(1, global.innerWidth || document.documentElement.clientWidth || 1);
      const height = Math.max(1, global.innerHeight || document.documentElement.clientHeight || 1);
      state.mobile = width < 768 || coarse.matches || (navigator.hardwareConcurrency || 8) <= 4;
      const budget = state.mobile ? 520000 : 1250000;
      const pixelScale = Math.min(global.devicePixelRatio || 1, state.mobile ? 1.25 : 1.5, Math.sqrt(budget / (width * height)));
      state.width = width;
      state.height = height;
      state.scale = Math.max(.35, pixelScale);
      canvas.width = Math.max(1, Math.round(width * state.scale));
      canvas.height = Math.max(1, Math.round(height * state.scale));
      field.width = state.mobile ? 76 : 112;
      field.height = Math.max(36, Math.min(156, Math.round(field.width * height / width)));
      state.image = fieldCtx.createImageData(field.width, field.height);
      state.columns = Array.from({ length: field.width }, (_, i) => (i + .5) / field.width);
      state.rows = Array.from({ length: field.height }, (_, i) => (i + .5) / field.height);
      const count = state.mobile ? 58 : 112;
      state.ribbons = Array.from({ length: count }, (_, i) => ({
        index: (i + .5) / count,
        seed: seed(i + 1),
        offset: seed(i + 67) * TAU,
        length: .2 + seed(i + 133) * .43,
        brightness: .035 + seed(i + 277) * .11,
        width: .42 + seed(i + 401) * .46
      }));
      state.resized = false;
      state.dirty = true;
    }

    function elapsed(now) {
      return state.reduced ? 0 : state.anchorTime + (now - state.anchorNow) / 1000;
    }

    function paintField(time) {
      const data = state.image.data;
      const dark = state.darkStage;
      const t = time * .3;
      let offset = 0;
      for (let y = 0; y < field.height; y++) {
        // The source uses GL UVs; Canvas rows run in the opposite direction.
        const v = 1 - state.rows[y];
        const sy = v * .8;
        for (let x = 0; x < field.width; x++) {
          const u = state.columns[x];
          const sx = u * .8;
          const edge = 1 - smooth(.3, .7, Math.hypot(u - .5, v - .5));
          let wave = (Math.sin(sx * 4 * Math.sin(sx * 4) + t + Math.sin(sy * 4 + t * 1.3))
            - Math.sin(sy + t + Math.sin(sx * 3 + t) * 4)) * .3 * edge;
          wave += 1 - smooth(.3, .7, Math.hypot(u - 1, v - 1));
          const white = 235 - Math.max(0, Math.min(.24, wave * .3)) * 88;
          // Dark material chapter has a nearly neutral charcoal floor, not a glow.
          const charcoal = 8 + 2 * edge;
          const grey = Math.round(white * (1 - dark) + charcoal * dark);
          data[offset++] = grey;
          data[offset++] = grey;
          data[offset++] = grey;
          data[offset++] = 255;
        }
      }
      fieldCtx.putImageData(state.image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(field, 0, 0, canvas.width, canvas.height);
    }

    function filamentPoint(ribbon, along, time, phase, point) {
      // Matches the reference's orbit frequencies (1.5 / 2) and slow global time.
      const theta = ribbon.index * 10 + time * .2 - along * ribbon.length;
      const pulse = .5 + Math.sin(theta) * .5;
      const angle = theta + pulse * .2;
      const opening = 1 - smooth(0, .3, phase);
      const radius = .6 * (1 + 3 * opening * opening * opening * ribbon.index);
      let x = Math.sin(angle * 1.5) * radius;
      let y = Math.cos(angle * 1.5) * radius;
      const z = Math.sin(angle * 2);
      const s = ribbon.offset;
      const flow = time * .028;
      const nx = Math.sin(y * 3.1 + z * 1.7 + s + flow);
      const ny = Math.sin(z * 2.7 + x * 1.5 + s * 1.31 - flow);
      const nz = Math.sin(x * 2.3 + y * 1.9 + s * .73 + flow * .7);
      const curl = .085 * (.8 + pulse);
      x += (ny - nz) * curl;
      y += (nz - nx) * curl;
      const perspective = .95 / (1.25 - z * .32);
      const zoom = 1 + smooth(.45, .8, phase) * .85;
      const size = Math.min(state.width, state.height) * .9 * perspective * zoom;
      point.x = state.width * (.51 + Math.cos(time * .065) * .018) + x * size;
      point.y = state.height * (.53 + Math.sin(time * .065) * .018) + y * size;
    }

    function paintFilaments(time) {
      if (state.section !== 'Particles' || state.darkStage < .002) return;
      const phase = state.phase;
      const visibility = state.darkStage * smooth(.001, .1, phase) * (1 - smooth(.75, .85, phase));
      if (visibility < .001) return;
      ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const point = { x: 0, y: 0 };
      const points = state.mobile ? 15 : 21;
      const third = points / 3;
      for (const ribbon of state.ribbons) {
        // Three tapered pieces make wisps rather than dots, beads or space stars.
        for (let segment = 0; segment < 3; segment++) {
          ctx.beginPath();
          for (let j = 0; j <= third; j++) {
            const along = 1 - (segment * third + j) / points;
            filamentPoint(ribbon, along, time, phase, point);
            if (j === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          const taper = [.22, .53, 1][segment];
          const opacity = ribbon.brightness * taper * visibility;
          ctx.strokeStyle = 'rgba(226,230,232,' + opacity.toFixed(4) + ')';
          ctx.lineWidth = ribbon.width;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function draw(now) {
      if (state.resized) resize();
      const started = performance.now();
      const time = elapsed(now);
      paintField(time);
      paintFilaments(time);
      state.lastDraw = now;
      state.dirty = false;
      state.drawCount++;
      state.lastCost = performance.now() - started;
    }

    function schedule() {
      if (!state.frame && !state.disposed && !document.hidden) {
        state.frame = requestAnimationFrame(tick);
      }
    }

    function tick(now) {
      state.frame = 0;
      if (state.disposed || document.hidden) return;
      const isParticle = state.section === 'Particles' && state.darkStage > .01;
      // No full-resolution per-pixel work; both resolution and cadence are capped.
      const fps = isParticle ? (state.mobile ? 18 : 24) : (state.mobile ? 10 : 15);
      const interval = 1000 / fps;
      if (state.dirty || state.resized || (!state.reduced && now - state.lastDraw >= interval - 1)) draw(now);
      if (!state.reduced || state.dirty || state.resized) schedule();
    }

    function onResize() { state.resized = true; state.dirty = true; schedule(); }
    function onVisibility() {
      if (document.hidden && state.frame) { cancelAnimationFrame(state.frame); state.frame = 0; }
      if (!document.hidden) { state.dirty = true; schedule(); }
    }
    function onMotion(event) { state.reduced = event.matches; state.dirty = true; schedule(); }
    global.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener?.('change', onMotion);

    const api = {
      canvas,
      getStats: () => ({ width: canvas.width, height: canvas.height, mobile: state.mobile,
        filaments: state.ribbons.length, draws: state.drawCount, drawMilliseconds: state.lastCost,
        reduced: state.reduced, section: state.section }),
      destroy() {
        state.disposed = true;
        if (state.frame) cancelAnimationFrame(state.frame);
        global.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        media.removeEventListener?.('change', onMotion);
        canvas.remove();
        instance = null;
      }
    };
    instance = { api, state, schedule };
    draw(performance.now());
    schedule();
    return api;
  }

  function updateReferenceBackdrop(options) {
    const api = initReferenceBackdrop();
    if (!api || !options || typeof options !== 'object') return api;
    const { state, schedule } = instance;
    const dark = clamp(finite(options.darkStage, state.darkStage));
    const phase = clamp(finite(typeof options.phase === 'object' && options.phase !== null ? options.phase.p : options.phase, state.phase));
    const section = typeof options.section === 'string' ? options.section : state.section;
    const reduced = typeof options.reduced === 'boolean' ? options.reduced : state.reduced;
    if (Math.abs(dark - state.darkStage) > .0001 || Math.abs(phase - state.phase) > .0001
      || section !== state.section || reduced !== state.reduced) state.dirty = true;
    state.darkStage = dark;
    state.phase = phase;
    state.section = section;
    state.reduced = reduced;
    if (Number.isFinite(options.time)) {
      state.anchorTime = options.time;
      state.anchorNow = performance.now();
    }
    if (state.dirty || !state.reduced) schedule();
    return api;
  }

  global.initReferenceBackdrop = initReferenceBackdrop;
  global.updateReferenceBackdrop = updateReferenceBackdrop;
})(window);
