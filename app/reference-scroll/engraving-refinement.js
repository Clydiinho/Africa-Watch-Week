/* Source-specific finish recovery. Install after source finishes have loaded:
 *   const finish = window.applyEngravingRefinement({T, active, onChange});
 *   await finish.ready; // optional: waits only for the original incision mask
 *
 * R43_SednaCutGrain belongs to THREE plates in checkpoint_212_hero.blend:
 * 321.1002_bridge34, center_bridge_S17, 321.1006_balance_cock. The previous
 * finish-manifest only listed the last, so the first two kept GLB roughness=1.
 * The source graph is exactly .285 + .065*sin(worldX_mm*44.8798942565918).
 * Recover that graph at its original spatial scale, without adding fake relief.
 *
 * Only Y_clutch_bridge has the R46 floral engraving. Its existing normal map,
 * UVs and .042 mm source incision remain unchanged. A pixel-identical copy of
 * the original toolpath mask supplies mild recess occlusion; this is a web
 * cavity approximation, not a new source bake or a new engraved design.
 * Source: reports/r46/toolpaths_r46_linear.png in omega-321-b3d.
 * Mask WebP SHA256:359e9ea72cbd3705fbab457ebc1677d7cee6c49bbcde5fcbc46a285a8650db48
 */
(function engravingFinishModule(global) {
  'use strict';
  const VERSION = 'source-bridge-finish-1';
  const SOURCE_FREQUENCY = 44.8798942565918;
  const PLATES = new Set(['321.1002_bridge34', 'center_bridge_S17', '321.1006_balance_cock']);
  const installations = new WeakMap();

  function materialsOf(mesh) {
    return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
  }

  function calibrateSourceX(active) {
    // Reconstruct source millimetres from an already verified world-mapped
    // bake. This also handles the actual 26.7 mm GLB plate diameter; using the
    // nominal 27 mm page convention would subtly shift the fine grain phase.
    const reference = active.find(unit => unit.name === 'Y_clutch_bridge');
    const mesh = reference?.render?.find(mesh => materialsOf(mesh)
      .some(material => material.userData?.sourceFinish === 'r46-silver-engraving'));
    const position = mesh?.geometry?.getAttribute('position');
    const uv = mesh?.geometry?.getAttribute('uv');
    if (position && uv && position.count === uv.count) {
      let n = 0, sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
      const points = [];
      const step = Math.max(1, Math.floor(position.count / 128));
      for (let i = 0; i < position.count; i += step) {
        const x = position.getX(i) + reference.center.x;
        const sourceX = uv.getX(i) * 14 - 12;
        points.push([x, sourceX]); n++;
        sumX += x; sumY += sourceX; sumXX += x * x; sumXY += x * sourceX;
      }
      const denominator = n * sumXX - sumX * sumX;
      if (Math.abs(denominator) > 1e-9) {
        const scale = (n * sumXY - sumX * sumY) / denominator;
        const offset = (sumY - scale * sumX) / n;
        const error = Math.max(...points.map(([x, y]) => Math.abs(x * scale + offset - y)));
        if (scale > 0 && Number.isFinite(error) && error < .001)
          return { scale, offset, errorMM: error, method: 'R46 source UV regression', samples: n };
      }
    }
    return { scale: 26.700000762939453 / 4, offset: 0, errorMM: null,
      method: 'verified original GLB mainplate bounds fallback', samples: 0 };
  }

  function applyEngravingRefinement(options = {}) {
    const Three = options.T || options.THREE || (typeof T !== 'undefined' ? T : global.THREE);
    const members = options.active || options.units
      || (typeof active !== 'undefined' ? active : global.__UNITS);
    if (!Three || !Array.isArray(members) || !members.length)
      throw new Error('Engraving refinement requires {T, active} after the GLBs have loaded.');
    const key = members[0].root || members;
    if (installations.has(key)) return installations.get(key);
    const calibration = calibrateSourceX(members);
    const report = {
      version: VERSION, installed: true, geometryChanged: false, meshCountBefore: 0,
      meshCountAfter: 0, sourceCalibration: calibration, cutGrainRestored: [],
      engraving: [], compiledMaterials: 0, shaderErrors: [], warnings: [],
      maskLoaded: false, maskPixelIdenticalToSource: true,
      limitation: 'Original incision geometry/normal is unchanged; recess darkening approximates subpixel cavity occlusion.'
    };
    const publish = () => {
      if (global.document?.body) global.document.body.dataset.engraving = JSON.stringify(report);
    };
    const meshCount = () => members.reduce((count, unit) => count + (unit.render?.length || 0), 0);
    report.meshCountBefore = meshCount();
    const restore = [], seen = new Set();
    const cavityStrength = Math.max(0, Math.min(.3, options.cavityStrength ?? .18));
    let mask = null, resolveMask;
    const ready = new Promise(resolve => { resolveMask = resolve; });

    function preserve(material) {
      const saved = {
        roughness: material.roughness, hook: material.onBeforeCompile,
        cacheKey: material.customProgramCacheKey,
        referenceRoughness: material.userData.referenceBase?.roughness,
        derivatives: material.extensions?.derivatives,
        metadata: material.userData.engravingRefinement
      };
      material.userData.engravingRefinement = { version: VERSION };
      if (material.extensions) material.extensions.derivatives = true;
      let hook, cacheKey;
      restore.push(() => {
        material.roughness = saved.roughness;
        if (material.onBeforeCompile === hook) material.onBeforeCompile = saved.hook;
        if (material.customProgramCacheKey === cacheKey) material.customProgramCacheKey = saved.cacheKey;
        if (material.userData.referenceBase && saved.referenceRoughness !== undefined)
          material.userData.referenceBase.roughness = saved.referenceRoughness;
        if (material.extensions) {
          if (saved.derivatives === undefined) delete material.extensions.derivatives;
          else material.extensions.derivatives = saved.derivatives;
        }
        if (saved.metadata === undefined) delete material.userData.engravingRefinement;
        else material.userData.engravingRefinement = saved.metadata;
        material.needsUpdate = true;
      });
      return { saved, attach(label, callback) {
        let counted = false;
        const priorKey = saved.cacheKey?.call(material) || '';
        hook = function (shader, renderer) {
          saved.hook?.call(this, shader, renderer);
          if (!report.installed) return;
          try {
            callback(shader);
            if (!counted) { report.compiledMaterials++; counted = true; publish(); }
          } catch (error) {
            const message = `${material.name}: ${error.message}`;
            if (!report.shaderErrors.includes(message)) report.shaderErrors.push(message);
            publish();
          }
        };
        cacheKey = () => priorKey + '|' + VERSION + ':' + label;
        material.onBeforeCompile = hook; material.customProgramCacheKey = cacheKey;
        material.needsUpdate = true;
      } };
    }

    for (const unit of members) {
      if (unit.on === false || unit.isSample) continue;
      for (const mesh of unit.render || []) {
        for (const material of materialsOf(mesh)) {
          if (seen.has(material) || !material.isMeshStandardMaterial) continue;
          seen.add(material);
          if (PLATES.has(unit.name) && material.name === 'R43_SednaCutGrain') {
            const previous = preserve(material);
            const row = { part: unit.name, previouslyRestored: !!material.userData.sourceFinish,
              roughnessBefore: material.roughness, hadRoughnessMap: !!material.roughnessMap,
              roughnessMean: .285, roughnessMin: .22, roughnessMax: .35,
              sourcePhaseRadiansPerMM: SOURCE_FREQUENCY, fineNormalAdded: false };
            material.roughness = .285;
            if (material.userData.referenceBase) material.userData.referenceBase.roughness = .285;
            const uniforms = { kimiCutGrainTransform: { value: new Three.Vector2(
              calibration.scale, calibration.offset + unit.center.x * calibration.scale) } };
            previous.attach('cutgrain', shader => {
              if (!shader.vertexShader.includes('#include <begin_vertex>')
                || !shader.fragmentShader.includes('#include <roughnessmap_fragment>'))
                throw new Error('source cut-grain shader anchor missing');
              Object.assign(shader.uniforms, uniforms);
              shader.vertexShader = 'uniform vec2 kimiCutGrainTransform;\nvarying float vKimiSourceX;\n'
                + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
                  vKimiSourceX = position.x * kimiCutGrainTransform.x + kimiCutGrainTransform.y;
                `);
              shader.fragmentShader = 'varying float vKimiSourceX;\n' + shader.fragmentShader
                .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                  float kimiCutPhase = vKimiSourceX * ${SOURCE_FREQUENCY};
                  float kimiPixelPitch = fwidth(kimiCutPhase) / 6.28318530718;
                  float kimiResolved = 1.0 - smoothstep(0.22, 0.52, kimiPixelPitch);
                  roughnessFactor = 0.285 + 0.065 * sin(kimiCutPhase) * kimiResolved;
                `);
            });
            material.userData.engravingRefinement.kind = 'original R43 world-X cut grain';
            report.cutGrainRestored.push(row);
          }
          if (unit.name === 'Y_clutch_bridge' && material.name === 'R46_HandEngraved_Silver') {
            const uv = mesh.geometry.getAttribute('uv');
            if (!material.normalMap || !material.map || !uv) {
              report.warnings.push('Y_clutch_bridge is missing a restored normal/map/UV. Restore R46 source finish before installing this module.');
              continue;
            }
            const previous = preserve(material);
            if (!mask) {
              const loader = new Three.TextureLoader();
              mask = loader.load(options.maskURL || 'assets/finishes/r46-original-incision-mask.webp', () => {
                report.maskLoaded = true; publish(); options.onChange?.(); resolveMask(report);
              }, undefined, error => {
                report.warnings.push('Original incision mask could not load: ' + (error?.message || 'HTTP/image failure'));
                publish(); resolveMask(report); options.onChange?.();
              });
              mask.colorSpace = Three.NoColorSpace; mask.flipY = true;
              mask.minFilter = Three.LinearMipmapLinearFilter;
              mask.magFilter = Three.LinearFilter;
              mask.anisotropy = Math.min(options.renderer?.capabilities?.getMaxAnisotropy?.() || 8,
                Math.max(1, material.normalMap.anisotropy || 1));
              mask.needsUpdate = true;
            }
            const uniforms = { kimiOriginalToolpaths: { value: mask },
              kimiIncisionCavity: { value: cavityStrength } };
            previous.attach('original-incision', shader => {
              if (!shader.fragmentShader.includes('#include <map_fragment>')
                || !shader.fragmentShader.includes('#include <roughnessmap_fragment>'))
                throw new Error('original incision shader anchor missing');
              Object.assign(shader.uniforms, uniforms);
              shader.fragmentShader = 'uniform sampler2D kimiOriginalToolpaths;\nuniform float kimiIncisionCavity;\n'
                + shader.fragmentShader
                  .replace('#include <map_fragment>', `#include <map_fragment>
                    vec3 kimiOriginalIncision = texture2D(kimiOriginalToolpaths, vMapUv).rgb;
                    float kimiGrooveCavity = max(kimiOriginalIncision.g,
                      kimiOriginalIncision.r * (1.0 - kimiOriginalIncision.b));
                    diffuseColor.rgb *= 1.0 - kimiIncisionCavity * kimiGrooveCavity;
                  `)
                  .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                    // A small lower bound on the existing polished-lip lobe
                    // suppresses single-pixel sparkle without widening a cut.
                    roughnessFactor = max(roughnessFactor, 0.105);
                    roughnessFactor = mix(roughnessFactor, max(roughnessFactor, 0.36),
                      kimiOriginalIncision.g * (1.0 - kimiOriginalIncision.b));
                  `);
            });
            material.userData.engravingRefinement.kind = 'original R46 incision masks';
            report.engraving.push({ part: unit.name, normalMapUnchanged: true,
              normalScale: material.normalScale?.toArray(), uvVertices: uv.count,
              cavityStrength, originalDesign: true, addedFloralPattern: false });
          }
        }
      }
    }
    report.meshCountAfter = meshCount();
    if (!mask) resolveMask(report);
    const api = { report, ready, dispose() {
      report.installed = false; restore.reverse().forEach(fn => fn());
      mask?.dispose(); installations.delete(key); publish(); options.onChange?.();
    } };
    installations.set(key, api); global.__ENGRAVING_REFINEMENT = report;
    publish(); options.onChange?.(); return api;
  }
  global.applyEngravingRefinement = applyEngravingRefinement;
  global.installEngravingRefinement = async function (options) {
    const api = applyEngravingRefinement(options);
    await api.ready;
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);
