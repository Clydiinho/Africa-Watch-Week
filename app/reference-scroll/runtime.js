// AWW2K26 Cal.2K26 scroll adaptation (Omega-321 geometry kept as placeholder). Source geometry and finish maps unchanged.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {AWW_ASSETS} from './asset-config.js';
const Q=new URLSearchParams(location.search), RECORD=false;
const $=id=>document.getElementById(id),clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>(x=clamp(x),x*x*(3-2*x)),seg=(a,b,x)=>ease((x-a)/(b-a)),hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296};
const units=[],active=[],pickMeshes=[],UP=new T.Vector3(0,1,0),V=new T.Vector3(),errors=[];
let ready=false,S=0,mode='manual',knollSize=[1,1],packStats=[],photoLight=null;
const dark=false;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.25:1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
renderer.setClearColor(0x000000,0);renderer.domElement.id='watch-canvas';renderer.domElement.setAttribute('aria-hidden','true');document.body.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x0b0b0c);const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.1,400);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x131414}));floor.visible=false;
const shadowTex=new T.Texture(),shadowGeo=new T.PlaneGeometry(1,1);
const notes={'Mainplate':'Carries the wheel train and bridges, setting the assembly datum of the movement.','Plates & Bridges':'Secures the bearings and drive wheels, stabilizing the precision mechanism.','Winding System':'Stores winding energy in the barrel and delivers it to the gear train.','Gear Train':'Passes barrel power down stage by stage, forming the timekeeping train.','Escapement':'Releases the gear train power in measured steps and, with the balance, sets the rhythm.','Balance Wheel':'Oscillates back and forth, providing the rhythm reference for mechanical timekeeping.','Hairspring':'Gives the balance its restoring force, keeping the oscillation steady.','Jewel Bearings':'Supports the fine pivots, reducing friction in rotation.','Springs':'Applies return force, keeping the levers in their working positions.','Dial Indication':'Provides a visual reference for adjustment positions.','Screws':'Fastens neighboring components, holding the assembly in place.','Chronograph Works':'Takes part in the control, support, or drive of the chronograph.'};
const terms=[[/mainplate/,'Mainplate'],[/Y_clutch_bridge/,'Hand-Engraved Clutch Bridge'],[/colw_columns/,'Column Wheel · Seven Pillars'],[/columnwheel_base/,'Column Wheel Base'],[/columnwheel_cap/,'Column Wheel Cap'],[/colw_hub/,'Column Wheel Hub'],[/bridge34/,'Third & Fourth Wheel Bridge'],[/balance_cock/,'Balance Cock'],[/breguet_hairspring/,'Breguet Overcoil Hairspring'],[/barrel_drum/,'Barrel Drum'],[/barrel_teeth/,'Barrel Teeth'],[/barrel_arbor/,'Barrel Arbor'],[/barrel_cover/,'Barrel Cover'],[/ratchet_wheel/,'Ratchet Wheel'],[/crown_wheel/,'Crown Wheel'],[/center_wheel/,'Center Wheel'],[/fourth_wheel/,'Fourth Wheel'],[/third_wheel/,'Third Wheel'],[/pallet_fork/,'Pallet Fork'],[/escape_wheel/,'Escape Wheel'],[/balance_rim/,'Balance Rim'],[/balance_staff/,'Balance Staff'],[/balance_roller/,'Balance Roller'],[/balance_arm/,'Balance Arm'],[/bal_screw/,'Balance Regulating Screw'],[/chrono_runner/,'Chronograph Runner'],[/minute_recorder/,'Minute Recorder'],[/operating_lever/,'Operating Lever'],[/operating_hook/,'Operating Hook'],[/blocking_lever/,'Blocking Lever'],[/reset_lever/,'Reset Lever'],[/clutch_rocker/,'Clutch Rocker'],[/hammer_seconds/,'Seconds Hammer'],[/hammer_minutes/,'Minutes Hammer'],[/minute_jumper/,'Minute Jumper'],[/double_spring/,'Double Spring'],[/heart/,'Heart Cam'],[/clutch_inter_wheel/,'Clutch Intermediate Wheel'],[/chrono_wheel_bridge/,'Chronograph Wheel Bridge'],[/bridge/,'Bridge'],[/cock/,'Cock'],[/hs_collet/,'Hairspring Collet'],[/hs_stud/,'Hairspring Stud'],[/hs_regpin/,'Regulator Pin'],[/hs_.*link/,'Hairspring Link'],[/incabloc_lyre/,'Shock-Absorber Spring'],[/inca_housing/,'Shock-Absorber Housing'],[/inca_boss/,'Shock-Absorber Boss'],[/reg2_ring/,'Regulator Ring'],[/reg3_studscr/,'Stud Adjustment Screw'],[/ra2_index/,'Regulator Index'],[/^ra/,'Rate Adjustment Mark'],[/^scr/,'Fastening Screw'],[/ruby|rjewel|roller_jewel/,'Ruby Jewel'],[/chaton/,'Jewel Chaton'],[/sink|hole/,'Bearing Sink'],[/bushing/,'Bushing'],[/bank.*pin|bankpin/,'Banking Pin'],[/colw_screw/,'Column Wheel Screw'],[/spring|snail/,'Spring Component'],[/^sw.*screw/,'Switch Mechanism Screw'],[/^sw.*col/,'Switch Mechanism Post'],[/^sw.*plate/,'Switch Mechanism Lever'],[/^sw/,'Switch Mechanism Part'],[/^t35.*hubcap/,'Wheel Hub Cap'],[/^t35/,'Transmission Wheel'],[/hr_runner/,'Hour Recorder'],[/hr_stop/,'Hour Stop Lever'],[/switch_lever/,'Switch Lever'],[/recorder_teeth_band/,'Recorder Teeth Band'],[/center_bridge_boss/,'Center Bridge Boss']];
function labelOf(p){if(/[\u4e00-\u9fff]/.test(p.t))return p.t;let name=terms.find(([r])=>r.test(p.n))?.[1]||p.g+' Part';if(/pinion/.test(p.n))name+=' Pinion';else if(/staff/.test(p.n)&&!/balance_staff/.test(p.n))name+=' Arbor';else if(/_csk/.test(p.n))name+=' Countersunk Seat';return name;}
async function build(gltf,manifest,exteriorGLTF){
 const src=gltf.scene;src.updateMatrixWorld(true);const assoc=gltf.parser.associations,json=gltf.parser.json,roots=new Map();src.traverse(o=>{const a=assoc.get(o);if(a?.nodes!==undefined)roots.set(json.nodes[a.nodes].name,o)});
 const allbox=new T.Box3();for(const p of manifest.parts)if(p.g!=='Studio Props')allbox.union(new T.Box3().setFromObject(roots.get(p.n)));const ctr=allbox.getCenter(new T.Vector3());const plateNode=roots.get((manifest.parts.find(p=>/mainplate/i.test(p.n))||{}).n);const plateBox=plateNode?new T.Box3().setFromObject(plateNode):allbox;const plateD=Math.max(plateBox.getSize(new T.Vector3()).x,plateBox.getSize(new T.Vector3()).z);ctr.copy(plateBox.getCenter(new T.Vector3()));const factor=4/Math.max(.001,plateD),norm=new T.Matrix4().makeScale(factor,factor,factor).multiply(new T.Matrix4().makeTranslation(-ctr.x,-ctr.y,-ctr.z));
 for(const p of manifest.parts){const source=roots.get(p.n);if(!source)throw Error('Missing source node: '+p.n);const bb=new T.Box3().setFromObject(source).applyMatrix4(norm),center=bb.getCenter(new T.Vector3()),root=new T.Group(),u={id:units.length,name:p.n,g:/^sw[1-8]_/.test(p.n)?'Finish Samples':p.g,isSample:/^sw[1-8]_/.test(p.n),pno:p.pno,label:labelOf(p),sourceMatrix:p.m,center,size:bb.getSize(new T.Vector3()),root,render:[],on:p.g!=='Studio Props'&&!/^sw[1-8]_/.test(p.n),pos:center.clone(),quat:new T.Quaternion(),kpos:new T.Vector3(),kquat:new T.Quaternion(),equat:new T.Quaternion(),delta:new T.Vector3()};
 source.traverse(o=>{if(!o.isMesh)return;const geom=o.geometry.clone();const restored=restoreSourceFinish(o.material,geom,o.matrixWorld,p.n);ensureOmegaAnisotropyTangents(T,geom,restored,p.n);geom.applyMatrix4(norm.clone().multiply(o.matrixWorld));geom.translate(-center.x,-center.y,-center.z);const mat=restored;mat.envMapIntensity=.95;mat.userData.baseEmissive=mat.emissive?.clone();const mesh=new T.Mesh(geom,mat);mesh.userData.unit=u;root.add(mesh);u.render.push(mesh);if(p.g!=='Studio Props')pickMeshes.push(mesh)});scene.add(root);root.visible=u.on;units.push(u);if(p.g==='Studio Props')continue;active.push(u);u.baseQuat=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI);u.center.applyQuaternion(u.baseQuat);u.pos.copy(u.center);
 const shadow=new T.Mesh(shadowGeo,new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,toneMapped:false,opacity:.5}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);u.shadow=shadow;
 }
 if(units.length!==283||active.length!==278)throw Error('Unexpected manifest part count');
 buildExteriorFromGLTF(exteriorGLTF);planExplosion();planKnoll();if(typeof planKnollAssemblyV5==='function')planKnollAssemblyV5();scene.traverse(o=>{if(o.isMesh)ensureOmegaAnisotropyTangents(T,o.geometry,o.material);});photoLight=installOmegaLightingV4({T,scene,renderer,units});await loadReferenceEnvironment();await onAssetsReady();
}
/* Blender exterior v3: each exported object remains one selectable, movable unit. */
function buildExteriorFromGLTF(gltf){
 if(!gltf?.scene||!gltf.parser?.json)throw Error('Missing Blender exterior GLB');
 if(active.some(u=>u.origin))throw Error('Exterior units already exist; refusing duplicate import');
 const src=gltf.scene;src.updateMatrixWorld(true);
 const json=gltf.parser.json,associations=gltf.parser.associations,nodeObjects=new Map(),objects=[];
 src.traverse(o=>{const a=associations.get(o);if(a?.nodes===undefined)return;const node=json.nodes[a.nodes],name=node?.name||'';if(!name.startsWith('ext_'))return;const item={source:o,index:a.nodes,name,meta:{...(o.userData||{}),...(node.extras||{})}};nodeObjects.set(o,item);objects.push(item);});
 const names=new Set();for(const item of objects){if(names.has(item.name))throw Error('Duplicate Blender object name: '+item.name);names.add(item.name);}
 const reference=objects.find(p=>p.name==='ext_case_mid');if(!reference)throw Error('Blender GLB must contain ext_case_mid');
 const ownerOf=mesh=>{for(let o=mesh;o;o=o.parent)if(nodeObjects.has(o))return nodeObjects.get(o);return null;};
 for(const item of objects){item.meshes=[];item.source.traverse(m=>{if(m.isMesh&&ownerOf(m)===item)item.meshes.push(m);});}
 const meshObjects=objects.filter(p=>p.meshes.length);if(!reference.meshes.length||!meshObjects.length)throw Error('Blender exterior has no independent mesh objects');
 const refBox=new T.Box3();for(const m of reference.meshes)refBox.union(new T.Box3().setFromObject(m));
 const refSize=refBox.getSize(new T.Vector3()),refCenter=refBox.getCenter(new T.Vector3()),diameterWorld=39.7*4/27;
 if(!(refSize.x>0))throw Error('Invalid ext_case_mid diameter');
 /* Blender millimetres/metres are both supported: X diameter gives the single global factor. */
 const factor=diameterWorld/refSize.x,origin=new T.Vector3(refCenter.x,0,refCenter.z);
 const norm=new T.Matrix4().makeScale(factor,factor,factor).multiply(new T.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
 const groups={case:'Case & Crystal',ring:'Case & Crystal',glass:'Case & Crystal',seal:'Case & Crystal',dial:'Dial & Hands',hand:'Dial & Hands',crown:'Crown & Pushers',link:'Bracelet & Clasp',pin:'Bracelet & Clasp',clasp:'Bracelet & Clasp',grain:'Exterior Fasteners'};
 const asArray=(value,n)=>Array.isArray(value)&&value.length===n&&value.every(Number.isFinite);
 const imported=[],claimed=new Set();let vertexCount=0;
 for(const item of meshObjects){
  const {name,source,meta}=item,role=meta.knollRole;if(typeof role!=='string'||!role)throw Error('Missing knollRole on '+name);
  const box=new T.Box3();for(const m of item.meshes)box.union(new T.Box3().setFromObject(m));box.applyMatrix4(norm);
  const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),root=new T.Group(),flatQuat=new T.Quaternion();
  /* Explicit rotations are already a WORLD-Y-UP delta applied to baked geometry. */
  if(asArray(meta.knollQuaternion,4))flatQuat.fromArray(meta.knollQuaternion).normalize();
  else if(asArray(meta.knollEuler,3))flatQuat.setFromEuler(new T.Euler(...meta.knollEuler,'XYZ'));
  else if(meta.knollFlatten===true){const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();source.matrixWorld.decompose(p,q,s);flatQuat.copy(q).invert();}
  if(meta.knollFlip===true)flatQuat.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI));
  const u={id:units.length,name,label:meta.omegaLabel||meta.label||name,g:meta.omegaGroup||groups[role]||'Exterior Parts',pno:null,sourceMatrix:source.matrixWorld.toArray(),center:center.clone(),size,root,render:[],on:true,pos:center.clone(),quat:new T.Quaternion(),baseQuat:new T.Quaternion(),kpos:new T.Vector3(),kquat:new T.Quaternion(),equat:new T.Quaternion(),delta:new T.Vector3(),family:role,kw:Math.max(.035,size.x),kd:Math.max(.035,size.z),rot:0,knollRole:role,knollSide:meta.knollSide,knollOrder:meta.knollOrder,knollColumn:meta.knollColumn,knollBand:meta.knollBand,origin:'blender-exterior-v3',blenderNodeIndex:item.index};
  const flatBox=new T.Box3(),flatPoint=new T.Vector3();
  for(const m of item.meshes){
   if(claimed.has(m))throw Error('Duplicate mesh ownership in '+name);claimed.add(m);
   const geometry=m.geometry.clone();geometry.applyMatrix4(norm.clone().multiply(m.matrixWorld));geometry.translate(-center.x,-center.y,-center.z);
   const cloneMaterial=original=>{const material=original.clone();if(material.name==='sapphire')material.side=T.FrontSide;material.envMapIntensity=.9;material.userData.baseEmissive=material.emissive?.clone();return material;};
   const material=Array.isArray(m.material)?m.material.map(cloneMaterial):cloneMaterial(m.material),mesh=new T.Mesh(geometry,material);mesh.userData.unit=u;mesh.castShadow=(Array.isArray(material)?material:[material]).every(v=>!v.transparent&&!(v.transmission>0));mesh.receiveShadow=true;
   root.add(mesh);u.render.push(mesh);pickMeshes.push(mesh);
   const position=geometry.getAttribute('position');vertexCount+=position.count;for(let i=0;i<position.count;i++){flatPoint.fromBufferAttribute(position,i).applyQuaternion(flatQuat);flatBox.expandByPoint(flatPoint);}
  }
  /* Symmetric conservative X/Z extents keep layout centres stable even for asymmetric curved parts. */
  u.knollFrame={quaternion:flatQuat,kw:Math.max(.035,2*Math.max(Math.abs(flatBox.min.x),Math.abs(flatBox.max.x))),kd:Math.max(.035,2*Math.max(Math.abs(flatBox.min.z),Math.abs(flatBox.max.z))),minY:flatBox.min.y,maxY:flatBox.max.y};
  u.kw=u.knollFrame.kw;u.kd=u.knollFrame.kd;root.position.copy(center);scene.add(root);
  const shadow=new T.Mesh(shadowGeo,new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,toneMapped:false,opacity:.5}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);u.shadow=shadow;
  units.push(u);active.push(u);imported.push(u);
 }
 let unclaimed=0;src.traverse(m=>{if(m.isMesh&&!claimed.has(m))unclaimed++;});if(unclaimed)throw Error('Exterior GLB contains '+unclaimed+' mesh(es) without ext_* object ownership');
 const expected=json.nodes.filter(n=>n.name?.startsWith('ext_')&&n.mesh!==undefined).length;if(expected!==imported.length)throw Error('Exterior object count mismatch: '+expected+' exported / '+imported.length+' imported');
 window.__EXTERIOR={version:2,origin:'blender-aww2k26-placeholder',asset:AWW_ASSETS.exterior,model:'AWW2K26 placeholder',units:imported.length,meshObjects:expected,renderMeshes:claimed.size,vertices:vertexCount,scaleFactor:factor,sourceCaseWidth:refSize.x,caseDiameter:diameterWorld,scale:'4 world = 27 mm',dialSide:'+Y',normalizationOrigin:origin.toArray(),roleCounts:imported.reduce((r,u)=>(r[u.knollRole]=(r[u.knollRole]||0)+1,r),{}),flattened:imported.filter(u=>u.knollFrame.quaternion.angleTo(new T.Quaternion())>1e-6).length};
}

