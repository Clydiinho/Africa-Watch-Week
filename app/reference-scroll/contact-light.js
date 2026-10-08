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
