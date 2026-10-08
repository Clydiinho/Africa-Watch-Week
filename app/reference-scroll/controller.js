/* AWW2K26 reference-led chapter choreography (placeholder Cal.2K26 geometry).
 * No reference brand/model code is run. */
let scrollSections=[],scrollMax=1,scrollTarget=0,scrollValue=0,domScrollValue=0,previousTime=0,isPlaying=false;
let currentSection='Intro',sectionProgress=0,selectedLayer=null,selectionValue=0,hoverLayer=null,holdValue=0,holdDown=false;
let rendererDirty=true,resizeFlag=false,frameTimes=[],actualFrames=0,modelThumbnails={},chosenFinish='steel',holdStarted=0,lastColorStep=-1,footerWatches=[],finishLocked=false,referenceContactLight=null,kimiConfiguration=null,conceptTourbillonAsset=null,partsReassembly=null;
let frameTimingSection=null,previousRenderedFrameTime=null;
const exteriorAssetPath=Q.get('asset')==='machining'?'assets/kimi_machining_exterior_v3.glb':'assets/kimi_openheart_exterior_v2.glb';
const movementAssetPath=Q.get('movement')==='refined'?'assets/kimi_movement_refined_v1.glb':'assets/omega_321_r46f.glb';
const tourbillonAssetPath='assets/kimi_tourbillon_v1.glb';
if(Q.has('chapter')||Q.has('p'))history.scrollRestoration='manual';
const pointerRef={x:0,y:0,dx:0,dy:0},reducedMotionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=reducedMotionQuery.matches;
const refPalette={steel:0xa8adb0,black:0x34373a,gold:0xc9ae70,rose:0xc79983};
const sectionOrder=['Intro','Disassembly','Particles','Presentation','Straps','Images','Colors','Parts','Footer'];
const partDescriptions={Caseback:'A sapphire window into the hand-wound mechanical heart.',Chronograph:'Column-wheel control and a horizontal clutch coordinate the chronograph.',Regulation:'The balance, hairspring and escapement set the rhythm of the movement.',Movement:'The mainplate and supporting bridges hold the wheel train in alignment.',Case:'The 39.7 mm steel case, ceramic bezel, crown and chronograph pushers.','Dial & hands':'A stepped dial with an open mechanical window at six. Fine indicators frame the moving cage.'};
function refError(error){errors.push(error?.message||String(error));console.error(error);isPlaying=false;const loading=$('loading');loading?.classList.remove('is-complete');loading?.setAttribute('aria-hidden','false');$('load-status').textContent='The 3D experience could not load.';$('retry-load').hidden=false;}
addEventListener('error',e=>refError(e.error||e.message));addEventListener('unhandledrejection',e=>refError(e.reason));$('retry-load')?.addEventListener('click',()=>location.reload());
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;refError(new Error('WebGL context lost. Reload to restore.'));});
function referenceGlass(material){
 material.transmission=0;material.opacity=1;material.transparent=true;material.depthWrite=false;material.roughness=.013;material.metalness=.0;material.envMapIntensity=.35;material.specularIntensity=.45;
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`diffuseColor.a *= .02 + .28 * pow(1.0 - abs(dot(normal, geometryViewDir)), 3.0);\n#include <opaque_fragment>`);};
 material.customProgramCacheKey=()=> 'omega-reference-ar-fresnel-v1';material.needsUpdate=true;
}
async function loadReferenceEnvironment(){
 const [mainEnv,metalEnv]=await Promise.all(['reference-studio.exr','reference-metal.exr'].map(name=>new EXRLoader().loadAsync('assets/environment/'+name)));
 const studio=new T.Scene(),geometry=new T.SphereGeometry(30,48,32);
 const material=new T.ShaderMaterial({side:T.BackSide,uniforms:{mainEnv:{value:mainEnv},metalEnv:{value:metalEnv}},vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D mainEnv;uniform sampler2D metalEnv;varying vec3 vDirection;const float PI=3.14159265359;vec2 uvFor(vec3 d){return vec2(atan(d.z,d.x)/(2.*PI)+.5,asin(clamp(d.y,-1.,1.))/PI+.5);}void main(){vec3 d=normalize(vDirection);d=vec3(d.x,-d.z,d.y);float a=.32;d.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*d.xz;vec3 base=texture2D(mainEnv,uvFor(d)).rgb;vec3 detail=texture2D(metalEnv,uvFor(d)).rgb;gl_FragColor=vec4(base*.55+detail*.22,1.);}`});
 studio.add(new T.Mesh(geometry,material));const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.015,.1,100).texture;pmrem.dispose();geometry.dispose();material.dispose();mainEnv.dispose();metalEnv.dispose();
 photoLight.key.intensity=1.15;photoLight.fill.intensity=.30;renderer.toneMappingExposure=.97;scene.traverse(o=>{if(o.isHemisphereLight)o.intensity=.045;});
 for(const u of active)for(const mesh of u.render)for(const mat of(Array.isArray(mesh.material)?mesh.material:[mesh.material])){mat.envMapIntensity=u.origin?.90:1.0;if(mat.name==='sapphire')referenceGlass(mat);}
 scene.background=null;renderer.setClearColor(0x000000,0);
}
function measureReference(){
 scrollSections=[...document.querySelectorAll('#reference-story > [data-webgl]')].map(el=>({name:el.dataset.webgl,top:el.offsetTop,height:el.offsetHeight,el}));scrollMax=Math.max(1,document.documentElement.scrollHeight-innerHeight);
}
function stopReference(){isPlaying=false;$('reference-play')?.setAttribute('aria-pressed','false');if($('reference-play'))$('reference-play').querySelector('.play-label').textContent='Play';rendererDirty=true;}
function updateReducedMotion(event){
 reduced=event.matches;
 if(reduced){stopReference();scrollTarget=scrollY;scrollValue=domScrollValue=scrollTarget;scrollTo({top:scrollTarget,behavior:'instant'});}
 document.body.dataset.reducedMotion=String(reduced);rendererDirty=true;
}
if(reducedMotionQuery.addEventListener)reducedMotionQuery.addEventListener('change',updateReducedMotion);else reducedMotionQuery.addListener(updateReducedMotion);
document.body.dataset.reducedMotion=String(reduced);
function seekSection(name){const section=scrollSections.find(s=>s.name===name);if(!section)return;stopReference();selectedLayer=null;const phase=name==='Disassembly'?.65:0;scrollTo({top:section.top+section.height*phase,behavior:reduced?'instant':'smooth'});rendererDirty=true;}
async function onAssetsReady(){
 if(['atelier','edge'].includes(Q.get('studio'))){await import('./studio-refinement.js');const studio=await window.installKimiStudioRefinement({T,scene,renderer,photoLight,baselineEnvironment:scene.environment,style:Q.get('studio')});scene.environment=studio.env;window.__STUDIO_REFINEMENT=studio.report;document.body.dataset.studio=JSON.stringify(studio.report);}
 if(window.__EXTERIOR)window.__EXTERIOR.asset=exteriorAssetPath;
 document.body.dataset.movementAsset=movementAssetPath;
 window.applySurfaceRefinement?.({THREE:T,units:active});
 if(window.installEngravingRefinement)await window.installEngravingRefinement({T,active,renderer});
 buildReferenceRig();initializeReferenceMotion();
 if(conceptTourbillonAsset)window.initConceptTourbillon?.({T,gltf:conceptTourbillonAsset,scene,displayRoot,active,renderer});optimizeReferenceScene();referenceContactLight=installReferenceContactLight({T,scene,renderer,active});initReferenceBackdrop();measureReference();camera.up.set(0,0,-1);camera.fov=25;camera.updateProjectionMatrix();
 window.__UNITS=units;window.__RENDERER=renderer;window.__CAMERA=camera;
 window.__FINISHES={loaded:finishLibrary.size,applied:finishApplied};
 const layers=$('layer-labels');REFERENCE_LAYERS.forEach(layer=>{const button=document.createElement('button');button.type='button';button.dataset.layer=layer.index;button.innerHTML='<span>'+layer.label+'</span>';button.onpointerenter=()=>{hoverLayer=layer.index;rendererDirty=true;};button.onpointerleave=()=>{hoverLayer=null;rendererDirty=true;};button.onclick=()=>{selectedLayer=selectedLayer===layer.index?null:layer.index;rendererDirty=true;};layers.append(button);});
 const initial=Number(Q.get('p'));if(Q.has('p')&&Number.isFinite(initial))scrollTo({top:clamp(initial/100)*scrollMax,behavior:'instant'});
 const qaChapter=scrollSections.find(s=>s.name===Q.get('chapter'));if(qaChapter){const start=qaChapter.top-(qaChapter.name==='Intro'?0:innerHeight),end=qaChapter.top+qaChapter.height-(qaChapter.name==='Footer'?innerHeight:0);scrollTo({top:start+clamp(Q.has('phase')?Number(Q.get('phase')):.7)*(end-start),behavior:'instant'});}scrollTarget=scrollValue=domScrollValue=scrollY;
 kimiConfiguration=window.initializeKimiConfigurator?.({T,units:active,onChange:()=>{rendererDirty=true;}});
 rendererDirty=true;runReferenceAudit();captureReferenceImages();createFooterWatches();
 let editorialLOD=null;
 if(Q.get('editorialLOD')==='20'){
  try{const {prepareEditorialLOD}=await import('./editorial-lod.js');editorialLOD=await prepareEditorialLOD({T,GLTFLoader,active,restoreSourceFinish,ensureAnisotropyTangents:ensureOmegaAnisotropyTangents,sourceFinishLog:finishApplied});}
  catch(error){console.warn('Rear editorial LOD unavailable; using original geometry.',error);}
 }
 window.initializeEditorialWatches?.({T,scene,camera,units:active,braceletSet:referenceRig.braceletSet,configuration:kimiConfiguration?.state,rearLOD:editorialLOD,onChange:()=>{rendererDirty=true;}});
 partsReassembly=window.initPartsReassembly?.({T,scene,displayRoot,active,renderer});
 ready=true;window.__READY=true;
 $('loading')?.classList.add('is-complete');$('loading')?.setAttribute('aria-hidden','true');$('loading')?.setAttribute('aria-busy','false');document.body.classList.add('watch-ready');
 if(location.origin==='http://127.0.0.1:8971'&&Q.get('qaCapture')==='1'){
  import('./qa-capture.js').then(({installQACapture})=>installQACapture({renderer,scene,camera,getState:()=>({chapter:currentSection,phase:sectionProgress,progress:scrollValue/scrollMax,frame:actualFrames})})).catch(()=>console.warn('Local review capture utility could not load.'));
 }
}
function refPose(phase){
 const x=phase.p,name=phase.name;
 const state={explode:0,bracelet:1,crystal:1,dial:1,caseAlpha:1,mechanism:1,knoll:0,strap:0};
 let direction=new T.Vector3(0,1,.0001),distance=40,focus=new T.Vector3(0,-1.7,0),fov=25,screen=[.5,.5],darkStage=0;
 if(name==='Intro'){
  const turn=x<.16?T.MathUtils.lerp(0,.13*Math.PI,seg(0,.16,x)):x<.5?T.MathUtils.lerp(.13*Math.PI,2*Math.PI,seg(.16,.5,x)):T.MathUtils.lerp(2*Math.PI,1.55*Math.PI,seg(.5,1,x));
  const apertureCloseup=seg(.035,.13,x)*(1-seg(.18,.32,x));
  direction.set(Math.sin(turn),Math.cos(turn),-.13*Math.sin(Math.PI*seg(0,.2,x)));distance=T.MathUtils.lerp(T.MathUtils.lerp(32,45,seg(.18,.32,x)),18,apertureCloseup);focus.set(0,T.MathUtils.lerp(-1.6,.45,apertureCloseup),.85*apertureCloseup);
 }
 if(name==='Disassembly'){state.mobileRoll=1;
  const opening=seg(0,.30,x),closing=seg(.90,1,x);state.detail=seg(.29,.70,x)*(1-closing);state.explode=opening*(1-closing);state.depart=seg(0,.50,x);state.crystalLift=seg(0,.45,x);state.dialLift=seg(.86,1,x);state.bracelet=1-seg(.28,.50,x);state.crystal=1-seg(.81,.98,x);state.allChild=holdValue;
  const closeDetail=seg(.69,.79,x)*(1-seg(.90,1,x));state.dial=(1-seg(.90,1,x))*(1-.96*closeDetail);state.caseAlpha=(1-seg(.90,1,x))*(1-.96*closeDetail);state.crystal*=1-closeDetail;direction.set(-1,-.28-.30*state.detail,.07+.18*state.detail);distance=T.MathUtils.lerp(40,33,opening)+4*state.detail;focus.set(0,.3*state.detail-2.5*closeDetail,0);distance=T.MathUtils.lerp(distance,24,closeDetail);
  state.zoomLayer=selectedLayer;state.child=selectionValue;distance*=1-.4*selectionValue;
  if(selectedLayer!==null){const layer=REFERENCE_LAYERS[selectedLayer];referenceLayerPosition(layer,state,focus).multiplyScalar(selectionValue);}
 }
 if(name==='Particles'){
  const reveal=seg(.44,.62,x);state.bracelet=reveal;state.crystal=reveal;state.dial=reveal;state.caseAlpha=reveal;state.explode=0;state.depart=1-reveal;state.crystalLift=1-reveal;state.dialLift=1-reveal;
  darkStage=seg(0,.08,x)*(1-seg(.89,1,x));direction.set(.3*Math.sin(x*Math.PI*2),-1,.48);distance=19;focus.set(0,-.5,0);
  if(x>.50){const t=seg(.5,1,x);direction.set(.4*Math.sin(t*Math.PI),-Math.cos(t*Math.PI),T.MathUtils.lerp(.48,.12,t));distance=T.MathUtils.lerp(19,27,t);focus.y=T.MathUtils.lerp(-.5,-1.5,t);}
 }
 if(name==='Presentation'){
  const t1=seg(.25,.45,x),t2=seg(.50,.70,x),exit=seg(.76,.98,x);
  // Whole watch moves through three poses: silhouette, movement at right, crown.
  direction.set(.25,1,.65).lerp(new T.Vector3(.20,-1,.10),t1).normalize().lerp(new T.Vector3(1,.24,.12),t2).normalize();
  distance=T.MathUtils.lerp(T.MathUtils.lerp(32,23,t1),24,t2);
  focus.set(2.1*t2,-1.0*(1-t2),0);screen=[T.MathUtils.lerp(T.MathUtils.lerp(.5,.73,t1),.5,t2),T.MathUtils.lerp(T.MathUtils.lerp(.77,.55,t1),.78,t2)];
  state.roll=-Math.PI*.5*t2;state.exit=exit;state.openStrap=seg(.20,.35,x)*(1-t2);
 }
 if(name==='Straps'){
  state.mechanism=state.caseAlpha=state.dial=state.crystal=0;state.strap=1;state.bracelet=1;
  state.strapSpread=1-seg(0,.4,x)+seg(.6,.9,x);state.strap=1-seg(.95,1,x);direction.set(0,1,.0001);distance=33;focus.set(0,-.2,0);screen=[.5,.64];
 }
 if(name==='Images'){state.bracelet=state.mechanism=state.caseAlpha=state.dial=state.crystal=0;}
 if(name==='Colors'){direction.set(Math.sin(.18*(1-seg(.5,.9,x))),1,.12);distance=45;focus.set(0,-1.8,0);screen=[.59,.48];}
 if(name==='Parts'){direction.set(.18,1,.22);distance=42;focus.set(0,-1.4,0);screen=[.5,.56];}
 if(name==='Footer'){state.bracelet=state.mechanism=state.caseAlpha=state.dial=state.crystal=0;distance=32;direction.set(0,1,.0001);focus.set(0,-1.7,0);screen=[.5,.55];}
 if(innerWidth<768){screen=[.5,name==='Colors'?.30:name==='Presentation'?.62:name==='Particles'?.55:screen[1]];}
 const pointerWeight=['Intro','Colors','Footer'].includes(name)?1:0;
 return{state,direction,distance,focus,fov,screen,darkStage,name,pointerWeight};
}
function referenceCamera(config){
 const mobile=innerWidth<768,dir=config.direction.clone().normalize();let distance=config.distance;
 if(mobile)distance*=config.mobileScale??referenceMobileScale(config.name||currentSection);
 const target=config.focus.clone();const position=target.clone().addScaledVector(dir,distance);
 const right=new T.Vector3().crossVectors(new T.Vector3(0,0,-1),dir).normalize(),up=new T.Vector3().crossVectors(dir,right).normalize();
 const [sx,sy]=config.screen;
 const height=2*distance*Math.tan(T.MathUtils.degToRad(config.fov/2)),width=height*camera.aspect;
 const offset=right.multiplyScalar((.5-sx)*width).addScaledVector(up,(sy-.5)*height);position.add(offset);target.add(offset);
 if(!reduced&&config.pointerWeight>0){position.x+=pointerRef.dx*.9*config.pointerWeight;position.z+=pointerRef.dy*.65*config.pointerWeight;}
 if(holdValue>0)position.lerp(target,.22*holdValue);
 camera.up.set(-Math.sin(config.state.roll||0),0,-Math.cos(config.state.roll||0));if(mobile&&config.state.mobileRoll)camera.up.set(0,0,-1).applyAxisAngle(dir,Math.PI/2*config.state.mobileRoll);camera.fov=config.fov;camera.position.copy(position);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 photoLight.update({rearMix:clamp(-dir.y),target:config.focus});renderer.domElement.style.opacity=String(1-(config.state.exit||0));return{position,target};
}
function framePartsReassembly(config,assembly,visibility){
 if(!assembly?.targetBounds||assembly.targetBounds.isEmpty())return;
 const mobile=innerWidth<768,hero=clamp(assembly.heroMix||0);
 // Frame the transparent watch, not the entire waiting parts field. Lower
 // rows enter the viewport on their way to the watch at their real scale.
 const direction=new T.Vector3(.17,1,.23).lerp(new T.Vector3(.22,1,.14),hero).normalize();
 const focus=new T.Vector3(0,-1.4,1.5).lerp(new T.Vector3(0,-1.15,.25),hero);
 const distance=T.MathUtils.lerp(mobile?43:36,mobile?38:30,hero);
 const mobileScale=mobile?(config.mobileScale??referenceMobileScale(config.name||currentSection)):1;
 config.distance=T.MathUtils.lerp(config.distance,distance/mobileScale,visibility);config.focus.lerp(focus,visibility);config.direction.lerp(direction,visibility).normalize();
 const screen=[.5,T.MathUtils.lerp(mobile?.53:.38,mobile?.53:.56,hero)];
 config.screen=config.screen.map((value,index)=>T.MathUtils.lerp(value,screen[index],visibility));
}
// Reference wrappers overlap by one measured viewport. Both poses contribute
// during that interval, so reversing through a boundary has the same result.
function sectionPhase(section,y){const start=section.top-(section.name==='Intro'?0:innerHeight),end=section.top+section.height-(section.name==='Footer'?innerHeight:0);return{name:section.name,p:clamp((y-start)/Math.max(1,end-start)),section};}
function getPhase(y=scrollValue){
 let index=0;for(let i=1;i<scrollSections.length;i++)if(y>=scrollSections[i].top-innerHeight)index=i;
 const incoming=sectionPhase(scrollSections[index],y),mix=index?seg(incoming.section.top-innerHeight,incoming.section.top,y):1;
 return{...incoming,mix,previous:index&&mix<1?sectionPhase(scrollSections[index-1],y):null};
}
function referenceMobileScale(name){return name==='Disassembly'?1.48:name==='Straps'?Math.max(1,1.62/camera.aspect):name==='Footer'?1.12:1.18;}
function blendReference(phase){
 const to=refPose(phase);if(!phase.previous)return to;
 const from=refPose(phase.previous),t=phase.mix;
 const state={...to.state};for(const key of new Set([...Object.keys(from.state),...Object.keys(to.state)])){if(key==='zoomLayer')continue;state[key]=T.MathUtils.lerp(from.state[key]??0,to.state[key]??0,t);}
 return{state,name:to.name,pointerWeight:T.MathUtils.lerp(from.pointerWeight,to.pointerWeight,t),mobileScale:T.MathUtils.lerp(referenceMobileScale(from.name),referenceMobileScale(to.name),t),direction:from.direction.clone().normalize().lerp(to.direction.clone().normalize(),t).normalize(),distance:T.MathUtils.lerp(from.distance,to.distance,t),focus:from.focus.clone().lerp(to.focus,t),fov:T.MathUtils.lerp(from.fov,to.fov,t),screen:from.screen.map((v,i)=>T.MathUtils.lerp(v,to.screen[i],t)),darkStage:T.MathUtils.lerp(from.darkStage,to.darkStage,t)};
}
function setReferenceFinish(value){
 chosenFinish=value in refPalette?value:'steel';
 for(const u of active.filter(u=>u.origin))for(const mesh of u.render)for(const mat of(Array.isArray(mesh.material)?mesh.material:[mesh.material])){
  const b=mat.userData.referenceBase;if(!b?.color||mat.metalness<.8||mat.name==='sapphire')continue;
  mat.color.copy(b.color);if(chosenFinish!=='steel')mat.color.lerp(new T.Color(refPalette[chosenFinish]),.70);
 }
 document.querySelectorAll('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.finish===chosenFinish)));rendererDirty=true;
 const label=$('finish-name');if(label)label.textContent={steel:'Stainless steel',black:'Black study',gold:'Gold study',rose:'Rose study'}[chosenFinish];
}
function updateReferenceDOM(phase,config){
 document.body.dataset.section=phase.name;document.body.dataset.phase=phase.p.toFixed(5);document.body.dataset.detail=(config.state.detail||0).toFixed(4);document.body.dataset.progress=(scrollValue/scrollMax).toFixed(5);
 document.body.style.setProperty('--dark-stage',config.darkStage);document.body.classList.toggle('dark-stage',config.darkStage>.5);
 const overlays=[...document.querySelectorAll('.overlay[data-scene]')];
 for(const el of overlays){const mix=phase.name==='Footer'?seg(0,.55,phase.mix??1):phase.mix??1;const opacity=el.dataset.scene===phase.name?mix:el.dataset.scene===phase.previous?.name?1-mix:0;el.style.opacity=String(opacity);el.style.visibility=opacity>.001?'visible':'hidden';el.setAttribute('aria-hidden',String(opacity<.1));}
 const hero=document.querySelector('.hero-word'),manifesto=document.querySelector('.scroll-manifesto');if(hero){hero.style.opacity=String(1-seg(.1,.2,phase.p));hero.style.transform=`translateY(${-phase.p*140}vh)`;}
 if(manifesto){manifesto.style.opacity=phase.name==='Intro'?String(seg(.10,.21,phase.p)*(1-seg(.70,.85,phase.p))):'0';manifesto.style.transform=`translateY(${100-seg(.1,.84,phase.p)*210}vh)`;}
 const introVisible=1-seg(.06,.14,phase.p);document.querySelector('.intro-overlay').style.opacity=phase.name==='Intro'?String(introVisible):'0';document.querySelector('.hero-circle').style.opacity=String(1-seg(.06,.18,phase.p));
 const labels=$('layer-labels');labels.style.opacity=phase.name==='Disassembly'?String(seg(.24,.40,phase.p)*(1-seg(.83,.89,phase.p))):'0';labels.style.pointerEvents=phase.name==='Disassembly'?'auto':'none';
 for(const layer of REFERENCE_LAYERS){const b=labels.querySelector(`[data-layer="${layer.index}"]`),point=referenceLayerPosition(layer,config.state);point.project(camera);const projected=point.x*.5+.5;const fallback=.08+layer.index*.168; b.style.left=(clamp(projected*.7+fallback*.3)*100)+'%';b.style.top=(innerWidth<768?clamp(-point.y*.5+.5)*100:75)+'%';if(innerWidth<768)b.style.left='86%';b.style.setProperty('--leader-height',innerWidth<768?'10vh':'18vh');b.classList.toggle('is-selected',selectedLayer===layer.index);b.style.opacity=selectedLayer===null||selectedLayer===layer.index?'1':'0';b.style.pointerEvents=selectedLayer===null?'auto':'none';b.classList.toggle('is-hovered',hoverLayer===layer.index);b.setAttribute('aria-pressed',String(selectedLayer===layer.index));}
 if(phase.name==='Presentation'){
  const i=phase.p<.30?0:phase.p<.58?1:2;
  $('presentation-title').innerHTML=['ELEGANT<br>CONTOURS','A MECHANICAL<br>LEGACY','IN YOUR<br>HANDS'][i];
   $('presentation-copy').textContent=['Rare independents and heritage maisons, experienced up close.','Coachbuilt cars and the culture of the drive.','Artists, designers and patrons shaping the scene.'][i];
  document.body.dataset.presentation=String(i);
 }
 const mechanismTitle=document.querySelector('.mechanism-heading');mechanismTitle.style.opacity=String(1-seg(.37,.46,phase.p));document.querySelector('.mechanism-note').style.opacity=String(1-seg(.37,.46,phase.p));document.querySelector('.mechanism-rate').style.opacity=String(seg(.12,.22,phase.p)*(1-seg(.46,.57,phase.p)));
 if(phase.name==='Colors')$('finish-number').textContent='0'+({ink:1,blue:2,silver:3}[kimiConfiguration?.state.dial]||1);
 if(phase.name==='Parts'){
  const p=phase.p,progress=seg(.10,.75,p),steps=['01 / THE INDIVIDUAL ELEMENTS','02 / THE MECHANICAL HEART','03 / THE CASE & BRACELET','04 / COMING TOGETHER'];
  const index=p<.20?0:p<.43?1:p<.75?2:3;$('reassembly-step').textContent=steps[index];$('reassembly-copy').textContent=['Scroll to bring the evening together.','Horology, automotive, art and private clients take their places.','Each world finds its place in the whole.','Africa Watch Week. One complete evening.'][index];$('reassembly-progress').textContent=Math.round(progress*100)+'%';$('reassembly-progress-bar').style.transform='scaleX('+progress+')';document.querySelector('.parts-heading').style.opacity=String(1-.65*seg(.75,.85,p));
 }
 const readout=$('reference-progress');if(readout)readout.style.transform='scaleY('+clamp(scrollValue/scrollMax)+')';$('reference-scroll-percent').textContent=Math.round(scrollValue/scrollMax*100)+'%';
 if(phase.name==='Disassembly'){const stage=phase.p<.30?0:phase.p<.56?1:phase.p<.76?2:3;document.querySelector('.explore-instruction').textContent=['01 / THE ASSEMBLIES','02 / BRIDGES & RETAINERS','03 / WHEELS & HANDS','04 / THE FINER DETAILS'][stage];document.querySelector('.disassembly-hold').innerHTML='SCROLL TO UNFOLD<br><span style="font-size:9px;margin:8px 0 0">'+(stage===0?'Six assemblies':stage===1?'Independent service modules':stage===2?'Wheels, escapement & indicators':'Bridgework, bearings & escapement')+'</span>';}
 const detail=$('component-detail');if(detail){detail.hidden=selectedLayer===null;if(selectedLayer!==null){$('component-name').textContent=REFERENCE_LAYERS[selectedLayer].label;$('component-description').textContent=partDescriptions[REFERENCE_LAYERS[selectedLayer].label];}}
}
function runReferenceAudit(){
 const q={ok:true,total:359,deep:deepDisassemblyStats,layers:referenceRig.counts,bracelet:106,crystal:2,checks:{unique:true,finite:true,reversible:true,allParts:true},failures:[]};
 const snapshots=new Map();const cases=sectionOrder.flatMap(name=>(name==='Disassembly'?Array.from({length:101},(_,i)=>i/100):[0,.25,.5,.75,1]).map(p=>({name,p})));
 for(const c of cases){poseReference(refPose(c).state);const v=active.filter(u=>u.on).flatMap(u=>u.pos.toArray().concat(u.quat.toArray()));q.checks.finite&&=v.every(Number.isFinite);snapshots.set(c.name+c.p,v);}
 for(const c of [...cases].reverse()){poseReference(refPose(c).state);const v=active.filter(u=>u.on).flatMap(u=>u.pos.toArray().concat(u.quat.toArray()));q.checks.reversible&&=v.every((n,i)=>n===snapshots.get(c.name+c.p)[i]);}
 q.checks.unique=new Set(active.filter(u=>u.on).map(u=>u.name)).size===359;q.checks.allParts=referenceRig.counts.reduce((s,l)=>s+l.count,0)+106+2===359;
 const interactionCases=[];
 for(const explode of [0,.5,1])for(const detail of [0,.5,1])for(const allChild of [0,1])for(const zoomLayer of [null,0,1,2,3,4,5])interactionCases.push({explode,detail,allChild,zoomLayer,child:zoomLayer===null?0:1});
 const poseVector=()=>active.filter(u=>u.on).flatMap(u=>u.pos.toArray().concat(u.quat.toArray(),u.root.visible?1:0));
 const records=interactionCases.map(state=>{poseReference(state);const result=poseVector();q.checks.finite&&=result.every(Number.isFinite);return result;});
 for(let i=interactionCases.length-1;i>=0;i--){poseReference(interactionCases[i]);q.checks.reversible&&=poseVector().every((v,k)=>v===records[i][k]);}
 poseReference({explode:0,detail:0,allChild:1,child:1});const held=poseVector();poseReference({});q.checks.reversible&&=poseVector().every((v,k)=>v===held[k]);
 q.interactionSamples=interactionCases.length;
 q.ok=Object.values(q.checks).every(Boolean);q.samples=cases.length;document.body.dataset.audit=JSON.stringify(q);window.__REFERENCE_AUDIT=q;poseReference({});if(!q.ok)throw Error('Reference adapter audit failed');
}
function applyFrontOcclusion(config,phase){
 const state=config.state||{},closed=(state.explode||0)<.001&&(state.detail||0)<.001&&(state.dial??1)>.999&&(state.caseAlpha??1)>.999;
 const assembly=partsReassembly?.report;
 const name=config.name||currentSection,inParts=name==='Parts'||(name==='Footer'&&phase?.previous?.name==='Parts');
 // Parts exits by fading the complete watch, not by opening its case. Retain
 // front occlusion until that pose ends; otherwise the dense hidden movement
 // reappears during the Footer fade solely because the dial alpha drops.
 const assembledParts=inParts&&assembly?.active&&assembly.serviceGroups>0&&assembly.landedGroups===assembly.serviceGroups;
 const front=config.direction.y>.55&&((closed&&['Intro','Colors','Presentation'].includes(name))||assembledParts);
 if(front)for(const u of active)if(!u.origin)u.root.visible=false;
 document.body.dataset.frontOcclusion=String(front);
}
function recordReferenceFrameTiming(now,rawFrameMs,section){
 if(section!==frameTimingSection){frameTimes.length=0;frameTimingSection=section;previousRenderedFrameTime=null;}
 const interval=now-previousRenderedFrameTime;
 if(previousRenderedFrameTime!==null&&Number.isFinite(rawFrameMs)&&rawFrameMs>0&&rawFrameMs<=500&&Number.isFinite(interval)&&interval>0&&interval<=500){frameTimes.push(interval);if(frameTimes.length>180)frameTimes.shift();}
 previousRenderedFrameTime=now;
 const sampleCount=frameTimes.length,ordered=frameTimes.slice().sort((a,b)=>a-b);
 // RAF cadence includes scheduling, main-thread work and GPU backpressure.
 // It is neither render-call CPU duration nor a GPU timer-query measurement.
 return{rawFrameMs:Number.isFinite(rawFrameMs)&&rawFrameMs>0?rawFrameMs:null,sampleCount,meanFrameMs:sampleCount?frameTimes.reduce((a,b)=>a+b,0)/sampleCount:null,p95FrameMs:sampleCount?ordered[Math.ceil(sampleCount*.95)-1]:null,frameTiming:'Unclamped consecutive rendered RAF intervals; not GPU timing'};
}
document.addEventListener('visibilitychange',()=>{previousRenderedFrameTime=null;});
function referenceFrame(now){
 requestAnimationFrame(referenceFrame);const rawFrameMs=now-previousTime,dt=Math.min(.08,rawFrameMs/1000||.016);previousTime=now;if(!ready||document.hidden){previousRenderedFrameTime=null;return;}
 if(resizeFlag){resizeFlag=false;camera.aspect=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight);measureReference();planKnoll();planKnollAssemblyV5();rendererDirty=true;}
 if(isPlaying){scrollTarget=Math.min(scrollMax,scrollTarget+dt*scrollMax/140);scrollTo({top:scrollTarget,behavior:'instant'});if(scrollTarget>=scrollMax)stopReference();}
 const diff=scrollTarget-scrollValue;scrollValue+=diff*(reduced?1:1-Math.exp(-dt*2));if(Math.abs(diff)<.02)scrollValue=scrollTarget;domScrollValue+=(scrollTarget-domScrollValue)*(reduced?1:1-Math.exp(-dt*4));
 const oldSelect=selectionValue;selectionValue+=((selectedLayer!==null?1:0)-selectionValue)*(1-Math.exp(-dt*5));
 pointerRef.dx+=(pointerRef.x-pointerRef.dx)*(1-Math.exp(-dt*3));pointerRef.dy+=(pointerRef.y-pointerRef.dy)*(1-Math.exp(-dt*3));holdValue+=((holdDown&&now-holdStarted>500?1:0)-holdValue)*(1-Math.exp(-dt*2));
 if(Math.abs(diff)>.02||isPlaying||Math.abs(oldSelect-selectionValue)>.0001||holdDown||holdValue>.001||Math.abs(scrollTarget-domScrollValue)>.1||Math.abs(pointerRef.x-pointerRef.dx)>.0001||Math.abs(pointerRef.y-pointerRef.dy)>.0001)rendererDirty=true;
 if(!reduced&&window.isConceptTourbillonActive?.({section:currentSection,phase:sectionProgress}))rendererDirty=true;
 if(!reduced&&window.isEditorialWatchesActive?.())rendererDirty=true;
 if(!reduced&&((currentSection==='Particles'&&sectionProgress>.025&&sectionProgress<.64)||(currentSection==='Presentation'&&sectionProgress>.35&&sectionProgress<.67)))rendererDirty=true;
 if(!rendererDirty){previousRenderedFrameTime=null;return;}const phase=getPhase();currentSection=phase.name;sectionProgress=phase.p;if(currentSection!=='Disassembly')selectedLayer=null;
 const cfg=blendReference(phase);poseReference(cfg.state);poseReferenceMotion({time:now/1000,section:phase.name,phase:phase.p,reduced});
 const reassemblyPhase=phase.name==='Parts'?phase:phase.previous?.name==='Parts'?phase.previous:null;
 if(reassemblyPhase&&partsReassembly){const visibility=phase.name==='Parts'?(phase.mix??1):1-(phase.mix??1),assembly=partsReassembly.pose({phase:reassemblyPhase.p,time:now/1000,reduced,config:cfg,compact:innerWidth<768,visibility,exiting:phase.name!=='Parts'});framePartsReassembly(cfg,assembly,visibility);}else partsReassembly?.deactivate();
 referenceCamera(cfg);updateFooterWatches(phase);window.updateEditorialWatches?.({time:now/1000,phase,reduced});window.poseConceptTourbillon?.({time:now/1000,config:cfg,section:phase.name,phase:phase.p,reduced});applyFrontOcclusion(cfg,phase);referenceContactLight?.update(cfg);updateReferenceDOM(getPhase(domScrollValue),cfg);updateReferenceBackdrop({darkStage:cfg.darkStage,phase:phase.p,section:phase.name,time:now/1000,reduced});renderer.render(scene,camera);actualFrames++;rendererDirty=false;
 const timing=recordReferenceFrameTiming(now,rawFrameMs,currentSection);
 const tb=window.__CONCEPT_TOURBILLON;document.body.dataset.tourbillon=JSON.stringify(tb||null);const diagnostics={loaded:true,section:currentSection,phase:sectionProgress,progress:scrollValue/scrollMax,visible:active.filter(u=>u.root.visible).length,total:359+(tb?.parts||0),baseParts:359,tourbillonParts:tb?.parts||0,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,...timing,errors,playing:isPlaying,frames:actualFrames};document.body.dataset.motion=JSON.stringify(window.__REFERENCE_MOTION);if(!document.body.dataset.surface){const r=window.__SURFACE_REFINEMENT;document.body.dataset.surface=JSON.stringify(r?{materials:r.materials,procedural:r.proceduralMaterials,compiled:r.compiledMaterials,meshCountBefore:r.meshCountBefore,meshCountAfter:r.meshCountAfter,errors:r.shaderErrors}:null);}document.body.dataset.shadow=JSON.stringify(referenceContactLight?.stats());if(!document.body.dataset.optimization)document.body.dataset.optimization=JSON.stringify(window.__REFERENCE_OPTIMIZATION?.snapshot());window.__REFERENCE_APP=diagnostics;document.body.dataset.runtime=JSON.stringify(diagnostics);
}
addEventListener('scroll',()=>{scrollTarget=scrollY;rendererDirty=true;},{passive:true});addEventListener('resize',()=>{resizeFlag=true;rendererDirty=true;});
addEventListener('wheel',()=>{stopReference();selectedLayer=null;holdDown=false;},{passive:true});addEventListener('touchstart',stopReference,{passive:true});
addEventListener('pointermove',e=>{pointerRef.x=e.clientX/innerWidth-.5;pointerRef.y=e.clientY/innerHeight-.5;rendererDirty=true;},{passive:true});
addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;if(e.key==='Escape'){selectedLayer=null;holdDown=false;document.body.style.overflow='';rendererDirty=true;}if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))stopReference();});
const referenceRaycaster=new T.Raycaster(),pointerStart={x:0,y:0,layer:null},rayPointer=new T.Vector2();
function layerAtPointer(e){
 if(currentSection!=='Disassembly'||sectionProgress<.35||sectionProgress>.80)return null;
 rayPointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);referenceRaycaster.setFromCamera(rayPointer,camera);
 // Intersect layer bounding spheres first; intersecting millions of source
 // triangles on every mouse move would make the interaction unresponsive.
 let result=null,distance=Infinity;
 for(const layer of REFERENCE_LAYERS){const center=referenceLayerPosition(layer,blendReference(getPhase()).state);const hit=referenceRaycaster.ray.intersectSphere(new T.Sphere(center,layer.index===0||layer.index>=4?1.7:1.15),new T.Vector3());if(hit&&hit.distanceTo(camera.position)<distance){result=layer.index;distance=hit.distanceTo(camera.position);}}
 return result;
}
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;holdDown=true;holdStarted=performance.now();pointerStart.x=e.clientX;pointerStart.y=e.clientY;pointerStart.layer=layerAtPointer(e);rendererDirty=true;});
renderer.domElement.addEventListener('pointermove',e=>{const hovered=layerAtPointer(e);if(hovered!==hoverLayer){hoverLayer=hovered;rendererDirty=true;}renderer.domElement.style.cursor=hovered!==null?'pointer':'default';});
addEventListener('pointerup',e=>{if(holdDown&&performance.now()-holdStarted<500&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<15&&pointerStart.layer!==null&&pointerStart.layer===layerAtPointer(e))selectedLayer=selectedLayer===pointerStart.layer?null:pointerStart.layer;holdDown=false;rendererDirty=true;});
addEventListener('pointercancel',()=>{holdDown=false;rendererDirty=true;});
$('reference-menu')?.addEventListener('click',()=>{const nav=$('reference-navigation');nav.hidden=!nav.hidden;$('reference-menu').setAttribute('aria-expanded',String(!nav.hidden));});
for(const b of document.querySelectorAll('[data-section-go]'))b.addEventListener('click',e=>{e.preventDefault();seekSection(b.dataset.sectionGo);$('reference-navigation').hidden=true;$('reference-menu').setAttribute('aria-expanded','false');});
for(const b of document.querySelectorAll('[data-finish]'))b.addEventListener('click',()=>{kimiConfiguration?.apply({dial:({steel:'ink',black:'blue',gold:'silver',rose:'ink'}[b.dataset.finish]),hardware:({steel:'silver',black:'graphite',gold:'champagne',rose:'champagne'}[b.dataset.finish]),bracelet:b.dataset.finish==='black'?'graphite':'silver'});if(b.closest('.footer-studies')){finishLocked=true;stopReference();selectedLayer=null;selectionValue=holdValue=0;scrollTarget=scrollValue=domScrollValue=0;scrollTo({top:0,behavior:'instant'});rendererDirty=true;}});
$('reference-play')?.addEventListener('click',()=>{if(!ready)return;if(isPlaying){stopReference();return;}if(scrollValue>scrollMax*.98){scrollTarget=scrollValue=domScrollValue=0;scrollTo({top:0,behavior:'instant'});}isPlaying=true;$('reference-play').querySelector('.play-label').textContent='Pause';$('reference-play').setAttribute('aria-pressed','true');});
$('component-close')?.addEventListener('click',()=>{selectedLayer=null;rendererDirty=true;});
const manager=new T.LoadingManager();manager.onProgress=(url,loaded,total)=>{if($('load-status'))$('load-status').textContent='Now loading · '+Math.round(loaded/total*100)+'%';};
const draco=new DRACOLoader(manager).setDecoderPath('vendor/three/0.160.0/examples/jsm/libs/draco/gltf/');
Promise.all([new GLTFLoader(manager).setDRACOLoader(draco).loadAsync(movementAssetPath),fetch('assets/manifest.json').then(r=>{if(!r.ok)throw Error('Manifest HTTP '+r.status);return r.json();}),new GLTFLoader(manager).setDRACOLoader(draco).loadAsync(exteriorAssetPath),loadSourceFinishes(),new GLTFLoader(manager).loadAsync(tourbillonAssetPath)]).then(([g,m,e,finishes,tb])=>{conceptTourbillonAsset=tb;return build(g,m,e);}).catch(refError);
measureReference();requestAnimationFrame(referenceFrame);
