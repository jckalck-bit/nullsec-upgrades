'use strict';
function create(config,log,warn,diagnostics){
 let sov; const cached=new Map(); let ready=false;
 function points(state){if(!state?.claimStructureID)return 0;const d=state.devIndices||{};return Math.max(0,Math.min(15,sov.getOperationalIndexLevel(d.industrialPoints)+sov.getOperationalIndexLevel(d.militaryPoints)+sov.getStrategicIndexLevel(d.claimedForDays)));}
 function getIndexPoints(id){if(!config.indexPoints||!sov)return 0;try{return points(sov.getSystemState(Number(id)));}catch(e){warn(e.message);return 0;}}
 function snapshot(state){if(!state?.claimStructureID)return;const id=Number(state.solarSystemID);if(!cached.has(id)){const n=points(state);cached.set(id,n);diagnostics.mark("indexPoints",Number.isInteger(n)&&n>=0&&n<=15,"Startup snapshot range checked");log(`Index benefits ${id}: ${n} points`);}}
 function attach(exports,filename){if(!config.indexPoints||sov||!filename.endsWith('/services/sovereignty/sovState.js'))return;sov=exports;
  const original=sov.upsertSystemState;if(typeof original!=='function')return;
  sov.upsertSystemState=function(id){const result=original.apply(this,arguments);if(ready)try{snapshot(result);}catch(e){warn(e.message);}return result;};
  setImmediate(()=>{try{for(const state of sov.listAllSovereigntySystemStates())snapshot(state);ready=true;}catch(e){warn(`Index snapshot failed: ${e.message}`);}}).unref();
 }
 function bonus(id){return cached.get(Number(id))||0;}
 return {attach,getIndexPoints,escalationBonus:id=>config.indexEscalation?bonus(id):0,boostResources:(id,local)=>{const n=config.indexResources?bonus(id):0;const result=n?{power:Math.round(local.power*(1+n/100)),workforce:Math.round(local.workforce*(1+n/100))}:local;diagnostics.mark("indexResources",null,"Local boost calculated; final native resource totals not independently verified");return result;}};
}
module.exports={create};
