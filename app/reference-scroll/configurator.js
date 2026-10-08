/* AWW2K26 material selections for the existing placeholder Cal.2K26 geometry.
 * The runtime injects its own Three.js instance and units after asset loading.
 * No GLB, geometry, source texture or assembly coordinate is rewritten here. */
(function installKimiConfigurator(global) {
  'use strict';

  const VERSION = 'aww2k26-configurator-1';
  const DEFAULT_STATE = Object.freeze({ dial: 'ink', hardware: 'silver', bracelet: 'silver' });
  const FINISHES = Object.freeze({
    dial: {
      ink: { label: 'Ink black', base: '#15191c', ink: null, roughness: 0.56, metalness: 0.08 },
      blue: { label: 'Midnight blue', base: '#1b354d', ink: null, roughness: 0.46, metalness: 0.16 },
      silver: { label: 'Silver grey', base: '#91989e', ink: '#242a30', roughness: 0.43, metalness: 0.28 }
    },
    hardware: {
      silver: { label: 'Silver', color: '#c5c9cd', brushed: 0.29, polished: 0.135 },
      graphite: { label: 'Graphite', color: '#545d65', brushed: 0.32, polished: 0.17 },
      champagne: { label: 'Champagne', color: '#c4ad86', brushed: 0.28, polished: 0.15 }
    },
    bracelet: {
      silver: { label: 'Silver steel', color: '#c5c9cd', brushed: 0.31, polished: 0.15 },
      graphite: { label: 'Dark steel', color: '#626970', brushed: 0.34, polished: 0.18 }
    }
  });
  let current = null;
  let pending = { ...DEFAULT_STATE };
  const dialSources = new WeakMap();

  function normalizeState(patch, previous) {
    const next = { ...previous };
    for (const key of Object.keys(DEFAULT_STATE)) {
      if (patch && Object.prototype.hasOwnProperty.call(FINISHES[key], patch[key])) next[key] = patch[key];
    }
    return next;
  }

  function surfaceOf(unit, material) {
    if (!unit.origin) return null;
    if (/^(dial_matte_black|dial_print_2048|recessed_subdial_)/.test(material.name)) return 'dial';
    if (!/^steel_(brushed|polished)/.test(material.name)) return null;
    const role = unit.knollRole || unit.family;
    return ['link', 'pin', 'clasp'].includes(role) ? 'bracelet' : 'hardware';
  }

  function bindDialShader(T, record) {
    const material = record.material;
    const uniforms = record.uniforms = {
      kimiDialBase: { value: new T.Color() },
      kimiDialInk: { value: new T.Color() },
      kimiDarkInk: { value: 0 },
      kimiSourceFloor: { value: material.name.startsWith('recessed_subdial_') ? 0.0064 : 0.0047 }
    };
    material.onBeforeCompile = function compileKimiDial(shader, renderer) {
      record.onBeforeCompile.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 kimiDialBase;
uniform vec3 kimiDialInk;
uniform float kimiDarkInk;
uniform float kimiSourceFloor;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
#ifdef USE_MAP
  // Separate the dark substrate from the original antialiased print.
  // Bright lettering stays neutral on dark dials; a light dial uses dark ink.
  vec3 kimiSource = sampledDiffuseColor.rgb;
  float kimiLuma = dot(kimiSource, vec3(0.2126, 0.7152, 0.0722));
  // Retain the source ink intensity; a second luminance multiplication
  // makes fine grey print and antialiased edges disappear on a dark dial.
  float kimiPrint = smoothstep(0.010, 0.055, kimiLuma);
  float kimiGrain = clamp(kimiLuma / kimiSourceFloor, 0.72, 1.3);
  vec3 kimiSubstrate = kimiDialBase * mix(0.86, 1.10, (kimiGrain - 0.72) / 0.58);
  vec3 kimiPrintColor = mix(kimiSource, kimiDialInk, kimiDarkInk);
  float kimiMax = max(max(kimiSource.r, kimiSource.g), kimiSource.b);
  float kimiMin = min(min(kimiSource.r, kimiSource.g), kimiSource.b);
  float kimiAccent = smoothstep(0.20, 0.42, (kimiMax - kimiMin) / max(kimiMax, 0.001)) * smoothstep(0.025, 0.10, kimiLuma);
  vec3 kimiRecolored = mix(kimiSubstrate, kimiPrintColor, kimiPrint);
  diffuseColor.rgb = mix(kimiRecolored, kimiSource, kimiAccent);
#endif`);
    };
    material.customProgramCacheKey = () => record.programKey + '|' + VERSION;
    material.needsUpdate = true;
  }

  function applyRecord(record, state) {
    const { material, surface, uniforms } = record;
    const finish = FINISHES[surface][state[surface]];
    if (surface === 'dial') {
      if (uniforms) {
        uniforms.kimiDialBase.value.set(finish.base);
        if (material.name.startsWith('recessed_subdial_')) uniforms.kimiDialBase.value.multiplyScalar(0.84);
        uniforms.kimiDialInk.value.set(finish.ink || '#f1f1ed');
        uniforms.kimiDarkInk.value = finish.ink ? 1 : 0;
        material.color.set(0xffffff);
      } else material.color.set(finish.base);
      material.roughness = finish.roughness + (material.name.startsWith('recessed_subdial_') ? 0.04 : 0);
      material.metalness = finish.metalness;
    } else {
      material.color.set(finish.color);
      const targetRoughness = material.name.includes('brushed') ? finish.brushed : finish.polished;
      // Source brush roughness has mean G = 87.5 / 255, not a unit multiplier.
      material.roughness = material.roughnessMap ? Math.min(1, targetRoughness / (87.5 / 255)) : targetRoughness;
      material.metalness = 1;
    }
    material.userData.kimiFinish = { surface, value: state[surface], version: VERSION };
  }

  function cloneMaterial({ T, source, unit, state = DEFAULT_STATE }) {
    const material = source.clone();
    // Three.Material.clone intentionally omits compile hooks. Restore any
    // contact/surface hook, but never copy the main dial's mutable uniforms.
    const prior = dialSources.get(source);
    material.onBeforeCompile = prior ? prior.onBeforeCompile : source.onBeforeCompile;
    material.customProgramCacheKey = prior ? prior.customProgramCacheKey : source.customProgramCacheKey;
    const surface = surfaceOf(unit, material);
    if (surface) {
      const record = { material, surface, uniforms: null, onBeforeCompile: material.onBeforeCompile, programKey: material.customProgramCacheKey() };
      if (surface === 'dial' && material.map) bindDialShader(T, record);
      applyRecord(record, normalizeState(state, DEFAULT_STATE));
    }
    return material;
  }

  function initialize(options) {
    const { T, onChange = () => {} } = options || {};
    const units = options && (options.units || options.active);
    if (!T || !Array.isArray(units)) throw new TypeError('initializeKimiConfigurator requires { T, units, onChange? }.');
    if (current) current.dispose();

    let state = normalizeState(options.initialState, pending);
    let disposed = false;
    const records = new Map();
    const bindings = [];
    const panel = document.getElementById('kimi-configurator');

    function collect(sourceUnits) {
      for (const unit of sourceUnits) {
        for (const mesh of unit.render || []) {
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if (!material || records.has(material)) continue;
            const surface = surfaceOf(unit, material);
            if (!surface) continue;
            const record = {
              material, surface,
              color: material.color.clone(),
              roughness: material.roughness,
              metalness: material.metalness,
              onBeforeCompile: material.onBeforeCompile,
              customProgramCacheKey: material.customProgramCacheKey,
              programKey: material.customProgramCacheKey(),
              uniforms: null
            };
            records.set(material, record);
            if (surface === 'dial' && material.map) { dialSources.set(material, record); bindDialShader(T, record); }
          }
        }
      }
    }

    function renderMaterials() {
      for (const record of records.values()) applyRecord(record, state);
    }

    function syncUI() {
      for (const button of document.querySelectorAll('[data-kimi-category][data-kimi-value]')) {
        const checked = state[button.dataset.kimiCategory] === button.dataset.kimiValue;
        button.setAttribute('aria-checked', String(checked));
        button.tabIndex = checked ? 0 : -1;
        button.disabled = false;
      }
      const text = `${FINISHES.dial[state.dial].label} · ${FINISHES.hardware[state.hardware].label} hardware · ${FINISHES.bracelet[state.bracelet].label}`;
      const summary = document.getElementById('kimi-config-summary');
      if (summary) summary.textContent = text;
      document.body.dataset.kimiConfiguration = JSON.stringify(state);
      if (panel) panel.setAttribute('aria-busy', 'false');
    }

    function apply(patch, meta) {
      if (disposed) return { ...state };
      state = normalizeState(patch, state);
      pending = { ...state };
      renderMaterials();
      syncUI();
      const detail = { state: { ...state }, source: meta && meta.source || 'api' };
      onChange(detail.state, detail);
      global.dispatchEvent(new CustomEvent('kimi-configuration-change', { detail }));
      return detail.state;
    }

    function bindUI() {
      for (const button of document.querySelectorAll('[data-kimi-category][data-kimi-value]')) {
        const click = () => apply({ [button.dataset.kimiCategory]: button.dataset.kimiValue }, { source: 'user' });
        const keydown = event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const buttons = [...button.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]')];
          const index = buttons.indexOf(button);
          const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + direction + buttons.length) % buttons.length;
          buttons[nextIndex].focus();
          buttons[nextIndex].click();
        };
        button.addEventListener('click', click);
        button.addEventListener('keydown', keydown);
        bindings.push(() => { button.removeEventListener('click', click); button.removeEventListener('keydown', keydown); });
      }
    }

    const api = {
      apply,
      get state() { return { ...state }; },
      get bindings() { return [...records.values()].reduce((count, record) => { count[record.surface]++; return count; }, { dial: 0, hardware: 0, bracelet: 0 }); },
      refresh(moreUnits = units) { collect(moreUnits); return apply(state, { source: 'refresh' }); },
      dispose() {
        if (disposed) return;
        disposed = true;
        bindings.forEach(remove => remove());
        for (const record of records.values()) {
          const material = record.material;
          material.color.copy(record.color);
          material.roughness = record.roughness;
          material.metalness = record.metalness;
          material.onBeforeCompile = record.onBeforeCompile;
          material.customProgramCacheKey = record.customProgramCacheKey;
          delete material.userData.kimiFinish;
          dialSources.delete(material);
          material.needsUpdate = true;
        }
        records.clear();
        if (current === api) current = null;
      }
    };
    collect(units);
    bindUI();
    current = api;
    global.KimiConfigurator = api;
    apply(state, { source: 'initialization' });
    return api;
  }

  global.initializeKimiConfigurator = initialize;
  global.cloneKimiMaterial = cloneMaterial;
  global.applyKimiConfiguration = function applyKimiConfiguration(patch, meta) {
    pending = normalizeState(patch, pending);
    return current ? current.apply(patch, meta) : { ...pending };
  };
  // AWW2K26 placeholder brand — Kimi names kept as deprecated aliases.
  global.AWW2K26Configurator = global.AWW2K26Configurator || null;
  global.initializeAWW2K26Configurator = initialize;
  global.cloneAWW2K26Material = cloneMaterial;
  Object.defineProperty(global, 'AWW2K26Configurator', {
    configurable: true,
    get: function () { return global.KimiConfigurator || null; }
  });
})(window);
