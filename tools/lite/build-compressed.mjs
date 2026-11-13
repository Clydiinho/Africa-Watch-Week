// Build the live compressed model set into app/assets/models/.
//
// Contract with the runtime (runtime.js):
//   * one mesh per node: build() and buildExteriorFromGLTF() resolve parts through
//     gltf.parser.associations, and three clones a shared mesh for every extra
//     node *without* an association entry. dedup() therefore MUST NOT run here,
//     or those parts disappear from the rig.
//   * node names, node count, material count and every source attribute
//     (POSITION/NORMAL/TEXCOORD_0) must survive, because manifest.json maps
//     parts by node name and restoreSourceFinish()/finish switching needs the
//     same material slots.
//   * no decimation, no simplification, no join/flatten: only lossless vertex
//     welding plus Draco quantization, i.e. the same surface at fewer bytes.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const APP = 'D:/Africa watch week/Africa Watch Week Site Remix/app';
const OUT = `${APP}/assets/models`;
const MANIFEST = JSON.parse(fs.readFileSync(`${APP}/assets/manifest.json`, 'utf8'));
const MANIFEST_NAMES = new Set(MANIFEST.parts.map((p) => p.n));

let failed = false;
function fail(label, message) {
  console.error(`FATAL [${label}]: ${message}`);
  failed = true;
}

function snapshot(doc) {
  const nodes = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    nodes.push({
      name: node.getName(),
      attrs: mesh ? mesh.listPrimitives().map((p) => p.listAttributes().map((a) => a.getName()).sort().join('+')) : null,
    });
  }
  return { nodes, materials: doc.getRoot().listMaterials().map((m) => m.getName()) };
}

async function build(label, infile, outfile, expectManifest) {
  console.log(`\n--- ${label}: ${infile}`);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  const before = fs.statSync(infile).size;
  const doc = await io.read(infile);
  const s0 = snapshot(doc);
  const v0 = doc.getRoot().listMeshes().length;

  await doc.transform(weld());
  await doc.transform(prune({ keepAttributes: true }));
  await doc.transform(draco({
    method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5,
    quantizePositionBits: 11, quantizeNormalBits: 8,
    quantizeTexcoordBits: 10, quantizeColorBits: 8, quantizationVolume: 'mesh',
  }));

  const s1 = snapshot(doc);
  const meshCount = doc.getRoot().listMeshes().length;

  if (s1.nodes.length !== s0.nodes.length) fail(label, `node count ${s0.nodes.length} -> ${s1.nodes.length}`);
  if (meshCount !== s1.nodes.length) fail(label, `mesh/node sharing: ${meshCount} meshes for ${s1.nodes.length} nodes (dedup must stay off)`);
  for (let i = 0; i < s0.nodes.length; i++) {
    const a = s0.nodes[i], b = s1.nodes[i];
    if (a.name !== b.name) fail(label, `node order/name changed at ${i}: ${a.name} -> ${b.name}`);
    if (JSON.stringify(a.attrs) !== JSON.stringify(b.attrs)) fail(label, `attributes changed on ${a.name}: ${a.attrs} -> ${b.attrs}`);
  }
  if (s1.materials.length !== s0.materials.length) fail(label, `material count ${s0.materials.length} -> ${s1.materials.length}`);
  if (expectManifest) {
    const missing = MANIFEST.parts.map((p) => p.n).filter((n) => !s1.nodes.some((x) => x.name === n));
    if (missing.length) fail(label, `${missing.length} manifest nodes missing: ${missing.slice(0, 8).join(', ')}`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  await io.write(outfile, doc);
  const after = fs.statSync(outfile).size;
  console.log(`${label}: nodes ${s0.nodes.length} meshes ${v0}->${meshCount} materials ${s0.materials.length}`);
  console.log(`${label}: bytes ${before} -> ${after} (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
  return { label, before, after };
}

const results = [];
results.push(await build('movement', `${APP}/assets/omega_321_r46f.glb`, `${OUT}/aww2k26-movement.glb`, true));
results.push(await build('exterior', `${APP}/assets/kimi_openheart_exterior_v2.glb`, `${OUT}/aww2k26-exterior.glb`, false));
results.push(await build('tourbillon', `${APP}/assets/kimi_tourbillon_v1.glb`, `${OUT}/aww2k26-tourbillon.glb`, false));

const total = results.reduce((a, r) => a + r.after, 0);
const totalBefore = results.reduce((a, r) => a + r.before, 0);
console.log(`\nmodels total: ${totalBefore} -> ${total} (${((1 - total / totalBefore) * 100).toFixed(1)}% smaller)`);
fs.writeFileSync(new URL('./build-compressed-report.json', import.meta.url), JSON.stringify({ results, total, totalBefore }, null, 1));
if (failed) { console.error('\nBUILD FAILED: contract violations above'); process.exit(1); }
console.log('BUILD OK');
void MANIFEST_NAMES;
