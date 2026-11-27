"use strict";
const OFF = Object.freeze({
  mark() {},
  recordTest() {},
  snapshot() { return []; },
  report() { return "Diagnostics disabled (Verbose Logging OFF)."; }
});
function create(config, log) {
  if (config.verbose !== true) return OFF;
  const flags = {
    escalations:config.escalations,oreScaling:config.oreScaling,strictSize:config.strictMiningSiteSize,
    tierDistribution:config.tierMix,arrayDistribution:config.tierMix&&config.arrayMix,
    tierRandomness:config.tierMix&&config.randomMix,respawn:true,instantRespawn:config.instantRespawn,initialSpawn:true,
    mercoxit:config.mercoxit,planetaryResources:config.automaticPlanetaryResources,
    industrialProgression:config.indexProgression,industrialDecay:config.indexDecay,
    indexPoints:config.indexPoints,indexEscalation:config.indexEscalation,indexResources:config.indexResources,
    reset:config.reset,commands:config.commands,verbose:true
  };
  const rows = new Map(Object.entries(flags).map(([k,v])=>[k,{status:v?'Pending':'Disabled',detail:v?'Awaiting evidence':'Configuration off'}]));
  function mark(k,ok,detail) {
    const r=rows.get(k); if(!r||r.status==='Disabled') return;
    const status=ok===null?'Pending':ok===true?'Passed':'Failed';
    // Pending is weaker than observed evidence; do not erase a real result.
    if(status==='Pending' && r.status!=='Pending') return;
    if(r.status===status && r.detail===detail) return;
    rows.set(k,{...r,status,detail,at:Date.now()});
    // Details are cached for the menu; only a status transition emits a line.
    if(r.status!==status) log(`${k}: ${status} — ${detail}`);
  }
  function recordTest(key,result,quiet=false) {
    const row=rows.get(key); if(!row || row.status==='Disabled') return;
    const next={status:result.status,detail:String(result.detail||''),at:Date.now(),durationMs:result.durationMs??null,hook:result.hook||null};
    const previous=row.test;
    rows.set(key,{...row,test:next});
    if(!quiet&&(previous?.status!==next.status || previous?.detail!==next.detail)) log(`${key}: Forced test ${next.status} — ${next.detail}`);
  }
  function recordInspection(key,result){const r=rows.get(key);if(r&&r.status!=='Disabled')rows.set(key,{...r,inspection:result});}
  function report(){return [...rows].map(([k,r])=>`${k}: ${r.status} (${r.detail})`).join('\n');}
  const labels = {
    escalations:'Mining escalations', oreScaling:'Ore scaling', strictSize:'Strict mining site size',
    tierDistribution:'Mining site tier distribution', arrayDistribution:'Distribution by Array level',
    tierRandomness:'Tier distribution randomness', respawn:'Mining site respawn',
    instantRespawn:'Instant site respawn', initialSpawn:'Initial Array spawn wait', mercoxit:'Mercoxit sites and reserves',
    planetaryResources:'Automatic planetary resources', industrialProgression:'Industrial index progression',
    industrialDecay:'Industrial index decay', indexPoints:'Index Points', indexEscalation:'Index escalation bonus',
    indexResources:'Index resource bonus', reset:'Reset mining sites', commands:'Administrative commands',
    verbose:'Verbose Logging'
  };
  // Only enabled features are returned, with no additional gameplay calculations.
  function snapshot() {
    return [...rows].filter(([,r])=>r.status!=='Disabled').map(([key,r])=>({key,label:labels[key]||key,status:r.status,detail:r.detail,at:r.at||null,test:r.test||null,inspection:r.inspection||null}));
  }
  return {mark,recordTest,recordInspection,report,snapshot};
}
module.exports={create};
