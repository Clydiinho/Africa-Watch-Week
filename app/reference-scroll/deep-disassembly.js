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
