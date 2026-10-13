// Post-pass: convert PNG textures >200KB inside models-lite GLBs to WebP (q80).
// Geometry/Draco data untouched (plain read/write preserves existing bitstreams).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import draco3d from 'draco3dgltf';

const DIR = 'D:/Africa watch week/Africa Watch Week Site Remix/app/assets/models-lite';

async function convert(file) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
  const doc = await io.read(file);
  let converted = 0;
  for (const tex of doc.getRoot().listTextures()) {
    const img = tex.getImage();
    const mime = tex.getMimeType();
    if (!img || mime !== 'image/png' || img.byteLength < 200 * 1024) continue;
    const webp = await sharp(Buffer.from(img)).webp({ quality: 80 }).toBuffer();
    tex.setImage(new Uint8Array(webp));
    tex.setMimeType('image/webp');
    converted++;
    console.log(`${path.basename(file)}: ${tex.getName()} ${Math.round(img.byteLength / 1024)}KB -> ${Math.round(webp.byteLength / 1024)}KB webp`);
  }
  if (converted) await io.write(file, doc);
  else console.log(`${path.basename(file)}: nothing to convert`);
}

for (const f of ['movement-lite.glb', 'exterior-lite.glb', 'tourbillon-lite.glb']) {
  await convert(`${DIR}/${f}`);
}
console.log('done');
