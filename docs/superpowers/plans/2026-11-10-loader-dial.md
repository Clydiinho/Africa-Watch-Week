# Loader Dial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the spinning grey loading ring with a gold-rimmed black dial whose sweep starts at 12, reveals the watch as it passes, and lands back at 12 at 100%.

**Architecture:** One SVG dial drawn once as a reusable `<g>` in hidden defs, then rendered twice inside `.load-dial`: a ghost copy at 7% opacity and an identical copy at full opacity clipped by a clockwise `conic-gradient` mask. A single custom property, `--load-p` (0 to 1), drives both the mask angle and the gold rim arc. `entry-gate.js` owns the property (it already owns the loader's lifecycle); `runtime.js` reports byte progress to it and nothing else changes there.

**Tech Stack:** Static HTML, CSS custom properties, `conic-gradient` mask, inline SVG, ES modules. No build step, no test framework.

**Spec:** `docs/superpowers/specs/2026-11-10-loader-dial-design.md`

## Global Constraints

- Never commit or push to `main`. Work on `perf/design3`, branched from `perf/design2`.
- No new image assets. The dial is SVG only.
- No change to what is downloaded, when, or how bytes are measured. No change to the entry gate's copy, the ETA, the phase labels, the quick-view escape, quick mode, or the hero.
- Existing visible copy is not reworded. No em-dashes in visible copy.
- Diagnostics stay behind `?qa=1`. The QA page below is inert and unlinked.
- `prefers-reduced-motion` must not be able to force the gauge to a wrong value.
- Do not claim a visual or performance result that was not observed. WebGL cannot boot in the sandbox, so the live 3D load path is verified by code and by the staged harness, never by "it looks right in 3D".
- Serve with `cd app; python -m http.server 8123` → `http://127.0.0.1:8123/`.
- Headless capture (Windows): `"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=W,H --user-data-dir=C:\Users\TASCAL~1\AppData\Local\Temp\opencode\prof-NAME --screenshot=PATH URL`.

## Review Focus

- **The three.js download.** Before the runtime exists there are no tracked bytes, so the dial sits at 0% for potentially seconds. The ghost state must look intentional, not broken.
- **Bytes complete, scene still warming.** `--load-p` reaches 1 while "Preparing scene" runs. The dial must read as finished at that moment, not stuck mid-sweep.
- **No mask support.** A browser without `conic-gradient` masks must still show a complete, correctly proportioned dial, not a blank circle or a double-exposed one.
- **Reduced motion.** The old stylesheet forced `stroke-dashoffset: 0` under `prefers-reduced-motion`, which on the new gauge means "100%". That override must be gone.
- **Second attempt.** Retry after a failure, or re-entering 3D after switching to quick, must not show a pre-filled dial from the previous attempt.
- **Short landscape.** At 844×390 the dial, status, ETA, retry link and quick-view escape must all fit.

---

### Task 1: QA harness for the loader states

**Files:**
- Create: `app/_qa/loader-dial.html`

**Interfaces:**
- Produces: a page at `http://127.0.0.1:8123/_qa/loader-dial.html` that renders the real `index.html` in five iframes, forces the loader visible, sets `--load-p` to 0 / 0.25 / 0.5 / 0.75 / 1, and prints `PASS`/`FAIL` per frame. Later tasks run their checks by loading this page and reading its captions.

- [ ] **Step 1: Write the harness**

It must, for each of `[0, 0.25, 0.5, 0.75, 1]`, create an iframe `src="index.html"`, and on load:
`d.getElementById('entry-gate')?.setAttribute('hidden','')`, `d.getElementById('loading')?.classList.remove('is-complete','is-hidden')`, `d.getElementById('loading').style.display='grid'`, `d.documentElement.style.setProperty('--load-p', String(p))`.

Each caption must print the frame's `p`, then the checks, with the whole body in `try/catch` so a missing element reports `FAIL` with the error rather than throwing:
`dial = !!d.querySelector('.load-dial')`; `ghost = getComputedStyle(d.querySelector('.load-ghost')).opacity`; `arc = parseFloat(getComputedStyle(d.querySelector('.load-arc')).strokeDashoffset)`; `expected = 100 - 100*p`; `maskDegs = [...((getComputedStyle(d.querySelector('.load-reveal')).maskImage || getComputedStyle(d.querySelector('.load-reveal')).webkitMaskImage || '').matchAll(/([\d.]+)deg/g))].map(m => parseFloat(m[1]))`; `maskOk = p === 0 ? true : maskDegs.some(v => Math.abs(v - p*360) <= 1)`. A frame passes when `dial && Math.abs(arc-expected) < 0.6 && maskOk`.

Add `window.__qaResult` holding `{ pass: n, total: 5, rows: [...] }` so it can also be read programmatically.

- [ ] **Step 2: Run it and confirm it fails**

Serve, then open `http://127.0.0.1:8123/_qa/loader-dial.html`. Expected: five `FAIL` captions, `0/5`, because `.load-dial` does not exist yet.

- [ ] **Step 3: Commit**

```bash
git add app/_qa/loader-dial.html
git commit -m "Design3: QA harness for loader dial states"
```

---

### Task 2: Dial art, ghost copy, masked reveal and rim gauge

**Files:**
- Modify: `app/index.html:174` (replace the `.loading-ring` SVG)
- Modify: `app/reference-scroll/style.css:206-214` (replace the ring rules), `:328` (mobile ring rule), `:531-532` (dark ring overrides), `:348` (reduced-motion ring override)

**Interfaces:**
- Produces: `.load-dial`, `.load-ghost`, `.load-reveal`, `.load-arc`, `#aww-dial-art`, and the `--load-p` contract (`0` to `1`, unitless, set on `:root`). Task 4 writes it; Tasks 3 and 5 read it.

- [ ] **Step 1: Replace the loader SVG with the dial**

In `index.html`, inside `#loading`, before `.loading-content`, insert the hidden defs and the three-layer dial. Geometry, `viewBox="0 0 400 400"`, centre `(200,200)`:

- bezel shadow ring `r=192`, `stroke=#241f18`, `stroke-width=6`
- plate `r=186`, `fill=url(#aww-plate)` (radial: `#151310` at 55%, `#0a0a0b` at 100%)
- gold catch-light `r=192`, `pathLength=100`, `stroke-dasharray="17 83"`, `stroke-dashoffset="-4"`, `stroke-width=2`, `stroke=url(#aww-gold)`, `stroke-linecap=round`, rotated `-90 200 200` (reads as a highlight from 1 o'clock to 3 o'clock)
- twelve indices from `<rect id="aww-idx" x="199" y="24" width="2" height="26" rx="1">`, `<use>` rotated 0/30/…/330 about `200 200`, `fill=#8a7a5e`, `fill-opacity=".7"`
- hour hand `M200 200 L150 171`, `stroke=url(#aww-gold)`, `stroke-width=4`, `stroke-linecap=round`
- minute hand `M200 200 L268 161`, `stroke=url(#aww-gold)`, `stroke-width=2.5`, `stroke-linecap=round`
- centre cap `circle r=3.4` gold over `circle r=6` `#0a0a0b`

Markup shape:

```html
<svg class="load-defs" aria-hidden="true" focusable="false"><defs>…gradients…</defs><g id="aww-dial-art">…art above…</g></svg>
<div class="load-dial" aria-hidden="true">
  <div class="load-ghost"><svg viewBox="0 0 400 400"><use href="#aww-dial-art"/></svg></div>
  <div class="load-reveal"><svg viewBox="0 0 400 400"><use href="#aww-dial-art"/></svg></div>
  <svg class="load-gauge" viewBox="0 0 400 400"><circle class="load-arc" cx="200" cy="200" r="192" pathLength="100" fill="none" stroke="url(#aww-gold)" stroke-width="2" stroke-linecap="round" transform="rotate(-90 200 200)"/></svg>
</div>
```

The gauge `circle` must be the only element with `.load-arc`; it sits outside the masked copy so the arc is never clipped.

- [ ] **Step 2: Write the CSS**

Delete `.loading-ring`, `.loading-ring circle`, `.loading-ring .loading-arc`, `@keyframes load-spin`, the mobile `.loading-ring` rule, the two dark-theme `.loading-ring` overrides, and the reduced-motion `.loading-ring .loading-arc` override. Add:

```css
.load-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.load-dial { position: relative; width: min(52vw, 50vh); max-width: 560px; aspect-ratio: 1; --sweep: calc(var(--load-p, 0) * 360deg); }
.load-dial > div, .load-dial > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.load-ghost { opacity: .07; }
.load-reveal {
  -webkit-mask-image: conic-gradient(from 0deg at 50% 50%, #000 0deg var(--sweep), transparent var(--sweep));
  mask-image: conic-gradient(from 0deg at 50% 50%, #000 0deg var(--sweep), transparent var(--sweep));
}
.load-arc { stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--load-p, 0) * 100); }
@supports not ((-webkit-mask-image: conic-gradient(#000, transparent)) or (mask-image: conic-gradient(#000, transparent))) {
  .load-ghost { opacity: 1; }
  .load-reveal { display: none; }
}
```

- [ ] **Step 3: Verify the five states**

Reload the harness. Expected: `5/5 PASS`. Capture `--window-size=1200,900` and confirm by eye that frame 0 is a dark ghost dial with a rim highlight and no gold arc, frame 0.5 shows the left half of the dial fully lit with the arc ending at 6 o'clock, and frame 1 shows the whole dial.

- [ ] **Step 4: Commit**

```bash
git add app/index.html app/reference-scroll/style.css
git commit -m "Design3: gold dial loader with progressive conic reveal"
```

---

### Task 3: Column layout, status placement and the edge states

**Files:**
- Modify: `app/index.html` (the `#loading` inner structure)
- Modify: `app/reference-scroll/style.css` (`#loading`, `.loading-content`, `#load-status`, `#retry-load`, `.loading-ring` absence)

- [ ] **Step 1: Restructure `#loading` into a column**

Wrap the dial and `.loading-content` in a single `<div class="load-column">`. `#loading` keeps `display: grid; place-items: center`. Add `.load-column { display: grid; justify-items: center; gap: clamp(18px, 3.4vh, 30px); }`. `.loading-content` keeps its class and children (`#load-status`, `#retry-load`, `#loading-quick`) unchanged.

- [ ] **Step 2: Verify layout at three viewports**

Harness screenshots at `1920,1080`, `1366,768`, `844,390`, `390,844`. Expected: dial centred, status directly beneath, nothing clipped, no text crossing the dial face, and at 844×390 the whole stack fits above the fold.

- [ ] **Step 3: Verify the finished, failed and fallback states**

In the harness, add three more captions by toggling state after load:

1. add `is-complete` to `#loading` (expect it to fade to invisible within about a second);
2. set `#retry-load.hidden = false` with `--load-p` at 0.62 (expect the retry link visible under the status, the dial frozen at 62%);
3. inject `.load-reveal{display:none}.load-ghost{opacity:1}` to stand in for a browser with no mask support (expect a complete dial with a working rim arc, no blank circle and no double exposure).

- [ ] **Step 4: Commit**

```bash
git add app/index.html app/reference-scroll/style.css
git commit -m "Design3: loader column layout, status below the dial"
```

---

### Task 4: The progress writer

**Files:**
- Modify: `app/reference-scroll/entry-gate.js` (new `setLoadProgress`, exposed; reset in `showLoading`)
- Modify: `app/reference-scroll/runtime.js:23` (`awwProgressUpdate`)

**Interfaces:**
- Produces: `window.__AWW_SET_LOAD_P(p: number): void`. Clamps to `[0,1]`, ignores non-finite input, writes `--load-p` on `document.documentElement` only when the value rises by more than `0.002`, and never moves backwards.
- Consumes: Task 2's `--load-p` contract.

- [ ] **Step 1: Add the writer to `entry-gate.js`**

```js
var loadP = -1;
function setLoadProgress(p) {
  if (typeof p !== 'number' || !isFinite(p)) return;
  p = Math.max(0, Math.min(1, p));
  if (p <= loadP + 0.002) return;
  loadP = p;
  document.documentElement.style.setProperty('--load-p', p.toFixed(3));
}
window.__AWW_SET_LOAD_P = setLoadProgress;
```

In `showLoading()`, before showing the loader: `loadP = -1; document.documentElement.style.setProperty('--load-p', '0');`

- [ ] **Step 2: Report from `runtime.js`**

At the end of `awwProgressUpdate()`, inside the existing `try` that writes `window.__AWW_PROGRESS`: `if (T > 0 && window.__AWW_SET_LOAD_P) window.__AWW_SET_LOAD_P(L / T);`

- [ ] **Step 3: Test the writer through the harness**

Add caption `W` that runs in a fresh iframe: before any call, assert the root has no stale sweep (`--load-p` is `''` or `'0'`); call `__AWW_SET_LOAD_P(0.42)`, assert `--load-p === '0.420'`; call `__AWW_SET_LOAD_P(0.424)`, assert still `'0.420'` (throttle); call `__AWW_SET_LOAD_P(1.7)`, assert `'1.000'` (clamp); call `__AWW_SET_LOAD_P(-3)`, assert still `'1.000'` (no backwards). Also assert the arc's computed `strokeDashoffset` is within `0.6` of `100 - 100*p` after each call. Expected: `PASS`.

- [ ] **Step 4: Syntax check**

```powershell
Copy-Item app\reference-scroll\runtime.js "$env:TEMP\aww-runtime.mjs" -Force; node --check "$env:TEMP\aww-runtime.mjs"
Copy-Item app\reference-scroll\entry-gate.js "$env:TEMP\aww-gate.mjs" -Force; node --check "$env:TEMP\aww-gate.mjs"
```
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/reference-scroll/entry-gate.js app/reference-scroll/runtime.js
git commit -m "Design3: report byte progress to the loader dial"
```

---

### Task 5: Keep the preview page in sync and close out

**Files:**
- Modify: `app/reference-preview.html:135`
- Delete: nothing; the harness stays as an inert dev page.

- [ ] **Step 1: Replace the loader markup in `reference-preview.html`**

It shares `style.css` and still contains the old `.loading-ring` SVG, so it must carry the same `.load-column` / `.load-dial` block as `index.html`. Copy it verbatim.

- [ ] **Step 2: Check for leftovers**

```powershell
Select-String -Path app\reference-scroll\style.css,app\index.html,app\reference-preview.html -Pattern "loading-ring|load-spin"
```
Expected: no matches.

```powershell
node -e "const t=require('fs').readFileSync('app/reference-scroll/style.css','utf8');let d=0;for(const c of t){if(c==='{')d++;if(c==='}')d--;}console.log('brace depth',d)"
```
Expected: `brace depth 0`.

- [ ] **Step 3: Confirm quick mode is untouched**

Load `http://127.0.0.1:8123/index.html?mode=quick`. Expected: the hero, no loader, no console errors.

- [ ] **Step 4: Confirm reduced motion**

Load the harness with Chrome emulating `prefers-reduced-motion: reduce` (`--force-prefers-reduced-motion`). Expected: the arc still sits at the staged value, not at full ring; the dial still renders.

- [ ] **Step 5: Commit**

```bash
git add app/reference-preview.html
git commit -m "Design3: sync preview page loader markup"
```

---

## What this plan cannot verify

The 3D boot path (`showLoading` → real byte events → warm-up → `is-complete`) needs WebGL and a 40MB download, neither of which the sandbox has. Tasks 2 to 4 prove the CSS contract, the writer's arithmetic, and the states when driven by hand. The live run is a manual check on a real device: enter 3D on a throttled connection and watch the sweep track the status text, stop when the download stalls, and complete while "Preparing scene" is on screen.
