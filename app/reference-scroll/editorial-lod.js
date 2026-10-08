/* Explicit ?editorialLOD=20 candidate. The main movement is never replaced.
 * Input geometries retain source glTF coordinates. This loader restores the
 * source surface attributes before applying the core loader's normalization. */
const CONTRACT = {"asset":"kimi_editorial_rear_lod20_candidate_v1.glb","assetSHA256":"7733f7ff7c07f2e2806c2ab6daac3bc72ea980d328dcce289162920c02eeca51","sourceSHA256":"4fd53749b9c66390cfc44c49de37349c44080b2a23629878b3cd068b5811749f","sourceMainplateBounds":{"min":[-13.350000381469727,0,-13.350000381469727],"max":[13.350000381469727,1.2000000476837158,13.350000381469727]},"parts":[{"name":"321.1200_barrel_teeth","translation":[0,0,0],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"M_Brass","sourceTriangles":1350660,"candidateTriangles":270088,"sourceVertices":675332,"candidateVertices":286683}]},{"name":"321.1224_center_wheel","translation":[0,0,0],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"M_Brass","sourceTriangles":982268,"candidateTriangles":196418,"sourceVertices":491134,"candidateVertices":164549}]},{"name":"ratchet_wheel","translation":[0.4000000059604645,0,-7.599999904632568],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"M_SteelRatchet","sourceTriangles":783328,"candidateTriangles":156658,"sourceVertices":391664,"candidateVertices":128717}]},{"name":"321.1243_fourth_wheel","translation":[-0.5,0.2549999952316284,7.5],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"M_Brass","sourceTriangles":747308,"candidateTriangles":149434,"sourceVertices":373646,"candidateVertices":97753}]},{"name":"321.1705_chrono_runner","translation":[0,1.0199999809265137,0],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"M_Brass","sourceTriangles":693492,"candidateTriangles":138684,"sourceVertices":346738,"candidateVertices":89629}]},{"name":"third_wheel","translation":[-0.30000001192092896,0.20999999344348907,4.599999904632568],"rotation":[0,0,0,1],"scale":[0.9869999885559082,0.9869999885559082,0.9869999885559082],"primitives":[{"material":"M_Brass","sourceTriangles":565532,"candidateTriangles":113098,"sourceVertices":282758,"candidateVertices":64665}]},{"name":"t35_automatic_bridge_wheel_004","translation":[0,0,0],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"R39_BrassResponse","sourceTriangles":538288,"candidateTriangles":107646,"sourceVertices":269136,"candidateVertices":61191}]},{"name":"hr_runner","translation":[-5.199999809265137,0,6.599999904632568],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"M_Brass","sourceTriangles":520768,"candidateTriangles":104144,"sourceVertices":260386,"candidateVertices":58540}]},{"name":"t35_automatic_bridge_wheel_1","translation":[0,0,0],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"R39_BrassResponse","sourceTriangles":464480,"candidateTriangles":92890,"sourceVertices":232232,"candidateVertices":49620}]},{"name":"321.1002_bridge34","translation":[0,-0.1599999964237213,0],"rotation":[0,0,0,1],"scale":[1,1,1],"primitives":[{"material":"R43_SednaCutGrain","sourceTriangles":15142,"candidateTriangles":15142,"sourceVertices":15158,"candidateVertices":15158},{"material":"M_SednaChamfer","sourceTriangles":398510,"candidateTriangles":398510,"sourceVertices":215175,"candidateVertices":215175},{"material":"M_SednaWall","sourceTriangles":16690,"candidateTriangles":16690,"sourceVertices":16690,"candidateVertices":16690}]}]};

