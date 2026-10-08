/* Kimi concept tourbillon: an independent visual mechanism, not part of Cal.321.
 * GLB motionPivot/motionAxis extras define every bearing in source Y-up space.
 * Call after poseReference(); source units and the 359-part contract stay intact. */
(function installConceptTourbillon(global) {
  'use strict';
  const TAU = Math.PI * 2;
  const ROLE_ORDER = ['fixed', 'cage', 'balance', 'escape', 'pallet'];
  let rig = null;
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const smooth = (a, b, value) => { const x = clamp((value - a) / (b - a)); return x * x * (3 - 2 * x); };
  const vectorArray = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

  function initConceptTourbillon({ T, gltf, scene, displayRoot, active, renderer } = {}) {
    if (!T || !gltf?.scene || !displayRoot || !Array.isArray(active)) throw new TypeError('Concept tourbillon requires {T,gltf,displayRoot,active}.');
    if (rig) rig.dispose();
    const dial = active.find(unit => unit.name === 'ext_step_dial');
    const exterior = global.__EXTERIOR;
    if (!dial || !Number.isFinite(exterior?.scaleFactor) || !vectorArray(exterior.normalizationOrigin)) throw new Error('Concept tourbillon requires the normalized exterior and ext_step_dial.');
    const source = gltf.scene;
    const metadata = source.userData.conceptTourbillon || gltf.parser?.json?.scenes?.[gltf.parser.json.scene || 0]?.extras?.conceptTourbillon;
    if (!metadata || !vectorArray(metadata.pivot) || !vectorArray(metadata.axis)) throw new Error('Concept tourbillon GLB is missing its pivot/axis contract.');
    if (metadata.sourceUnit !== 'millimeter') throw new Error('Concept tourbillon source units must match the exterior millimetres.');

    const factor = exterior.scaleFactor;
    const origin = new T.Vector3().fromArray(exterior.normalizationOrigin);
    const norm = new T.Matrix4().makeScale(factor, factor, factor).multiply(new T.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z));
    const pivot = new T.Vector3().fromArray(metadata.pivot).applyMatrix4(norm);
    const axis = new T.Vector3().fromArray(metadata.axis).normalize();
    const definitions = [];
    const materials = new Map();
    const counts = Object.fromEntries(ROLE_ORDER.map(role => [role, 0]));
    const sourceNames = new Set();
    let vertices = 0, triangles = 0, meshCount = 0;
    source.updateMatrixWorld(true);

    function prepareMaterial(original) {
      if (materials.has(original)) return materials.get(original);
      const material = original.clone();
      material.name = original.name;
      material.envMapIntensity = 1.05;
      material.transmission = 0;
      material.opacity = 1;
      material.transparent = false;
      material.depthWrite = true;
      material.side = T.FrontSide;
      if (/ruby/i.test(material.name)) {
        material.metalness = 0.12;
        material.roughness = 0.17;
        material.clearcoat = 0.45;
        material.clearcoatRoughness = 0.11;
        material.ior = 1.76;
        material.envMapIntensity = 1.15;
      } else {
        material.metalness = 1;
        material.roughness = Math.max(0.16, Math.min(0.34, material.roughness));
        // Separate the real finishes at the small aperture scale. These are
        // linear metal reflectance tints, with roughness retaining the machining
        // hierarchy; there is no emissive fill or geometry behind the opening.
        if (/polished rhodium/i.test(material.name)) {
          material.color.setRGB(0.68, 0.71, 0.75);
          material.roughness = 0.16;
        } else if (/satin titanium/i.test(material.name)) {
          material.color.setRGB(0.26, 0.29, 0.33);
          material.roughness = 0.36;
        } else if (/champagne balance/i.test(material.name)) {
          material.color.setRGB(0.76, 0.51, 0.20);
          material.roughness = 0.22;
        } else if (/tempered blue steel/i.test(material.name)) {
          material.color.setRGB(0.025, 0.052, 0.17);
          material.roughness = 0.21;
        } else if (/blued hairspring/i.test(material.name)) {
          material.color.setRGB(0.045, 0.075, 0.14);
          material.roughness = 0.30;
        }
      }
      material.userData.conceptTourbillon = true;
      materials.set(original, material);
      return material;
    }

    source.traverse(mesh => {
      if (!mesh.isMesh) return;
      let owner = mesh;
      while (owner && !owner.userData.motionRole) owner = owner.parent;
      const data = owner?.userData;
      const role = data?.motionPart === 'hairspring' ? 'cage' : data?.motionRole;
      if (!ROLE_ORDER.includes(role) || !vectorArray(data.motionPivot) || !vectorArray(data.motionAxis)) throw new Error('Missing tourbillon motion metadata for ' + mesh.name);
      const bearing = new T.Vector3().fromArray(data.motionPivot).applyMatrix4(norm);
      const bearingAxis = new T.Vector3().fromArray(data.motionAxis).normalize();
      const geometry = mesh.geometry.clone().applyMatrix4(norm.clone().multiply(mesh.matrixWorld));
      geometry.translate(-bearing.x, -bearing.y, -bearing.z);
      geometry.computeBoundingSphere();
      const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const prepared = originalMaterials.map(prepareMaterial);
      const definition = { name: owner.name || mesh.name, role, bearing, axis: bearingAxis, geometry, materials: prepared, arrayMaterial: Array.isArray(mesh.material), data: { ...data } };
      definitions.push(definition);
      const name = owner.name || mesh.uuid;
      if (!sourceNames.has(name)) { sourceNames.add(name); counts[role]++; }
      meshCount++;
      vertices += geometry.attributes.position?.count || 0;
      triangles += geometry.index ? geometry.index.count / 3 : (geometry.attributes.position?.count || 0) / 3;
    });
    for (const role of ROLE_ORDER) if (!counts[role]) throw new Error('Concept tourbillon is missing the ' + role + ' assembly.');

    const report = {
      version: 1, ready: true, name: 'Kimi concept tourbillon', isConcept: true,
      limitation: 'Independent display concept; not an original Cal.321 mechanism or a calibrated escapement.',
      sourceUnit: metadata.sourceUnit, parts: sourceNames.size, meshes: meshCount, triangles, vertices,
      roles: counts, sourcePivot: metadata.pivot.slice(), normalizedPivot: pivot.toArray(), scaleFactor: factor,
      normalizationOrigin: origin.toArray(), cagePeriodSeconds: 60, balanceFrequencyHz: 2.5,
      balanceAmplitudeRadians: 0.85, hairspringMotion: 'Carried by cage; no rigid balance oscillation',
      transmissionPasses: 0, active: false, visible: false, concealedRear: false, assembled: true, cameraFacing: null, opacity: 1, detail: 0, cloneCount: 0,
      angles: { cage: 0, balance: 0, escape: 0, pallet: 0 }
    };
    const restDialPosition = (dial.referencePosition || dial.center).clone();
    const restDialQuaternion = (dial.referenceQuaternion || dial.baseQuat || new T.Quaternion()).clone();
    const restDialMatrix = new T.Matrix4().compose(restDialPosition, restDialQuaternion, new T.Vector3(1, 1, 1));
    const inverseRestDialMatrix = restDialMatrix.clone().invert();
    const inverseParentMatrix = new T.Matrix4();
    const currentDialMatrix = new T.Matrix4();
    const attachmentMatrix = new T.Matrix4();
    const clones = new Set();
    let reducedMotion = false;

    function instance(name, cloneMaterials = false) {
      const root = new T.Group();root.name = name;
      root.userData.conceptTourbillon = true;
      const fixed = new T.Group();fixed.name = 'Concept fixed seat';root.add(fixed);
      const cage = new T.Group();cage.name = 'Concept 60-second cage';root.add(cage);
      const bearings = new Map();
      const meshes = [];
      const ownMaterials = new Map();
      const groupFor = definition => {
        if (definition.role === 'fixed') return fixed;
        if (definition.role === 'cage') return cage;
        const key = definition.role + ':' + definition.bearing.toArray().join(',');
        if (!bearings.has(key)) {
          const group = new T.Group();group.name = 'Concept ' + definition.role + ' bearing';
          group.userData.motionRole = definition.role;
          cage.add(group);
          bearings.set(key, { group, role: definition.role, axis: definition.axis, base: definition.bearing.clone().sub(pivot) });
        }
        return bearings.get(key).group;
      };
      for (const definition of definitions) {
        const mats = definition.materials.map(base => {
          if (!cloneMaterials) return base;
          if (!ownMaterials.has(base)) {
            const material = base.clone();
            material.opacity = 1;material.transparent = false;material.depthWrite = true;
            ownMaterials.set(base, material);
          }
          return ownMaterials.get(base);
        });
        const mesh = new T.Mesh(definition.geometry, definition.arrayMaterial ? mats : mats[0]);
        mesh.name = definition.name;
        mesh.userData = { ...definition.data, conceptTourbillon: true };
        if (definition.role === 'fixed' || definition.role === 'cage') mesh.position.copy(definition.bearing).sub(pivot);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        groupFor(definition).add(mesh);meshes.push(mesh);
      }
      return { root, fixed, cage, bearings: [...bearings.values()], meshes, ownMaterials, phaseOffset: 0, disposed: false };
    }

    const main = instance('Kimi concept tourbillon');
    displayRoot.add(main.root);

    function applyMotion(target, time, detail, reduced) {
      const seconds = reduced ? 0 : time + target.phaseOffset;
      const cageAngle = TAU * ((seconds % 60) / 60);
      const balanceAngle = reduced ? 0 : 0.85 * Math.sin(TAU * 2.5 * (seconds % 0.4));
      const beat = seconds * 5;
      const escapeAngle = reduced ? 0 : -(Math.floor(beat) + smooth(0.12, 0.30, beat % 1)) * TAU / 15;
      const palletAngle = reduced ? 0 : 0.14 * Math.tanh(4.5 * Math.sin(TAU * 2.5 * (seconds % 0.4)));
      target.fixed.position.copy(pivot);
      target.fixed.quaternion.identity();
      target.cage.position.copy(pivot).addScaledVector(axis, 0.38 * detail);
      target.cage.quaternion.setFromAxisAngle(axis, cageAngle);
      for (const bearing of target.bearings) {
        bearing.group.position.copy(bearing.base);
        const angle = bearing.role === 'balance' ? balanceAngle : bearing.role === 'escape' ? escapeAngle : palletAngle;
        if (bearing.role === 'balance') bearing.group.position.addScaledVector(axis, 0.40 * detail);
        bearing.group.quaternion.setFromAxisAngle(bearing.axis, angle);
      }
      return { cage: cageAngle, balance: balanceAngle, escape: escapeAngle, pallet: palletAngle };
    }

    function dialOpacity() {
      const material = dial.render.flatMap(mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material]).find(value => /^dial_/.test(value.name));
      if (!material) return 1;
      return clamp(material.opacity / (material.userData.referenceBase?.opacity || 1));
    }

    function setOpacity(alpha) {
      for (const material of materials.values()) {
        const transparent = alpha < 0.999;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.opacity = alpha;
        material.depthWrite = !transparent;
      }
    }

    function visibleInParents(object) {
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
      return true;
    }

    function rearConcealment(config, state, section) {
      // This only gates repeat paints. Never hide geometry or suppress any
      // exploded/transparent assembly, where the front mechanism can be seen.
      const assembled = ['explode', 'detail', 'dialLift', 'crystalLift', 'knoll', 'strap'].every(key => Math.abs(Number(state[key]) || 0) < 0.001)
        && ['dial', 'caseAlpha', 'crystal', 'mechanism'].every(key => (state[key] === undefined ? 1 : Number(state[key])) > 0.999);
      const direction = config.direction;
      const length = direction ? Math.hypot(direction.x, direction.y, direction.z) : 0;
      const facing = length > 0 && Number.isFinite(length) ? direction.y / length : null;
      const rear = section !== 'Disassembly' && assembled && facing !== null && facing < -0.55;
      return { assembled, facing, rear };
    }

    function pose({ time = 0, config = {}, section = '', phase = 0, reduced = false } = {}) {
      reducedMotion = Boolean(reduced);
      const state = config.state || config;
      const safeTime = Number.isFinite(time) ? time : 0;
      const concealment = rearConcealment(config, state, section);
      // Match the dial's actual root transform, including its automatic fine
      // disassembly translation and display flip, without modifying the dial.
      displayRoot.updateWorldMatrix(true, false);
      dial.root.updateWorldMatrix(true, false);
      inverseParentMatrix.copy(displayRoot.matrixWorld).invert();
      currentDialMatrix.multiplyMatrices(inverseParentMatrix, dial.root.matrixWorld);
      attachmentMatrix.multiplyMatrices(currentDialMatrix, inverseRestDialMatrix);
      attachmentMatrix.decompose(main.root.position, main.root.quaternion, main.root.scale);
      const alpha = Math.min(dialOpacity(),state.dial===undefined?1:clamp(state.dial));
      main.root.visible = dial.on !== false && dial.root.visible && alpha > 0.002;
      setOpacity(alpha);
      const deep = Math.max(Number(state.detail) || 0, (Number(state.allChild) || 0) * 0.85 * (Number(state.explode) || 0), (Number(state.child) || 0) * 0.85 * (Number(state.explode) || 0));
      const detail = section === 'Disassembly' ? smooth(0.30, 0.95, deep) : 0;
      report.angles = applyMotion(main, safeTime, detail, reducedMotion);
      for (const clone of clones) if (!clone.disposed && visibleInParents(clone.root)) applyMotion(clone, safeTime, 0, reducedMotion);
      main.root.updateMatrixWorld(true);
      report.active = !reducedMotion && ((main.root.visible && !concealment.rear) || [...clones].some(clone => visibleInParents(clone.root)));
      report.visible = main.root.visible;
      report.concealedRear = concealment.rear;
      report.assembled = concealment.assembled;
      report.cameraFacing = concealment.facing;
      report.opacity = alpha;
      report.detail = detail;
      report.section = section;
      report.phase = phase;
      report.time = safeTime;
      report.cloneCount = clones.size;
      report.rootPosition = main.root.position.toArray();
      report.rootQuaternion = main.root.quaternion.toArray();
      return report;
    }

    function createClone({ parent, phaseOffset = 0 } = {}) {
      if (!parent?.add) throw new TypeError('Concept tourbillon clone requires a parent watch group.');
      const clone = instance('Kimi concept tourbillon — composition', true);
      clone.phaseOffset = Number.isFinite(phaseOffset) ? phaseOffset : 0;
      parent.add(clone.root);clones.add(clone);
      applyMotion(clone, report.time || 0, 0, reducedMotion);
      report.cloneCount = clones.size;
      return {
        root: clone.root,
        pose: ({ time = report.time || 0, reduced = reducedMotion } = {}) => applyMotion(clone, time, 0, reduced),
        dispose() { if (clone.disposed) return;clone.disposed = true;clone.root.removeFromParent();clone.ownMaterials.forEach(material => material.dispose());clones.delete(clone);report.cloneCount = clones.size; }
      };
    }

    function isActive({ section = report.section, reduced = reducedMotion } = {}) {
      if (reduced || !report.ready) return false;
      if (section === 'Footer') return (main.root.visible && !report.concealedRear) || [...clones].some(clone => visibleInParents(clone.root));
      if (['Straps', 'Images'].includes(section)) return false;
      return main.root.visible && !report.concealedRear && ['Intro', 'Disassembly', 'Particles', 'Presentation', 'Colors', 'Parts'].includes(section);
    }

    function dispose() {
      main.root.removeFromParent();
      for (const clone of clones) { clone.root.removeFromParent();clone.ownMaterials.forEach(material => material.dispose()); }
      clones.clear();definitions.forEach(definition => definition.geometry.dispose());materials.forEach(material => material.dispose());
      report.ready = false;report.active = false;
    }

    rig = { T, main, report, pose, createClone, isActive, dispose };
    global.__CONCEPT_TOURBILLON = report;
    pose({ section: 'Intro', reduced: false });
    return { root: main.root, report, pose, createClone, isActive, dispose };
  }

  global.initConceptTourbillon = initConceptTourbillon;
  global.poseConceptTourbillon = options => rig?.pose(options) || null;
  global.isConceptTourbillonActive = options => Boolean(rig?.isActive(options));
  global.createConceptTourbillonClone = options => rig?.createClone(options) || null;
})(window);
