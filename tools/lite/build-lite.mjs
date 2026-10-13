// T10.2: build lighter GLBs from ORIGINALS (never overwritten) into
// app/assets/models-lite/. Node/mesh names preserved so the rig contract holds.
// Pipeline: dedup -> weld -> per-mesh simplify (meshoptimizer, per-group
// ratios) -> prune -> textureCompress (WebP, 2048 cap) -> Draco.
// Skipped deliberately: join/flatten/merge (would break part count),
// instance() (untested interaction with the clone-per-part loader; dedup
// already captures byte-identical savings; draw calls unchanged either way),
// quantize() (Draco subsumes it; stacking wastes quality).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Format } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, textureCompress, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';

const APP = 'D:/Africa watch week/Africa Watch Week Site Remix/app';
const OUT = `${APP}/assets/models-lite`;
const MANIFEST = JSON.parse(fs.readFileSync(`${APP}/assets/manifest.json`, 'utf8'));
const GROUP_OF = new Map(MANIFEST.parts.map((p) => [p.n, p.g]));

// ratio/error per group. High = hero/close-up surfaces. Geometry untouched otherwise.
function movementPlan(group, meshName) {
  if (['Mainplate', 'Plates & Bridges', 'Balance Wheel', 'Hairspring', 'Dial Indication'].includes(group)) return { ratio: 0.85, error: 0.005 };
  if (['Escapement', 'Chronograph Works', 'Winding System', 'Gear Train'].includes(group)) return { ratio: 0.65, error: 0.01 };
  return { ratio: 0.5, error: 0.01 }; // Screws, Jewel Bearings, Springs, samples
}
function exteriorPlan(role) {
  if (['case', 'ring', 'glass', 'dial', 'crown'].includes(role)) return { ratio: 0.9, error: 0.005 };
  if (role === 'hand') return { ratio: 0.85, error: 0.005 };
  if (['clasp'].includes(role)) return { ratio: 0.75, error: 0.01 };
  return { ratio: 0.55, error: 0.01 }; // link, pin, grain, seal, unclaimed
}

async function simplifyMeshes(doc, planFor) {
  await MeshoptSimplifier.ready;
  const root = doc.getRoot();
  const meshPlan = new Map();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh || meshPlan.has(mesh)) continue;
    meshPlan.set(mesh, planFor(node.getName(), mesh.getName()));
  }
  let done = 0, skipped = 0;
  for (const [mesh, plan] of meshPlan) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== undefined && prim.getMode() !== 4) { skipped++; continue; }
      if (prim.listTargets().length > 0) { skipped++; continue; }
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      if (!pos || !idx) { skipped++; continue; }
      const vcount = pos.getCount();
      if (vcount < 500) { skipped++; continue; }
      const positions = pos.getArray();
      const stride = pos.getElementSize();
      const indices = idx.getArray();
      const indexArray = indices instanceof Uint32Array || indices.BYTES_PER_ELEMENT === 4
        ? Uint32Array.from(indices) : Uint32Array.from(indices);
      const target = Math.max(24, Math.floor((indexArray.length / 3) * plan.ratio) * 3);
      if (target >= indexArray.length) { skipped++; continue; }
      const floatPos = positions instanceof Float32Array ? positions : Float32Array.from(positions);
      let out;
      try {
        out = MeshoptSimplifier.simplify(indexArray, floatPos, stride, target, plan.error, undefined)[0];
      } catch (e) { skipped++; continue; }
      if (!out || out.length >= indexArray.length) { skipped++; continue; }
      const acc = doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(out));
      prim.setIndices(acc);
      done++;
    }
  }
  return { done, skipped };
}

function docStats(doc) {
  let verts = 0, tris = 0, prims = 0;
  const nodes = new Set(), meshes = new Set();
  for (const node of doc.getRoot().listNodes()) {
    nodes.add(node.getName());
    const m = node.getMesh();
    if (m) meshes.add(m.getName());
  }
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prims++;
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      const vc = pos ? pos.getCount() : 0;
      verts += vc;
      tris += Math.floor(((idx ? idx.getCount() : vc)) / 3);
    }
  }
  return { nodes: nodes.size, meshes: meshes.size, prims, verts, tris, nodeNames: [...nodes].sort(), meshNames: [...meshes].sort() };
}

function manifestCoverage(doc, label) {
  const names = new Set();
  for (const n of doc.getRoot().listNodes()) names.add(n.getName());
  const missing = MANIFEST.parts.map((p) => p.n).filter((n) => !names.has(n));
  if (missing.length) {
    console.error(`FATAL [${label}]: ${missing.length} manifest nodes missing: ${missing.slice(0, 10).join(', ')}`);
    process.exitCode = 1;
  } else console.log(`ok [${label}]: all ${MANIFEST.parts.length} manifest nodes present`);
}

async function build(label, infile, outfile, planFor) {
  console.log(`--- ${label}: ${infile}`);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });
  const before = fs.statSync(infile).size;
  const doc = await io.read(infile);
  const s0 = docStats(doc);
  await doc.transform(dedup(), weld());
  const simp = await simplifyMeshes(doc, planFor);
  console.log(`simplify: ${simp.done} prims decimated, ${simp.skipped} skipped`);
  await doc.transform(prune());
  await doc.transform(textureCompress({ targetFormat: Format.WEBP, resize: [2048, 2048] }));
  await doc.transform(draco({
    method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5,
    quantizePositionBits: 11, quantizeNormalBits: 8,
    quantizeTexcoordBits: 10, quantizeColorBits: 8, quantizationVolume: 'mesh',
  }));
  await io.write(outfile, doc);
  const after = fs.statSync(outfile).size;
  const s1 = docStats(doc);
  const namesKept = s0.nodeNames.length === s1.nodeNames.length
    && s0.nodeNames.every((n, i) => n === s1.nodeNames[i]);
  console.log(`${label}: nodes ${s0.nodes}->${s1.nodes} meshes ${s0.meshes}->${s1.meshes} prims ${s0.prims}->${s1.prims}`);
  console.log(`${label}: verts ${s0.verts}->${s1.verts} tris ${s0.tris}->${s1.tris}`);
  console.log(`${label}: bytes ${before}->${after} nodeNamesKept=${namesKept}`);
  if (!namesKept) { console.error(`FATAL [${label}]: node set changed`); process.exitCode = 1; }
  if (label === 'movement') manifestCoverage(doc, label);
  return { label, before, after, ...{ v0: s0.verts, v1: s1.verts, t0: s0.tris, t1: s1.tris, p0: s0.prims, p1: s1.prims } };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  results.push(await build('movement', `${APP}/assets/omega_321_r46f.glb`, `${OUT}/movement-lite.glb`,
    (nodeName) => movementPlan(GROUP_OF.get(nodeName) || 'Screws', nodeName)));
  results.push(await build('exterior', `${APP}/assets/kimi_openheart_exterior_v2.glb`, `${OUT}/exterior-lite.glb`,
    (nodeName, meshName) => {
      const m = /^ext_([a-z]+)/.exec(nodeName || '');
      void meshName;
      return exteriorPlan(m ? m[1] : 'link');
    }));
  results.push(await build('tourbillon', `${APP}/assets/kimi_tourbillon_v1.glb`, `${OUT}/tourbillon-lite.glb`, () => ({ ratio: 0.7, error: 0.01 })));
  fs.writeFileSync(new URL('./build-report.json', import.meta.url), JSON.stringify(results, null, 1));
  console.log('wrote build-report.json');
}
main().catch((e) => { console.error('BUILD FAILED:', e); process.exit(1); });
