/* Runtime-only optimizations for the reference presentation. Geometry, vertex
 * attributes, per-part identities, finish maps and source GLBs remain unchanged.
 *
 * Three r160 renders the entire opaque scene again as soon as ONE visible ruby
 * has transmission > 0. M_Ruby is double-sided, adding a further back-face pass.
 * Reference ruby shading is environment-driven (the-watch.pretty.js:1789–1794).
 * Here the small bearing rubies sample refracted studio radiance in one pass,
 * retaining their original tint, roughness, IOR, Fresnel and transmission weight.
 * This approximates the environment behind ruby; nearby geometry is not sampled.
 * Sapphire retains the controller's existing rim-alpha material unchanged.
 *
 * Call optimizeReferenceScene() after model/rig/material setup, before first audit.
 * When loaded separately from the combined runtime, optional { scene, units,
 * renderer } arguments are accepted. The return value supports inspection/restore.
 */
(function referenceOptimizationModule(global) {
  'use strict';

  const installations = new WeakMap();
  const MARKER = '#include <transmission_fragment>';
  const RUBY_FRAGMENT = `
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      vec3 omegaRefractedDirection = refract( -geometryViewDir, normal,
        1.0 / max( 1.0, omegaReferenceIor ) );
      omegaRefractedDirection = inverseTransformDirection( omegaRefractedDirection, viewMatrix );
      vec3 omegaTransmittedRadiance = textureCubeUV( envMap,
        omegaRefractedDirection, material.roughness ).rgb * envMapIntensity;
      vec3 omegaTransmissionFresnel = EnvironmentBRDF( normal, geometryViewDir,
        material.specularColor, material.specularF90, material.roughness );
      totalDiffuse = mix( totalDiffuse,
        ( vec3( 1.0 ) - omegaTransmissionFresnel ) * diffuseColor.rgb * omegaTransmittedRadiance,
        omegaReferenceTransmission );
    #endif
  `;

  function optimizeReferenceScene(options = {}) {
    const allUnits = options.units || (typeof units !== 'undefined' ? units : global.__UNITS) || [];
    let targetScene = options.scene || (typeof scene !== 'undefined' ? scene : null);
    const targetRenderer = options.renderer || (typeof renderer !== 'undefined' ? renderer : global.__RENDERER);
    if (!targetScene && allUnits.length) {
      targetScene = allUnits[0].root;
      while (targetScene?.parent) targetScene = targetScene.parent;
    }
    if (!targetScene?.traverse) return null;
    if (installations.has(targetScene)) return installations.get(targetScene).api;

    const changes = [];
    const report = {
      installed: true, geometryChanged: false, rubyMaterials: 0, rubyMeshes: 0,
      singlePassMaterials: 0, frozenLocalMatrices: 0, hiddenNonProductUnits: 0,
      hiddenLegacyShadows: 0,
      transmissionBefore: [], transmissionAfter: [], shadersPatched: 0,
      shaderErrors: [], sceneMeshCount: 0, sourceTriangles: 0,
      enabledProductTriangles: 0, enabledProductMeshes: 0,
      limitation: 'Ruby uses refracted studio radiance; local screen-space refraction is approximated.'
    };
    const seen = new Set();
    const meshes = [];
    const visible = object => {
      for (let current = object; current; current = current.parent) if (!current.visible) return false;
      return true;
    };
    const materialsOf = mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
    const trianglesOf = geometry => {
      const available = geometry.index?.count ?? geometry.attributes?.position?.count ?? 0;
      const start = Math.max(0, geometry.drawRange?.start || 0);
      const count = Math.min(Math.max(0, available - start), geometry.drawRange?.count ?? Infinity);
      return Math.floor(count / 3);
    };

    targetScene.traverse(object => {
      if (!object.isMesh || !object.geometry) return;
      meshes.push(object);
      report.sceneMeshCount++;
      report.sourceTriangles += trianglesOf(object.geometry);
      if (visible(object) && object.userData?.unit?.on === true) {
        report.enabledProductTriangles += trianglesOf(object.geometry);
        report.enabledProductMeshes++;
      }
      for (const material of materialsOf(object)) {
        if (material.name === 'M_Ruby' && material.transmission > 0) report.rubyMeshes++;
        if (seen.has(material)) continue;
        seen.add(material);
        if (material.transmission > 0) report.transmissionBefore.push({
          name: material.name, weight: material.transmission, side: material.side
        });

        // Whitelist the actual bearing material, never arbitrary glass/dielectrics.
        if (material.name === 'M_Ruby' && material.isMeshPhysicalMaterial && material.transmission > 0) {
          const saved = {
            transmission: material.transmission, onBeforeCompile: material.onBeforeCompile,
            customProgramCacheKey: material.customProgramCacheKey
          };
          const uniforms = {
            omegaReferenceTransmission: { value: material.transmission },
            omegaReferenceIor: { value: material.ior || 1.5 }
          };
          material.transmission = 0;
          material.onBeforeCompile = function (shader, currentRenderer) {
            saved.onBeforeCompile?.call(this, shader, currentRenderer);
            if (!shader.fragmentShader.includes(MARKER)) {
              const message = 'Reference ruby optimization: transmission shader hook missing.';
              if (!report.shaderErrors.includes(message)) report.shaderErrors.push(message);
              // Keep a valid PBR shader; report the unsupported hook visibly to QA.
              return;
            }
            Object.assign(shader.uniforms, uniforms);
            shader.fragmentShader = 'uniform float omegaReferenceTransmission;\nuniform float omegaReferenceIor;\n'
              + shader.fragmentShader.replace(MARKER, MARKER + RUBY_FRAGMENT);
            report.shadersPatched++;
          };
          // Cache only structural code; each material's color and IOR stay uniforms.
          const priorKey = saved.customProgramCacheKey?.call(material) || '';
          material.customProgramCacheKey = () => priorKey + '|omega-reference-ruby-environment-v1';
          material.userData.referenceTransmissionApproximation = 'refracted-environment';
          material.needsUpdate = true;
          report.rubyMaterials++;
          changes.push(() => {
            material.transmission = saved.transmission;
            material.onBeforeCompile = saved.onBeforeCompile;
            material.customProgramCacheKey = saved.customProgramCacheKey;
            delete material.userData.referenceTransmissionApproximation;
            material.needsUpdate = true;
          });
        }

        // A solid part temporarily faded for choreography does not need r160's
        // back-then-front transparency redraw. DoubleSide remains enabled so thin
        // springs / engraved surfaces retain their original visible faces.
        const base = material.userData?.referenceBase;
        const originallyOpaque = !(base?.transparent ?? material.transparent)
          && (base?.opacity ?? material.opacity) >= .999;
        if (material.side === 2 && originallyOpaque && !material.alphaMap
          && !(material.transmission > 0) && material.name !== 'sapphire'
          && material.forceSinglePass !== true) {
          const oldValue = material.forceSinglePass;
          material.forceSinglePass = true;
          report.singlePassMaterials++;
          changes.push(() => { material.forceSinglePass = oldValue; });
        }
      }
    });

    for (const unit of allUnits) {
      // The reference rig explicitly hides these old flat shadow cards for ON
      // parts, but its off-unit early return leaves 43 sample shadows visible.
      // They are display helpers, not GLB parts, and add 43 calls / 86 triangles.
      if (unit.shadow?.visible) {
        unit.shadow.visible = false;
        report.hiddenLegacyShadows++;
        changes.push(() => { unit.shadow.visible = true; });
      }
      // These flags already define the loader's off-list; no product part is culled.
      if (unit.on === false && (unit.isSample || unit.g === 'Studio Props') && unit.root?.visible) {
        unit.root.visible = false;
        report.hiddenNonProductUnits++;
        changes.push(() => { unit.root.visible = true; });
      }
      for (const mesh of unit.render || []) {
        // Imported geometry is baked into unit-local space. Animation belongs to
        // the unit root, which remains dynamic; do not freeze arbitrary scene meshes.
        if (mesh.parent !== unit.root || !mesh.isMesh || mesh.isSkinnedMesh
          || mesh.morphTargetInfluences?.length || mesh.matrixAutoUpdate === false) continue;
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        report.frozenLocalMatrices++;
        changes.push(() => { mesh.matrixAutoUpdate = true; });
      }
    }

    for (const material of seen) if (material.transmission > 0) report.transmissionAfter.push({
      name: material.name, weight: material.transmission, side: material.side
    });

    const api = {
      report,
      snapshot() {
        const draw = targetRenderer?.info?.render;
        return { ...report,
          transmissionBefore: [...report.transmissionBefore], transmissionAfter: [...report.transmissionAfter],
          rendered: draw ? { calls: draw.calls, triangles: draw.triangles, points: draw.points } : null,
          visibleTriangles: meshes.reduce((sum, mesh) => sum + (visible(mesh) ? trianglesOf(mesh.geometry) : 0), 0)
        };
      },
      restore() {
        for (let i = changes.length - 1; i >= 0; i--) changes[i]();
        report.installed = false;
        installations.delete(targetScene);
        if (global.__REFERENCE_OPTIMIZATION === api) delete global.__REFERENCE_OPTIMIZATION;
      }
    };
    installations.set(targetScene, { api });
    global.__REFERENCE_OPTIMIZATION = api;
    return api;
  }

  global.optimizeReferenceScene = optimizeReferenceScene;
})(window);