/* The existing packer calls these hooks; its functional grouping and rectangle packing stay intact. */
function initializeKnollFrame(u){
 u.kw=Math.max(.035,u.size.x);u.kd=Math.max(.035,u.size.z);u.rot=0;u.knollAlign=Number.isFinite(u.knollBaseAngle)?-u.knollBaseAngle:0;
 if(u.knollFrame){u.kw=u.knollFrame.kw;u.kd=u.knollFrame.kd;u.knollAlign=0;return;}
 if(u.knollAlign&&u.render?.length){const c=Math.cos(u.knollAlign),s=Math.sin(u.knollAlign);let mx=0,mz=0;for(const mesh of u.render){const a=mesh.geometry?.attributes.position;if(!a)continue;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);mx=Math.max(mx,Math.abs(c*x+s*z));mz=Math.max(mz,Math.abs(-s*x+c*z));}}if(mx&&mz){u.kw=Math.max(.035,mx*2);u.kd=Math.max(.035,mz*2);}}
}
function setKnollUnitPose(u,x,z,rotation){
 u.rot=rotation;u.kpos.set(x,u.knollFrame?-.238-u.knollFrame.minY:u.size.y/2-.238,z);
 u.kquat.setFromAxisAngle(UP,rotation*Math.PI/2);
 if(u.knollFrame)u.kquat.multiply(u.knollFrame.quaternion);
 else{u.kquat.multiply(new T.Quaternion().setFromAxisAngle(UP,u.knollAlign||0));if(u.name==='ext_caseback_ring')u.kquat.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI));}
}
function unitPoseCorner(u,index,knollProgress){
 if(knollProgress>.99999&&u.serviceKnollBounds){const b=u.serviceKnollBounds;return new T.Vector3(index&1?b.max.x:b.min.x,index&2?b.max.y:b.min.y,index&4?b.max.z:b.min.z).add(u.pos);}
 if(knollProgress>.99999&&u.knollFrame){const f=u.knollFrame,w=u.rot?f.kd:f.kw,d=u.rot?f.kw:f.kd;return new T.Vector3((index&1?1:-1)*w/2,index&2?f.maxY:f.minY,(index&4?1:-1)*d/2).add(u.pos);}
 return new T.Vector3((index&1?1:-1)*u.size.x/2,(index&2?1:-1)*u.size.y/2,(index&4?1:-1)*u.size.z/2).applyQuaternion(u.quat).add(u.pos);
}

// Minimum projected bounding boxes are silhouette hashes; functional bins subdivide into shape families.
function shape(u){const s=u.size,r=Math.max(s.x,s.z)/Math.max(.001,Math.min(s.x,s.z));if(/screw|^scr|^j_|ruby|chaton|hubcap|^ra|_col\d/.test(u.name))return 'grain';if(r>3.1)return 'rod';if(/wheel|rim|ring|barrel|heart|colw|roller/.test(u.name))return 'round';return 'plate';}
function packing(list,width){
 const pad=.035,rows=[],placed=[];let height=0;
 // Strip packing, decreasing silhouette area within each shape family. 0/90-degree candidates only.
 for(const u of [...list].sort((a,b)=>b.kw*b.kd-a.kw*a.kd||a.name.localeCompare(b.name))){let best=null;
  for(let rot=0;rot<2;rot++){let w=(rot?u.kd:u.kw)+pad*2,h=(rot?u.kw:u.kd)+pad*2;if(w>width)continue;for(const row of rows)if(h<=row.h&&row.x+w<=width){const score=(row.h-h)*width+(width-row.x-w)*.05;if(!best||score<best.score)best={row,w,h,rot,score}}}
  if(!best){let rot=u.kd>u.kw&&u.kd+pad*2<=width?1:0,w=(rot?u.kd:u.kw)+pad*2,h=(rot?u.kw:u.kd)+pad*2;if(w>width){rot=1-rot;w=(rot?u.kd:u.kw)+pad*2;h=(rot?u.kw:u.kd)+pad*2}const row={x:0,z:height,h};rows.push(row);height+=h;best={row,w,h,rot};}
  const b=best;placed.push({u,x:b.row.x+b.w/2,z:b.row.z+b.h/2,rot:b.rot});b.row.x+=b.w;
 }return{placed,w:width,h:height};
}
/* Whole-watch knoll: a bracelet spine, independent circular anchors, and local functional bins. */
/* Whole-watch knoll: a bracelet spine, independent circular anchors, and local functional bins. */
/* Whole-watch knoll: a bracelet spine, independent circular anchors, and local functional bins. */
/* Whole-watch knoll: a bracelet spine, independent circular anchors, and local functional bins. */
function planKnoll(){
 const visible=active.filter(u=>!u.isSample),samples=active.filter(u=>u.isSample),D=4;
 const itemGap=.07,groupGap=.22,EPS=1e-7;
 const used=new Set(),blocks=[];
 const family=u=>{const role=u.knollRole||'',n=u.name||'',r=Math.max(u.kw,u.kd)/Math.max(.001,Math.min(u.kw,u.kd));if(role==='pin')return'rod';if(role==='grain'||u.g==='Screws'||/ruby|chaton|jewel|hubcap|_screw|^scr|^j_/.test(n))return'grain';if(r>3.1||role==='hand')return'rod';if(/wheel|rim|ring|barrel|heart|colw|roller/.test(n)||['ring','seal','glass'].includes(role))return'round';return'plate';};
 for(const u of active){initializeKnollFrame(u);u.family=family(u);u.kquat.identity();}
 /* Maximal free rectangles preserve compact local groups without a global tile grid. */
 const split=(free,r)=>{
  const next=[];for(const f of free){if(r.x>=f.x+f.w-EPS||r.x+r.w<=f.x+EPS||r.z>=f.z+f.h-EPS||r.z+r.h<=f.z+EPS){next.push(f);continue;}
   if(r.x>f.x+EPS)next.push({x:f.x,z:f.z,w:r.x-f.x,h:f.h});if(r.x+r.w<f.x+f.w-EPS)next.push({x:r.x+r.w,z:f.z,w:f.x+f.w-r.x-r.w,h:f.h});
   if(r.z>f.z+EPS)next.push({x:f.x,z:f.z,w:f.w,h:r.z-f.z});if(r.z+r.h<f.z+f.h-EPS)next.push({x:f.x,z:r.z+r.h,w:f.w,h:f.z+f.h-r.z-r.h});}
  return next.filter((a,i)=>a.w>EPS&&a.h>EPS&&!next.some((b,j)=>j!==i&&a.x>=b.x-EPS&&a.z>=b.z-EPS&&a.x+a.w<=b.x+b.w+EPS&&a.z+a.h<=b.z+b.h+EPS&&(j<i||a.w*a.h<b.w*b.h-EPS)));
 };
 const overlap=(a,b)=>a.x<b.x+b.w-EPS&&a.x+a.w>b.x+EPS&&a.z<b.z+b.h-EPS&&a.z+a.h>b.z+EPS;
 function rectPack(items,W,H,reserved=[]){
  if(reserved.some(r=>r.x<0||r.z<0||r.x+r.w>W+EPS||r.z+r.h>H+EPS)||reserved.some((r,i)=>reserved.slice(0,i).some(q=>overlap(r,q))))return null;
  let free=[{x:0,z:0,w:W,h:H}];for(const r of reserved)free=split(free,r);const out=[];
  for(const item of items){let best=null;for(const f of free)for(let rot=0;rot<(item.noRotate?1:2);rot++){
   const w=rot?item.h:item.w,h=rot?item.w:item.h;if(w>f.w+EPS||h>f.h+EPS)continue;
   const score=Math.min(f.w-w,f.h-h)*6+Math.max(f.w-w,f.h-h)*.12+f.z*.018;
   if(!best||score<best.score)best={item,x:f.x,z:f.z,w,h,rot,score};}
   if(!best)return null;out.push(best);free=split(free,best);
  }return out;
 }
 function local(list,width){
  const items=[...list].sort((a,b)=>b.kw*b.kd-a.kw*a.kd||a.name.localeCompare(b.name)).map(u=>({u,w:u.kw+itemGap,h:u.kd+itemGap}));
  width=Math.max(width,...items.map(i=>Math.min(i.w,i.h)));let h=Math.max(...items.map(i=>Math.min(i.w,i.h)),items.reduce((s,i)=>s+i.w*i.h,0)/width),placed=null;
  for(let n=0;n<90&&!placed;n++,h*=1.04)placed=rectPack(items,width,h);
  if(!placed)throw Error('Knoll local bin did not fit');
  return{w:Math.max(...placed.map(p=>p.x+p.w)),h:Math.max(...placed.map(p=>p.z+p.h)),placed:placed.map(p=>({u:p.item.u,x:p.x+p.w/2,z:p.z+p.h/2,rot:p.rot}))};
 }
 function add(label,list,width,kind='mechanism'){
  if(!list.length)return;const p=local(list,width);const block={label,kind,...p,w:p.w+groupGap,h:p.h+groupGap};blocks.push(block);for(const u of list)used.add(u);return block;
 }
 function matrix(label,list,cols,kind='grain'){
  if(!list.length)return;list=[...list].sort((a,b)=>b.kw*b.kd-a.kw*a.kd||a.name.localeCompare(b.name,undefined,{numeric:true}));
  const dx=Math.max(...list.map(u=>u.kw))+itemGap,dz=Math.max(...list.map(u=>u.kd))+itemGap;
  const block={label,kind,w:cols*dx+groupGap,h:Math.ceil(list.length/cols)*dz+groupGap,placed:list.map((u,i)=>({u,x:(i%cols+.5)*dx,z:(Math.floor(i/cols)+.5)*dz,rot:0})),pitch:[dx,dz],cols};blocks.push(block);list.forEach(u=>used.add(u));return block;
 }
 /* Three independently positioned metal pieces per bracelet row retain the recognisable band. */
 const links=visible.filter(u=>u.knollRole==='link'),clasps=visible.filter(u=>u.knollRole==='clasp');let spine=null;
 if(links.length){
  const rows=new Map();for(const u of links){const fallback=u.name.match(/(?:link|endlink)_(-?1)_([0-9]+)/),side=Number.isFinite(+u.knollSide)?+u.knollSide:(fallback?+fallback[1]:1),order=Number.isFinite(+u.knollOrder)?+u.knollOrder:(fallback?+fallback[2]:u.id),key=`${side}:${u.knollBand??order}`;
   if(!rows.has(key))rows.set(key,{side,order,list:[]});rows.get(key).list.push(u);}
  const sorted=[...rows.values()].sort((a,b)=>a.side-b.side||(a.side<0?b.order-a.order:a.order-b.order)),column=u=>Number.isFinite(+u.knollColumn)?+u.knollColumn:(/_left|_L/.test(u.name)?-1:/_right|_R/.test(u.name)?1:0);
  const widths=new Map(),columnLinks=sorted.some(r=>r.list.length>1)?sorted.filter(r=>r.list.length>1).flatMap(r=>r.list):links;for(const u of columnLinks){const col=column(u);widths.set(col,Math.max(widths.get(col)||0,u.kw));}
  const columns=[...widths.keys()].sort((a,b)=>a-b),chainWidth=[...widths.values()].reduce((s,w)=>s+w,0)+Math.max(0,columns.length-1)*.085,positions=new Map();let cursor=0;
  for(const col of columns){positions.set(col,cursor+widths.get(col)/2);cursor+=widths.get(col)+.085;}
  const placed=[];let z=0,inserted=false;
  function putClasps(){if(inserted)return;inserted=true;if(!clasps.length)return;z+=.19;for(const u of [...clasps].sort((a,b)=>(a.knollOrder??0)-(b.knollOrder??0)||a.name.localeCompare(b.name))){placed.push({u,x:chainWidth/2,z:z+u.kd/2,rot:0});z+=u.kd+.16;used.add(u);}z+=.05;}
  for(let i=0;i<sorted.length;i++){const row=sorted[i];if(i&&sorted[i-1].side!==row.side)putClasps();const height=Math.max(...row.list.map(u=>u.kd));
   for(const u of row.list){placed.push({u,x:row.list.length===1?chainWidth/2:positions.get(column(u)),z:z+height/2,rot:0});used.add(u);}z+=height+.095;}
  if(!inserted)putClasps();
  let minX=Math.min(...placed.map(p=>p.x-p.u.kw/2)),maxX=Math.max(...placed.map(p=>p.x+p.u.kw/2));for(const p of placed)p.x-=minX;
  spine={label:'Steel Bracelet & Folding Clasp / Individual Links',kind:'spine',w:maxX-minX+groupGap,h:z-.095+groupGap,placed,noRotate:true};
 }
 /* Glass, seals, dial, case and back all have their own non-overlapping anchor. */
 const anchorParts=visible.filter(u=>!used.has(u)&&((['case','ring','glass','dial','seal'].includes(u.knollRole)&&u.kw*u.kd>3.5)||u.kw*u.kd>6.0));
 for(const u of anchorParts.sort((a,b)=>b.kw*b.kd-a.kw*a.kd))add(u.label||u.name,[u],u.kw+itemGap,'anchor');
 matrix('Fastening Screws / Even Matrix',visible.filter(u=>!used.has(u)&&(u.g==='Screws'||u.knollRole==='grain')),11);
 const pins=visible.filter(u=>!used.has(u)&&u.knollRole==='pin');matrix('Link Pins / Even Matrix',pins,pins.length>16?2:1,'pins');
 matrix('Balance Regulating Screws / Series of Eight',visible.filter(u=>!used.has(u)&&/^bal_screw\d+$/.test(u.name)),8);
 /* Every functional mechanism keeps its own compact footprint; large families split into adjacent bins. */
 const groupOrder=['Winding System','Gear Train','Chronograph Works','Plates & Bridges','Balance Wheel','Hairspring','Escapement','Jewel Bearings','Springs','Dial Indication'];
 const groupNames=[...new Set(visible.filter(u=>!used.has(u)).map(u=>u.g))].sort((a,b)=>(groupOrder.indexOf(a)<0?99:groupOrder.indexOf(a))-(groupOrder.indexOf(b)<0?99:groupOrder.indexOf(b)));
 for(const g of groupNames){const group=visible.filter(u=>!used.has(u)&&u.g===g),area=group.reduce((s,u)=>s+(u.kw+itemGap)*(u.kd+itemGap),0);
  const families=g==='Chronograph Works'||(group.length>18&&area>6)?['plate','round','rod','grain']:['all'];
  for(const f of families){const list=group.filter(u=>f==='all'||u.family===f);if(!list.length)continue;const a=list.reduce((s,u)=>s+(u.kw+itemGap)*(u.kd+itemGap),0),width=Math.max(1.2,Math.min(4.2,Math.sqrt(a*1.18)));add(g+(f==='all'?'':' / '+({plate:'Levers & Bridges',round:'Wheels & Cams',rod:'Rods & Springs',grain:'Arbors & Bearings'}[f])),list,width,g==='Chronograph Works'?'chronograph':'mechanism');}
 }
 if(visible.some(u=>!used.has(u)))throw Error('Knoll omitted visible units');
 const viewportAspect=Math.max(.45,Math.min(2.4,(typeof innerWidth==='number'?innerWidth/innerHeight:1.6))),turn=viewportAspect>1.12?1:0,aspect=turn?1/viewportAspect:viewportAspect;
 const anchors=blocks.filter(b=>b.kind==='anchor'),choose=re=>anchors.find(b=>b.placed.length===1&&re.test(b.placed[0].u.name));
 const special=[
  [choose(/^ext_(case_mid|case_middle|midcase)$/),.77,.53],
  [choose(/^ext_(bezel|tachymeter_bezel)$/),.77,.10],
  [choose(/^ext_(sapphire|front_crystal|front_glass|crystal_front)$/),.23,.10],
  [choose(/^ext_(caseback|caseback_ring|back_ring)$/),.23,.90],
  [choose(/^ext_(step_dial|dial)$/),.77,.90]
 ].filter(([b],i,a)=>b&&a.findIndex(([q])=>q===b)===i);
 const total=blocks.reduce((s,b)=>s+b.w*b.h,0)+(spine?spine.w*spine.h:0),widest=Math.max(...anchors.map(b=>Math.min(b.w,b.h)),0);
 let H=Math.max(Math.sqrt(total/aspect)*1.03,spine?spine.h:0,(widest*2+(spine?spine.w:0)+.16)/aspect),W,layout=null,reserved=[],spineRect=null;
 const ordered=blocks.filter(b=>!special.some(([s])=>s===b)).sort((a,b)=>(b.kind==='anchor')-(a.kind==='anchor')||b.w*b.h-a.w*a.h||a.label.localeCompare(b.label));
 for(let attempt=0;attempt<110&&!layout;attempt++,H*=1.018){
  W=H*aspect;spineRect=spine?{item:spine,x:(W-spine.w)/2,z:(H-spine.h)/2,w:spine.w,h:spine.h,rot:0}:null;
  reserved=spineRect?[spineRect]:[];for(const[b,x,z]of special)reserved.push({item:b,x:Math.max(0,Math.min(W-b.w,W*x-b.w/2)),z:Math.max(0,Math.min(H-b.h,H*z-b.h/2)),w:b.w,h:b.h,rot:0});
  layout=rectPack(ordered,W,H,reserved);
 }
 if(!layout)throw Error('Whole-watch knoll did not fit');
 /* Pull small functional bins into central residual spaces, preserving their local grids. */
 const movable=layout.filter(r=>r.item.kind!=='anchor').sort((a,b)=>b.w*b.h-a.w*a.h);
 for(let pass=0;pass<2;pass++)for(const current of movable){
  let free=[{x:0,z:0,w:W,h:H}];for(const r of [...reserved,...layout])if(r!==current)free=split(free,r);
  const distance=(x,z,w,h)=>Math.hypot((x+w/2-W/2)*1.15,z+h/2-H/2);let best={...current,score:distance(current.x,current.z,current.w,current.h)};
  for(const f of free)for(let rot=0;rot<2;rot++){const w=rot?current.item.h:current.item.w,h=rot?current.item.w:current.item.h;if(w>f.w+EPS||h>f.h+EPS)continue;
   const x=Math.max(f.x,Math.min(f.x+f.w-w,W/2-w/2)),z=Math.max(f.z,Math.min(f.z+f.h-h,H/2-h/2)),score=distance(x,z,w,h);
   if(score<best.score-1e-5)best={item:current.item,x,z,w,h,rot,score};}
  Object.assign(current,best);
 }
 const records=[];
 function put(b,r,auxiliary=false){
  for(const p of b.placed){const qx=p.x+groupGap/2,qz=p.z+groupGap/2,x=r.x+(r.rot?b.h-qz:qx),z=r.z+(r.rot?qx:qz);const u=p.u;
   setKnollUnitPose(u,turn?-z:x,turn?x:z,(p.rot+r.rot+turn)%2);}
  records.push({label:b.label,kind:b.kind,x:turn?-(r.z+r.h):r.x,z:turn?r.x:r.z,w:turn?r.h:r.w,h:turn?r.w:r.h,count:b.placed.length,auxiliary,pitch:b.pitch,cols:b.cols});
 }
 for(const r of reserved)put(r.item,r);for(const r of layout)put(r.item,r);
 function bounds(list){let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;for(const u of list){const w=u.rot?u.kd:u.kw,h=u.rot?u.kw:u.kd;minX=Math.min(minX,u.kpos.x-w/2);maxX=Math.max(maxX,u.kpos.x+w/2);minZ=Math.min(minZ,u.kpos.z-h/2);maxZ=Math.max(maxZ,u.kpos.z+h/2);}return{minX,minZ,maxX,maxZ,w:maxX-minX,h:maxZ-minZ};}
 const box=bounds(visible),cx=(box.minX+box.maxX)/2,cz=(box.minZ+box.maxZ)/2;
 for(const u of visible){u.kpos.x-=cx;u.kpos.z-=cz;}for(const b of records){b.x-=cx;b.z-=cz;}
 knollSize=[box.w,box.h];
 /* Source-only workshop samples stay inspectable in a separate tray outside the normal camera fit. */
 if(samples.length){const p=local(samples,Math.max(5.0,Math.min(9,Math.sqrt(samples.reduce((s,u)=>s+u.kw*u.kd,0)*1.3)))),b={label:'Source Finish Samples / Auxiliary Tray',kind:'samples',...p,w:p.w+groupGap,h:p.h+groupGap};
  const x=box.w/2+1.0,z=-b.h/2;for(const q of p.placed){setKnollUnitPose(q.u,x+q.x,z+q.z,q.rot);used.add(q.u);}records.push({label:b.label,kind:b.kind,x,z,w:b.w,h:b.h,count:samples.length,auxiliary:true});}
 packStats=records;
 const unitRects=list=>list.map(u=>({u,x:u.kpos.x-(u.rot?u.kd:u.kw)/2,z:u.kpos.z-(u.rot?u.kw:u.kd)/2,w:u.rot?u.kd:u.kw,h:u.rot?u.kw:u.kd}));
 const rects=unitRects(active);let overlaps=0;const overlapNames=[];for(let i=0;i<rects.length;i++)for(let j=0;j<i;j++)if(overlap(rects[i],rects[j])){overlaps++;if(overlapNames.length<12)overlapNames.push([rects[i].u.name,rects[j].u.name]);}
 if(typeof window!=='undefined'){
  window.__KNOLL_QA={parts:visible.length,totalParts:active.length,placed:used.size,sampleParts:samples.length,overlaps,overlapNames,footprintArea:box.w*box.h,partBoxArea:visible.reduce((s,u)=>s+u.kw*u.kd,0),aspect:box.w/box.h,viewportAspect,turn:turn*90};
  window.__KNOLL_SAMPLE_BOUNDS=samples.length?bounds(samples):null;window.__KNOLL_ALL_BOUNDS=bounds(active);
 }
}

