'use strict';
function create(config, log) {
 const flags={escalations:config.escalations,oreScaling:config.oreScaling,strictSize:config.strictMiningSiteSize,tierDistribution:config.tierMix,arrayDistribution:config.tierMix&&config.arrayMix,tierRandomness:config.tierMix&&config.randomMix,respawn:true,instantRespawn:config.instantRespawn,mercoxit:config.mercoxit,planetaryResources:config.automaticPlanetaryResources,industrialProgression:config.indexProgression,industrialDecay:config.indexDecay,indexPoints:config.indexPoints,indexEscalation:config.indexEscalation,indexResources:config.indexResources,reset:config.reset,commands:config.commands,verbose:config.verbose};
 const rows=new Map(Object.entries(flags).map(([k,v])=>[k,{status:v?'Pending':'Disabled',detail:v?'Awaiting evidence':'Configuration off'}]));
 function mark(k,ok,detail){const r=rows.get(k);if(!r||r.status==='Disabled')return;const status=ok===null?'Pending':ok?'Validated':'Failed';if(r.status===status&&r.detail===detail)return;rows.set(k,{status,detail});log(`${k}: ${status} — ${detail}`);}
 function report(){return [...rows].map(([k,r])=>`${k}: ${r.status} (${r.detail})`).join('\n');}
 return {mark,report};
}
module.exports={create};
