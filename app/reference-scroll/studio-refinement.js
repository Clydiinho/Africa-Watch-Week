/* Optional reflection-environment study for the existing Kimi watch.
 * Loading this file only exports the factory; no scene state is changed.
 *
 * const candidate = await window.installKimiStudioRefinement({
 *   T, scene, renderer, photoLight, baselineEnvironment: scene.environment,
 *   style: 'atelier' // or 'edge'
 * });
 * scene.environment = candidate.env; // The caller explicitly opts into A/B.
 * candidate.dispose(); // Restores the previous environment if still installed.
 *
 * The source EXR-derived environment is sampled in its actual texture mapping.
 * White luminous cards and black flags exist only in a separate capture scene.
 * PMREM convolves that complete, fixed studio for every watch material/angle.
 * No product geometry, mesh shader, colour, direct light or camera is modified.
 */
(function kimiStudioModule(global) {
  'use strict';

  const VERSION = 'kimi-studio-reflection-1';
  const ownedTextures = new WeakMap();
  const STYLES = Object.freeze({
    atelier: Object.freeze({
      name: 'Atelier · broad satin, narrow edge',
      baselineGain: .68, surroundRadiance: .014, sigma: .008,
      softbox: Object.freeze({ width: 7.4, height: 10.8, radiance: 2.05 }),
      strip: Object.freeze({ width: 1.45, height: 11.0, radiance: 2.85 }),
      crossFill: .36, flagRadiance: .012,
      lighting: Object.freeze({ exposure: .94, keyIntensity: 1.0, fillIntensity: .28 })
    }),
    edge: Object.freeze({
      name: 'Edge · darker surround, tighter strip',
      baselineGain: .52, surroundRadiance: .010, sigma: .006,
      softbox: Object.freeze({ width: 6.5, height: 10.0, radiance: 1.90 }),
      strip: Object.freeze({ width: 1.10, height: 11.0, radiance: 3.05 }),
      crossFill: .28, flagRadiance: .008,
      lighting: Object.freeze({ exposure: .94, keyIntensity: .92, fillIntensity: .26 })
    })
  });

  function originalEnvironment(texture) {
    const visited = new Set();
    while (texture && ownedTextures.has(texture) && !visited.has(texture)) {
      visited.add(texture);
      texture = ownedTextures.get(texture).baseline;
    }
    return texture;
  }

  function liveRestoreEnvironment(texture) {
    const visited = new Set();
    while (texture && ownedTextures.get(texture)?.disposed && !visited.has(texture)) {
      visited.add(texture);
      texture = ownedTextures.get(texture).previous;
    }
    return texture || null;
  }

  function domeMaterial(T, texture, style) {
    const defines = {}, uniforms = {
      kimiBaseline: { value: texture },
      kimiBaselineGain: { value: style.baselineGain },
      kimiSurround: { value: style.surroundRadiance }
    };
    let declarations, sample, mapping;
    if (texture.mapping === T.CubeUVReflectionMapping) {
      const width = texture.image?.width, height = texture.image?.height;
      const maxMip = Math.log2(height) - 2;
      if (!(width > 0 && height > 0 && Number.isInteger(maxMip) && maxMip >= 4))
        throw new Error('Kimi studio needs a valid CubeUV PMREM texture size.');
      defines.ENVMAP_TYPE_CUBE_UV = '';
      defines.CUBEUV_TEXEL_WIDTH = 1 / width;
      defines.CUBEUV_TEXEL_HEIGHT = 1 / height;
      defines.CUBEUV_MAX_MIP = maxMip.toFixed(1);
      declarations = 'uniform sampler2D kimiBaseline;\n#include <cube_uv_reflection_fragment>';
      // Roughness zero reads the original sharpest available PMREM tile.
      // Reusing the baseline does not recover detail that was already filtered.
      sample = 'textureCubeUV(kimiBaseline, direction, 0.0).rgb';
      mapping = 'cube-uv';
    } else if (texture.isCubeTexture) {
      uniforms.kimiCubeFlip = { value: texture.isRenderTargetTexture ? 1 : -1 };
      declarations = 'uniform samplerCube kimiBaseline; uniform float kimiCubeFlip;';
      sample = 'textureCube(kimiBaseline, vec3(kimiCubeFlip * direction.x, direction.yz)).rgb';
      mapping = 'cube';
    } else if (texture.mapping === T.EquirectangularReflectionMapping
      || texture.mapping === T.EquirectangularRefractionMapping) {
      declarations = `uniform sampler2D kimiBaseline;
        vec2 kimiEquirectUV(vec3 d) {
          return vec2(atan(d.z, d.x) * 0.15915494309189535 + 0.5,
            asin(clamp(d.y, -1.0, 1.0)) * 0.3183098861837907 + 0.5);
        }`;
      sample = 'texture2D(kimiBaseline, kimiEquirectUV(direction)).rgb';
      mapping = 'equirectangular';
    } else {
      throw new Error('Kimi studio baseline must be CubeUV, cube or equirectangular.');
    }
    const material = new T.ShaderMaterial({
      name: VERSION + ' EXR surround', side: T.BackSide, depthWrite: false,
      toneMapped: false, defines, uniforms,
      vertexShader: `varying vec3 vKimiStudioDirection;
        void main() {
          vKimiStudioDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec3 vKimiStudioDirection;
        uniform float kimiBaselineGain;
        uniform float kimiSurround;
        ${declarations}
        void main() {
          vec3 direction = normalize(vKimiStudioDirection);
          vec3 source = ${sample};
          // All quantities are linear radiance. No display tone curve is baked.
          gl_FragColor = vec4(max(source, vec3(0.0)) * kimiBaselineGain
            + vec3(kimiSurround), 1.0);
        }`
    });
    return { material, mapping };
  }

  async function installKimiStudioRefinement(options = {}) {
    const { T, scene, renderer, photoLight } = options;
    const styleKey = options.style || 'atelier';
    const style = STYLES[styleKey];
    if (!T || !scene?.isScene || !renderer?.isWebGLRenderer)
      throw new Error('Kimi studio requires THREE, the live scene and WebGLRenderer.');
    if (!style) throw new Error('Unknown Kimi studio style: ' + styleKey);
    const previous = scene.environment;
    // Selecting a second candidate never compounds the first candidate's gain.
    const baseline = originalEnvironment(options.baselineEnvironment || previous);
    if (!baseline?.isTexture)
      throw new Error('Load the existing EXR environment before creating the studio candidate.');
    const dome = domeMaterial(T, baseline, style);
    const studio = new T.Scene();
    studio.name = VERSION + ' / ' + styleKey;
    studio.background = new T.Color().setRGB(0, 0, 0);
    const sphereGeometry = new T.SphereGeometry(60, 40, 24);
    const panelGeometry = new T.PlaneGeometry(1, 1);
    const materials = [dome.material], panelReport = [];
    const shell = new T.Mesh(sphereGeometry, dome.material);
    shell.name = 'EXR baseline surround'; shell.renderOrder = -1;
    studio.add(shell);

    function panel(name, kind, position, width, height, radiance) {
      // Neutral linear RGB cards preserve the product's existing material palette.
      const material = new T.MeshBasicMaterial({
        name, color: new T.Color().setRGB(radiance, radiance, radiance),
        side: T.DoubleSide, toneMapped: false
      });
      materials.push(material);
      const mesh = new T.Mesh(panelGeometry, material);
      mesh.name = name; mesh.position.fromArray(position);
      mesh.scale.set(width, height, 1); mesh.lookAt(0, 0, 0);
      // Y is the watch's front/back axis. A Z-aligned long edge creates one
      // continuous stripe across a curved metal surface, rather than dots.
      mesh.up.set(0, 0, 1); mesh.lookAt(0, 0, 0);
      studio.add(mesh);
      panelReport.push({ name, kind, position: [...position], width, height,
        linearRadianceRGB: [radiance, radiance, radiance],
        distanceFromOrigin: Math.hypot(...position) });
    }

    // Mirror the reflection apparatus about Y=0. Both faces see a real studio
    // simultaneously; no per-camera, per-mesh or rear-only reflection swap.
    for (const sign of [1, -1]) {
      const side = sign > 0 ? 'front' : 'rear';
      panel(side + ' broad softbox', 'softbox', [-9, 8 * sign, 4],
        style.softbox.width, style.softbox.height, style.softbox.radiance);
      panel(side + ' narrow strip', 'strip', [9, 4.5 * sign, -6],
        style.strip.width, style.strip.height, style.strip.radiance);
      panel(side + ' dark flag', 'flag', [4.8, 6.5 * sign, 8],
        4.2, 11.2, style.flagRadiance);
    }
    // Dim cross cards hold middle values on steep case walls and fasteners.
    panel('lateral satin fill', 'bounce', [-7, 0, -11], 8, 5, style.crossFill);
    panel('opposite dark surround', 'flag', [10, 0, 7], 4, 12, style.flagRadiance);

    const saved = {
      target: renderer.getRenderTarget(), cubeFace: renderer.getActiveCubeFace(),
      mipLevel: renderer.getActiveMipmapLevel(), toneMapping: renderer.toneMapping,
      autoClear: renderer.autoClear, clearAlpha: renderer.getClearAlpha(),
      clearColor: renderer.getClearColor(new T.Color()),
      viewport: renderer.getViewport(new T.Vector4()),
      scissor: renderer.getScissor(new T.Vector4()),
      scissorTest: renderer.getScissorTest(), xrEnabled: renderer.xr?.enabled
    };
    let pmrem = null, target = null;
    try {
      if (renderer.xr) renderer.xr.enabled = false;
      pmrem = new T.PMREMGenerator(renderer);
      target = pmrem.fromScene(studio, style.sigma, .1, 100);
      target.texture.name = VERSION + ':' + styleKey;
    } finally {
      // PMREM restores this state on success. Also restore on an exception so
      // generating a candidate cannot leave the live page rendering into it.
      pmrem?.dispose();
      materials.forEach(material => material.dispose());
      sphereGeometry.dispose(); panelGeometry.dispose(); studio.clear();
      renderer.setRenderTarget(saved.target, saved.cubeFace, saved.mipLevel);
      renderer.toneMapping = saved.toneMapping; renderer.autoClear = saved.autoClear;
      renderer.setClearColor(saved.clearColor, saved.clearAlpha);
      renderer.setViewport(saved.viewport); renderer.setScissor(saved.scissor);
      renderer.setScissorTest(saved.scissorTest);
      if (renderer.xr) renderer.xr.enabled = saved.xrEnabled;
    }

    const report = {
      version: VERSION, style: styleKey, name: style.name,
      generated: true, disposed: false,
      geometryChanged: false, surfaceMaterialsChanged: false,
      directLightsChanged: false, exposureChanged: false,
      baseline: { name: baseline.name || 'existing EXR-derived environment',
        mapping: dome.mapping, gain: style.baselineGain, ownedByCaller: true },
      studio: { units: 'arbitrary studio units; capture point at [0,0,0]',
        palette: 'neutral linear RGB', frontAxis: '+Y', rearAxis: '-Y',
        surroundRadiance: style.surroundRadiance, sigmaRadians: style.sigma,
        cubeFaceResolution: 256, panels: panelReport },
      liveLightingAtCreation: { exposure: renderer.toneMappingExposure,
        keyIntensity: photoLight?.key?.intensity ?? null,
        fillIntensity: photoLight?.fill?.intensity ?? null },
      optionalLightingRecommendation: { ...style.lighting,
        application: 'Apply once to the whole scene only if the A/B merits it. '
          + 'First compare environment alone; keep the contact-shadow light update.' },
      limitations: [
        'Pending visual A/B at fixed front, rear and exploded camera poses.',
        'The EXR baseline has already been filtered; its lost detail is not reconstructed.',
        'The static environment is consistent across faces; existing direct-light choreography is unchanged.',
        'No image quality or frame-rate claim is inferred from successful PMREM compilation.'
      ]
    };
    const ownership = { baseline, previous, disposed: false };
    ownedTextures.set(target.texture, ownership);
    const env = target.texture;
    Object.defineProperty(report, 'applied', { enumerable: true,
      get: () => !ownership.disposed && scene.environment === env });
    return { env, report,
      dispose() {
        if (ownership.disposed) return;
        // Never dispose the caller's old target/EXR or a newer replacement.
        // If this candidate is active, detach it before releasing its GPU target.
        if (scene.environment === env) scene.environment = liveRestoreEnvironment(previous);
        target.dispose(); ownership.disposed = true; report.disposed = true;
      }
    };
  }

  global.installKimiStudioRefinement = installKimiStudioRefinement;
  global.KIMI_STUDIO_REFINEMENT_STYLES = STYLES;
})(typeof window !== 'undefined' ? window : globalThis);
