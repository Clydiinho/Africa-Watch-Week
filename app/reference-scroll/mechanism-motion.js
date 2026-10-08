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
