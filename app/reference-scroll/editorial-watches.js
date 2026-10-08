/* Two live views of the same source assets, rendered by the page's one renderer.
 * Geometry and textures are shared; poses and material opacity are independent.
 * The source movement/exterior identities remain in their original asset records. */
(function installEditorialWatches(global) {
  'use strict';
  let rig = null;

  function initialize({ T, scene, camera, units, braceletSet, configuration, rearLOD = null, onChange = () => {} }) {
    rig?.dispose();
    if (!T || !scene || !camera || !Array.isArray(units)) throw new TypeError('Live watch views require the existing scene, camera and units.');
    const selected = { dial: 'ink', hardware: 'silver', bracelet: 'silver', ...configuration };
    const watches = [];
    const sourceGeometries = new Set();
    const candidateGeometries = new Set();
    const basis = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    const rearTurn = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI);
    const tilt = new T.Quaternion(), rotation = new T.Quaternion(), euler = new T.Euler();
    const right = new T.Vector3(), up = new T.Vector3(), forward = new T.Vector3(), scratch = new T.Vector3();
    const rotatedBounds = new T.Box3(), size = new T.Vector3();
    let layoutWidth = 0, layoutHeight = 0, visible = false, reducedMotion = false, disposed = false;

    const materialsOf = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const geometryTriangles = geometry => {
      const available = geometry.index?.count ?? geometry.attributes.position?.count ?? 0;
      return Math.max(0, Math.min(available - (geometry.drawRange?.start || 0), geometry.drawRange?.count ?? Infinity)) / 3;
    };
    function prepareMaterial(source, unit) {
      const material = global.cloneKimiMaterial({ T, source, unit, state: selected });
      const base = source.userData.referenceBase || source;
      material.opacity = base.opacity ?? 1;
      material.transparent = base.transparent ?? false;
      material.depthWrite = base.depthWrite ?? true;
      // cloneKimiMaterial preserves the original surface, glass and engraving
      // compile hooks, with independent dial uniforms for each live view.
      material.userData.editorialBase = { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite };
      return material;
    }
    function createWatch(id, rear) {
      const root = new T.Group(), content = new T.Group();
      root.name = 'Kimi live perspective — ' + (rear ? 'movement' : 'face');
      root.visible = false;root.add(content);scene.add(root);
      const records = new Map(), bindings = [], meshes = [], parts = [];
      const braceletOpening = .80, millimetre = global.__EXTERIOR?.scaleFactor || 4 / 27;
      const hinge = new T.Vector3(), hingeRotation = new T.Quaternion(), hingeAxis = new T.Vector3(1, 0, 0);
      let casePart = null;
      const source = units.filter(unit => unit.on && (rear || unit.origin));
      for (const unit of source) {
        const part = new T.Group();part.name = unit.name;
        part.position.copy(unit.referencePosition);
        part.quaternion.copy(unit.referenceQuaternion);
        if (rear && braceletSet.has(unit) && !/^(ext_endlink_|ext_springbar_)/.test(unit.name)) {
          // Open the two existing curved bracelet halves at the end-link hinge.
          // The clasp clears the caseback without stretching every link into a
          // long straight strip. Each half retains its source relative poses.
          const side = Math.sign(unit.center.z) || -1;
          hinge.set(0, -1.52 * millimetre, side * 24.45 * millimetre);
          hingeRotation.setFromAxisAngle(hingeAxis, -side * braceletOpening);
          part.position.sub(hinge).applyQuaternion(hingeRotation).add(hinge);
          part.quaternion.premultiply(hingeRotation);
        }
        for (const original of unit.render) {
          const sources = materialsOf(original);
          const materials = sources.map(source => {
            if (!records.has(source)) records.set(source, { source, unit, material: prepareMaterial(source, unit) });
            return records.get(source).material;
          });
          const candidate = rear && rearLOD?.report?.ready ? rearLOD.geometries.get(original) : null;
          const geometry = candidate || original.geometry;
          const mesh = new T.Mesh(geometry, Array.isArray(original.material) ? materials : materials[0]);
          mesh.name = original.name || unit.name;
          mesh.position.copy(original.position);mesh.quaternion.copy(original.quaternion);mesh.scale.copy(original.scale);
          mesh.castShadow = false;mesh.receiveShadow = false;
          part.add(mesh);meshes.push(mesh);bindings.push({ mesh, sources, array: Array.isArray(original.material) });
          if (candidate) candidateGeometries.add(candidate);else sourceGeometries.add(original.geometry);
        }
        content.add(part);parts.push(part);if (unit.name === 'ext_case_mid') casePart = part;
      }
      const tourbillon = rear ? null : global.createConceptTourbillonClone?.({ parent: content, phaseOffset: 11.5 });
      const tourbillonMeshes = [];
      tourbillon?.root.traverse(object => {
        if (!object.isMesh) return;
        tourbillonMeshes.push(object);sourceGeometries.add(object.geometry);
        for (const material of materialsOf(object)) material.userData.editorialBase = { opacity: 1, transparent: false, depthWrite: true };
      });
      content.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(content);
      const caseBounds = new T.Box3().setFromObject(casePart || content);
      const caseDiameter = caseBounds.max.x - caseBounds.min.x;
      const center = caseBounds.getCenter(new T.Vector3());
      content.position.copy(center).negate();
      center.negate();bounds.translate(center);caseBounds.translate(center);
      const corners = Array.from({ length: 8 }, (_, index) => new T.Vector3(index & 1 ? bounds.max.x : bounds.min.x, index & 2 ? bounds.max.y : bounds.min.y, index & 4 ? bounds.max.z : bounds.min.z));
      const caseCorners = Array.from({ length: 8 }, (_, index) => new T.Vector3(index & 1 ? caseBounds.max.x : caseBounds.min.x, index & 2 ? caseBounds.max.y : caseBounds.min.y, index & 4 ? caseBounds.max.z : caseBounds.min.z));
      const watch = { id, rear, root, content, records, bindings, meshes, parts, tourbillon, tourbillonMeshes, corners, caseCorners, caseDiameter, braceletOpening: rear ? braceletOpening : 0, slot: document.querySelector('[data-live-watch="' + id + '"]'), rect: null, alpha: -1 };
      watch.geometryTriangles = meshes.reduce((sum, mesh) => sum + geometryTriangles(mesh.geometry), 0);
      watch.tourbillonTriangles = tourbillonMeshes.reduce((sum, mesh) => sum + geometryTriangles(mesh.geometry), 0);
      watches.push(watch);
      return watch;
    }
    createWatch('front', false);
    createWatch('rear', true);

    const report = {
      version: 2, mode: 'live-3d', framing: 'case-diameter', ready: true, instances: 2, visibleInstances: 0, geometryCopies: 0,
      sourceBaseParts: units.filter(unit => unit.on).length, sharedGeometryCount: sourceGeometries.size,
      configuration: { ...selected }, visibleGeometryTriangles: 0, continuouslyAnimating: false,
      rearLOD: rearLOD ? { requested: rearLOD.report.requested, applied: rearLOD.report.ready && candidateGeometries.size === 12, candidateGeometries: candidateGeometries.size, savedTriangles: rearLOD.report.ready ? rearLOD.report.savedTriangles : 0, fallback: rearLOD.report.fallback } : { requested: false, applied: false, candidateGeometries: 0, savedTriangles: 0, fallback: false },
      views: watches.map(watch => ({ view: watch.id, baseParts: watch.parts.length, meshes: watch.meshes.length, sourceGeometryTriangles: watch.geometryTriangles, tourbillonParts: watch.tourbillonMeshes.length, tourbillonGeometryTriangles: watch.tourbillonTriangles, openBracelet: watch.rear, braceletOpeningRadians: watch.braceletOpening, caseDiameter: watch.caseDiameter, opacity: 0, position: [], quaternion: [] }))
    };
    if (rearLOD) { rearLOD.report.applied = report.rearLOD.applied;if (document.body) document.body.dataset.editorialLOD = JSON.stringify(rearLOD.report); }

    function measure() {
      layoutWidth = innerWidth;layoutHeight = innerHeight;
      for (const watch of watches) watch.rect = watch.slot?.getBoundingClientRect() || null;
    }
    function setOpacity(watch, alpha) {
      if (Math.abs(alpha - watch.alpha) < 0.0001) return;
      watch.alpha = alpha;
      const materials = [...watch.records.values()].map(record => record.material);
      for (const mesh of watch.tourbillonMeshes) materials.push(...materialsOf(mesh));
      for (const material of new Set(materials)) {
        const base = material.userData.editorialBase;
        const transparent = base.transparent || alpha < 0.999;
        if (material.transparent !== transparent) { material.transparent = transparent;material.needsUpdate = true; }
        material.opacity = base.opacity * alpha;
        material.depthWrite = base.depthWrite && alpha > 0.999;
      }
    }
    function layoutWatch(watch, time, phase) {
      const rect = watch.rect;
      if (!rect || rect.width < 1 || rect.height < 1) return false;
      const mobile = layoutWidth < 768;
      const clock = reducedMotion ? 0 : time;
      // The two readable faces stay within a small angular range. They never
      // rotate through an edge-on or inverted pose to suggest motion.
      const pitch = (watch.rear ? -.08 : .20) + Math.sin(clock * .37 + (watch.rear ? 1.2 : 0)) * (reducedMotion ? 0 : .055);
      const yaw = (watch.rear ? -.23 : .25) + Math.sin(clock * .29 + (watch.rear ? 2.0 : .3)) * (reducedMotion ? 0 : .075);
      const roll = (watch.rear ? -.27 : -.16) + Math.sin(clock * .23 + (watch.rear ? 1.0 : .1)) * (reducedMotion ? 0 : .025);
      tilt.setFromEuler(euler.set(pitch, yaw, roll, 'XYZ'));
      rotation.copy(tilt);
      if (watch.rear) rotation.multiply(rearTurn);
      rotation.multiply(basis);
      rotatedBounds.makeEmpty();
      for (const corner of watch.caseCorners) rotatedBounds.expandByPoint(scratch.copy(corner).applyQuaternion(rotation));
      rotatedBounds.getSize(size);
      const distance = 32, halfHeight = distance * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), halfWidth = halfHeight * camera.aspect;
      // Match case diameter across both views; a longer/open bracelet must not
      // shrink the rear movement into a thumbnail. There is no card clipping.
      const targetPixels = mobile ? Math.min(235, rect.width * .70, layoutHeight * .26) : Math.min(325, rect.width * .61, layoutHeight * .405);
      const pixelsPerWorld = layoutHeight / (2 * halfHeight);
      const projectedDiameter = scratch.set(watch.caseDiameter, 0, 0).applyQuaternion(rotation);
      const diameterOnScreen = Math.hypot(projectedDiameter.x, projectedDiameter.y);
      const scale = targetPixels / Math.max(.001, diameterOnScreen * pixelsPerWorld);
      watch.casePixelDiameter = targetPixels;
      const floatPixels = (reducedMotion ? 0 : Math.sin(clock * .65 + (watch.rear ? 1.8 : 0)) * Math.min(7, layoutHeight * .009));
      const x = (rect.left + rect.width / 2) / layoutWidth * 2 - 1;
      const y = 1 - (rect.top + rect.height / 2 + floatPixels) / layoutHeight * 2;
      watch.root.position.copy(camera.position).addScaledVector(forward, distance).addScaledVector(right, x * halfWidth).addScaledVector(up, y * halfHeight);
      watch.root.quaternion.copy(camera.quaternion).multiply(rotation);
      watch.root.scale.setScalar(scale);
      return true;
    }
    function update({ time = 0, phase = {}, reduced = false } = {}) {
      if (disposed) return report;
      reducedMotion = Boolean(reduced);
      const alpha = phase.name === 'Images' ? (phase.mix ?? 1) : phase.previous?.name === 'Images' ? 1 - (phase.mix ?? 1) : 0;
      visible = alpha > 0.001;
      if (visible && (layoutWidth !== innerWidth || layoutHeight !== innerHeight || !watches[0].rect)) measure();
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      let count = 0, triangles = 0;
      for (const [index, watch] of watches.entries()) {
        watch.root.visible = visible && layoutWatch(watch, Number.isFinite(time) ? time : 0, phase);
        setOpacity(watch, alpha);
        if (watch.root.visible) { count++;triangles += watch.geometryTriangles + watch.tourbillonTriangles; }
        Object.assign(report.views[index], { visible: watch.root.visible, opacity: alpha, position: watch.root.position.toArray(), quaternion: watch.root.quaternion.toArray(), scale: watch.root.scale.x, targetCasePixelDiameter: watch.casePixelDiameter });
      }
      report.visibleInstances = count;report.visibleGeometryTriangles = triangles;
      report.continuouslyAnimating = count > 0 && !reducedMotion;report.reducedMotion = reducedMotion;
      document.body.dataset.editorialWatches = JSON.stringify(report);
      return report;
    }
    function changeConfiguration(event) {
      Object.assign(selected, event.detail?.state || {});
      for (const watch of watches) {
        for (const record of watch.records.values()) {
          const previous = record.material;
          record.material = prepareMaterial(record.source, record.unit);
          previous.dispose();
        }
        for (const { mesh, sources, array } of watch.bindings) {
          const materials = sources.map(source => watch.records.get(source).material);
          mesh.material = array ? materials : materials[0];
        }
        watch.alpha = -1;
      }
      report.configuration = { ...selected };onChange();
    }
    global.addEventListener('kimi-configuration-change', changeConfiguration);
    function dispose() {
      if (disposed) return;
      disposed = true;
      global.removeEventListener('kimi-configuration-change', changeConfiguration);
      for (const watch of watches) {
        watch.tourbillon?.dispose();watch.records.forEach(record => record.material.dispose());watch.root.removeFromParent();
      }
      rearLOD?.dispose();
      report.ready = false;report.visibleInstances = 0;report.continuouslyAnimating = false;
      // Shared source geometry and textures remain owned by the asset loader.
    }
    rig = { update, report, dispose, isActive: () => visible && !reducedMotion, measure, watches };
    global.__EDITORIAL_WATCHES = report;
    return rig;
  }
  global.initializeEditorialWatches = initialize;
  global.updateEditorialWatches = options => rig?.update(options);
  global.isEditorialWatchesActive = () => Boolean(rig?.isActive());
})(window);