function byName(name){return active.find(u=>u.name===name);}
function focusOf(name,fallback=[0,-.3,0]){return byName(name)?.pos.clone()||new T.Vector3(...fallback);}
function cameraFit(dir,target=null,padding=1.08,selection=null){
 dir=dir.clone().normalize();const right=new T.Vector3().crossVectors(UP,dir).normalize();if(right.lengthSq()<.01)right.set(1,0,0);
 const up=new T.Vector3().crossVectors(dir,right),corners=[],bounds=new T.Box3(),k=seg(.70,1,S);
 for(const u of selection||active){if(!u.on)continue;for(let i=0;i<8;i++){const p=unitPoseCorner(u,i,k);corners.push(p);bounds.expandByPoint(p);}}
 if(!corners.length)return{pos:new T.Vector3(0,12,12),target:new T.Vector3(),fov:32,rearMix:0};
 target=target?.clone()||bounds.getCenter(new T.Vector3());const vf=Math.tan(T.MathUtils.degToRad(16)),hf=vf*camera.aspect;let dist=0;
 for(const p of corners){const v=p.clone().sub(target);dist=Math.max(dist,Math.abs(v.dot(right))/hf+v.dot(dir),Math.abs(v.dot(up))/vf+v.dot(dir));}
 return{pos:target.clone().addScaledVector(dir,dist*padding),target,fov:32,rearMix:clamp(-dir.y*1.6)};
}
function detailPose(focus,dir,dist,fov=30){
 const target=typeof focus==='string'?focusOf(focus):focus.clone();dir=dir.clone().normalize();
 dist*=Math.max(1,Math.min(1.8,.95/camera.aspect));
 return{pos:target.clone().addScaledVector(dir,dist),target,fov,rearMix:clamp(-dir.y*1.6)};
}
/* Interpolate viewing angles and stand-off, keeping the camera outside the model
 * while crossing from the decorated rear face to the dial side. */
function mixPose(a,b,p){
 const da=a.pos.clone().sub(a.target),db=b.pos.clone().sub(b.target),ra=da.length(),rb=db.length();da.normalize();db.normalize();
 const yawA=Math.atan2(da.x,da.z),yawB=yawA+Math.atan2(Math.sin(Math.atan2(db.x,db.z)-yawA),Math.cos(Math.atan2(db.x,db.z)-yawA));
 const yaw=T.MathUtils.lerp(yawA,yawB,p),pitch=T.MathUtils.lerp(Math.asin(da.y),Math.asin(db.y),p),target=a.target.clone().lerp(b.target,p);
 const dir=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
 return{pos:target.clone().addScaledVector(dir,T.MathUtils.lerp(ra,rb,p)),target,fov:T.MathUtils.lerp(a.fov,b.fov,p),rearMix:clamp(-dir.y*1.6)};
}
function meanFocusV5(names,weight=.65){
 const available=names.map(byName).filter(Boolean),point=new T.Vector3();
 if(!available.length)return point.set(0,-.3,0);
 for(const u of available)point.add(u.pos);point.multiplyScalar(1/available.length);
 return point.lerp(new T.Vector3(0,point.y,0),1-weight);
}
/* Cal.321 V5 service motion. Include in the page module after removing V4
 * planExplosion/stagedOffset. It does not edit geometry, materials or source poses.
 * Evidence: omega-work/assembly-v5/STRUCTURE-REFERENCES.md and geometry-audit.
 * No mesh name/centroid/hash fallback is used for unknown supporting surfaces.
 */
const V5_ASSEMBLY_HOLD = Object.freeze([15.5, 17]);
let assemblyRigV5 = null;
const v5Clamp = x => Math.max(0, Math.min(1, x));
const v5Ease = x => { x = v5Clamp(x); return x*x*x*(x*(x*6-15)+10); };
const v5Range = (a,b,t) => b > a ? v5Ease((t-a)/(b-a)) : +(t >= b);
const V5_ZERO = [0,0,0];

function planExplosion() {
  const map = new Map(active.map(u => [u.name,u]));
  const assigned = new Set(), groups = [], missing = [];
  const add = (id,carrier,names,kind,delta,assemble,disassemble,extra={}) => {
    const members = names.map(n => { const u=map.get(n); if(!u)missing.push(n); return u; }).filter(Boolean);
    if(!members.length)return null;
    if(!map.has(carrier))throw Error('V5 missing carrier '+carrier);
    for(const u of members){if(assigned.has(u))throw Error('V5 duplicate service member '+u.name);assigned.add(u);}
    const g={id,carrier,members,kind,delta:new T.Vector3(...delta),assemble,disassemble,...extra};
    groups.push(g);return g;
  };
  const existing = names => names.filter(n=>map.has(n));
  const bearing = stem => existing([stem+'_ruby',stem+'_sink',stem+'_chaton',stem+'_chatonfun']);
  const screw = (g,name,travel=.60) => {
    const u=map.get(name);if(!u)return;
    if(assigned.has(u))throw Error('V5 duplicate screw '+name);
    assigned.add(u);g.members.push(u);
    u.v5Retainer={travel,axis:new T.Vector3(0,-1,0),
      assemble:[g.assemble[1],g.assemble[1]+.20],
      disassemble:[g.disassemble[0]-.24,g.disassemble[0]-.025]};
  };
  const seat = (g,name) => {const u=map.get(name+'_csk');if(!u)return;if(assigned.has(u))throw Error('V5 duplicate seat '+u.name);assigned.add(u);g.members.push(u);};
  for(const u of active){delete u.v5Retainer;delete u.v5Pin;delete u.v5Control;u.unlock=0;u.axial=new T.Vector3();u.equat.copy(u.baseQuat||new T.Quaternion());}

  // Wheel staffs within the source's unbored mainplate stay in the fixed core.
  // Only the exposed escapement can lift on the rear side without crossing it.
  add('escape-wheel','escape_wheel',['escape_wheel'],'wheel-module',[0,-.48,0],[1.20,1.72],[25.95,26.50]);
  add('pallet-fork','pallet_fork',['pallet_fork'],'wheel-module',[0,-.62,0],[1.48,1.98],[25.70,26.22]);
  let g=add('escape-cock','escape_cock',['escape_cock',...bearing('j_escape')],'carrier',[0,-1.03,0],[1.82,2.34],[25.27,25.87]);
  g=add('train-bridge','321.1002_bridge34',['321.1002_bridge34',...bearing('j_third'),...bearing('j_fourth')],'carrier',[0,-.88,0],[2.02,2.65],[25.05,25.68]);
  // Only b34_1 remains on the rear bridge in the audited source. 0/2/3 are
  // on/below the mainplate and are held fixed, including their countersinks.
  screw(g,'scr_b34_1');seat(g,'scr_b34_1');
  g=add('pallet-cock','pallet_cock',['pallet_cock',...bearing('j_pallet')],'carrier',[0,-1.18,0],[2.43,2.98],[24.88,25.44]);
  screw(g,'scr_pcock');seat(g,'scr_pcock');
  g=add('center-bridge','center_bridge_S17',['center_bridge_S17','center_bridge_boss',...bearing('j_center'),...bearing('j_chrono')],'carrier',[0,-1.40,0],[2.82,3.38],[24.35,25.04]);
  // Current ray evidence places central jewels at the boss, not at the moved
  // chrono bridge. The conflicting barrel jewel and hr bearing remain core.
  add('upper-fourth','upper_fourth_wheel',['upper_fourth_wheel'],'wheel-module',[0,-1.66,0],[3.10,3.62],[24.05,24.64]);
  const balanceNames=active.filter(u=>!u.origin&&(
    /^(balance_|bal_screw|hs_|inca|reg|ra2_|ra3_|raA_|raR_|j_balance_)/.test(u.name)||
    ['breguet_hairspring','roller_jewel','321.1006_balance_cock'].includes(u.name))).map(u=>u.name);
  g=add('balance-service','321.1006_balance_cock',balanceNames,'service-module',[0,-2.02,0],[3.50,4.16],[23.45,24.14]);
  screw(g,'scr_bcock');seat(g,'scr_bcock');
  add('chrono-runner','321.1705_chrono_runner',['321.1705_chrono_runner','chrono_arbor','chrono_heart'],'wheel-module',[0,-2.63,0],[4.18,4.70],[23.45,24.00]);
  add('minute-recorder','321.1708_minute_recorder',['321.1708_minute_recorder','minrec_heart','recorder_teeth_band'],'wheel-module',[0,-2.73,0],[4.35,4.88],[23.24,23.81]);
  g=add('column-wheel','colw_columns',['columnwheel_base','colw_hub','columnwheel_cap','colw_columns'],'wheel-module',[0,-2.60,0],[4.12,4.72],[23.37,23.96]);
  screw(g,'colw_screw',.48);
  g=add('clutch-service','clutch_rocker',['clutch_rocker','clutch_inter_wheel',...bearing('j_clutch_w')],'service-module',[0,-3.00,0],[4.68,5.21],[22.90,23.46]);
  screw(g,'scr_lev_3');seat(g,'scr_lev_3');
  g=add('chrono-bridge','chrono_wheel_bridge',['chrono_wheel_bridge',...bearing('j_minrec')],'carrier',[0,-3.27,0],[4.96,5.50],[22.53,23.11]);
  // s5_rebuild.py explicitly assigns these two pivots to this retaining bridge.
  for(const n of ['scr_lev_4','scr_lev_5']){screw(g,n);seat(g,n);}
  g=add('chrono-reset-controls','hammer_seconds',['hammer_seconds','hammer_minutes','blocking_lever','reset_lever','minute_jumper'],'service-module',[0,-3.39,0],[5.10,5.69],[22.12,22.83]);
  for(const n of ['scr_lev_1','scr_lev_2']){screw(g,n);seat(g,n);}
  g=add('engraved-bridge','Y_clutch_bridge',['Y_clutch_bridge','ycl_bankpin'],'carrier',[0,-3.72,0],[5.52,6.08],[21.55,22.27]);
  for(const n of ['scr_ybr_0','scr_ybr_1']){screw(g,n);seat(g,n);}
  g=add('chrono-operating-controls','operating_lever',['operating_lever','operating_hook','double_spring','321.1730_operating_lever_spring','r45_hammer_spring'],'service-module',[0,-4.38,0],[6.05,6.58],[20.95,21.62]);
  for(const n of ['scr_lev_0','scr_r45_hs']){screw(g,n);seat(g,n);}

  // Case: retain both rear glass and rear gasket with the same ring. This
  // removes V4's measured back-gasket/ring crossover. No invented unscrewing.
  add('case-mid','ext_case_mid',['ext_case_mid','ext_movement_spacer'],'case-module',[0,1.48,0],[6.82,7.61],[20.20,20.88]);
  add('caseback','ext_caseback_ring',['ext_caseback_ring','ext_rear_crystal','ext_back_gasket'],'case-module',[0,-6.22,0],[11.04,11.66],[18.72,19.40]);
  add('dial','ext_step_dial',['ext_step_dial'],'case-module',[0,2.52,0],[7.75,8.41],[19.67,20.31]);
  const hands=[
    ['ext_small_seconds_hand',3.01,8.48,8.83],['ext_30minute_hand',3.15,8.60,8.95],['ext_12hour_hand',3.29,8.72,9.07],
    ['ext_hour_hand',3.40,8.48,8.93],['ext_minute_hand',3.86,9.02,9.43],['ext_chrono_hand',4.32,9.52,9.91]
  ];
  for(const [n,y,a,b]of hands){
    const rev=(n==='ext_chrono_hand'?0:n==='ext_minute_hand'?.36:n==='ext_hour_hand'?.71:.80);
    add(n,n,[n],'case-module',[0,y,0],[a,b],[18.92+rev,19.30+rev]);
  }
  add('bezel','ext_bezel',['ext_bezel'],'case-module',[0,4.83,0],[10.00,10.48],[18.68,19.10]);
  add('front-crystal','ext_front_crystal',['ext_front_crystal','ext_front_gasket'],'case-module',[0,5.66,0],[10.57,11.08],[18.14,18.65]);
  const ports=[['ext_crown',[1,0,0]],['ext_pusher_upper',[.8910065,0,-.4539905]],['ext_pusher_lower',[.8910065,0,.4539905]]];
  for(const [n,axis]of ports){
    g=add(n,n,[n],'case-module',V5_ZERO,[7.63,8.06],[19.55,20.00],{parentGroup:'case-mid'});
    map.get(n).v5Control={axis:new T.Vector3(...axis).normalize(),travel:1.15};
  }

  // Each strip and pin shares its row transform. First clear pin along X,
  // then move the row; during assembly settle the row before inserting pin.
  // Travel comes from the actual finite mesh bounds: 2.838889 + margin.
  for(const side of [-1,1]){
    const end=map.get('ext_endlink_'+side),direction=Math.sign(end?.center.z||-side);
    const spring='ext_springbar_'+side;
    g=add('endlink-'+side,'ext_endlink_'+side,['ext_endlink_'+side,spring],'bracelet-row',[0,.64,direction*.89],[11.80,12.28],[18.06,18.60]);
    map.get(spring).v5Pin={axis:new T.Vector3(side,0,0),travel:3.20,
      assemble:[12.29,12.48],disassemble:[17.80,18.04],springbar:true};
    for(let row=0;row<12;row++){
      const r=String(row).padStart(2,'0'),n='ext_link_'+side+'_'+r+'_0',pin='ext_link_pin_'+side+'_'+r;
      const a=12.22+row*.205+(side<0?.035:0),b=a+.39;
      const da=17.38+(11-row)*.04,db=da+.36;
      const members=[-1,0,1].map(c=>'ext_link_'+side+'_'+r+'_'+c).concat(pin);
      if(side===-1&&row===11)members.push('ext_clasp_catch');
      g=add('link-'+side+'-'+r,n,members,'bracelet-row',[0,.68,direction*(1.05+row*.10)],[a,b],[da,db]);
      const p=map.get(pin);p.v5Pin={axis:new T.Vector3(side,0,0),travel:Math.max(3.08,(p.size.x||2.82)+.24),
        assemble:[b+.01,b+.20],disassemble:[da-.25,da-.035]};
    }
  }
  add('clasp','ext_clasp_cover',['ext_clasp_cover','ext_clasp_release_-1','ext_clasp_release_1','ext_clasp_fold_frame','ext_clasp_fold_leaf'],'service-module',[0,.82,-2.24],[14.78,15.26],[17.04,17.51]);

  // Source defects and unproven interfaces stay at their original positions.
  // These members are intentionally a fixed display core, not a real OEM unit.
  add('fixed-core','321.1000_mainplate',active.filter(u=>!assigned.has(u)&&!u.isSample).map(u=>u.name),'fixed-core',V5_ZERO,[0,0],[99,100],{fixed:true});
  for(const u of active.filter(u=>!assigned.has(u))){add('sample-'+u.name,u.name,[u.name],'sample',V5_ZERO,[0,0],[99,100],{fixed:true});}
  const groupMap=new Map(groups.map(g=>[g.id,g]));
  for(const g of groups){
    const carrier=map.get(g.carrier);
    for(const u of g.members){
      u.serviceGroup=g.id;u.serviceCarrier=g.carrier;u.serviceKind=g.kind;
      u.serviceLocalOffset=u.center.clone().sub(carrier.center);
      u.v5Group=g;u.delta.copy(g.delta);u.phase=[.35*v5Clamp((g.disassemble[0]-17)/10),.35*v5Clamp((g.disassemble[1]-17)/10)];
      if(g.fixed)u.phase=[.35,.35];
      if(u.v5Pin)u.axial.copy(u.v5Pin.axis).multiplyScalar(u.v5Pin.travel);
      if(u.v5Control)u.axial.copy(u.v5Control.axis).multiplyScalar(u.v5Control.travel);
      if(u.v5Retainer)u.axial.copy(u.v5Retainer.axis).multiplyScalar(u.v5Retainer.travel);
    }
  }
  assemblyRigV5={version:5,groups,groupMap,map,missing,hold:V5_ASSEMBLY_HOLD,
    evidence:'assembly-v5/STRUCTURE-REFERENCES.md + geometry-audit/subassembly-recommendations.json',
    limitations:['Unbored mainplate and captured lower train held as fixed core.','Unknown supporting interfaces remain at source pose.','Bracelet retention is illustrative; springbar tip compression is not modeled.','Source intersections are not repaired or certified by this animation.']};
  if(missing.length)throw Error('V5 expected objects missing: '+missing.join(', '));
  if(assigned.size!==active.length)throw Error('V5 unassigned units');
  if(typeof window!=='undefined')window.__ASSEMBLY_RIG_V5=assemblyRigV5;
  return assemblyRigV5;
}