export async function prepareEditorialLOD({ T, GLTFLoader, active, restoreSourceFinish, ensureAnisotropyTangents, sourceFinishLog } = {}) {
  const geometries = new Map(), owned = new Set();
  const report = { version: 1, requested: new URLSearchParams(location.search).get('editorialLOD') === '20', ready: false, applied: false, fallback: false, asset: CONTRACT.asset, scope: 'Images rear clone only', sourceUnchanged: true, expectedNodes: 10, expectedPrimitives: 12, matchedPrimitives: 0, sourceTriangles: 0, candidateTriangles: 0, savedTriangles: 0, restoredUVPrimitives: 0, restoredTangentPrimitives: 0, error: null };
  const publish = () => { globalThis.__EDITORIAL_LOD = report;if (globalThis.document?.body) document.body.dataset.editorialLOD = JSON.stringify(report); };
  let disposed = false;
  const result = { geometries, report, dispose() { if (disposed) return;disposed = true;for (const geometry of owned) geometry.dispose();owned.clear();geometries.clear();report.ready = false;report.applied = false;publish(); } };
  publish();
  if (!report.requested) return result;
  const materialsOf = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const triangles = geometry => (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3;
  const assert = (condition, message) => { if (!condition) throw new Error('Editorial LOD: ' + message); };
  const matrixNear = (a, b, epsilon = 1e-6) => a.elements.every((value, i) => Math.abs(value - b.elements[i]) <= epsilon);
  let gltf = null;
  function releaseInput() {
    if (!gltf) return;
    const materials = new Set(),buffers = new Set();
    gltf.scene.traverse(object => { if (!object.isMesh) return;buffers.add(object.geometry);materialsOf(object).forEach(material => materials.add(material)); });
    buffers.forEach(geometry => geometry.dispose());materials.forEach(material => material.dispose());gltf = null;
  }
  try {
    assert(T && GLTFLoader && Array.isArray(active) && typeof restoreSourceFinish === 'function' && typeof ensureAnisotropyTangents === 'function', 'required source loader hooks are missing.');
    const unitMap = new Map(active.filter(unit => unit.on && !unit.origin).map(unit => [unit.name, unit]));
    const plate = unitMap.get('321.1000_mainplate');assert(plate, 'source mainplate is missing.');
    const originalPlate = new T.Box3(new T.Vector3(...CONTRACT.sourceMainplateBounds.min), new T.Vector3(...CONTRACT.sourceMainplateBounds.max));
    const sourceCenter = originalPlate.getCenter(new T.Vector3()),sourceSize = originalPlate.getSize(new T.Vector3());
    const factor = 4 / Math.max(sourceSize.x, sourceSize.z);
    const normalization = new T.Matrix4().makeScale(factor, factor, factor).multiply(new T.Matrix4().makeTranslation(-sourceCenter.x, -sourceCenter.y, -sourceCenter.z));
    const runtimePlate = new T.Box3();
    for (const mesh of plate.render) { if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();mesh.updateMatrix();runtimePlate.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix)); }
    const expectedPlate = originalPlate.clone().applyMatrix4(normalization);
    const baselinePlateCenter = plate.referencePosition.clone().applyQuaternion(plate.referenceQuaternion.clone().invert());
    expectedPlate.translate(baselinePlateCenter.clone().negate());
    assert(runtimePlate.min.distanceTo(expectedPlate.min) < 1e-5 && runtimePlate.max.distanceTo(expectedPlate.max) < 1e-5, 'mainplate normalization differs from the candidate source.');
    const sourceContracts = new Map();
    for (const row of CONTRACT.parts) {
      const unit = unitMap.get(row.name);assert(unit && unit.referencePosition && unit.referenceQuaternion, 'source node missing: ' + row.name);
      assert(unit.render.length === row.primitives.length, 'source primitive count differs: ' + row.name);
      const byMaterial = new Map();
      for (const mesh of unit.render) {
        const mats = materialsOf(mesh);assert(mats.length === 1, 'source primitive is unexpectedly multi-material: ' + row.name);
        const material = mats[0];assert(!byMaterial.has(material.name), 'ambiguous source material: ' + row.name + '/' + material.name);
        const spec = row.primitives.find(item => item.material === material.name);
        assert(spec && triangles(mesh.geometry) === spec.sourceTriangles && mesh.geometry.attributes.position.count === spec.sourceVertices, 'source geometry contract differs: ' + row.name + '/' + material.name);
        mesh.updateMatrix();assert(matrixNear(mesh.matrix, new T.Matrix4()), 'source primitive transform is not baked: ' + row.name);
        byMaterial.set(material.name, { mesh, spec });
      }
      sourceContracts.set(row.name, { unit, byMaterial, row });
    }
    const abort = new AbortController(),timer = setTimeout(() => abort.abort(), 30000);
    let bytes;
    try { const response = await fetch('assets/' + CONTRACT.asset, { signal: abort.signal, credentials: 'same-origin' });assert(response.ok, 'candidate HTTP ' + response.status);bytes = await response.arrayBuffer(); } finally { clearTimeout(timer); }
    assert(bytes.byteLength === 48388800, 'candidate byte size differs.');
    assert(globalThis.crypto?.subtle, 'SHA-256 verification is unavailable.');
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
    assert(digest === CONTRACT.assetSHA256, 'candidate SHA-256 differs.');
    gltf = await new GLTFLoader().parseAsync(bytes, '');gltf.scene.updateMatrixWorld(true);
    const json = gltf.parser.json;assert(json.nodes?.length === 10 && json.meshes?.length === 10, 'candidate node/mesh count differs.');
    assert(gltf.scene.userData.editorialLOD?.sourceSHA256 === CONTRACT.sourceSHA256, 'candidate provenance differs.');
    const owners = new Map(),seenNames = new Set();
    gltf.scene.traverse(object => {
      const association = gltf.parser.associations.get(object);if (association?.nodes === undefined) return;
      const name = json.nodes[association.nodes]?.name;
      if (!sourceContracts.has(name)) return;
      assert(!seenNames.has(name), 'duplicate candidate node: ' + name);seenNames.add(name);owners.set(object, sourceContracts.get(name));
    });
    assert(owners.size === 10, 'candidate named node contract differs.');
    const claimed = new Set();
    for (const [owner, item] of owners) {
      const { unit, byMaterial, row } = item;
      const expectedMatrix = new T.Matrix4().compose(new T.Vector3(...row.translation), new T.Quaternion(...row.rotation), new T.Vector3(...row.scale));
      assert(matrixNear(owner.matrixWorld, expectedMatrix), 'candidate source matrix differs: ' + row.name);
      const usedMaterials = new Set();
      const localCenter = unit.referencePosition.clone().applyQuaternion(unit.referenceQuaternion.clone().invert());
      owner.traverse(mesh => {
        if (!mesh.isMesh) return;
        const mats = materialsOf(mesh);assert(mats.length === 1, 'candidate primitive is multi-material: ' + row.name);
        const original = mats[0],sourceRecord = byMaterial.get(original.name);
        assert(sourceRecord && !usedMaterials.has(original.name), 'candidate material contract differs: ' + row.name + '/' + original.name);
        usedMaterials.add(original.name);claimed.add(mesh);
        const { mesh: sourceMesh, spec } = sourceRecord;
        assert(triangles(mesh.geometry) === spec.candidateTriangles && mesh.geometry.attributes.position.count === spec.candidateVertices, 'candidate count differs: ' + row.name + '/' + original.name);
        assert(matrixNear(mesh.matrixWorld, expectedMatrix), 'candidate primitive matrix differs: ' + row.name);
        const geometry = mesh.geometry.clone();geometry.userData = { ...geometry.userData };owned.add(geometry);
        const logStart = Array.isArray(sourceFinishLog) ? sourceFinishLog.length : 0;
        let restored;
        try { restored = restoreSourceFinish(original, geometry, mesh.matrixWorld, row.name);ensureAnisotropyTangents(T, geometry, restored, row.name); }
        finally { restored?.dispose();if (Array.isArray(sourceFinishLog)) sourceFinishLog.splice(logStart); }
        geometry.applyMatrix4(normalization.clone().multiply(mesh.matrixWorld));geometry.translate(-localCenter.x, -localCenter.y, -localCenter.z);
        // Core's second tangent pass sees the final source material. A temporary
        // clone mirrors that pass without setting needsUpdate on source material.
        if (sourceMesh.geometry.getAttribute('tangent') && !geometry.getAttribute('tangent')) {
          const material = sourceMesh.material.clone();try { ensureAnisotropyTangents(T, geometry, material); } finally { material.dispose(); }
        }
        for (const semantic of Object.keys(sourceMesh.geometry.attributes)) {
          assert(geometry.getAttribute(semantic), 'restored attribute missing: ' + row.name + '/' + semantic);
        }
        const position = geometry.getAttribute('position'),normal = geometry.getAttribute('normal');assert(position && normal && position.count === normal.count, 'normal count mismatch.');
        for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) assert(Number.isFinite(value), 'non-finite candidate attribute.');
        geometry.computeBoundingBox();geometry.computeBoundingSphere();
        if (!sourceMesh.geometry.boundingBox) sourceMesh.geometry.computeBoundingBox();
        const difference = Math.max(geometry.boundingBox.min.distanceTo(sourceMesh.geometry.boundingBox.min), geometry.boundingBox.max.distanceTo(sourceMesh.geometry.boundingBox.max));
        assert(difference < .0005, 'unit-local bounds differ: ' + row.name + '/' + original.name + ' (' + difference + ').');
        geometry.userData.editorialLOD = { candidate: true, sourceNode: row.name, sourceMaterial: original.name, scope: 'Images rear clone only', sourceTriangles: spec.sourceTriangles, candidateTriangles: spec.candidateTriangles };
        geometries.set(sourceMesh, geometry);report.sourceTriangles += spec.sourceTriangles;report.candidateTriangles += spec.candidateTriangles;report.matchedPrimitives++;
        if (geometry.getAttribute('uv')) report.restoredUVPrimitives++;
        if (geometry.getAttribute('tangent')) report.restoredTangentPrimitives++;
      });
      assert(usedMaterials.size === row.primitives.length, 'incomplete candidate node: ' + row.name);
    }
    let candidateMeshCount = 0;gltf.scene.traverse(object => { if (object.isMesh) candidateMeshCount++; });
    assert(claimed.size === 12 && candidateMeshCount === 12 && geometries.size === 12, 'candidate primitive coverage differs.');
    report.ready = true;report.sourceNormalization = { factor, sourceCenter: sourceCenter.toArray(), coreContract: '4 / original GLB mainplate diameter' };report.savedTriangles = report.sourceTriangles - report.candidateTriangles;
    releaseInput();publish();return result;
  } catch (error) {
    releaseInput();for (const geometry of owned) geometry.dispose();owned.clear();geometries.clear();report.ready = false;report.applied = false;report.fallback = true;report.error = error?.message || String(error);report.matchedPrimitives = 0;publish();
    console.warn('Editorial LOD candidate unavailable; retaining original rear geometry.', report.error);
    return result;
  }
}
