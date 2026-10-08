/* Small component thumbnails and the selectable live studies share the source GLB. */
function captureReferenceImages(){
 if(!document.querySelector('#parts-cover,.parts-index img'))return;
 const size=new T.Vector2();renderer.getSize(size);const ratio=renderer.getPixelRatio(),aspect=camera.aspect,savedSection=currentSection;
 renderer.setPixelRatio(1);renderer.setSize(640,640,false);camera.aspect=1;camera.up.set(0,0,-1);scene.background=new T.Color(0xebebeb);
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
 const inFooter=phase.name==='Footer',mix=inFooter?clamp(Number.isFinite(phase.mix)?phase.mix:1):0;
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