function v5GroupFraction(g,t){
  if(g.fixed)return 0;
  if(t<15.5)return 1-v5Range(...g.assemble,t);
  if(t<17)return 0;
  return v5Range(...g.disassemble,t);
}
function v5LocalFraction(item,t){
  if(t<15.5)return 1-v5Range(...item.assemble,t);
  if(t<17)return 0;
  return v5Range(...item.disassemble,t);
}

/* s is [0,1]: 0 assembled, .35–.70 suspended, 1 service knoll.
 * In auto mode real per-group time windows govern all motion. Manual slider
 * maps to the same reverse dependency path. The whole 15.5–17 hold is exact.
 * The caller applies u.pos/u.quat to roots and handles surface/camera updates.
 */
function poseAssemblyV5(s,t,poseMode){
  if(!assemblyRigV5)planExplosion();
  s=v5Clamp(Number.isFinite(s)?s:0);t=Number.isFinite(t)?Math.max(0,Math.min(44,t)):0;
  const isAuto=poseMode==='auto';
  let motionTime=isAuto?t:(s<=.35?17+10*v5Clamp(s/.35):27);
  const knoll=isAuto?v5Range(31.5,40,t):v5Range(.70,1,s);
  // Regather released retainers/pins inside their already-clear service module
  // before any group rotates toward the table. This preserves final group shape.
  const regather=isAuto?v5Range(31.5,32.5,t):v5Range(.70,.74,s);
  const offsets=new Map();
  for(const g of assemblyRigV5.groups)offsets.set(g.id,g.delta.clone().multiplyScalar(v5GroupFraction(g,motionTime)));
  for(const g of assemblyRigV5.groups){
    const shift=offsets.get(g.id).clone();
    if(g.parentGroup)shift.add(offsets.get(g.parentGroup));
    for(const u of g.members){
      u.pos.copy(u.center).add(shift);u.quat.copy(u.baseQuat||new T.Quaternion());
      for(const item of [u.v5Retainer,u.v5Pin,u.v5Control]){
        if(!item)continue;
        const fraction=item===u.v5Control?v5GroupFraction(g,motionTime):v5LocalFraction(item,motionTime);
        u.pos.addScaledVector(item.axis,item.travel*fraction*(1-regather));
        // Retainers move on their verified axis. No broad thread-angle claim,
        // eccentric adjustment or fake helical lateral movement is introduced.
      }
      // Final destinations are provided by planKnollAssemblyV5(). A common
      // group rotation plus rotated local offsets prevents patch separation.
      if(knoll>0){
        const carrier=assemblyRigV5.map.get(g.carrier);
        const startCarrier=carrier.center.clone().add(shift);
        const targetCarrier=carrier.kpos;
        const endDelta=carrier.kquat.clone().multiply((carrier.baseQuat||new T.Quaternion()).clone().invert());
        const turn=new T.Quaternion().slerp(endDelta,knoll);
        const center=startCarrier.lerp(targetCarrier,knoll);
        const local=u.serviceLocalOffset.clone().applyQuaternion(turn);
        const release=u.pos.clone().sub(u.center).sub(shift).multiplyScalar(1-knoll);
        u.pos.copy(center).add(local).add(release);
        u.quat.copy(turn).multiply(u.baseQuat||new T.Quaternion());
        if(knoll>=1){u.pos.copy(u.kpos);u.quat.copy(u.kquat);}
      }
      if(![u.pos.x,u.pos.y,u.pos.z,u.quat.x,u.quat.y,u.quat.z,u.quat.w].every(Number.isFinite))throw Error('V5 non-finite pose '+u.name);
    }
  }
  if(typeof window!=='undefined')window.__ASSEMBLY_V5={time:t,motionTime,knoll,mode:poseMode,
    beat:assemblyBeatV5(t).label,hold:t>=15.5&&t<=17,
    groups:assemblyRigV5.groups.length,fixedCore:assemblyRigV5.groupMap.get('fixed-core').members.length};
  return {knoll,motionTime,hold:isAuto&&t>=15.5&&t<=17};
}

function assemblyBeatV5(t){
  const beats=[
    [1.20,'Axial Suspension',['Y_clutch_bridge','321.1000_mainplate']],
    [2.02,'Escape Wheel & Pallet Fork',['escape_wheel','pallet_fork']],
    [3.50,'Bridges Seated',['321.1002_bridge34','center_bridge_S17']],
    [4.18,'Balance & Balance Cock',['balance_rim','321.1006_balance_cock']],
    [5.10,'Chronograph Train',['321.1705_chrono_runner','321.1708_minute_recorder','colw_columns']],
    [6.05,'Engraved Bridge & Clutch',['Y_clutch_bridge','clutch_rocker']],
    [6.82,'Chronograph Control Layer',['operating_lever','double_spring','Y_clutch_bridge']],
    [7.75,'Mid-Case Receives the Movement',['ext_case_mid','321.1000_mainplate']],
    [8.48,'Dial Seated',['ext_step_dial']],
    [10.00,'Six Hands Set on Their Arbors',['ext_hour_hand','ext_minute_hand','ext_chrono_hand']],
    [11.80,'Crystal & Caseback Closed',['ext_front_crystal','ext_caseback_ring']],
    [15.50,'End Links & Links Fitted in Sequence',['ext_case_mid','ext_endlink_1','ext_link_1_00_0']],
    [17.00,'Fully Assembled · At Rest',['ext_case_mid','ext_step_dial']],
    [18.72,'Bracelet & Crystal Released',['ext_case_mid','ext_endlink_1']],
    [20.95,'Dial, Hands & Exterior Separated',['ext_step_dial','ext_case_mid']],
    [23.45,'Chronograph Controls & Bridges Exploded',['Y_clutch_bridge','operating_lever','chrono_wheel_bridge']],
    [27.00,'Balance & Base Bridges Exploded',['321.1006_balance_cock','center_bridge_S17']],
    [31.50,'Original Engraving Close-Up',['Y_clutch_bridge']],
    [40.00,'Service Sub-Assemblies Laid Out',['Y_clutch_bridge','ext_case_mid']],
    [42.50,'Full Composition',['321.1000_mainplate','ext_case_mid']],
    [44.01,'Fade Out',['ext_case_mid']]
  ];
  const b=beats.find(b=>t<b[0])||beats[beats.length-1];
  return {label:b[1],focusNames:b[2]};
}
/* Service-level knoll. Call after planKnoll() and planExplosion(): the former
 * supplies each carrier's presentation normal, the latter supplies ownership.
 * Every source mesh remains a selectable unit. Packing operates on rigid service
 * groups; jewels, seats, shafts and bracelet pins retain their carrier transform. */
const knollServiceVertexCacheV5 = new WeakMap();

