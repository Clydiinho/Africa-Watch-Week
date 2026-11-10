# Loader: gold-rimmed dial with a progressive reveal

## Intent

Replace the spinning grey ring with the reference dial, so the loading screen looks
like the thing the site is about, and so the graphic finally shows real progress. A
sweep starts at 12, travels clockwise, and returns to 12 at 100%. The part of the
watch the sweep has passed is at full opacity. Everything it has not reached sits at
7% opacity, a ghost of the whole clock.

## What it is

One SVG dial (bezel, dark plate, twelve baton indices, hour and minute hands at
10:10, centre cap), drawn twice:

- a base copy at 7% opacity: the ghost of the whole clock;
- a masked copy at 100% opacity, revealed by a clockwise conic wedge that starts at
  12 o'clock.

A gold arc on the bezel fills with the same value, so the leading edge of the reveal
and the head of the indicator are the same point.

## Mechanic

- One custom property, `--load-p` (0 to 1), on `:root`, default 0.
- `--sweep: calc(var(--load-p) * 360deg)`.
- Revealed copy: `mask-image: conic-gradient(from 0deg at 50% 50%, #000 0deg
  var(--sweep), transparent var(--sweep))`, applied to a wrapper element (with the
  `-webkit-` prefix) rather than to the SVG itself.
- Rim arc: a circle with `pathLength="100"`, `stroke-dasharray: 100`,
  `stroke-dashoffset: calc(100 - var(--load-p) * 100)`, rotated -90deg.
- Nothing is animated by time. The sweep only moves when bytes arrive.

## States

- **0%**: ghost dial, the bezel's warm catch-light, no rim arc.
- **In progress**: the revealed region stays at full opacity; the rest stays at 7%.
- **Stall**: the sweep stops where it is. No invented motion.
- **Bytes done, scene still warming**: full dial and full rim, while the status text
  shows the phase label ("Preparing scene"). The percentage may read 100% before the
  scene is ready; that stays as it is today.
- **Exit**: unchanged. `.is-complete` fades the loader over .65s.
- **Failure**: the sweep stops, `#retry-load` appears as today.
- **Reduced motion**: the same visuals. There is no spinning or looping left to
  suppress; the `load-spin` keyframes and their reduced-motion override are removed.
- **No JS / quick view**: the loader stays hidden, as today.

## Where the value comes from

`awwProgressUpdate()` in `runtime.js` already sums real bytes across the scene
assets. It gains one branch that writes `--load-p` when the value has moved by more
than 0.002. Nothing else changes: not the byte estimates, the ETA, the phase labels,
the entry gate, or the quick-view escape.

Before the runtime exists, during the three.js download, there are no tracked bytes,
so the dial sits at 0% showing the ghost. That is correct, not a stall, and it is
why the ghost state has to look deliberate.

## Layout and type

- `#loading` becomes a centred column: dial, then the existing status block beneath
  it. Today the ring is absolutely positioned and the text sits inside it; the dial
  should not have text across its face.
- Dial size `min(52vw, 50vh)`, capped at 560px.
- `#load-status` (Outfit 11px, ivory), the injected ETA line, `#retry-load` and
  "Taking too long? Quick view" keep their current copy, colour and order.

## Non-goals

No new image assets. No change to what is downloaded, when, or how it is measured. No
change to the entry gate, quick view, or the hero. No text inside the dial.

## Files

`app/index.html`, `app/reference-preview.html` (shares the stylesheet and carries its
own copy of the loader markup), `app/reference-scroll/style.css`,
`app/reference-scroll/runtime.js`.

## Left to the builder

The exact dial proportions and the weight of the gold. Whether the bezel carries a
warm specular highlight in one quadrant only (as the reference does) or a uniform
line. How far the plate sits above the page black so the revealed disc reads as a
disc rather than a hole.
