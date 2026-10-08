/* AWW2K26 asset config — swap-ready placeholder.
 * Current GLBs are the Omega-321 / Kimi concept models kept as stand-ins.
 * To swap in the final model: drop the new files under assets/models/
 * and update the three paths + manifest case below. No other code change. */
export const AWW_ASSETS = Object.freeze({
  brand: 'AWW2K26',
  calibre: 'Cal.2K26',
  movement: 'assets/omega_321_r46f.glb',
  exterior: 'assets/kimi_openheart_exterior_v2.glb',
  tourbillon: 'assets/kimi_tourbillon_v1.glb',
  manifest: 'assets/manifest.json',
  // Draco-compressed stand-ins (dedup + draco re-quantize, NO decimation):
  // models/aww2k26-movement.glb 14.59MB (was 19.88MB; original already Draco)
  // models/aww2k26-exterior.glb 3.46MB (was 10.72MB)
  // models/aww2k26-tourbillon.glb 180KB (was 968KB)
  // Models total ~17.4MB vs ~31.6MB original (-45%, geometry preserved).
  // NOT live yet — verify part-name association + visual QA first, then
  // swap the three paths above. Note: 5MB chunk is unreachable at full
  // fidelity (movement alone is 14.6MB Draco); it needs mesh decimation.
  compressed: Object.freeze({
    movement: 'assets/models/aww2k26-movement.glb',
    exterior: 'assets/models/aww2k26-exterior.glb',
    tourbillon: 'assets/models/aww2k26-tourbillon.glb',
  }),
});

export const AWW_BUDGETS = Object.freeze({
  initialMB: 2, // HTML + CSS + JS + fonts + poster, excl. 3D chunk
  chunk3DMB: 5, // movement + exterior + tourbillon + env + finishes
});