function planKnollAssemblyV5() {
 const EPS=1e-7, itemGap=.075, groupGap=.20, floorY=-.238;
 const visible=active.filter(u=>!u.isSample), samples=active.filter(u=>u.isSample);
 const byName=new Map(active.map(u=>[u.name,u])), sourceGroups=new Map();
 const identity=new T.Quaternion(), yAxis=new T.Vector3(0,1,0);
 const quarter=q=>new T.Quaternion().setFromAxisAngle(yAxis,-q*Math.PI/2);
 const rotate=(x,z,q)=>{q=((q%4)+4)%4;return q===0?[x,z]:q===1?[-z,x]:q===2?[-x,-z]:[z,-x];};
 const finite=v=>v.toArray().every(Number.isFinite);
 const intersects=(a,b)=>a.x<b.x+b.w-EPS&&a.x+a.w>b.x+EPS&&a.z<b.z+b.h-EPS&&a.z+a.h>b.z+EPS;

 for(const u of visible){
  if(!u.serviceGroup)throw Error('V5 knoll requires service ownership: '+u.name);
  if(!sourceGroups.has(u.serviceGroup))sourceGroups.set(u.serviceGroup,[]);
  sourceGroups.get(u.serviceGroup).push(u);
 }
 const rigGroups=typeof assemblyRigV5!=='undefined'?assemblyRigV5?.groups:[];
 const rigById=new Map((rigGroups||[]).map(g=>[g.id,g]));

 /* Scan actual vertices once per local presentation quaternion. Mesh-local
  * transforms are included; neither animated roots nor local AABB empty corners
  * can inflate the cached group footprint. */
 function localBounds(u,q){
  const key=q.toArray().map(n=>n.toFixed(10)).join(','), cached=knollServiceVertexCacheV5.get(u);
  if(cached?.key===key)return cached.bounds.clone();
  const box=new T.Box3(), p=new T.Vector3();let vertexCount=0;
  for(const mesh of u.render||[]){
   const positions=mesh.geometry?.getAttribute('position');if(!positions)continue;
   const matrix=new T.Matrix4();let node=mesh;
   while(node&&node!==u.root){node.updateMatrix();matrix.premultiply(node.matrix);node=node.parent;}
   for(let i=0;i<positions.count;i++){
    p.fromBufferAttribute(positions,i).applyMatrix4(matrix).applyQuaternion(q);
    if(!finite(p))throw Error('Non-finite V5 knoll vertex: '+u.name);
    box.expandByPoint(p);
   }
   vertexCount+=positions.count;
  }
  if(!vertexCount)throw Error('V5 knoll unit has no geometry: '+u.name);
  knollServiceVertexCacheV5.set(u,{key,bounds:box.clone(),vertexCount});return box;
 }

 const modules=[];
 for(const [id,members] of sourceGroups){
  const rig=rigById.get(id), carrier=(typeof rig?.carrier==='string'?byName.get(rig.carrier):rig?.carrier)
   ||byName.get(members[0].serviceCarrier)||members[0];
  if(!members.includes(carrier))throw Error('V5 knoll carrier outside group: '+id);
  /* Strip only the old rectangle packer's quarter turn. Keep the carrier's
   * explicit flatten/flip quaternion and apply its delta to every member. */
  const oldTurn=new T.Quaternion().setFromAxisAngle(yAxis,-(carrier.rot||0)*Math.PI/2);
  const flatCarrier=oldTurn.multiply(carrier.kquat.clone());
  const delta=flatCarrier.clone().multiply((carrier.baseQuat||identity).clone().invert()).normalize();
  const bounds=new T.Box3(), frames=[];
  for(const u of members){
   const q=delta.clone().multiply(u.baseQuat||identity).normalize();
   const offset=u.center.clone().sub(carrier.center).applyQuaternion(delta);
   const local=localBounds(u,q);bounds.union(local.clone().translate(offset));
   frames.push({u,q,offset,local});
  }
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const module={id,carrier,members,frames,delta,bounds,center,kind:rig?.kind||carrier.serviceKind||'service-module',
   label:rig?.label||carrier.label||id,kw:Math.max(.035,size.x),kd:Math.max(.035,size.z)};
  const link=members.find(u=>u.knollRole==='link');
  if(link){module.side=Number(link.knollSide)||Math.sign(link.center.z)||1;
   module.order=Number.isFinite(+link.knollOrder)?+link.knollOrder:-1;
   if(/^ext_endlink_/.test(link.name))module.order=-1;
   module.spine=true;
  }else if(members.some(u=>u.knollRole==='clasp')){module.spine=true;module.isClasp=true;}
  modules.push(module);
 }

 function split(free,r){
  const next=[];
  for(const f of free){
   if(!intersects(f,r)){next.push(f);continue;}
   if(r.x>f.x+EPS)next.push({x:f.x,z:f.z,w:r.x-f.x,h:f.h});
   if(r.x+r.w<f.x+f.w-EPS)next.push({x:r.x+r.w,z:f.z,w:f.x+f.w-r.x-r.w,h:f.h});
   if(r.z>f.z+EPS)next.push({x:f.x,z:f.z,w:f.w,h:r.z-f.z});
   if(r.z+r.h<f.z+f.h-EPS)next.push({x:f.x,z:r.z+r.h,w:f.w,h:f.z+f.h-r.z-r.h});
  }
  return next.filter((a,i)=>a.w>EPS&&a.h>EPS&&!next.some((b,j)=>j!==i&&a.x>=b.x-EPS&&a.z>=b.z-EPS&&a.x+a.w<=b.x+b.w+EPS&&a.z+a.h<=b.z+b.h+EPS&&(j<i||a.w*a.h<b.w*b.h-EPS)));
 }
 function pack(items,W,H,reserved=[]){
  if(reserved.some(r=>r.x<0||r.z<0||r.x+r.w>W+EPS||r.z+r.h>H+EPS)||reserved.some((r,i)=>reserved.slice(0,i).some(s=>intersects(r,s))))return null;
  let free=[{x:0,z:0,w:W,h:H}];for(const r of reserved)free=split(free,r);const result=[];
  for(const item of items){
   let best=null;
   for(const f of free)for(let rot=0;rot<(item.noRotate?1:2);rot++){
    const w=rot?item.h:item.w,h=rot?item.w:item.h;if(w>f.w+EPS||h>f.h+EPS)continue;
    const score=Math.min(f.w-w,f.h-h)*6+Math.max(f.w-w,f.h-h)*.12+f.z*.018;
    if(!best||score<best.score)best={item,x:f.x,z:f.z,w,h,rot,score};
   }
   if(!best)return null;result.push(best);free=split(free,best);
  }
  return result;
 }
 const blocks=[],used=new Set();
 function add(label,list,width,kind='mechanism'){
  if(!list.length)return null;
  const items=[...list].sort((a,b)=>b.kw*b.kd-a.kw*a.kd||a.id.localeCompare(b.id))
   .map(m=>({m,w:m.kw+itemGap,h:m.kd+itemGap}));
  width=Math.max(width,...items.map(i=>Math.min(i.w,i.h)));
  let height=Math.max(...items.map(i=>Math.min(i.w,i.h)),items.reduce((n,i)=>n+i.w*i.h,0)/width),layout=null;
  for(let i=0;i<95&&!layout;i++,height*=1.04)layout=pack(items,width,height);
  if(!layout)throw Error('V5 knoll local bin did not fit: '+label);
  const w=Math.max(...layout.map(p=>p.x+p.w)),h=Math.max(...layout.map(p=>p.z+p.h));
  const block={label,kind,w:w+groupGap,h:h+groupGap,placed:layout.map(p=>({m:p.item.m,x:p.x+p.w/2,z:p.z+p.h/2,rot:p.rot}))};
  blocks.push(block);list.forEach(m=>used.add(m));return block;
 }
 function matrix(label,list,columns,kind){
  if(!list.length)return null;
  list=[...list].sort((a,b)=>b.kw*b.kd-a.kw*a.kd||a.id.localeCompare(b.id,undefined,{numeric:true}));
  const dx=Math.max(...list.map(m=>m.kw))+itemGap,dz=Math.max(...list.map(m=>m.kd))+itemGap;
  columns=Math.min(columns,list.length);
  const block={label,kind,w:columns*dx+groupGap,h:Math.ceil(list.length/columns)*dz+groupGap,
   pitch:[dx,dz],cols:columns,placed:list.map((m,i)=>({m,x:(i%columns+.5)*dx,z:(Math.floor(i/columns)+.5)*dz,rot:0}))};
  blocks.push(block);list.forEach(m=>used.add(m));return block;
 }

 /* One continuous straight spine. Rows keep their three pieces and transverse
  * pin together; the articulated clasp is a complete source-pose module. */
 const chain=modules.filter(m=>m.spine);let spine=null;
 if(chain.length){
  const negative=chain.filter(m=>!m.isClasp&&m.side<0).sort((a,b)=>a.order-b.order);
  const positive=chain.filter(m=>!m.isClasp&&m.side>=0).sort((a,b)=>b.order-a.order);
  const ordered=[...negative,...chain.filter(m=>m.isClasp),...positive];
  const width=Math.max(...chain.map(m=>m.kw));let z=0;
  const placed=ordered.map(m=>{const gap=m.isClasp?.17:.058,p={m,x:width/2,z:z+m.kd/2,rot:0};z+=m.kd+gap;used.add(m);return p;});
  spine={label:'Bracelet Rows & Folding Clasp / Complete Service Set',kind:'spine',w:width+groupGap,h:z-.058+groupGap,placed,noRotate:true};
 }
 const isAnchor=m=>m.kw*m.kd>5.5||m.members.some(u=>['case','ring','glass','dial'].includes(u.knollRole)&&m.kw*m.kd>3.5);
 for(const m of modules.filter(m=>!used.has(m)&&isAnchor(m)).sort((a,b)=>b.kw*b.kd-a.kw*a.kd))add(m.label,[m],m.kw+itemGap,'anchor');
 matrix('Fasteners / Even Service Matrix',modules.filter(m=>!used.has(m)&&m.kind==='fastener'),9,'fasteners');
 matrix('Loose Pins / Respective Service Sets',modules.filter(m=>!used.has(m)&&m.members.every(u=>u.knollRole==='pin')),2,'pins');
 const groupOrder=['Plates & Bridges','Gear Train','Winding System','Chronograph Works','Balance Wheel','Hairspring','Escapement','Springs','Dial Indication','Dial & Hands','Crown & Pushers'];
 const groups=[...new Set(modules.filter(m=>!used.has(m)).map(m=>m.carrier.g||m.kind))]
  .sort((a,b)=>(groupOrder.indexOf(a)<0?99:groupOrder.indexOf(a))-(groupOrder.indexOf(b)<0?99:groupOrder.indexOf(b)));
 for(const label of groups){
  const list=modules.filter(m=>!used.has(m)&&(m.carrier.g||m.kind)===label),area=list.reduce((n,m)=>n+(m.kw+itemGap)*(m.kd+itemGap),0);
  add(label+' / Service Assembly',list,Math.max(1.25,Math.min(4.0,Math.sqrt(area*1.16))));
 }
 if(used.size!==modules.length)throw Error('V5 knoll omitted service groups');

 const viewportAspect=Math.max(.40,Math.min(2.5,typeof innerWidth==='number'?innerWidth/innerHeight:1.6));
 const turn=viewportAspect>1.12?1:0,aspect=turn?1/viewportAspect:viewportAspect;
 const anchors=blocks.filter(b=>b.kind==='anchor'),choose=re=>anchors.find(b=>b.placed.some(p=>p.m.members.some(u=>re.test(u.name))));
 const special=[
  [choose(/^ext_case_mid$/),.79,.50],[choose(/^ext_bezel$/),.79,.10],
  [choose(/^ext_front_crystal$/),.21,.10],[choose(/^ext_caseback_ring$/),.21,.90],
  [choose(/^ext_step_dial$/),.79,.90],[choose(/^321\.1000_mainplate$/),.21,.50]
 ].filter(([b],i,a)=>b&&a.findIndex(([q])=>q===b)===i);
 const total=blocks.reduce((n,b)=>n+b.w*b.h,0)+(spine?spine.w*spine.h:0);
 const widest=Math.max(...anchors.map(b=>Math.min(b.w,b.h)),0);
 let H=Math.max(Math.sqrt(total/aspect)*1.025,spine?.h||0,(widest*2+(spine?.w||0)+.12)/aspect),W,layout=null,reserved=[];
 const ordered=blocks.filter(b=>!special.some(([s])=>s===b)).sort((a,b)=>(b.kind==='anchor')-(a.kind==='anchor')||b.w*b.h-a.w*a.h||a.label.localeCompare(b.label));
 for(let attempt=0;attempt<115&&!layout;attempt++,H*=1.017){
  W=H*aspect;reserved=spine?[{item:spine,x:(W-spine.w)/2,z:(H-spine.h)/2,w:spine.w,h:spine.h,rot:0}]:[];
  for(const [b,x,z] of special)reserved.push({item:b,x:Math.max(0,Math.min(W-b.w,W*x-b.w/2)),z:Math.max(0,Math.min(H-b.h,H*z-b.h/2)),w:b.w,h:b.h,rot:0});
  layout=pack(ordered,W,H,reserved);
 }
 if(!layout)throw Error('V5 service knoll did not fit');

 const moduleRects=[],records=[];
 for(const r of [...reserved,...layout]){
  const b=r.item;
  for(const p of b.placed){
   const [lx,lz]=rotate(p.x+groupGap/2-b.w/2,p.z+groupGap/2-b.h/2,r.rot);
   const [cx,cz]=rotate(r.x+r.w/2+lx,r.z+r.h/2+lz,turn);
   const m=p.m,rot=(p.rot+r.rot+turn)%4,q=quarter(rot),center=new T.Vector3(cx,floorY-m.bounds.min.y,cz);
   for(const f of m.frames){
    const u=f.u,offset=f.offset.clone().sub(new T.Vector3(m.center.x,0,m.center.z)).applyQuaternion(q);
    u.kpos.copy(center).add(offset);u.kquat.copy(q).multiply(f.q).normalize();u.rot=rot%2;
    const local=f.local.clone().applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q));
    u.serviceKnollBounds={min:local.min.clone(),max:local.max.clone()};
    u.serviceKnollQuaternion=q.clone().multiply(m.delta);u.serviceKnollModule=m.id;
    u.kw=Math.max(.035,f.local.max.x-f.local.min.x);u.kd=Math.max(.035,f.local.max.z-f.local.min.z);
   }
   const w=rot%2?m.kd:m.kw,h=rot%2?m.kw:m.kd;
   moduleRects.push({id:m.id,carrier:m.carrier.name,kind:m.kind,x:cx-w/2,z:cz-h/2,w,h,
    count:m.members.length,members:m.members.map(u=>u.name),rotation:rot*90,module:m});
  }
  const [cx,cz]=rotate(r.x+r.w/2,r.z+r.h/2,turn),w=turn?r.h:r.w,h=turn?r.w:r.h;
  records.push({label:b.label,kind:b.kind,x:cx-w/2,z:cz-h/2,w,h,count:b.placed.reduce((n,p)=>n+p.m.members.length,0),
   serviceGroups:b.placed.length,groupIds:b.placed.map(p=>p.m.id),auxiliary:false,pitch:b.pitch,cols:b.cols});
 }
 const minX=Math.min(...moduleRects.map(r=>r.x)),minZ=Math.min(...moduleRects.map(r=>r.z));
 const maxX=Math.max(...moduleRects.map(r=>r.x+r.w)),maxZ=Math.max(...moduleRects.map(r=>r.z+r.h));
 const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 for(const u of visible){u.kpos.x-=cx;u.kpos.z-=cz;}
 for(const r of [...records,...moduleRects]){r.x-=cx;r.z-=cz;}
 knollSize=[maxX-minX,maxZ-minZ];

 /* The original individual sample tray remains optional and lies outside the
  * service poster. Preserve its internal layout and move it beyond the new edge. */
 function unitBounds(list){const bounds=new T.Box3();for(const u of list){
  const local=u.serviceKnollBounds?new T.Box3(u.serviceKnollBounds.min.clone(),u.serviceKnollBounds.max.clone()):localBounds(u,u.kquat);
  bounds.union(local.translate(u.kpos));}return bounds;}
 let sampleBounds=null;
 if(samples.length){
  const box=unitBounds(samples),size=box.getSize(new T.Vector3()),mid=box.getCenter(new T.Vector3());
  const shift=new T.Vector3(knollSize[0]/2+1-box.min.x,0,-mid.z);
  for(const u of samples)u.kpos.add(shift);
  box.translate(shift);sampleBounds=box;
  records.push({label:'Source Finish Samples / Auxiliary Tray',kind:'samples',x:box.min.x,z:box.min.z,w:size.x,h:size.z,count:samples.length,serviceGroups:samples.length,auxiliary:true});
 }
 packStats=records;

 let overlaps=0,relationError=0,normalError=0;const overlapNames=[],outside=[],membership=[];
 for(let i=0;i<moduleRects.length;i++){
  const a=moduleRects[i];
  for(let j=0;j<i;j++)if(intersects(a,moduleRects[j])){overlaps++;if(overlapNames.length<16)overlapNames.push([a.id,moduleRects[j].id]);}
  if(a.x<-knollSize[0]/2-EPS||a.z<-knollSize[1]/2-EPS||a.x+a.w>knollSize[0]/2+EPS||a.z+a.h>knollSize[1]/2+EPS)outside.push(a.id);
  const m=a.module,carrier=m.carrier,delta=carrier.kquat.clone().multiply((carrier.baseQuat||identity).clone().invert());
  for(const u of m.members){
   const expected=u.center.clone().sub(carrier.center).applyQuaternion(delta);
   relationError=Math.max(relationError,u.kpos.clone().sub(carrier.kpos).distanceTo(expected));
   normalError=Math.max(normalError,u.kquat.angleTo(delta.clone().multiply(u.baseQuat||identity)));
   membership.push(u.name);
  }
 }
 const allBounds=unitBounds(active),serializeBounds=b=>b?{minX:b.min.x,minZ:b.min.z,maxX:b.max.x,maxZ:b.max.z,w:b.max.x-b.min.x,h:b.max.z-b.min.z}:null;
 const report={version:5,standard:'service-group-union-bounds',parts:visible.length,totalParts:active.length,placed:membership.length+samples.length,
  sampleParts:samples.length,serviceGroups:modules.length,groupedParts:membership.length,uniqueParts:new Set(membership).size,
  overlaps,overlapNames,outside,footprintArea:knollSize[0]*knollSize[1],
  serviceBoxArea:moduleRects.reduce((n,r)=>n+r.w*r.h,0),partBoxArea:visible.reduce((n,u)=>n+u.kw*u.kd,0),
  aspect:knollSize[0]/knollSize[1],viewportAspect,turn:turn*90,maxRelationError:relationError,maxNormalError:normalError,
  braceletRows:modules.filter(m=>m.spine&&!m.isClasp).length,claspModules:modules.filter(m=>m.isClasp).length,
  memberOverlapPolicy:'Source-pose contact within a service group is retained; only distinct group footprints are tested.',
  groups:moduleRects.map(({module,...r})=>r)};
 if(overlaps||outside.length||membership.length!==visible.length||new Set(membership).size!==visible.length||relationError>1e-6||normalError>1e-6)throw Error('V5 knoll service-group validation failed');
 if(typeof window!=='undefined'){
  window.__KNOLL_QA=report;window.__KNOLL_SAMPLE_BOUNDS=serializeBounds(sampleBounds);window.__KNOLL_ALL_BOUNDS=serializeBounds(allBounds);
 }
 return report;
}
/* Static photographic reflection rig. No bloom, post sharpening, geometry or colour replacement. */
function installOmegaLightingV4({T,scene,renderer,units=[]}){
 const previous={environment:scene.environment,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,lights:[],materials:[]};
 scene.traverse(o=>{if(o.isLight){previous.lights.push([o,o.visible]);o.visible=false;}});
 const environment=new T.Scene();environment.background=new T.Color(.10,.095,.085);
 const envGeometry=new T.PlaneGeometry(1,1),envMaterials=[];
 function panel(position,width,height,intensity,tint){
  const material=new T.MeshBasicMaterial({color:new T.Color(tint).multiplyScalar(intensity),side:T.DoubleSide});envMaterials.push(material);
  const plane=new T.Mesh(envGeometry,material);plane.position.fromArray(position);plane.scale.set(width,height,1);plane.lookAt(0,0,0);environment.add(plane);return plane;
 }
 /* A large diagonal key carries silver, while a narrow opposite strip defines polished edges. */
 panel([-6,6,3],7,11,3.1,0xffedd1);
 panel([7,3,-4],1.7,10,3.4,0xf0d9a8);
 panel([-1,4,-8],6,4,.62,0xece2cd);
 panel([2,9,0],4,2,.5,0xfff4dc);
 /* The finished watch's decorated movement faces -Y; reflected below-boxes preserve the back view. */
 panel([-6,-5,3],7,9,2.2,0xffe9c4);
 panel([7,-3,-4],1.5,8,2.7,0xe8d3a6);
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromScene(environment,.035,.1,80);scene.environment=target.texture;pmrem.dispose();envGeometry.dispose();envMaterials.forEach(m=>m.dispose());
 const lightGroup=new T.Group();lightGroup.name='Omega photographic lights';scene.add(lightGroup);
 const key=new T.DirectionalLight(0xffe3b0,1.75);key.position.set(-8,5,6);lightGroup.add(key);lightGroup.add(key.target);
 const fill=new T.DirectionalLight(0xd8b988,.4);fill.position.set(6,3,-5);lightGroup.add(fill);lightGroup.add(fill.target);
 const top=new T.HemisphereLight(0x453b2c,0x0a0a0b,.3);lightGroup.add(top);
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 const seen=new Set();for(const u of units)for(const mesh of u.render||[])for(const material of(Array.isArray(mesh.material)?mesh.material:[mesh.material])){
  if(seen.has(material)||!material.isMeshStandardMaterial)continue;seen.add(material);previous.materials.push([material,material.envMapIntensity]);material.envMapIntensity=u.origin?.94:1.08;
 }
 const anchor=new T.Vector3();
 return{version:4,description:'Large warm key and cool strip reflections; front/rear macro support, restrained contrast',key,fill,
  update({rearMix=0,target:focus=null}={}){const m=Math.max(0,Math.min(1,rearMix)),sign=1-2*m;if(focus)anchor.copy(focus);else anchor.set(0,0,0);key.position.set(-8,5*sign,6).add(anchor);fill.position.set(6,3*sign,-5).add(anchor);key.target.position.copy(anchor);fill.target.position.copy(anchor);},
  dispose(){scene.environment=previous.environment;renderer.toneMapping=previous.toneMapping;renderer.toneMappingExposure=previous.exposure;previous.lights.forEach(([l,v])=>l.visible=v);previous.materials.forEach(([m,i])=>m.envMapIntensity=i);scene.remove(lightGroup);target.dispose();}};
}
/*
 * Repair undefined anisotropic shading when glTF has no tangent attribute.
 * Three r160 otherwise builds T/B from UV derivatives; absent or collapsed UVs
 * produce a zero frame, then normalize(0) in anisotropic IBL yields NaN. An HDR
 * transmission target retains those NaNs and its filtering spreads black tiles.
 *
 * Call on the cloned geometry BEFORE its normalization/source-matrix bake when
 * possible; BufferGeometry.applyMatrix4 transforms tangent XYZ with the mesh.
 * No source positions, normals, indices, UVs, material values, or identities are
 * changed. It supplies a stable orthogonal source-local frame only where the
 * exporter did not supply one. A least-parallel local axis is a documented
 * fallback direction, not a reconstruction of Blender's omitted tangent graph.
 * The opt-in grainFrame=stable study gives three R43 faces one projected source-X
 * axis. It cannot replace an authored tangent or affect a mixed-material mesh.
 */
