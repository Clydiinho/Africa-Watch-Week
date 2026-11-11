# SDD ledger — plan: docs/superpowers/plans/2026-11-10-loader-dial.md

Plan: `docs/superpowers/plans/2026-11-10-loader-dial.md`
Spec: `docs/superpowers/specs/2026-11-10-loader-dial-design.md`
Branch: `perf/design3` (off `perf/design2` at `dd394f3`)
Executor: inline (Native), one fresh-context review at the end.

## Pre-flight

| Check | Result |
|---|---|
| Branch / tree | `perf/design3`, clean at `a2bc592` (spec + plan commit) |
| Shared interfaces | `.load-dial`, `.load-ghost`, `.load-reveal`, `.load-arc`, `.load-column`, `--load-p`, `window.__AWW_SET_LOAD_P` appear in tasks 2→3→4 consistently |
| Rulings | Stay in this checkout, not a worktree: project uses branch-per-task; keeps the running :8123 server valid. |
| Deviation | Harness iframes use `../index.html` (the harness lives in `/app/_qa/`, so plain `index.html` would resolve to `/_qa/index.html`). |
| Tooling | `node`, `python`, PowerShell present. Chrome headless for capture. |

## Task log

| Task | Status | Evidence |
|---|---|---|
| 1. QA harness | done | `app/_qa/loader-dial.html` committed `e3b163c`; harness reads `calc()` stroke-dashoffset via `strokeOffset()` helper |
| 2. Dial art, ghost, masked reveal, rim gauge | done | `app/index.html` + `app/reference-scroll/style.css` committed `1f4b21a`; harness `5/5 PASS` (arc 100/75/50/25/0, mask 0/90/180/270/360, ghost 0.07) |
| 3. Column layout, status placement and edge states | done | `index.html` `.load-column` wrap + `style.css` gap; harness `8/8 PASS` (5 stages + is-complete exit + retry@62% + no-mask fallback); geometry at 1920/1366/844×390/390×844: centreErr ≤0.008, gap 18-30, fits, textCrosses false |
| 4. Progress writer | done | `entry-gate.js` `setLoadProgress` + `__AWW_SET_LOAD_P` + reset in `showLoading`; `runtime.js` hooks `L/T`; harness `9/9 PASS` incl. W (initial 0 → 0.420 → 0.420 throttled → 1.000 clamp → 1.000 no-backwards); `node --check` both exit 0 |
| 5. Preview sync + close out | done | `reference-preview.html` carries the same defs + `.load-column`/`.load-dial` block; no `loading-ring|load-spin` leftovers; `brace depth 0`; `?mode=quick` clean (data-mode=quick, welcome overlay, no ring); reduced-motion harness `9/9 PASS` with staged arc values |

## Rulings and deviations

- **Task 2 harness `strokeOffset` helper.** Chrome 157 returns `stroke-dashoffset` as unresolved `"calc(75px)"` text, so the plan's `parseFloat(...)` yields `NaN`. Harness now parses the `calc(Npx)` form; the CSS contract is unchanged.
- **Task 4 throttle test value.** Plan Step 3 said `0.424` should stay `'0.420'`, but `0.424 - 0.420 = 0.004`, which is greater than the `0.002` threshold, so the writer correctly updates. Used `0.421` (`0.001`) to exercise the throttle without contradicting the interface contract ("rises by more than 0.002").
- **Chrome cache.** Repeated headless runs reused cached `entry-gate.js`; captures now use a fresh profile per run (and `--disable-cache`).
- **Layout check** done geometrically (iframe sized to each viewport + `getBoundingClientRect`) rather than by screenshot, because Chrome 157 headless ignored `--window-size` and produced fixed 764x429 crops.
- **Visual confirmation (real browser, live canvas):** p=0 ghost dial with faint warm catch-light at upper-right rim, no full rim arc; p=0.5 right half (12→3→6) fully resolved, arc head at 6 o'clock, left half ghosted; p=1 full dial, full gold rim, hands at 10:10, status beneath. Plan Step 2's phrase "left half lit" is a wording slip; the spec's clockwise sweep correctly lights the right half at 50%.
- **Preview page progress (minor, deferred):** `reference-preview.html` does not import `entry-gate.js`, so `window.__AWW_SET_LOAD_P` is undefined there; its dial sits at the deliberate 0% ghost until runtime adds `is-complete`. Dev-only page, markup is in sync.

## Final review (whole branch)

- Diff since `dd394f3` (perf/design2): 6 implementation commits + spec/plan; `runtime.js` change is one guarded line; `entry-gate.js` adds the writer + reset; no geometry/asset changes.
- All 5 plan tasks verified: harness 9/9, reduced-motion 9/9, geometry 4 viewports, quick mode clean, no `loading-ring`/`load-spin` leftovers, brace depth 0, `node --check` both JS files.
- Spec conformance: ghost 7%, masked reveal clockwise from 12, gauge arc same value, no text on the face, no new assets, entry gate/quick/hero untouched, reduced-motion no longer forces the gauge.

## Close-out

- Final harness on committed tree: `9/9 PASS`.
- Pushed `perf/design3` to `origin` (new branch, no force). Local HEAD `9edd633` == remote head `9edd633`.
- Base: `perf/design2`. Did not touch `main`. Branch left in place; no PR/merge performed.

## Follow-up: "the dial has no animation" (after push)

Root cause (reproduced live, not guessed): the browser served a **pre-writer** `entry-gate.js`
(11300 B) from heuristic HTTP cache while `index.html` was new. The served file was 11709 B and
did contain the writer. With the stale module, `window.__AWW_SET_LOAD_P` was `undefined`, so
`--load-p` was never written and the dial sat at the 0% ghost. `cache: 'reload'` fetches did not
displace the module-cache entry; a plain reload kept reusing it.

Fixes:

1. **Cache stamp.** `index.html` and `reference-preview.html` load `entry-gate.js`,
   `configurator.js`, `runtime.js` and `style.css` with `?v=20261111-3`. `entry-gate.js` reads
   `?v=` from `import.meta.url` (`ASSET_V`) and chains it onto its dynamic
   `./runtime.js` / `./asset-config.js` imports and the modulepreload hint, so a release can no
   longer mix a new entry gate with a cached runtime.
2. **Rim closes.** Asset totals are estimates, so `L/T` tops out at `0.999`. `runtime.js` now
   calls `__AWW_SET_LOAD_P(1)` at `watch-ready`, and the writer always admits a terminal `1`
   (`if (p <= loadP + 0.002 && p < 1) return;`) instead of letting the throttle swallow it.

Verified live (real browser, WebGL 2.0, full 39.36 MB scene):

| Check | Result |
|---|---|
| Writer present after reload | `typeof __AWW_SET_LOAD_P === "function"` |
| Versioned graph | `entry-gate.js?v=20261111-3`, `runtime.js?v=20261111-3`, `asset-config.js?v=20261111-3` |
| Dial tracks bytes | 140 distinct `--load-p` values, e.g. 0.003 @ 108 KB → 0.619 @ 24.4 MB → 0.999 @ 39.36 MB |
| Arc follows | `calc(100px)` → `calc(38.1px)` at p 0.619 → `0%` at p 1.000 |
| End state | p `1.000`, `#loading.is-complete`, `watch-ready`, zero page errors |
| Harness after change | `9/9 PASS` (writer contract still `0.420` → throttled → `1.000`) |

Not fixed / known: `runtime.js` keeps a static `import ... from './asset-config.js'` (no version
query possible without a build step). It is a data-only table, so a stale copy cannot break the
dial, but a future release that edits it will need the stamp bumped in that import by hand.



