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