function ensureOmegaAnisotropyTangents(T, geometry, material, sourceName='') {
 const materials=Array.isArray(material)?material:[material];
 if(!materials.some(m=>m?.anisotropy>0)||geometry.getAttribute('tangent'))return false;
 const normal=geometry.getAttribute('normal');
 if(!normal)throw new Error('Anisotropic material requires source normals.');
 const stableGrain=Q.get('grainFrame')==='stable'&&materials.length===1&&materials[0]?.name==='R43_SednaCutGrain'
  &&['321.1002_bridge34','center_bridge_S17','321.1006_balance_cock'].includes(sourceName);
 const tangent=new Float32Array(normal.count*4),n=new T.Vector3(),t=new T.Vector3();
 let singularFallbacks=0;
 for(let i=0;i<normal.count;i++){
  n.fromBufferAttribute(normal,i);
  if(!Number.isFinite(n.x+n.y+n.z)||n.lengthSq()<1e-16)throw new Error('Non-finite or zero source normal at vertex '+i);
  n.normalize();const x=Math.abs(n.x),y=Math.abs(n.y),z=Math.abs(n.z);
  if(stableGrain){
   t.set(1,0,0).addScaledVector(n,-n.x);
   // Source X has no tangent projection at normals parallel to ±X. Use source Z
   // only within this tiny singular cone; Z is necessarily well conditioned there.
   if(t.lengthSq()<1e-8){t.set(0,0,1).addScaledVector(n,-n.z);singularFallbacks++;}
   if(!Number.isFinite(t.lengthSq())||t.lengthSq()<1e-16)throw new Error('Invalid source-X grain frame at vertex '+i);
   t.normalize();
  }else{
   if(x<=y&&x<=z)t.set(1,0,0);else if(y<=z)t.set(0,1,0);else t.set(0,0,1);
   t.addScaledVector(n,-t.dot(n)).normalize();
  }
  tangent.set([t.x,t.y,t.z,1],i*4);
 }
 geometry.setAttribute('tangent',new T.BufferAttribute(tangent,4));
 if(stableGrain)geometry.userData={...geometry.userData}; // Three r160 geometry clones share userData.
 geometry.userData.omegaTangentRepair='source-local orthogonal frame for missing glTF tangents';
 if(stableGrain)geometry.userData.kimiGrainFrame={version:1,mode:'stable',sourceName,axis:'source X projected onto normal',singularFallbackAxis:'source Z',singularProjectionLengthSquared:1e-8,singularFallbacks,vertices:normal.count};
 for(const m of materials)m.needsUpdate=true;
 return true;
}
/* Recover actual Blender finishes that the original GLB exporter omitted. */
let finishLibrary=new Map(),finishManifest=null,finishApplied=[],sourceMaterialDefaults={};
async function loadSourceFinishes(){
 if(Q.get('finish')==='0')return;
 const base='assets/finishes/',response=await fetch(base+'finish-manifest.json');
 if(!response.ok)throw Error('Blender finish manifest HTTP '+response.status);
 finishManifest=await response.json();const defaultsResponse=await fetch(base+'material-defaults.json');
 if(!defaultsResponse.ok)throw Error('Source material defaults HTTP '+defaultsResponse.status);
 sourceMaterialDefaults=(await defaultsResponse.json()).overridesByMaterial;const loader=new T.TextureLoader();
 await Promise.all(finishManifest.materials.map(async spec=>{
  const maps={};await Promise.all(Object.entries(spec.maps).map(async([kind,item])=>{
   if(item.useInWeb===false)return;
   const version=item.resolution2k&&!(spec.id==='r46-silver-engraving'&&kind==='normal'&&innerWidth>700)?item.resolution2k:item;
   const texture=await loader.loadAsync(base+version.file);texture.flipY=true;
   texture.colorSpace=kind==='baseColor'?T.SRGBColorSpace:T.NoColorSpace;
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;maps[kind]=texture;
  }));finishLibrary.set(spec.sourceMaterial,{spec,maps});
 }));
}
function restoreSourceFinish(original,geometry,sourceMatrix,name){
 const item=finishLibrary.get(original.name);if(!item){const material=original.clone(),defaults=sourceMaterialDefaults[original.name];if(defaults){Object.assign(material,defaults);material.userData.sourceScalarFinish=true;}return material;}
 const {spec,maps}=item;if(!spec.sourceObjects.includes(name))return original.clone();
 const p=geometry.attributes.position,uv=new Float32Array(p.count*2),world=new T.Vector3();
 for(let i=0;i<p.count;i++){
  world.fromBufferAttribute(p,i).applyMatrix4(sourceMatrix);
  uv[i*2]=world.x*spec.uvScale[0]+spec.uvOffset[0];uv[i*2+1]=-world.z*spec.uvScale[1]+spec.uvOffset[1];
 }
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
 const material=new T.MeshPhysicalMaterial({name:original.name,color:maps.baseColor?0xffffff:original.color,metalness:spec.metalness,roughness:1,side:original.side,
  map:maps.baseColor||null,normalMap:maps.normal||null,roughnessMap:maps.roughness||null,normalMapType:T.TangentSpaceNormalMap,normalScale:new T.Vector2(1,1),anisotropy:spec.anisotropy||0});
 if(!maps.baseColor&&spec.baseColorLinear)material.color.setRGB(...spec.baseColorLinear.slice(0,3),T.LinearSRGBColorSpace);
 material.userData.sourceFinish=spec.id;material.userData.sourceBlend=finishManifest.sourceBlend;
 finishApplied.push({part:name,material:spec.sourceMaterial,vertices:p.count,maps:Object.keys(maps)});
 return material;
}

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

/* A second, automatic level of the display explosion. Destinations are named
 * service modules from the asset audit, never a radial/hash scatter. Captured
 * lower train parts remain on the source mainplate. This is a display layout. */
const DEEP_CARRIER_Y=[-8.4,-5.45,-2.1,1.1,4.6,8.45];
const DEEP_SERVICE_LAYOUT={
 'chrono-operating-controls':[-1.35,-.60,.06],
 'engraved-bridge':[-.95,.20,.12],
 'chrono-reset-controls':[-.50,.85,.22],
 'chrono-bridge':[-.05,-.35,.28],
 'clutch-service':[.40,.35,.42],
 'column-wheel':[.85,-.85,.52],
 'minute-recorder':[1.20,.75,.56],
 'chrono-runner':[1.55,-.35,.60],
 'balance-service':[-.70,-.65,.24],
 'pallet-cock':[-.30,.80,.28],
 'escape-cock':[.15,-.45,.34],
 'pallet-fork':[.55,.65,.58],
 'escape-wheel':[.90,-.20,.64],
 'train-bridge':[-.80,-.65,.28],
 'center-bridge':[-.30,.55,.36],
 'upper-fourth':[.30,.90,.58],
 'bezel':[1.00,0,.10],
 'ext_small_seconds_hand':[.38,-.16,.20],
 'ext_30minute_hand':[.55,.16,.22],
 'ext_12hour_hand':[.72,.40,.24],
 'ext_hour_hand':[1.02,0,.28],
 'ext_minute_hand':[1.43,0,.20],
 'ext_chrono_hand':[1.86,0,.12]
};
let deepDisassemblyStats=null;
function buildDeepDisassembly(){
 const groups=new Set(),retainers=[];
 for(const u of active.filter(u=>u.on)){
  const spec=DEEP_SERVICE_LAYOUT[u.serviceGroup];
  if(spec){u.deepService={y:spec[0],z:spec[1],start:spec[2]};groups.add(u.serviceGroup);}
  if(u.v5Retainer)retainers.push(u.name);
 }
 deepDisassemblyStats={serviceModules:groups.size,retainers:retainers.length,handLayers:6,exteriorControls:3,
  fixedCore:assemblyRigV5.groupMap.get('fixed-core').members.length,
  layout:'six carriers → bridges and retainers → wheels, escapement and hands',
  limitation:'Captured lower train remains with the unbored source mainplate.'};
 document.body.dataset.disassembly=JSON.stringify(deepDisassemblyStats);
}
function referenceLayerPosition(layer,config,target=new T.Vector3()){
 const coarse=(layer.index-2.5)*REFERENCE_LAYER_GAP*(config.explode||0);
 const detail=Math.max(config.detail||0,(config.allChild||0)*.85*(config.explode||0),(config.child||0)*.85*(config.explode||0));
 return target.copy(layer.center).add(new T.Vector3(0,coarse+(DEEP_CARRIER_Y[layer.index]-(layer.index-2.5)*REFERENCE_LAYER_GAP)*detail,0));
}
const deepOffset=new T.Vector3(),deepDialTurn=new T.Quaternion();
function poseDeepDisassemblyUnit(u,config,rotation){
 const d=Math.max(config.detail||0,(config.allChild||0)*.85*(config.explode||0),(config.child||0)*.85*(config.explode||0));
 if(d<=0)return;
 if(u.referenceLayer!==undefined){
  const i=u.referenceLayer;
  u.pos.y+=(DEEP_CARRIER_Y[i]-(i-2.5)*REFERENCE_LAYER_GAP)*d;
  const spec=u.deepService;
  if(spec){
   const f=v5Range(spec.start,Math.min(1,spec.start+.36),d);
   deepOffset.set(0,spec.y,spec.z).applyQuaternion(rotation);u.pos.addScaledVector(deepOffset,f);
  }
  if(u.serviceGroup==='balance-service'){
   const wheel=/^(balance_|bal_screw)/.test(u.name)||u.name==='roller_jewel';
   const spring=['breguet_hairspring','hs_collet','hs_collet.001','hs_inner_link'].includes(u.name);
   if(wheel||spring){deepOffset.set(0,wheel?-.64:-.32,0).applyQuaternion(rotation);u.pos.addScaledVector(deepOffset,v5Range(.64,1,d));}
  }
  if(u.v5Retainer){
   const start=Math.max(0,(spec?.start||.25)-.18),f=v5Range(start,start+.18,d);
   deepOffset.copy(u.v5Retainer.axis).applyQuaternion(rotation);u.pos.addScaledVector(deepOffset,u.v5Retainer.travel*f);
  }
  if(u.v5Control){
   deepOffset.copy(u.v5Control.axis).applyQuaternion(rotation);u.pos.addScaledVector(deepOffset,u.v5Control.travel*v5Range(.10,.48,d));
  }
  // The back crystal and gasket are already independent exported nodes.
  if(u.name==='ext_rear_crystal')u.pos.y-=.44*v5Range(.10,.52,d);
  if(u.name==='ext_back_gasket')u.pos.y-=.20*v5Range(.08,.38,d);
  // Display each freed dial/hand face toward the rear-view camera. Keeping
  // their released positions preserves the readable six-hand layer spacing.
  if(i===5){u.pos.z-=1.7*v5Range(.12,.58,d);deepDialTurn.setFromAxisAngle(REFERENCE_Z,Math.PI*138/180*v5Range(.12,.58,d));u.quat.premultiply(deepDialTurn);}
 }else if(!referenceRig.braceletSet.has(u)){
  // Keep sapphire ahead of the six hand planes throughout the deep stage.
  u.pos.y+=5.1*d;
  if(u.name==='ext_front_gasket')u.pos.y-=.30*v5Range(.1,.5,d);
 }
}

/* Six display carriers corresponding to the reference site's six xploded roots.
 * Names describe Cal.321's actual functions. This presentation rig is not a repair sequence. */
const REFERENCE_LAYERS=[
 {id:9,label:'Caseback',group:['caseback'],focus:'ext_caseback_ring'},
 {id:10,label:'Chronograph',group:['chrono-runner','minute-recorder','column-wheel','clutch-service','chrono-bridge','chrono-reset-controls','engraved-bridge','chrono-operating-controls'],focus:'Y_clutch_bridge'},
 {id:28,label:'Regulation',group:['escape-wheel','pallet-fork','escape-cock','pallet-cock','balance-service'],focus:'balance_rim'},
 {id:29,label:'Movement',group:['fixed-core','train-bridge','center-bridge','upper-fourth'],focus:'321.1000_mainplate'},
 {id:42,label:'Case',group:['case-mid','bezel','ext_crown','ext_pusher_upper','ext_pusher_lower'],focus:'ext_case_mid'},
 {id:45,label:'Dial & hands',group:['dial','ext_small_seconds_hand','ext_30minute_hand','ext_12hour_hand','ext_hour_hand','ext_minute_hand','ext_chrono_hand'],focus:'ext_step_dial'}
];
const REFERENCE_LAYER_GAP=2.15;
const REFERENCE_MM=4/27,REFERENCE_X=new T.Vector3(1,0,0),REFERENCE_Z=new T.Vector3(0,0,1);
let referenceRig=null,displayRoot=new T.Group();scene.add(displayRoot);displayRoot.name='Omega reference presentation';
function referenceBounds(members,positionKey,quaternionKey,spread=0){
 const box=new T.Box3(),matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(1,1,1);
 for(const u of members){if(!u.on)continue;position.copy(u[positionKey]);if(spread)position.addScaledVector(u.referenceStrapSpread,spread);matrix.compose(position,u[quaternionKey],scale);
  for(const mesh of u.render){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));}
 }return box;
}
function buildReferenceBracelet(bracelet){
 // Arc length is in the source's millimetres. Fixed end-links lead into a
 // continuous wrist curve, turn over, and meet the two ends of the 23.7 mm clasp.
 // Its 35 mm outer reach leaves the individual links legible around the case.
 // The 43.265 mm arc is 3.38 + 11 × 3.46 + half a 3.15 mm link
 // + a 0.25 mm clasp hinge gap, so neither half floats above the buckle.
 const wristDepthMM=23.630303;
 const curve=new T.CubicBezierCurve3(new T.Vector3(0,-1.52,24.45),new T.Vector3(0,-2.5,41.5),new T.Vector3(0,-wristDepthMM,36),new T.Vector3(0,-wristDepthMM,11.85));
 curve.arcLengthDivisions=600;const length=curve.getLength(),flatTurn=new T.Quaternion().setFromAxisAngle(UP,-Math.PI/2);
 const rowGroups=assemblyRigV5.groups.filter(g=>g.id.startsWith('link-'));
 const setGroupPose=(g,position,rotation,positionKey,quaternionKey)=>{
  const carrier=byName(g.carrier),q=rotation.clone().multiply(carrier.knollFrame?.quaternion||new T.Quaternion()).normalize();
  for(const u of g.members){u[positionKey]=u.center.clone().sub(carrier.center).applyQuaternion(q).add(position);u[quaternionKey]=q.clone().multiply(u.baseQuat||new T.Quaternion());}
 };
 for(const g of rowGroups){
  const carrier=byName(g.carrier),index=Number(g.id.split('-').pop()),zsign=Math.sign(carrier.center.z),s=3.38+index*3.46;
  const t=curve.getUtoTmapping(0,s),target=curve.getPoint(t),tangent=curve.getTangent(t),angle=Math.atan2(-tangent.y,tangent.z);
  target.z*=zsign;target.multiplyScalar(REFERENCE_MM);
  setGroupPose(g,target,new T.Quaternion().setFromAxisAngle(REFERENCE_X,zsign*angle),'referencePosition','referenceQuaternion');
  // A dedicated flat strip, ordered end-link → twelve rows → clasp → twelve
  // rows → end-link. All three link columns, the pin and the catch stay rigid.
  const x=zsign*(13.675+(11-index)*3.46)*REFERENCE_MM;
  setGroupPose(g,new T.Vector3(x,-.2,0),flatTurn,'referenceStrapPosition','referenceStrapQuaternion');
  for(const u of g.members)u.referenceStrapSpread=new T.Vector3(zsign*(12-index)*1.4*REFERENCE_MM,0,0);
 }
 for(const side of [-1,1]){
  const g=assemblyRigV5.groupMap.get('endlink-'+side),carrier=byName(g.carrier),zsign=Math.sign(carrier.center.z);
  setGroupPose(g,new T.Vector3(zsign*(13.675+11*3.46+5.86)*REFERENCE_MM,-.2,0),flatTurn,'referenceStrapPosition','referenceStrapQuaternion');
  for(const u of g.members)u.referenceStrapSpread=new T.Vector3(zsign*13*1.4*REFERENCE_MM,0,0);
 }
 const clasp=assemblyRigV5.groupMap.get('clasp');
 setGroupPose(clasp,new T.Vector3(0,-wristDepthMM*REFERENCE_MM,0),new T.Quaternion().setFromAxisAngle(REFERENCE_X,Math.PI),'referencePosition','referenceQuaternion');
 setGroupPose(clasp,new T.Vector3(0,-.2,0),flatTurn,'referenceStrapPosition','referenceStrapQuaternion');
 for(const u of clasp.members)u.referenceStrapSpread=new T.Vector3();
 if(bracelet.some(u=>!u.referenceStrapPosition||!u.referenceStrapQuaternion||!u.referenceStrapSpread))throw Error('Incomplete reference bracelet pose');
 return{curveLengthMM:length,pitchMM:3.46,rowsPerSide:12,claspLengthMM:23.7};
}
function buildReferenceRig(){
 const assigned=new Set();for(const [index,layer]of REFERENCE_LAYERS.entries()){
  layer.index=index;layer.members=assemblyRigV5.groups.filter(g=>layer.group.includes(g.id)).flatMap(g=>g.members).filter(u=>!u.isSample);
  layer.center=new T.Box3();for(const u of layer.members){layer.center.expandByPoint(u.center);if(assigned.has(u))throw Error('Duplicate reference layer member');assigned.add(u);u.referenceLayer=index;}
  layer.center=layer.center.getCenter(new T.Vector3());
 }
 const bracelet=active.filter(u=>u.on&&['link','pin','clasp'].includes(u.knollRole));
 const crystal=active.filter(u=>u.on&&!assigned.has(u)&&!bracelet.includes(u));
 if(assigned.size!==251||bracelet.length!==106||crystal.length!==2)throw Error('Six-layer asset contract does not match');
 for(const u of active){u.root.removeFromParent();displayRoot.add(u.root);u.referencePosition=u.center.clone();u.referenceQuaternion=(u.baseQuat||new T.Quaternion()).clone();u.root.userData.unit=u;
  for(const mesh of u.render)for(const mat of(Array.isArray(mesh.material)?mesh.material:[mesh.material])){
   if(!mat.userData.referenceBase)mat.userData.referenceBase={color:mat.color?.clone(),metalness:mat.metalness,roughness:mat.roughness,opacity:mat.opacity,transparent:mat.transparent,depthWrite:mat.depthWrite};
  }
 }
 const braceletGeometry=buildReferenceBracelet(bracelet);
 const strapAssembledBounds=referenceBounds(bracelet,'referenceStrapPosition','referenceStrapQuaternion'),strapBounds=referenceBounds(bracelet,'referenceStrapPosition','referenceStrapQuaternion',1);
 referenceRig={layers:REFERENCE_LAYERS,bracelet,braceletSet:new Set(bracelet),crystal,total:359,layerGap:REFERENCE_LAYER_GAP,braceletGeometry,overallBounds:referenceBounds(active,'referencePosition','referenceQuaternion'),strapBounds,strapAssembledBounds,counts:REFERENCE_LAYERS.map(l=>({id:l.id,label:l.label,count:l.members.length}))};
 window.__REFERENCE_RIG=referenceRig;buildDeepDisassembly();
 return referenceRig;
}
const displayRotation=new T.Quaternion(),displayE=new T.Euler(0,0,0,'YXZ');
function setRefMaterialOpacity(u,alpha){
 u.root.visible=u.on&&alpha>.002;
 for(const mesh of u.render)for(const mat of(Array.isArray(mesh.material)?mesh.material:[mesh.material])){
  const base=mat.userData.referenceBase,transparent=base.transparent||alpha<.999;
  if(mat.transparent!==transparent){mat.transparent=transparent;mat.needsUpdate=true;}
  mat.opacity=base.opacity*alpha;mat.depthWrite=base.depthWrite&&alpha>.999;
 }
}
function poseReference(config){
 const {explode=0,bracelet=1,crystal=1,dial=1,caseAlpha=1,mechanism=1,zoomLayer=null,child=0,allChild=0,depart=0,crystalLift=0,dialLift=0,strap=0,knoll=0,openStrap=0}=config;
 const layerRotation=new T.Quaternion().setFromAxisAngle(REFERENCE_Z,-Math.PI*.1*explode),childOffset=new T.Vector3(),strapTarget=new T.Vector3();
 if(knoll>0)poseAssemblyV5(.7+.3*knoll,0,'manual');
 for(const u of active){
  if(!u.on){u.root.visible=false;continue;}
  if(knoll===0){u.pos.copy(u.referencePosition);u.quat.copy(u.referenceQuaternion);}else if(knoll<1){u.pos.lerp(u.referencePosition,1-knoll);u.quat.slerp(u.referenceQuaternion,1-knoll);}
  if(openStrap>0&&referenceRig.braceletSet.has(u)){u.pos.lerp(u.center,openStrap);u.quat.slerp(u.baseQuat||new T.Quaternion(),openStrap);}
  let alpha=1;
  if(u.referenceLayer!==undefined){const i=u.referenceLayer,layer=REFERENCE_LAYERS[i];
   if(explode){u.pos.sub(layer.center).applyQuaternion(layerRotation).add(layer.center);u.quat.premultiply(layerRotation);}
   u.pos.y+=(i-2.5)*REFERENCE_LAYER_GAP*explode;
   if(i===0||i===4)alpha=caseAlpha;else if(i===5)alpha=dial;else alpha=mechanism;
   if(zoomLayer!==null&&i!==zoomLayer)alpha*=1-child;
   // Fine service motion is applied after the carrier transform below.
   if(i===5)u.pos.y+=dialLift*5;
  }else if(referenceRig.braceletSet.has(u)){alpha=bracelet;u.pos.y-=depart*9;}else{alpha=crystal;u.pos.y+=crystalLift*6;}
  if(strap>0&&referenceRig.braceletSet.has(u)){
   strapTarget.copy(u.referenceStrapPosition).addScaledVector(u.referenceStrapSpread,config.strapSpread||0);
   u.pos.lerp(strapTarget,strap);u.quat.slerp(u.referenceStrapQuaternion,strap);
  }
  poseDeepDisassemblyUnit(u,config,layerRotation);
  u.root.position.copy(u.pos);u.root.quaternion.copy(u.quat);setRefMaterialOpacity(u,alpha);u.shadow.visible=false;
 }
 displayRoot.rotation.set(0,0,0);displayRoot.position.set(0,0,0);displayRoot.updateMatrixWorld(true);
}

