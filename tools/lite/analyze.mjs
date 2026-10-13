// T10.1 analysis: per-mesh verts, identical-mesh groups, textures, draw calls.
// Pure node, no dependencies. Reads GLB JSON+BIN chunks directly.
import fs from 'node:fs';
import path from 'node:path';

const APP = 'D:/Africa watch week/Africa Watch Week Site Remix/app';

function readGLB(file) {
  const buf = fs.readFileSync(file);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error('not a GLB: ' + file);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  let bin = Buffer.alloc(0);
  let off = 20 + jsonLen;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x004E4942) { bin = buf.subarray(off + 8, off + 8 + len); break; }
    off += 8 + len;
  }
  return { json, bin };
}

function fnv(buf) {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) { h ^= buf[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function accessorBytes(json, bin, idx) {
  const a = json.accessors[idx];
  if (a.bufferView === undefined) return Buffer.alloc(0);
  const bv = json.bufferViews[a.bufferView];
  const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
  return bin.subarray(start, start + bv.byteLength);
}
function primBytes(json, bin, p) {
  // Draco meshes store geometry in the extension bitstream; hash that.
  const ext = p.extensions && p.extensions.KHR_draco_mesh_compression;
  if (ext && ext.bufferView !== undefined) {
    const bv = json.bufferViews[ext.bufferView];
    const start = bv.byteOffset || 0;
    return bin.subarray(start, start + bv.byteLength);
  }
  const parts = [];
  if (p.indices !== undefined) parts.push(accessorBytes(json, bin, p.indices));
  if (p.attributes && p.attributes.POSITION !== undefined) parts.push(accessorBytes(json, bin, p.attributes.POSITION));
  return Buffer.concat(parts);
}

function analyzeMeshes(file) {
  const { json, bin } = readGLB(file);
  const meshes = [];
  let totalVerts = 0, totalTris = 0, prims = 0;
  (json.meshes || []).forEach((m, mi) => {
    let verts = 0, tris = 0;
    const primSigs = [];
    for (const p of m.primitives || []) {
      prims++;
      const pos = p.attributes && p.attributes.POSITION;
      const vc = pos !== undefined ? json.accessors[pos].count : 0;
      verts += vc;
      const idx = p.indices !== undefined ? json.accessors[p.indices].count : vc;
      tris += Math.floor(idx / 3);
      const h = fnv(primBytes(json, bin, p));
      primSigs.push(`${vc}/${idx}/${p.material ?? -1}/${h}`);
    }
    totalVerts += verts; totalTris += tris;
    meshes.push({ mesh: mi, name: m.name || `(mesh ${mi})`, verts, tris, prims: (m.primitives || []).length, sig: primSigs.join('|') });
  });
  return { json, meshes, totalVerts, totalTris, prims, meshCount: (json.meshes || []).length };
}

function top25(meshes, totalVerts) {
  return [...meshes].sort((a, b) => b.verts - a.verts).slice(0, 25)
    .map((m) => ({ name: m.name, verts: m.verts, pct: +(100 * m.verts / totalVerts).toFixed(2) }));
}

function identicalGroups(meshes) {
  const bySig = new Map();
  for (const m of meshes) {
    if (!bySig.has(m.sig)) bySig.set(m.sig, []);
    bySig.get(m.sig).push(m.name);
  }
  return [...bySig.values()].filter((g) => g.length > 1)
    .sort((a, b) => b.length - a.length).slice(0, 20);
}

function pngSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(12) === 0x49484452)
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  return null;
}
function jpgSize(buf) {
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) break;
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8) {
      if (i + 9 < buf.length) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      break;
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
function webpSize(buf) {
  const riff = buf.subarray(0, 4).toString();
  if (riff !== 'RIFF') return null;
  const fourcc = buf.subarray(8, 12).toString();
  if (fourcc === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (fourcc === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  return { note: fourcc };
}

function analyzeTextures(file) {
  const { json, bin } = readGLB(file);
  const texUse = new Map();
  const matOf = new Map();
  (json.materials || []).forEach((m, i) => matOf.set(i, m.name || `mat${i}`));
  function use(ti, slot, mi) {
    if (ti === undefined) return;
    if (!texUse.has(ti)) texUse.set(ti, []);
    texUse.get(ti).push(`${matOf.get(mi)}.${slot}`);
  }
  (json.materials || []).forEach((m, mi) => {
    if (m.pbrMetallicRoughness) {
      use(m.pbrMetallicRoughness.baseColorTexture?.index, 'baseColor', mi);
      use(m.pbrMetallicRoughness.metallicRoughnessTexture?.index, 'metalRough', mi);
    }
    use(m.normalTexture?.index, 'normal', mi);
    use(m.occlusionTexture?.index, 'occlusion', mi);
    use(m.emissiveTexture?.index, 'emissive', mi);
  });
  const out = [];
  (json.textures || []).forEach((t, ti) => {
    const srcIdx = (t.extensions && t.extensions.EXT_texture_webp && t.extensions.EXT_texture_webp.source) ?? t.source;
    const img = (json.images || [])[srcIdx] || {};
    if (img.bufferView === undefined) {
      out.push({ texture: ti, image: img.name || `(img ${t.source})`, mime: img.mimeType || '',
        bytes: 0, mb: 0, dims: img.uri ? 'external-uri' : 'missing',
        usedBy: texUse.get(ti) || ['(unreferenced)'] });
      return;
    }
    const bv = json.bufferViews[img.bufferView];
    const bytes = bv.byteLength;
    const data = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bytes);
    const mt = img.mimeType || '';
    const dim = mt.includes('png') ? pngSize(data) : mt.includes('jpeg') ? jpgSize(data) : webpSize(data);
    out.push({ texture: ti, image: img.name || `(img ${t.source})`, mime: mt,
      bytes, mb: +(bytes / 1048576).toFixed(3),
      dims: dim ? `${dim.w}x${dim.h}` : JSON.stringify(dim),
      usedBy: texUse.get(ti) || ['(unreferenced)'] });
  });
  return out;
}

function main() {
  const report = {};
  for (const [key, file] of [['movement', `${APP}/assets/omega_321_r46f.glb`], ['exterior', `${APP}/assets/kimi_openheart_exterior_v2.glb`]]) {
    const a = analyzeMeshes(file);
    report[key] = {
      file: path.basename(file),
      bytes: fs.statSync(file).size,
      meshCount: a.meshCount, primitives: a.prims,
      totalVerts: a.totalVerts, totalTris: a.totalTris,
      top25: top25(a.meshes, a.totalVerts),
      identicalGroups: identicalGroups(a.meshes).slice(0, 10).map((g) => ({ count: g.length, names: g.slice(0, 8) })),
      textures: analyzeTextures(file),
    };
  }
  // Manifest group distribution (movement visibility heuristic input).
  const manifest = JSON.parse(fs.readFileSync(`${APP}/assets/manifest.json`, 'utf8'));
  const groups = {};
  for (const p of manifest.parts) groups[p.g] = (groups[p.g] || 0) + 1;
  report.manifestGroups = groups;
  // Exterior knoll roles.
  const ext = readGLB(`${APP}/assets/kimi_openheart_exterior_v2.glb`).json;
  const roles = {};
  for (const n of ext.nodes || []) {
    if (n.name && n.name.startsWith('ext_')) {
      const r = (n.extras && n.extras.knollRole) || '?';
      roles[r] = (roles[r] || 0) + 1;
    }
  }
  report.exteriorRoles = roles;
  fs.writeFileSync(new URL('./analysis.json', import.meta.url),
    JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ movement: { meshes: report.movement.meshCount, prims: report.movement.primitives, verts: report.movement.totalVerts, tris: report.movement.totalTris, textures: report.movement.textures.length, identicalSets: report.movement.identicalGroups.length },
    exterior: { meshes: report.exterior.meshCount, prims: report.exterior.primitives, verts: report.exterior.totalVerts, tris: report.exterior.totalTris, textures: report.exterior.textures.length, identicalSets: report.exterior.identicalGroups.length } }, null, 1));
}
main();
