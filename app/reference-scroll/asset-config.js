/* AWW2K26 asset config — swap-ready placeholder.
 * Current GLBs are the Omega-321 / Kimi concept models kept as stand-ins.
 * To swap in the final model: drop the new files under assets/models/
 * and update the three paths + manifest case below. No other code change. */
export const AWW_ASSETS = Object.freeze({
  brand: 'AWW2K26',
  calibre: 'Cal.2K26',
  // Live models: Draco re-quantise of the originals below (no decimation,
  // dedup deliberately OFF: runtime.js resolves parts through gltf.parser.associations,
  // and merging shared meshes would drop entries for 39 movement + 44 exterior
  // nodes, breaking the 283-part / 359-unit rig contract). All 283 / 124 / 64
  // node names and every source attribute preserved. Originals stay on disk as
  // the rollback path (documented as AWW_ASSETS.original).
  movement: 'assets/models/aww2k26-movement.glb',
  exterior: 'assets/models/aww2k26-exterior.glb',
  tourbillon: 'assets/models/aww2k26-tourbillon.glb',
  manifest: 'assets/manifest.json',
  // Source originals stay on disk as the rollback path; ?model=original is not
  // wired, so switching back means restoring the three paths above.
  original: Object.freeze({
    movement: 'assets/omega_321_r46f.glb',
    exterior: 'assets/kimi_openheart_exterior_v2.glb',
    tourbillon: 'assets/kimi_tourbillon_v1.glb',
  }),
});

export const AWW_BUDGETS = Object.freeze({
  initialMB: 2, // HTML + CSS + JS + fonts + poster, excl. 3D chunk
  chunk3DMB: 5, // movement + exterior + tourbillon + env + finishes
});

// Measured disk bytes (identity, no gzip) from tools/baseline.json, 2026-10-13.
// Gate download-size text is computed from these, never hardcoded.
// NOTE (Task 6): move these totals into finish-manifest.json / manifest.json
// instead of hardcoding them here.
export const AWW_ASSET_BYTES = Object.freeze({
  threeJs: 2026496, // three.module.js + loaders + draco wasm/wrapper
  models: 22885840, // live compressed movement + exterior + tourbillon GLBs
  env: 1146880, // reference-studio + reference-metal EXRs
  finishes: 7755776, // finish-manifest + textures actually on disk
});

export function awwChunkMB() {
  const total = AWW_ASSET_BYTES.threeJs + AWW_ASSET_BYTES.models
    + AWW_ASSET_BYTES.env + AWW_ASSET_BYTES.finishes;
  return Math.floor(total / 1048576);
}

// Measured 2026-10-13 (tools/lite/build-report.json). Shown in the ?qa=1
// timings summary so lite-vs-original can be compared on a real device.
export const AWW_LITE_BYTES = Object.freeze({
  movement: 16379968,
  exterior: 1059880,
  tourbillon: 167740,
});
