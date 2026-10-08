// Omega Calibre 321 scroll adaptation. Source geometry and finish maps unchanged.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
const Q=new URLSearchParams(location.search), RECORD=false;
const $=id=>document.getElementById(id),clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>(x=clamp(x),x*x*(3-2*x)),seg=(a,b,x)=>ease((x-a)/(b-a)),hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296};
const units=[],active=[],pickMeshes=[],UP=new T.Vector3(0,1,0),V=new T.Vector3(),errors=[];
let ready=false,S=0,mode='manual',knollSize=[1,1],packStats=[],photoLight=null;
const dark=false;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.25:1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
renderer.setClearColor(0x000000,0);renderer.domElement.id='watch-canvas';renderer.domElement.setAttribute('aria-hidden','true');document.body.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xefeeea);const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.1,400);
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
 window.__EXTERIOR={version:2,origin:'blender-kimi-openheart',asset:'assets/kimi_openheart_exterior_v2.glb',model:'Kimi Open Heart concept',units:imported.length,meshObjects:expected,renderMeshes:claimed.size,vertices:vertexCount,scaleFactor:factor,sourceCaseWidth:refSize.x,caseDiameter:diameterWorld,scale:'4 world = 27 mm',dialSide:'+Y',normalizationOrigin:origin.toArray(),roleCounts:imported.reduce((r,u)=>(r[u.knollRole]=(r[u.knollRole]||0)+1,r),{}),flattened:imported.filter(u=>u.knollFrame.quaternion.angleTo(new T.Quaternion())>1e-6).length};
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
 const environment=new T.Scene();environment.background=new T.Color(.16,.17,.16);
 const envGeometry=new T.PlaneGeometry(1,1),envMaterials=[];
 function panel(position,width,height,intensity,tint){
  const material=new T.MeshBasicMaterial({color:new T.Color(tint).multiplyScalar(intensity),side:T.DoubleSide});envMaterials.push(material);
  const plane=new T.Mesh(envGeometry,material);plane.position.fromArray(position);plane.scale.set(width,height,1);plane.lookAt(0,0,0);environment.add(plane);return plane;
 }
 /* A large diagonal key carries silver, while a narrow opposite strip defines polished edges. */
 panel([-6,6,3],7,11,2.8,0xfff2dd);
 panel([7,3,-4],1.7,10,3.2,0xe5edff);
 panel([-1,4,-8],6,4,.60,0xf5f6f2);
 panel([2,9,0],4,2,.45,0xffffff);
 /* The finished watch's decorated movement faces -Y; reflected below-boxes preserve the back view. */
 panel([-6,-5,3],7,9,2.0,0xffefdb);
 panel([7,-3,-4],1.5,8,2.5,0xe5edff);
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromScene(environment,.035,.1,80);scene.environment=target.texture;pmrem.dispose();envGeometry.dispose();envMaterials.forEach(m=>m.dispose());
 const lightGroup=new T.Group();lightGroup.name='Omega photographic lights';scene.add(lightGroup);
 const key=new T.DirectionalLight(0xffedd1,1.6);key.position.set(-8,5,6);lightGroup.add(key);lightGroup.add(key.target);
 const fill=new T.DirectionalLight(0xdce8fa,.44);fill.position.set(6,3,-5);lightGroup.add(fill);lightGroup.add(fill.target);
 const top=new T.HemisphereLight(0xf5f5ec,0x6e736e,.15);lightGroup.add(top);
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
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
