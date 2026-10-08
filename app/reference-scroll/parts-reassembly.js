/* Scroll-driven reassembly of the 359 existing display units.
 * Call init after buildReferenceRig/material refinement, then pose after
 * poseReference and before concept-tourbillon attachment, camera and shadows.
 * No source geometry or rest pose is edited. Ghosts share EXTERIOR geometry
 * only, use independent materials, and never duplicate the dense movement.
 */
(function partsReassemblyModule(global) {
  'use strict';
  const VERSION = 'kimi-parts-reassembly-2';
  const installations = new WeakMap();
  let current = null;
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
  const range = (a, b, value) => ease((value - a) / (b - a));
  const materialsOf = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  function initPartsReassembly({ T, scene, displayRoot, active, renderer } = {}) {
    if (!T || !scene?.isScene || !displayRoot?.isObject3D || !Array.isArray(active))
      throw new Error('Parts reassembly requires THREE, scene, displayRoot and loaded units.');
    if (installations.has(displayRoot)) return installations.get(displayRoot);
    const source = active.filter(unit => unit.on !== false && !unit.isSample);
    if (source.length !== 359 || new Set(source.map(unit => unit.name)).size !== 359)
      throw new Error('Parts reassembly expects the 359 unique visible source units.');
    const byName = new Map(source.map(unit => [unit.name, unit]));
    const identity = new T.Quaternion(), one = new T.Vector3(1, 1, 1);
    const tempMatrix = new T.Matrix4(), tempBox = new T.Box3();
    const position = new T.Vector3(), quaternion = new T.Quaternion();
    const groupPosition = new T.Vector3(), groupRotation = new T.Quaternion();
    const localBounds = new Map(), groupMap = new Map(), ownedMaterials = new Set();
    const targetBounds = new T.Box3();

    for (const unit of source) {
      if (!unit.referencePosition || !unit.referenceQuaternion || !unit.serviceGroup)
        throw new Error('Parts reassembly needs audited reference/service data: ' + unit.name);
      const box = new T.Box3();
      for (const mesh of unit.render) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        mesh.updateMatrix();
        box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix));
      }
      localBounds.set(unit, box);
      tempMatrix.compose(unit.referencePosition, unit.referenceQuaternion, one);
      targetBounds.union(tempBox.copy(box).applyMatrix4(tempMatrix));
      if (!groupMap.has(unit.serviceGroup)) groupMap.set(unit.serviceGroup, []);
      groupMap.get(unit.serviceGroup).push(unit);
    }

    const groups = [...groupMap].map(([id, members]) => {
      const carrier = byName.get(members[0].serviceCarrier);
      if (!carrier || !members.includes(carrier))
        throw new Error('Invalid service carrier for reassembly group ' + id);
      const rest = carrier.referencePosition.clone();
      const flatQuaternion = carrier.referenceStrapQuaternion || carrier.kquat || carrier.referenceQuaternion;
      const flatDelta = flatQuaternion.clone().multiply(carrier.referenceQuaternion.clone().invert()).normalize();
      const flatBounds = new T.Box3();
      const frames = members.map(unit => {
        const offset = unit.referencePosition.clone().sub(rest);
        const q = flatDelta.clone().multiply(unit.referenceQuaternion).normalize();
        const p = offset.clone().applyQuaternion(flatDelta);
        tempMatrix.compose(p, q, one);
        flatBounds.union(tempBox.copy(localBounds.get(unit)).applyMatrix4(tempMatrix));
        return { unit, offset };
      });
      const size = flatBounds.getSize(new T.Vector3());
      const isBracelet = members.some(unit => ['link', 'pin', 'clasp'].includes(unit.knollRole));
      const isFront = members.some(unit => unit.origin) && id !== 'caseback';
      const axis = carrier.v5Control?.axis?.clone()
        || new T.Vector3(0, isFront ? 1 : -1, 0);
      const assemblyTime = Number(carrier.v5Group?.assemble?.[0]) || 0;
      const start = .10 + .46 * Math.min(1, assemblyTime / 15.0);
      const duration = isBracelet ? .16 : .19;
      const approach = rest.clone().addScaledVector(axis, isBracelet ? 2.2 : id === 'front-crystal' ? 4.2 : 2.8);
      return { id, carrier, members, frames, rest, flatDelta, flatBounds,
        width: Math.max(.34, size.x), height: Math.max(.34, size.z),
        size, start, end: Math.min(.75, start + duration), approach,
        axis, isBracelet, assemblyTime, ghosts: [] };
    }).sort((a, b) => a.assemblyTime - b.assemblyTime || a.id.localeCompare(b.id));

    // A lower staging field, not a contact sheet that must fit one viewport.
    // The assembled target stays prominent above it. Modules may wait below
    // the viewport and enter from the bottom as their scroll interval begins.
    // Fixed core, bridge bearings and complete bracelet rows stay coherent.
    const layouts = new Map();
    function layout(compact) {
      if (layouts.has(compact)) return layouts.get(compact);
      const shelfWidth = compact ? 10.5 : 24.0;
      const left = -shelfWidth / 2, top = targetBounds.max.z + 1.05, gap = .38;
      const ordered = [...groups].sort((a, b) => {
        const bandA = a.isBracelet ? 2 : a.width * a.height > 5 ? 0 : 1;
        const bandB = b.isBracelet ? 2 : b.width * b.height > 5 ? 0 : 1;
        return bandA - bandB || b.width * b.height - a.width * a.height
          || a.id.localeCompare(b.id);
      });
      const entries = new Map(), bounds = targetBounds.clone(), stageBounds = new T.Box3();
      // Fill a wide, shallow field centered below the target. The mobile field
      // is narrower and deliberately continues farther below the viewport.
      let free = [{ x: left, z: top, w: shelfWidth, h: 100 }];
      for (const group of ordered) {
        const w = group.width + gap, h = group.height + gap;
        const candidates = free.filter(rect => w <= rect.w + 1e-7 && h <= rect.h + 1e-7)
          .sort((a, b) => (a.z + h) - (b.z + h) || a.x - b.x);
        if (!candidates.length) throw new Error('Reassembly tray cannot fit ' + group.id);
        const slot = candidates[0], placed = { x: slot.x, z: slot.z, w, h };
        const split = [];
        for (const rect of free) {
          if (placed.x >= rect.x + rect.w || placed.x + w <= rect.x
            || placed.z >= rect.z + rect.h || placed.z + h <= rect.z) { split.push(rect);continue; }
          if (placed.x > rect.x) split.push({ ...rect, w: placed.x - rect.x });
          if (placed.x + w < rect.x + rect.w) split.push({ ...rect, x: placed.x + w, w: rect.x + rect.w - placed.x - w });
          if (placed.z > rect.z) split.push({ ...rect, h: placed.z - rect.z });
          if (placed.z + h < rect.z + rect.h) split.push({ ...rect, z: placed.z + h, h: rect.z + rect.h - placed.z - h });
        }
        free = split.filter((rect, index) => rect.w > .001 && rect.h > .001
          && !split.some((other, j) => j !== index && other.x <= rect.x && other.z <= rect.z
            && other.x + other.w >= rect.x + rect.w && other.z + other.h >= rect.z + rect.h
            && (j < index || other.x !== rect.x || other.z !== rect.z || other.w !== rect.w || other.h !== rect.h)));
        const center = group.flatBounds.getCenter(new T.Vector3());
        const anchor = new T.Vector3(placed.x + group.width / 2 - center.x,
          1.65 - center.y, placed.z + group.height / 2 - center.z);
        const bend = anchor.clone().add(new T.Vector3(-anchor.x * .12, 2.1, -1.5));
        const approachControl = group.approach.clone().addScaledVector(group.axis, 1.0);
        const curve = new T.CubicBezierCurve3(anchor, bend, approachControl, group.approach);
        entries.set(group, { anchor, curve });
        const stagedBounds = group.flatBounds.clone().translate(anchor);
        stageBounds.union(stagedBounds);bounds.union(stagedBounds);
      }
      const result = { entries, bounds, stageBounds, width: shelfWidth };
      layouts.set(compact, result); return result;
    }

    const ghostRoot = new T.Group();
    ghostRoot.name = 'Kimi reassembly / exterior target only';
    ghostRoot.visible = false; ghostRoot.userData.partsReassemblyGhost = true;
    displayRoot.add(ghostRoot);
    let ghostMeshes = 0, ghostTriangles = 0;
    for (const group of groups) for (const { unit } of group.frames) {
      if (!unit.origin) continue;
      const root = new T.Group();root.name = 'Target / ' + unit.name;
      root.position.copy(unit.referencePosition);root.quaternion.copy(unit.referenceQuaternion);
      root.visible = false;ghostRoot.add(root);
      const materialLinks = [];
      for (const mesh of unit.render) {
        const cloneMaterial = original => {
          const material = original.clone();
          // Material.clone does not preserve these callbacks. Keep the source
          // surface/engraving/glass logic with a separate opacity/render state.
          material.onBeforeCompile = original.onBeforeCompile;
          material.customProgramCacheKey = original.customProgramCacheKey;
          material.transparent = true;material.opacity = 0;material.depthWrite = false;
          material.polygonOffset = true;material.polygonOffsetFactor = -1;
          material.polygonOffsetUnits = -1;material.needsUpdate = true;
          ownedMaterials.add(material);materialLinks.push({ original, material });
          return material;
        };
        const clone = new T.Mesh(mesh.geometry, Array.isArray(mesh.material)
          ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material));
        clone.position.copy(mesh.position);clone.quaternion.copy(mesh.quaternion);clone.scale.copy(mesh.scale);
        clone.castShadow = false;clone.receiveShadow = false;
        clone.userData.partsReassemblyGhost = true;clone.renderOrder = 2;
        root.add(clone);ghostMeshes++;
        ghostTriangles += mesh.geometry.index ? mesh.geometry.index.count / 3
          : (mesh.geometry.getAttribute('position')?.count || 0) / 3;
      }
      group.ghosts.push({ unit, root, materialLinks });
    }

    const report = {
      version: VERSION, ready: true, active: false, phase: 0, visibility: 0,
      sourceUnits: source.length, serviceGroups: groups.length,
      accountedUnits: groups.reduce((sum, group) => sum + group.members.length, 0),
      exteriorUnits: source.filter(unit => unit.origin).length,
      ghostMeshes, ghostTriangles, ghostMaterials: ownedMaterials.size,
      interiorGhostMeshes: 0, sharedGeometry: true, geometryChanged: false,
      landedGroups: 0, travellingGroups: 0, heroMix: 0,
      assembledTarget: { min: targetBounds.min.toArray(), max: targetBounds.max.toArray() },
      cameraRecommendation: { mode: 'hero-relative; do not fit all staging bounds',
        distance: 36, focus: [0, -1.4, 1.5], fieldOfView: 25,
        stagingMayExtendBelowViewport: true },
      groupOrder: groups.map(group => ({ id: group.id, count: group.members.length,
        start: group.start, end: group.end, carrier: group.carrier.name })),
      limitation: 'Concept presentation using audited service modules; source CAD gaps and source intersections remain. '
        + 'The choreography is not a manufacturing collision or tolerance certificate.'
    };
    const framingBounds = new T.Box3();
    let disposed = false;

    function alphaUnit(unit, alpha) {
      unit.root.visible = unit.on !== false && alpha > .002;
      for (const mesh of unit.render) for (const material of materialsOf(mesh)) {
        const base = material.userData.referenceBase;
        if (!base) throw new Error('Missing reference material baseline for ' + unit.name);
        const transparent = base.transparent || alpha < .999;
        if (material.transparent !== transparent) { material.transparent = transparent;material.needsUpdate = true; }
        material.opacity = base.opacity * alpha;
        material.depthWrite = base.depthWrite && alpha >= .999;
      }
      if (unit.shadow) unit.shadow.visible = false;
    }

    function solveGroup(group, p, visibility, compact) {
      const t = range(group.start, group.end, p);
      const staged = layout(compact).entries.get(group);
      if (t >= 1 || visibility === 0) {
        groupPosition.copy(group.rest);groupRotation.identity();
      } else {
        // The last leg is an aligned insertion. Rotation finishes before that
        // leg begins; no part is flipped while crossing its destination plane.
        if (t < .78) staged.curve.getPoint(ease(t / .78), groupPosition);
        else groupPosition.copy(group.approach).lerp(group.rest, ease((t - .78) / .22));
        groupRotation.copy(group.flatDelta).slerp(identity, range(.05, .68, t));
        groupPosition.lerp(group.rest, 1 - visibility);
        groupRotation.slerp(identity, 1 - visibility);
      }
      return t;
    }

    function pose({ phase = 0, time = 0, reduced = false, config = {}, compact = false, visibility = 1, exiting = false } = {}) {
      if (disposed) return null;
      const p = clamp(phase), v = clamp(visibility), narrow = Boolean(compact);
      const heroMix = range(.77, .85, p);
      framingBounds.copy(targetBounds);ghostRoot.visible = v > .002 && p < .75;
      let landed = 0, travelling = 0, dialOpacity = 1;
      for (const group of groups) {
        const t = solveGroup(group, p, v, narrow);
        if (t >= 1) landed++;else if (t > 0) travelling++;
        const alpha = exiting ? v : 1;
        for (const { unit, offset } of group.frames) {
          if (t >= 1 || v === 0) {
            // Copy exact reference values at endpoints; no residual spline or
            // quaternion normalization drift can accumulate on reverse scroll.
            position.copy(unit.referencePosition);quaternion.copy(unit.referenceQuaternion);
          } else {
            position.copy(offset).applyQuaternion(groupRotation).add(groupPosition);
            quaternion.copy(groupRotation).multiply(unit.referenceQuaternion).normalize();
          }
          unit.pos.copy(position);unit.quat.copy(quaternion);
          unit.root.position.copy(position);unit.root.quaternion.copy(quaternion);
          alphaUnit(unit, alpha);
          tempMatrix.compose(position, quaternion, one);
          framingBounds.union(tempBox.copy(localBounds.get(unit)).applyMatrix4(tempMatrix));
          if (unit.name === 'ext_step_dial') dialOpacity = alpha;
        }
        const ghostAlpha = .14 * v * (1 - range(.66, 1, t));
        for (const ghost of group.ghosts) {
          ghost.root.visible = ghostAlpha > .002;
          for (const { original, material } of ghost.materialLinks) {
            // Configurator colours can change between chapters. Copy colour
            // only, leaving all source materials and textures untouched.
            if (material.color && original.color) material.color.copy(original.color);
            material.opacity = (original.userData.referenceBase?.opacity ?? 1) * ghostAlpha;
          }
        }
      }
      // The existing 64-piece concept mechanism attaches to the actual dial.
      // Its runtime also reads state.dial, so remove the old Parts hide gate.
      if (config.state) {
        config.state.dial = exiting ? v : 1;config.state.caseAlpha = 1;config.state.mechanism = 1;
        config.state.bracelet = 1;config.state.crystal = 1;
        config.state.explode = 0;config.state.detail = 0;config.state.child = 0;
        config.state.allChild = 0;config.state.knoll = 0;config.state.strap = 0;
      }
      displayRoot.updateMatrixWorld(true);
      report.active = v > .002;report.phase = p;report.visibility = v;
      report.compact = narrow;report.landedGroups = landed;report.travellingGroups = travelling;
      report.heroMix = heroMix;report.dialOpacity = dialOpacity;
      report.framing = { min: framingBounds.min.toArray(), max: framingBounds.max.toArray() };
      const stageBounds = layout(narrow).stageBounds;
      report.stageBounds = { min: stageBounds.min.toArray(), max: stageBounds.max.toArray() };
      report.time = Number.isFinite(time) ? time : 0;report.reduced = Boolean(reduced);
      if (typeof document !== 'undefined') document.body.dataset.reassembly = JSON.stringify({
        version: VERSION, active: report.active, phase: p, units: source.length,
        groups: groups.length, landed, travelling, heroMix, ghostMeshes,
        interiorGhostMeshes: 0, visible: v, disposed: false
      });
      return { framingBounds, targetBounds, stageBounds, heroFramingBounds: targetBounds,
        heroMix, dialOpacity, progress: p, report };
    }

    function deactivate({ restore = false } = {}) {
      ghostRoot.visible = false;report.active = false;
      if (typeof document !== 'undefined') document.body.dataset.reassembly = JSON.stringify({
        version: VERSION, active: false, units: source.length, groups: groups.length,
        ghostMeshes, interiorGhostMeshes: 0, disposed
      });
      if (restore) for (const unit of source) {
        unit.pos.copy(unit.referencePosition);unit.quat.copy(unit.referenceQuaternion);
        unit.root.position.copy(unit.pos);unit.root.quaternion.copy(unit.quat);alphaUnit(unit, 1);
      }
      // Normal frame order calls poseReference before this; do not overwrite
      // another chapter's current transforms, visibility or transparent glass.
    }

    function audit() {
      const snapshots = new Map(), samples = Array.from({ length: 101 }, (_, i) => i / 100);
      let finite = true, reversible = true, exactRest = true, rigidGroups = true, stagingSeparated = true;
      const sample = (p, compact) => {
        const values = [];
        for (const group of groups) {
          const t = solveGroup(group, p, 1, compact);
          for (const { unit, offset } of group.frames) {
            if (t >= 1) { position.copy(unit.referencePosition);quaternion.copy(unit.referenceQuaternion); }
            else {
              position.copy(offset).applyQuaternion(groupRotation).add(groupPosition);
              quaternion.copy(groupRotation).multiply(unit.referenceQuaternion).normalize();
            }
            values.push(...position.toArray(), ...quaternion.toArray());
            finite &&= values.slice(-7).every(Number.isFinite);
            rigidGroups &&= Math.abs(position.distanceTo(groupPosition) - offset.length()) < 1e-7;
            if (p === 1) exactRest &&= position.equals(unit.referencePosition) && quaternion.equals(unit.referenceQuaternion);
          }
        }
        return values;
      };
      for (const compact of [false, true]) {
        const rects = groups.map(group => group.flatBounds.clone().translate(layout(compact).entries.get(group).anchor));
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          stagingSeparated &&= Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) <= 1e-7
            || Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) <= 1e-7;
        }
        for (const p of samples) snapshots.set(compact + ':' + p, sample(p, compact));
        for (const p of [...samples].reverse()) {
          const expected = snapshots.get(compact + ':' + p);
          reversible &&= sample(p, compact).every((value, i) => value === expected[i]);
        }
      }
      const result = { finite, reversible, exactRest, rigidGroups, stagingSeparated,
        all359: source.length === 359 && report.accountedUnits === 359,
        noInteriorGhosts: report.interiorGhostMeshes === 0,
        samplesPerLayout: samples.length, layouts: 2,
        note: 'Transform/ownership checks; not a triangle-level collision certificate.' };
      result.ok = finite && reversible && exactRest && rigidGroups && stagingSeparated && result.all359 && result.noInteriorGhosts;
      report.audit = result;return result;
    }

    function dispose() {
      if (disposed) return;
      if (report.active) deactivate({ restore: true });else deactivate();
      ghostRoot.removeFromParent();ownedMaterials.forEach(material => material.dispose());
      // Shared geometries and shared textures belong to the original units.
      ownedMaterials.clear();disposed = true;report.ready = false;report.disposed = true;
      installations.delete(displayRoot);if (current === api) current = null;
    }
    const api = { pose, deactivate, audit, dispose, report, ghostRoot, targetBounds };
    installations.set(displayRoot, api);current = api;
    global.__PARTS_REASSEMBLY = report;
    return api;
  }

  global.initPartsReassembly = initPartsReassembly;
  global.posePartsReassembly = options => current?.pose(options) || null;
})(typeof window !== 'undefined' ? window : globalThis);
