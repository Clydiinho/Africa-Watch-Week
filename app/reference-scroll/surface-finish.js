/* Fine surface response for the existing watch. No geometry, colour, logos,
 * texture assets, mesh ownership or lighting are changed by this module.
 *
 * Include before controller.js, then call after loadReferenceEnvironment():
 *   window.applySurfaceRefinement({ THREE: T, units: active });
 * Calling again is idempotent. The result exposes report and dispose(). Existing
 * onBeforeCompile hooks are chained, including the contact-shadow shader.
 * Existing engraving/perlage normal maps, sapphire and ruby are left intact.
 */
(function surfaceFinishModule(global) {
  'use strict';
  const VERSION = 'kimi-fine-surface-1';
  const installations = new WeakMap();

  // Coordinates in the runtime are 4 world units for a 27 mm movement.
  const MM_TO_WORLD = 4 / 27;
  const VERTEX_DECLARATIONS = `
    uniform mat3 kimiSurfaceFrame;
    varying vec3 vKimiSurfacePosition;
    varying vec3 vKimiSurfaceNormal;
  `;
  const FRAGMENT_DECLARATIONS = `
    uniform vec4 kimiSurfaceSettings;
    uniform vec2 kimiSurfaceCenter;
    varying vec3 vKimiSurfacePosition;
    varying vec3 vKimiSurfaceNormal;
    const float KIMI_TAU = 6.28318530718;
    // x: mode (1 brush, 2 circular satin, 3 crown/pusher), y: cycles/mm,
    // z: physical relief amplitude in world units, w: roughness modulation.
    float kimiSurfacePhase() {
      float coordinate = vKimiSurfacePosition.x;
      if (kimiSurfaceSettings.x > 1.5)
        coordinate = length(vKimiSurfacePosition.xz - kimiSurfaceCenter);
      return coordinate * kimiSurfaceSettings.y * KIMI_TAU;
    }
    float kimiSurfaceBandLimit(float phase) {
      // Fade machining marks before their pitch is less than two pixels.
      // Distant views keep the finish's mean roughness without shimmer.
      return 1.0 - smoothstep(0.23, 0.55, fwidth(phase) / KIMI_TAU);
    }
  `;
  const ROUGHNESS_FRAGMENT = `
    float kimiPhase = kimiSurfacePhase();
    float kimiBandLimit = kimiSurfaceBandLimit(kimiPhase);
    if (kimiSurfaceSettings.x > 2.5) {
      // Crown and pushers currently share one material across machined barrel,
      // cap and bevel. Recover these finish zones from their physical normals.
      float kimiAxial = abs(normalize(vKimiSurfaceNormal).y);
      float kimiCap = smoothstep(0.78, 0.98, kimiAxial);
      float kimiBevel = smoothstep(0.20, 0.43, kimiAxial)
        * (1.0 - smoothstep(0.68, 0.87, kimiAxial));
      roughnessFactor = mix(0.205, 0.13, kimiCap);
      roughnessFactor = mix(roughnessFactor, 0.085, kimiBevel);
    }
    roughnessFactor = clamp(roughnessFactor
      * (1.0 + sin(kimiPhase) * kimiSurfaceSettings.w * kimiBandLimit),
      0.055, 0.95);
  `;
  const NORMAL_FRAGMENT = `
    float kimiNormalPhase = kimiSurfacePhase();
    float kimiNormalBand = kimiSurfaceBandLimit(kimiNormalPhase);
    float kimiHeightSlope = kimiSurfaceSettings.z
      * cos(kimiNormalPhase) * kimiNormalBand;
    // Turned relief belongs to the cap, not the long side of a pusher.
    if (kimiSurfaceSettings.x > 2.5)
      kimiHeightSlope *= smoothstep(0.76, 0.98,
        abs(normalize(vKimiSurfaceNormal).y));
    vec3 kimiSigmaX = dFdx(-vViewPosition);
    vec3 kimiSigmaY = dFdy(-vViewPosition);
    vec3 kimiR1 = cross(kimiSigmaY, normal);
    vec3 kimiR2 = cross(normal, kimiSigmaX);
    float kimiDet = dot(kimiSigmaX, kimiR1);
    if (abs(kimiDet) > 1e-12) {
      // Analytic height gradient avoids taking derivatives of the band-limit
      // derivative itself. Position/normal stay in the existing camera frame.
      vec3 kimiGradient = kimiHeightSlope * (
        dFdx(kimiNormalPhase) * kimiR1 + dFdy(kimiNormalPhase) * kimiR2);
      normal = normalize(abs(kimiDet) * normal - sign(kimiDet) * kimiGradient);
    }
  `;

  function recipe(material, unit) {
    const name = material.name || '';
    if (name === 'sapphire' || name === 'M_Ruby'
      || material.userData?.sourceFinish || material.normalMap) return null;
    const exterior = !!unit.origin;
    if (exterior && name === 'steel_polished') {
      if (/^ext_(crown|pusher_)/.test(unit.name))
        return { label: 'turned hardware', roughness: .145, mode: 3,
          frequency: 25, reliefMM: .00009, modulation: .035 };
      return { label: 'polished steel', roughness:
        unit.knollRole === 'pin' ? .16 : unit.knollRole === 'clasp' ? .13 : .105 };
    }
    if (exterior && name === 'steel_brushed')
      return { label: 'longitudinal brushed steel',
        roughness: material.roughnessMap ? 1 : .315,
        mode: 1, frequency: 29, reliefMM: .00009, modulation: .045 };
    if (/^recessed_subdial_(60|30|12)$/.test(name)) {
      const center = name.endsWith('_60') ? [-7.65, 0]
        : name.endsWith('_30') ? [7.65, 0] : [0, 7.55];
      return { label: 'engine-turned subdial', roughness: .455,
        mode: 2, frequency: 31.5, reliefMM: .00014, modulation: .045, center };
    }
    // Restored R43/R46 baked finishes are excluded above. These steel networks
    // only had their scalar mean restored during the original Blender export.
    if (name === 'M_SteelBrush' || /^M_Lever_/.test(name))
      return { label: 'satin movement steel', roughness: .255,
        mode: 1, frequency: 32, reliefMM: .000075, modulation: .035 };
    if (name === 'M_SteelPolished')
      return { label: 'polished movement steel', roughness: .095 };
    if (name === 'M_SteelChamfer' || name === 'M_SednaChamfer')
      return { label: 'polished bevel', roughness: .065 };
    if (name === 'R38_MirrorAnglage')
      return { label: 'mirror anglage', roughness: .072 };
    if (name === 'R38_DressedWall')
      return { label: 'dressed bridge wall', roughness: .28 };
    if (/^R41_PolishedSteel_(head|edge|slot)$/.test(name))
      return { label: 'polished screw', roughness:
        name.endsWith('_edge') ? .105 : name.endsWith('_slot') ? .285 : .17 };
    if (/^R43_BlueGray_(head|edge|lift)$/.test(name))
      return { label: 'blued screw', roughness:
        name.endsWith('_edge') ? .125 : name.endsWith('_lift') ? .28 : .21 };
    if (['M_Brass', 'M_Brass3135', 'R39_BrassResponse'].includes(name)
      && /wheel|barrel|recorder/.test(unit.name))
      return { label: 'circular satin brass', roughness:
        name === 'R39_BrassResponse' ? .31 : .275,
        mode: 2, frequency: 23, reliefMM: .00006, modulation: .025 };
    return null;
  }

  function applySurfaceRefinement(options = {}) {
    const Three = options.THREE || options.T
      || (typeof T !== 'undefined' ? T : global.THREE);
    const sourceUnits = options.units
      || (typeof units !== 'undefined' ? units : global.__UNITS);
    if (!Three || !Array.isArray(sourceUnits) || !sourceUnits.length)
      throw new Error('Surface refinement requires THREE and loaded watch units.');
    const key = sourceUnits[0].root || sourceUnits;
    if (installations.has(key)) return installations.get(key);
    const report = {
      version: VERSION, installed: true, geometryChanged: false, meshCountBefore: 0,
      meshCountAfter: 0, materials: 0, proceduralMaterials: 0, compiledMaterials: 0,
      preservedBakedMaterials: 0, categories: {}, changed: [], shaderErrors: [],
      reliefAmplitudeMM: [.00006, .00014], texturesCreated: 0,
      limitations: [
        'Analytic machining is a restrained surface study, not a new Blender bake.',
        'Case/bracelet geometry, crown flute sampling and source UVs are unchanged.'
      ]
    };
    const seen = new Set(), restores = [];
    const allMeshes = () => sourceUnits.reduce((sum, u) => sum + (u.render?.length || 0), 0);
    report.meshCountBefore = allMeshes();
    for (const unit of sourceUnits) {
      if (unit.on === false || unit.isSample) continue;
      for (const mesh of unit.render || []) {
        for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) {
          if (!material || seen.has(material) || !material.isMeshStandardMaterial) continue;
          seen.add(material);
          if (material.userData?.sourceFinish || material.normalMap) report.preservedBakedMaterials++;
          const spec = recipe(material, unit);
          if (!spec) continue;
          const saved = {
            roughness: material.roughness, onBeforeCompile: material.onBeforeCompile,
            customProgramCacheKey: material.customProgramCacheKey,
            extensionDerivatives: material.extensions?.derivatives,
            referenceRoughness: material.userData?.referenceBase?.roughness,
            surfaceRefinement: material.userData?.surfaceRefinement
          };
          material.roughness = spec.roughness;
          if (material.userData.referenceBase)
            material.userData.referenceBase.roughness = material.roughness;
          material.userData.surfaceRefinement = { version: VERSION, kind: spec.label,
            reliefMM: spec.reliefMM || 0, cyclesPerMM: spec.frequency || 0 };
          report.categories[spec.label] = (report.categories[spec.label] || 0) + 1;
          report.changed.push({ part: unit.name, material: material.name, finish: spec.label,
            roughnessBefore: saved.roughness, roughnessAfter: spec.roughness });
          report.materials++;
          let installedHook = null, installedKey = null;
          if (spec.mode) {
            const sourceRotation = new Three.Matrix4();
            if (Array.isArray(unit.sourceMatrix) && unit.sourceMatrix.length === 16)
              sourceRotation.extractRotation(new Three.Matrix4().fromArray(unit.sourceMatrix)).invert();
            const uniforms = {
              kimiSurfaceFrame: { value: new Three.Matrix3().setFromMatrix4(sourceRotation) },
              kimiSurfaceSettings: { value: new Three.Vector4(spec.mode, spec.frequency,
                spec.reliefMM * MM_TO_WORLD, spec.modulation) },
              kimiSurfaceCenter: { value: new Three.Vector2(...(spec.center || [0, 0])) }
            };
            const priorKey = saved.customProgramCacheKey?.call(material) || '';
            let compiled = false;
            material.onBeforeCompile = function (shader, currentRenderer) {
              saved.onBeforeCompile?.call(this, shader, currentRenderer);
              if (!report.installed) return;
              const required = [
                shader.vertexShader.includes('#include <begin_vertex>'),
                shader.fragmentShader.includes('#include <roughnessmap_fragment>'),
                shader.fragmentShader.includes('#include <normal_fragment_maps>')
              ];
              if (required.some(ok => !ok)) {
                const message = `${unit.name}/${material.name}: surface shader hook missing`;
                if (!report.shaderErrors.includes(message)) report.shaderErrors.push(message);
                return;
              }
              Object.assign(shader.uniforms, uniforms);
              shader.vertexShader = VERTEX_DECLARATIONS + shader.vertexShader.replace(
                '#include <begin_vertex>', `#include <begin_vertex>
                  vKimiSurfacePosition = (kimiSurfaceFrame * position) * ${(1 / MM_TO_WORLD).toFixed(8)};
                  vKimiSurfaceNormal = kimiSurfaceFrame * normal;
                `);
              shader.fragmentShader = FRAGMENT_DECLARATIONS + shader.fragmentShader
                .replace('#include <roughnessmap_fragment>',
                  '#include <roughnessmap_fragment>\n' + ROUGHNESS_FRAGMENT)
                .replace('#include <normal_fragment_maps>',
                  '#include <normal_fragment_maps>\n' + NORMAL_FRAGMENT);
              if (!compiled) { compiled = true; report.compiledMaterials++; }
            };
            material.customProgramCacheKey = () => priorKey + '|' + VERSION;
            installedHook = material.onBeforeCompile;
            installedKey = material.customProgramCacheKey;
            if (material.extensions) material.extensions.derivatives = true;
            report.proceduralMaterials++;
          }
          material.needsUpdate = true;
          restores.push(() => {
            material.roughness = saved.roughness;
            // A later contact-shadow wrapper may call our closure. Leave that
            // outer wrapper alive; our now-disabled closure calls only prior.
            if (installedHook && material.onBeforeCompile === installedHook)
              material.onBeforeCompile = saved.onBeforeCompile;
            if (installedKey && material.customProgramCacheKey === installedKey)
              material.customProgramCacheKey = saved.customProgramCacheKey;
            if (material.extensions) {
              if (saved.extensionDerivatives === undefined) delete material.extensions.derivatives;
              else material.extensions.derivatives = saved.extensionDerivatives;
            }
            if (material.userData.referenceBase && saved.referenceRoughness !== undefined)
              material.userData.referenceBase.roughness = saved.referenceRoughness;
            if (saved.surfaceRefinement === undefined) delete material.userData.surfaceRefinement;
            else material.userData.surfaceRefinement = saved.surfaceRefinement;
            material.needsUpdate = true;
          });
        }
      }
    }
    report.meshCountAfter = allMeshes();
    const api = { report, dispose() {
      report.installed = false;
      restores.reverse().forEach(restore => restore());
      installations.delete(key);
    } };
    installations.set(key, api);
    global.__SURFACE_REFINEMENT = report;
    return api;
  }
  global.applySurfaceRefinement = applySurfaceRefinement;
})(typeof window !== 'undefined' ? window : globalThis);