/* Reference background companion. No dependencies, model edits or render-loop hooks.
 * White field: the-watch.pretty.js:2985–2993; particle motion:2916–2918.
 * The Canvas2D filaments are a restrained approximation of the source curl trails.
 * Call initReferenceBackdrop() once, then updateReferenceBackdrop({ darkStage,
 * phase: 0..1 (or { p }), section, time: elapsedSeconds, reduced }).
 */
(function referenceBackdropModule(global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const smooth = (a, b, value) => {
    const t = clamp((value - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  let instance = null;

  function initReferenceBackdrop() {
    if (instance) return instance.api;
    if (!document.body) return null;

    const canvas = document.createElement('canvas');
    canvas.id = 'reference-backdrop';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;touch-action:pan-y;';
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    document.body.insertBefore(canvas, document.body.firstChild);

    const field = document.createElement('canvas');
    const fieldCtx = field.getContext('2d', { alpha: false });
    if (!fieldCtx) { canvas.remove(); return null; }
    const media = global.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = global.matchMedia('(pointer: coarse)');
    const state = {
      darkStage: 0, phase: 0, section: 'Intro', reduced: media.matches,
      width: 1, height: 1, scale: 1, mobile: false, dirty: true, resized: true,
      frame: 0, lastDraw: -Infinity, anchorTime: 0, anchorNow: performance.now(),
      image: null, columns: null, rows: null, ribbons: [], drawCount: 0,
      disposed: false, lastCost: 0
    };

    // Stable seeds give scrubbing and reduced-motion captures the same composition.
    function seed(index) {
      const n = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
      return n - Math.floor(n);
    }

    function resize() {
      const width = Math.max(1, global.innerWidth || document.documentElement.clientWidth || 1);
      const height = Math.max(1, global.innerHeight || document.documentElement.clientHeight || 1);
      state.mobile = width < 768 || coarse.matches || (navigator.hardwareConcurrency || 8) <= 4;
      const budget = state.mobile ? 520000 : 1250000;
      const pixelScale = Math.min(global.devicePixelRatio || 1, state.mobile ? 1.25 : 1.5, Math.sqrt(budget / (width * height)));
      state.width = width;
      state.height = height;
      state.scale = Math.max(.35, pixelScale);
      canvas.width = Math.max(1, Math.round(width * state.scale));
      canvas.height = Math.max(1, Math.round(height * state.scale));
      field.width = state.mobile ? 76 : 112;
      field.height = Math.max(36, Math.min(156, Math.round(field.width * height / width)));
      state.image = fieldCtx.createImageData(field.width, field.height);
      state.columns = Array.from({ length: field.width }, (_, i) => (i + .5) / field.width);
      state.rows = Array.from({ length: field.height }, (_, i) => (i + .5) / field.height);
      const count = state.mobile ? 58 : 112;
      state.ribbons = Array.from({ length: count }, (_, i) => ({
        index: (i + .5) / count,
        seed: seed(i + 1),
        offset: seed(i + 67) * TAU,
        length: .2 + seed(i + 133) * .43,
        brightness: .035 + seed(i + 277) * .11,
        width: .42 + seed(i + 401) * .46
      }));
      state.resized = false;
      state.dirty = true;
    }

    function elapsed(now) {
      return state.reduced ? 0 : state.anchorTime + (now - state.anchorNow) / 1000;
    }

    function paintField(time) {
      const data = state.image.data;
      const dark = state.darkStage;
      const t = time * .3;
      let offset = 0;
      for (let y = 0; y < field.height; y++) {
        // The source uses GL UVs; Canvas rows run in the opposite direction.
        const v = 1 - state.rows[y];
        const sy = v * .8;
        for (let x = 0; x < field.width; x++) {
          const u = state.columns[x];
          const sx = u * .8;
          const edge = 1 - smooth(.3, .7, Math.hypot(u - .5, v - .5));
          let wave = (Math.sin(sx * 4 * Math.sin(sx * 4) + t + Math.sin(sy * 4 + t * 1.3))
            - Math.sin(sy + t + Math.sin(sx * 3 + t) * 4)) * .3 * edge;
          wave += 1 - smooth(.3, .7, Math.hypot(u - 1, v - 1));
          const bright = 20 - Math.max(0, Math.min(.24, wave * .3)) * 30;
          // Dark material chapter has a nearly neutral charcoal floor, not a glow.
          const charcoal = 8 + 2 * edge;
          const grey = Math.round(bright * (1 - dark) + charcoal * dark);
          // Warm, near-black field with a soft gold cast rather than neutral grey.
          data[offset++] = grey;
          data[offset++] = Math.round(grey * .94);
          data[offset++] = Math.round(grey * .84);
          data[offset++] = 255;
        }
      }
      fieldCtx.putImageData(state.image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(field, 0, 0, canvas.width, canvas.height);
    }

    function filamentPoint(ribbon, along, time, phase, point) {
      // Matches the reference's orbit frequencies (1.5 / 2) and slow global time.
      const theta = ribbon.index * 10 + time * .2 - along * ribbon.length;
      const pulse = .5 + Math.sin(theta) * .5;
      const angle = theta + pulse * .2;
      const opening = 1 - smooth(0, .3, phase);
      const radius = .6 * (1 + 3 * opening * opening * opening * ribbon.index);
      let x = Math.sin(angle * 1.5) * radius;
      let y = Math.cos(angle * 1.5) * radius;
      const z = Math.sin(angle * 2);
      const s = ribbon.offset;
      const flow = time * .028;
      const nx = Math.sin(y * 3.1 + z * 1.7 + s + flow);
      const ny = Math.sin(z * 2.7 + x * 1.5 + s * 1.31 - flow);
      const nz = Math.sin(x * 2.3 + y * 1.9 + s * .73 + flow * .7);
      const curl = .085 * (.8 + pulse);
      x += (ny - nz) * curl;
      y += (nz - nx) * curl;
      const perspective = .95 / (1.25 - z * .32);
      const zoom = 1 + smooth(.45, .8, phase) * .85;
      const size = Math.min(state.width, state.height) * .9 * perspective * zoom;
      point.x = state.width * (.51 + Math.cos(time * .065) * .018) + x * size;
      point.y = state.height * (.53 + Math.sin(time * .065) * .018) + y * size;
    }

    function paintFilaments(time) {
      if (state.section !== 'Particles' || state.darkStage < .002) return;
      const phase = state.phase;
      const visibility = state.darkStage * smooth(.001, .1, phase) * (1 - smooth(.75, .85, phase));
      if (visibility < .001) return;
      ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const point = { x: 0, y: 0 };
      const points = state.mobile ? 15 : 21;
      const third = points / 3;
      for (const ribbon of state.ribbons) {
        // Three tapered pieces make wisps rather than dots, beads or space stars.
        for (let segment = 0; segment < 3; segment++) {
          ctx.beginPath();
          for (let j = 0; j <= third; j++) {
            const along = 1 - (segment * third + j) / points;
            filamentPoint(ribbon, along, time, phase, point);
            if (j === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          const taper = [.22, .53, 1][segment];
          const opacity = ribbon.brightness * taper * visibility;
          ctx.strokeStyle = 'rgba(226,230,232,' + opacity.toFixed(4) + ')';
          ctx.lineWidth = ribbon.width;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function draw(now) {
      if (state.resized) resize();
      const started = performance.now();
      const time = elapsed(now);
      paintField(time);
      paintFilaments(time);
      state.lastDraw = now;
      state.dirty = false;
      state.drawCount++;
      state.lastCost = performance.now() - started;
    }

    function schedule() {
      if (!state.frame && !state.disposed && !document.hidden) {
        state.frame = requestAnimationFrame(tick);
      }
    }

    function tick(now) {
      state.frame = 0;
      if (state.disposed || document.hidden) return;
      const isParticle = state.section === 'Particles' && state.darkStage > .01;
      // No full-resolution per-pixel work; both resolution and cadence are capped.
      const fps = isParticle ? (state.mobile ? 18 : 24) : (state.mobile ? 10 : 15);
      const interval = 1000 / fps;
      if (state.dirty || state.resized || (!state.reduced && now - state.lastDraw >= interval - 1)) draw(now);
      if (!state.reduced || state.dirty || state.resized) schedule();
    }

    function onResize() { state.resized = true; state.dirty = true; schedule(); }
    function onVisibility() {
      if (document.hidden && state.frame) { cancelAnimationFrame(state.frame); state.frame = 0; }
      if (!document.hidden) { state.dirty = true; schedule(); }
    }
    function onMotion(event) { state.reduced = event.matches; state.dirty = true; schedule(); }
    global.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener?.('change', onMotion);

    const api = {
      canvas,
      getStats: () => ({ width: canvas.width, height: canvas.height, mobile: state.mobile,
        filaments: state.ribbons.length, draws: state.drawCount, drawMilliseconds: state.lastCost,
        reduced: state.reduced, section: state.section }),
      destroy() {
        state.disposed = true;
        if (state.frame) cancelAnimationFrame(state.frame);
        global.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        media.removeEventListener?.('change', onMotion);
        canvas.remove();
        instance = null;
      }
    };
    instance = { api, state, schedule };
    draw(performance.now());
    schedule();
    return api;
  }

  function updateReferenceBackdrop(options) {
    const api = initReferenceBackdrop();
    if (!api || !options || typeof options !== 'object') return api;
    const { state, schedule } = instance;
    const dark = clamp(finite(options.darkStage, state.darkStage));
    const phase = clamp(finite(typeof options.phase === 'object' && options.phase !== null ? options.phase.p : options.phase, state.phase));
    const section = typeof options.section === 'string' ? options.section : state.section;
    const reduced = typeof options.reduced === 'boolean' ? options.reduced : state.reduced;
    if (Math.abs(dark - state.darkStage) > .0001 || Math.abs(phase - state.phase) > .0001
      || section !== state.section || reduced !== state.reduced) state.dirty = true;
    state.darkStage = dark;
    state.phase = phase;
    state.section = section;
    state.reduced = reduced;
    if (Number.isFinite(options.time)) {
      state.anchorTime = options.time;
      state.anchorNow = performance.now();
    }
    if (state.dirty || !state.reduced) schedule();
    return api;
  }

  global.initReferenceBackdrop = initReferenceBackdrop;
  global.updateReferenceBackdrop = updateReferenceBackdrop;
})(window);

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

/* Cached, geometry-backed contact shadows for the reference presentation.
 *
 * This deliberately uses one of the photographic key lights rather than an
 * extra fill source. The key's direct contribution is therefore shadowed by
 * the actual Cal.321 meshes, while the EXR remains responsible for metal
 * reflections. Shadow maps are invalidated by a pose/light change, not by a
 * camera-only change.
 */
function installReferenceContactLight({T,scene,renderer,active=[]}={}){
 const lights=[];scene.traverse(o=>{if(o.isDirectionalLight)lights.push(o);});
 let key=lights.sort((a,b)=>b.intensity-a.intensity)[0];const ownsKey=!key;
 if(ownsKey){key=new T.DirectionalLight(0xffedd1,1.15);key.name='Omega contact key';scene.add(key);scene.add(key.target);}
 const previous={enabled:renderer.shadowMap.enabled,autoUpdate:renderer.shadowMap.autoUpdate,type:renderer.shadowMap.type,keyCastShadow:key.castShadow};
 renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFSoftShadowMap;
 key.castShadow=true;
 key.shadow.mapSize.set(2048,2048);
 key.shadow.radius=1.15;
 key.shadow.bias=-0.00007;
 key.shadow.normalBias=0.006;
 key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;
 key.shadow.camera.near=.1;key.shadow.camera.far=40;key.shadow.camera.updateProjectionMatrix();
 const opaqueMeshes=[],opaqueUnits=[],restores=[],shadedMaterials=new Set();let sourceTriangles=0;
 const materialsOf=mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material];
 for(const u of active){let unitOpaque=false;
  for(const mesh of u.render||[]){const mats=materialsOf(mesh).filter(Boolean),opaque=mats.length>0&&mats.every(m=>{const base=m.userData.referenceBase;return !(base?.transparent??m.transparent)&&(base?.opacity??m.opacity)>=.999&&!m.alphaMap&&!(m.transmission>0)&&!m.userData.referenceTransmissionApproximation&&m.name!=='sapphire';});
   if(!opaque)continue;
   for(const mat of mats)if(!shadedMaterials.has(mat)&&mat.metalness>.5){shadedMaterials.add(mat);const prior=mat.onBeforeCompile,cache=mat.customProgramCacheKey();mat.onBeforeCompile=shader=>{prior?.(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
#if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
if(receiveShadow){
float omegaContact=getShadow(directionalShadowMap[0],directionalLightShadows[0].shadowMapSize,directionalLightShadows[0].shadowBias,directionalLightShadows[0].shadowRadius,vDirectionalShadowCoord[0]);
outgoingLight*=mix(0.66,1.0,omegaContact);
}
#endif
#include <opaque_fragment>`);};mat.customProgramCacheKey=()=>cache+'|contact-occlusion-v1';mat.needsUpdate=true;}
   restores.push([mesh,mesh.castShadow,mesh.receiveShadow]);mesh.castShadow=true;mesh.receiveShadow=true;opaqueMeshes.push(mesh);unitOpaque=true;
   sourceTriangles+=mesh.geometry.index?mesh.geometry.index.count/3:(mesh.geometry.attributes.position?.count||0)/3;
  }
  if(unitOpaque)opaqueUnits.push(u);
 }
 const target=new T.Vector3(),keyPosition=new T.Vector3(),keyTarget=new T.Vector3(),corner=new T.Vector3();let signature='';let updates=0,shadowSpan=8;
 const quantize=n=>Math.round(n*1000);
 const visibility=mesh=>{for(let o=mesh;o;o=o.parent)if(!o.visible)return false;return true;};
 function poseSignature(){let h='';for(const u of opaqueUnits){if(!u.on||!u.root.visible)continue;const p=u.pos,q=u.quat;h+=u.id+':'+quantize(p.x)+','+quantize(p.y)+','+quantize(p.z)+','+quantize(q.x)+','+quantize(q.y)+','+quantize(q.z)+','+quantize(q.w)+';';}return h;}
 function update(options={}){
  // Call after photoLight.update(). Camera direction is only used when this
  // module had to create its own key; it never redirects an existing light.
  if(ownsKey){const focus=options.target||options.focus;focus?target.copy(focus):target.set(0,0,0);const rearMix=Math.max(0,Math.min(1,options.rearMix??-(options.direction?.y||0)));key.position.set(-8,5*(1-2*rearMix),6).add(target);key.target.position.copy(target);}
  key.getWorldPosition(keyPosition);key.target.getWorldPosition(keyTarget);
  let castMask='';for(const mesh of opaqueMeshes){mesh.castShadow=visibility(mesh)&&mesh.userData.unit?.on!==false&&materialsOf(mesh).every(m=>!m.transparent&&m.opacity>=.999);castMask+=mesh.castShadow?'1':'0';}
  const next=keyPosition.toArray().map(quantize)+','+keyTarget.toArray().map(quantize)+'|'+castMask+'|'+poseSignature();
  if(next!==signature){
   signature=next;
   // The old fixed 8-unit shadow box clipped the outer exploded carriers.
   // Fit cached mesh bounds in light space; no triangle traversal is needed.
   key.shadow.updateMatrices(key);const view=key.shadow.camera.matrixWorldInverse,box=new T.Box3();
   for(const mesh of opaqueMeshes){if(!mesh.castShadow)continue;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    const b=mesh.geometry.boundingBox;mesh.updateWorldMatrix(true,false);
    for(let i=0;i<8;i++){corner.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(mesh.matrixWorld).applyMatrix4(view);box.expandByPoint(corner);}
   }
   if(!box.isEmpty()){
    const c=key.shadow.camera,pad=.25;c.left=box.min.x-pad;c.right=box.max.x+pad;c.bottom=box.min.y-pad;c.top=box.max.y+pad;
    c.near=Math.max(.05,-box.max.z-.5);c.far=Math.max(c.near+1,-box.min.z+1);c.updateProjectionMatrix();shadowSpan=Math.max(c.right-c.left,c.top-c.bottom);
   }
   key.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;updates++;
  }
  if(typeof window!=='undefined')window.__REFERENCE_CONTACT_SHADOW={version:1,light:key.name,casters:opaqueMeshes.filter(m=>m.castShadow).length,units:opaqueUnits.filter(u=>u.on&&u.root.visible).length,sourceTriangles,updates,mapSize:key.shadow.mapSize.x,frustum:8,normalBias:key.shadow.normalBias};
 }
 update();
 return{version:2,key,casters:opaqueMeshes,opaqueUnits,update,stats:()=>({casters:opaqueMeshes.filter(m=>m.castShadow).length,sourceTriangles,updates,mapSize:key.shadow.mapSize.x,frustum:shadowSpan}),dispose(){key.castShadow=previous.keyCastShadow;for(const[mesh,cast,receive]of restores){mesh.castShadow=cast;mesh.receiveShadow=receive;}renderer.shadowMap.enabled=previous.enabled;renderer.shadowMap.autoUpdate=previous.autoUpdate;renderer.shadowMap.type=previous.type;if(ownsKey){scene.remove(key);scene.remove(key.target);}key.shadow.dispose();}};
}

/* Cal.321 balance-only presentation motion.
 * 18,000 vibrations/hour = five beats/second = 2.5 complete oscillations/second.
 * The restrained 0.7 rad display amplitude is not a measured running amplitude.
 * Hairspring, collet, regulator, cock and bearings retain their source pose;
 * no rigid hairspring rotation or invented endpoint deformation is applied.
 * Call poseReference() first on every frame, then this function, then shadows.
 */
let referenceMotionRig=null;
function initializeReferenceMotion(options={}){
 const source=options.active||(typeof active!=='undefined'?active:[]);
 const names=['balance_rim','balance_staff','balance_roller','balance_arm','balance_arm_boss',
  ...Array.from({length:8},(_,i)=>'bal_screw'+i),'roller_jewel'];
 const map=new Map(source.map(u=>[u.name,u])),missing=names.filter(name=>!map.has(name));
 const members=names.map(name=>map.get(name)).filter(Boolean),staff=map.get('balance_staff');
 const report={version:1,ready:!missing.length,members:names,missing,frequencyHz:2.5,beatsPerHour:18000,amplitudeRadians:.7,active:false,angle:0,
  limitation:'Balance motion only; the source hairspring remains static and running amplitude is illustrative.'};
 referenceMotionRig={members,staff,report,axis:new T.Vector3(),pivot:new T.Vector3(),delta:new T.Quaternion(),turn:new T.Quaternion(),sourceUp:new T.Vector3(0,1,0)};
 if(typeof window!=='undefined')window.__REFERENCE_MOTION=report;
 return report;
}
function poseReferenceMotion({time=0,section='',phase=0,reduced=false,audit=false}={}){
 if(!referenceMotionRig)initializeReferenceMotion();
 const rig=referenceMotionRig,report=rig.report;report.active=false;report.angle=0;
 if(!report.ready||reduced||audit||!Number.isFinite(time)||!Number.isFinite(phase)||!rig.staff.on)return report;
 const smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
 let weight=0;
 if(section==='Particles')weight=smooth(.025,.08,phase)*(1-smooth(.52,.64,phase));
 if(section==='Presentation')weight=smooth(.35,.45,phase)*(1-smooth(.52,.67,phase));
 if(weight<=0||!rig.members.some(u=>u.on&&u.root.visible))return report;
 // Staff center is the actual pivot. Transform its source Y axis by the
 // current presentation turn so the wheel remains seated if the rig tilts.
 rig.pivot.copy(rig.staff.pos);
 rig.delta.copy(rig.staff.quat).multiply((rig.staff.baseQuat||new T.Quaternion()).clone().invert());
 rig.axis.copy(rig.sourceUp).applyQuaternion(rig.delta).normalize();
 const angle=.7*weight*Math.sin(2*Math.PI*2.5*(time%.4));
 rig.turn.setFromAxisAngle(rig.axis,angle);
 for(const u of rig.members){
  u.pos.sub(rig.pivot).applyQuaternion(rig.turn).add(rig.pivot);
  u.quat.premultiply(rig.turn).normalize();
  u.root.position.copy(u.pos);u.root.quaternion.copy(u.quat);u.root.updateMatrixWorld(true);
 }
 report.active=true;report.angle=angle;report.weight=weight;report.time=time;
 return report;
}

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

/* Small component thumbnails and the selectable live studies share the source GLB. */
function captureReferenceImages(){
 if(!document.querySelector('#parts-cover,.parts-index img'))return;
 const size=new T.Vector2();renderer.getSize(size);const ratio=renderer.getPixelRatio(),aspect=camera.aspect,savedSection=currentSection;
 renderer.setPixelRatio(1);renderer.setSize(640,640,false);camera.aspect=1;camera.up.set(0,0,-1);scene.background=new T.Color(0x0b0b0c);
 function shot(id,config){poseReference(config.state);window.poseConceptTourbillon?.({time:7.3,config,section:'Intro',phase:0,reduced:false});currentSection='Images';referenceCamera(config);referenceContactLight?.update(config);renderer.render(scene,camera);modelThumbnails[id]=renderer.domElement.toDataURL('image/jpeg',.91);}
 shot('rear',{state:{openStrap:1},direction:new T.Vector3(.22,-1,.17),distance:22,focus:new T.Vector3(0,-.8,0),fov:25,screen:[.5,.5]});
 const cover=document.querySelector('#parts-cover');if(cover)cover.src=modelThumbnails.rear;
 const names=['321.1000_mainplate','321.1002_bridge34','columnwheel_base','clutch_rocker','balance_rim','breguet_hairspring','pallet_fork','321.1705_chrono_runner','321.1708_minute_recorder','ext_caseback_ring'];
 for(const [i,name] of names.entries()){
  poseReference({});window.poseConceptTourbillon?.({time:0,config:{state:{dial:0}},section:'Parts',phase:0,reduced:true});const unit=byName(name),box=new T.Box3();for(const u of active){u.root.visible=u===unit;if(u===unit)box.setFromObject(u.root);}
  const center=box.getCenter(new T.Vector3()),dimension=box.getSize(new T.Vector3()),radius=Math.max(dimension.x,dimension.z,dimension.y);
  camera.position.copy(center).add(new T.Vector3(.2,-1,.3).normalize().multiplyScalar(radius*3.0));camera.lookAt(center);camera.updateProjectionMatrix();referenceContactLight?.update({});renderer.render(scene,camera);
  const img=document.querySelector(`.parts-index li:nth-child(${i+1}) img`);if(img)img.src=renderer.domElement.toDataURL('image/jpeg',.88);
 }
 renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);camera.aspect=aspect;scene.background=null;currentSection=savedSection;poseReference({});rendererDirty=true;
}
const footerMaterialBaselines=new WeakMap();
const footerEntryEase=(start,end,value)=>{const t=Math.max(0,Math.min(1,(value-start)/(end-start)));return t*t*t*(t*(t*6-15)+10);};
function createFooterWatches(){
 const studies=[
  {id:'steel',label:'Ink steel',state:{dial:'ink',hardware:'silver',bracelet:'silver'}},
  {id:'black',label:'Midnight',state:{dial:'blue',hardware:'graphite',bracelet:'graphite'}},
  {id:'gold',label:'Silver champagne',state:{dial:'silver',hardware:'champagne',bracelet:'silver'}},
  {id:'rose',label:'Ink champagne',state:{dial:'ink',hardware:'champagne',bracelet:'silver'}}
 ];
 for(const study of studies){
  const group=new T.Group();group.name='Kimi composition '+study.label;group.userData.kimiConfiguration={...study.state};group.visible=false;
  for(const u of active.filter(u=>u.on&&u.origin)){
   const part=new T.Group();part.position.copy(u.referencePosition);part.quaternion.copy(u.referenceQuaternion);
   for(const original of u.render){const mats=(Array.isArray(original.material)?original.material:[original.material]).map(m=>{
    const mat=window.cloneKimiMaterial({T,source:m,unit:u,state:study.state}),base=m.userData.referenceBase;
    mat.opacity=base?.opacity??1;mat.transparent=base?.transparent??false;mat.depthWrite=base?.depthWrite??true;
    if(m.name==='sapphire')referenceGlass(mat);return mat;});
    const mesh=new T.Mesh(original.geometry,Array.isArray(original.material)?mats:mats[0]);part.add(mesh);
   }group.add(part);
  }window.createConceptTourbillonClone?.({parent:group,phaseOffset:footerWatches.length*7.5});
  // Capture every independent clone material after its glass setup and concept
  // mechanism have been added. Opacity never propagates to the source watch.
  const seen=new Set(),baselines=[];group.traverse(object=>{if(!object.isMesh)return;for(const material of(Array.isArray(object.material)?object.material:[object.material])){
   if(seen.has(material))continue;seen.add(material);baselines.push({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});
  }});footerMaterialBaselines.set(group,baselines);
  scene.add(group);footerWatches.push(group);
 }
}
function updateFooterWatches(phase){
 const mobile=innerWidth<768,height=2*camera.position.distanceTo(new T.Vector3(0,-1.7,0))*Math.tan(T.MathUtils.degToRad(25/2)),width=height*camera.aspect;
 const inFooter=phase.name==='Footer'&&!globalThis.__AWW_HIDE_FOOTER_WATCHES,mix=inFooter?clamp(Number.isFinite(phase.mix)?phase.mix:1):0;
 // Leave the large Parts hero alone during the first 65% of the overlap.
 // Delayed quintic alpha has zero slope at both ends, including reverse scroll.
 const alpha=inFooter?footerEntryEase(.65,1,mix):0,states=[];
 footerWatches.forEach((group,i)=>{
  group.visible=inFooter&&alpha>0;
  const baselines=footerMaterialBaselines.get(group)||[];
  for(const base of baselines){const mat=base.material,transparent=base.transparent||alpha<1;
   if(mat.transparent!==transparent){mat.transparent=transparent;mat.needsUpdate=true;}
   mat.opacity=base.opacity*alpha;mat.depthWrite=base.depthWrite&&alpha===1;
  }
  const enter=inFooter?footerEntryEase(.65+i*.025,1,mix):0;group.scale.setScalar(mobile?.52:.57);
  const stagger=[-.028,.024,-.016,.035][i]*height;
  group.position.set(mobile?(i%2-.5)*width*.49:(i-1.5)*width*.225,0,(mobile?(i<2?-1:1)*height*.22:stagger)+(1-enter)*height);
  group.rotation.set([-.08,.10,-.05,.07][i]+pointerRef.dy*.07,[-.075,.055,-.025,.085][i],[-.09,.065,-.055,.08][i]-pointerRef.dx*.10);
  states.push({index:i,visible:group.visible,alpha,enter,position:group.position.toArray(),materials:baselines.length});
 });
 const report={version:'kimi-footer-handoff-1',active:inFooter,mix,entryStart:.65,alpha,visibleWatches:states.filter(value=>value.visible).length,studies:states};
 window.__FOOTER_HANDOFF=report;document.body.dataset.footerHandoff=JSON.stringify(report);
}

/* Reference-led chapter choreography. Original source evidence is documented in
 * research/omega-scroll-321/REFERENCE_TIMELINES.md. No reference brand/model code is run. */
let scrollSections=[],scrollMax=1,scrollTarget=0,scrollValue=0,domScrollValue=0,previousTime=0,isPlaying=false;
let currentSection='Intro',sectionProgress=0,selectedLayer=null,selectionValue=0,hoverLayer=null,holdValue=0,holdDown=false;
let rendererDirty=true,resizeFlag=false,frameTimes=[],actualFrames=0,modelThumbnails={},chosenFinish='steel',holdStarted=0,lastColorStep=-1,footerWatches=[],finishLocked=false,referenceContactLight=null,kimiConfiguration=null,conceptTourbillonAsset=null,partsReassembly=null;
let frameTimingSection=null,previousRenderedFrameTime=null;
const exteriorAssetPath=Q.get('asset')==='machining'?'assets/kimi_machining_exterior_v3.glb':AWW_ASSETS.exterior;
const movementAssetPath=Q.get('movement')==='refined'?'assets/kimi_movement_refined_v1.glb':AWW_ASSETS.movement;
const tourbillonAssetPath=AWW_ASSETS.tourbillon;
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
  const i=phase.p<.24?0:phase.p<.46?1:phase.p<.70?2:3;
  $('presentation-title').innerHTML=['HOROLOGY','AUTOMOTIVE','ART &amp;<br>CULTURE','PRIVATE<br>CLIENTS'][i];
  $('presentation-copy').textContent=['Rare independents and heritage maisons, experienced up close.','Coachbuilt cars and the culture of the drive.','Artists, designers and patrons shaping the scene.','A private circle of collectors and founders.'][i];
  document.body.dataset.presentation=String(i);
 }
 const mechanismTitle=document.querySelector('.mechanism-heading');mechanismTitle.style.opacity=String(1-seg(.37,.46,phase.p));document.querySelector('.mechanism-note').style.opacity=String(1-seg(.37,.46,phase.p));document.querySelector('.mechanism-rate').style.opacity=String(seg(.12,.22,phase.p)*(1-seg(.46,.57,phase.p)));
 if(phase.name==='Colors'){const finishNumber=$('finish-number');if(finishNumber)finishNumber.textContent='0'+({ink:1,blue:2,silver:3}[kimiConfiguration?.state.dial]||1);}
 if(phase.name==='Parts'){
  const p=phase.p,progress=seg(.10,.75,p),steps=['01 / THE GUESTS','02 / THE WORLDS','03 / THE VENUE','04 / ONE EVENING'];
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
if(!window.__CHROME_WIRED){$('reference-menu')?.addEventListener('click',()=>{const nav=$('reference-navigation');nav.hidden=!nav.hidden;$('reference-menu').setAttribute('aria-expanded',String(!nav.hidden));});
for(const b of document.querySelectorAll('[data-section-go]'))b.addEventListener('click',e=>{e.preventDefault();seekSection(b.dataset.sectionGo);$('reference-navigation').hidden=true;$('reference-menu').setAttribute('aria-expanded','false');});}
for(const b of document.querySelectorAll('[data-finish]'))b.addEventListener('click',()=>{kimiConfiguration?.apply({dial:({steel:'ink',black:'blue',gold:'silver',rose:'ink'}[b.dataset.finish]),hardware:({steel:'silver',black:'graphite',gold:'champagne',rose:'champagne'}[b.dataset.finish]),bracelet:b.dataset.finish==='black'?'graphite':'silver'});if(b.closest('.footer-studies')){finishLocked=true;stopReference();selectedLayer=null;selectionValue=holdValue=0;scrollTarget=scrollValue=domScrollValue=0;scrollTo({top:0,behavior:'instant'});rendererDirty=true;}});
$('reference-play')?.addEventListener('click',()=>{if(!ready)return;if(isPlaying){stopReference();return;}if(scrollValue>scrollMax*.98){scrollTarget=scrollValue=domScrollValue=0;scrollTo({top:0,behavior:'instant'});}isPlaying=true;$('reference-play').querySelector('.play-label').textContent='Pause';$('reference-play').setAttribute('aria-pressed','true');});
$('component-close')?.addEventListener('click',()=>{selectedLayer=null;rendererDirty=true;});
const manager=new T.LoadingManager();manager.onProgress=(url,loaded,total)=>{if($('load-status'))$('load-status').textContent='Now loading · '+Math.round(loaded/total*100)+'%';};
const draco=new DRACOLoader(manager).setDecoderPath('vendor/three/0.160.0/examples/jsm/libs/draco/gltf/');
Promise.all([new GLTFLoader(manager).setDRACOLoader(draco).loadAsync(movementAssetPath),fetch('assets/manifest.json').then(r=>{if(!r.ok)throw Error('Manifest HTTP '+r.status);return r.json();}),new GLTFLoader(manager).setDRACOLoader(draco).loadAsync(exteriorAssetPath),loadSourceFinishes(),new GLTFLoader(manager).loadAsync(tourbillonAssetPath)]).then(([g,m,e,finishes,tb])=>{conceptTourbillonAsset=tb;return build(g,m,e);}).catch(refError);
measureReference();requestAnimationFrame(referenceFrame);
