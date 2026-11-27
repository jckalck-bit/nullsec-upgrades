"use strict";
const path = require('node:path');
const DAY = 86400000;
const ownerKey = state => `${state.claimStructureID}:${state.allianceID}:${state.corporationID}`;
const thresholds = [0,1500000,3000000,6000000,12000000,24000000];
function toVolume(points,width) {
  const level = Math.min(4,Math.floor(points/width));
  return thresholds[level]+(points/width-level)*(thresholds[level+1]-thresholds[level]);
}
function toPoints(volume,width) {
  let level=0; while(level<4 && volume>=thresholds[level+1]) level++;
  return Math.min(5*width,width*(level+(volume-thresholds[level])/(thresholds[level+1]-thresholds[level])));
}
function create({config,loadState,mutateState,log,warn,diagnostics}) {
  let sov, dir, timer, batchTimer, stopping=false, running=false, deadline=0;
  const snapshots=config.verbose===true ? new Map() : null;
  const hooked=new WeakSet();
  const pending=new Map();
  let width, corporations, world;
  let debugLedgerAttached=false, debugShutdownAttached=false;
  function eligible(id) {
    if(!sov) return null;
    const current=sov.getSystemState(id);
    if(!current?.claimStructureID || !current.corporationID || !sov.getSystemSovClaim(id)) return null;
    world ||= require(path.join(dir,'../../space/worldData'));
    const system=world.getSolarSystemByID(id);
    if(!system || !(Number(system.securityStatus??system.security)<0)) return null;
    corporations ||= require(path.join(dir,'../corporation/corporationState'));
    if(corporations.isNpcCorporationID(current.corporationID)) return null;
    const corp=corporations.getCorporationRecord(current.corporationID);
    if(!corp || corp.deleted || corp.isNPC!==false) return null;
    return current;
  }
  function capped(current) {return !config.indexDecay && Number(current.devIndices.industrialPoints)>=5*width;}
  function flush(){deadline=Date.now()+60000; snapshots?.clear();if(!pending.size)return;for(const [id,row] of pending){pending.delete(id);try{update(id,row.volume,Date.now(),row.owner);}catch(e){if(config.verbose){diagnostics.mark('industrialProgression',false,'Batch settlement failed; not retried to avoid double credit');warn(`Industrial batch ${id} failed: ${e.message}`);}}}}
  function credit(id,volume){if(stopping)return;const state=eligible(id);if(!state || capped(state) || !Number.isFinite(volume) || volume<=0 || config.indexMultiplier<=0)return;const owner=ownerKey(state);const old=pending.get(id);pending.set(id,{owner,volume:volume+(old?.owner===owner?old.volume:0)});}
  const enabled=()=>config.indexProgression||config.indexDecay;
  function update(id, volume=0, now=Date.now(), expectedOwner=null) {
    if (!sov || running) return;
    running=true;
    try {
      if(volume<=0 && !config.indexDecay)return;
      const current=eligible(id);
      if(!current || capped(current))return;
      const old=Number(current.devIndices.industrialPoints)||0;
      const saved=loadState().industrialIndex?.[id];
      const owner=ownerKey(current);
      if(expectedOwner && expectedOwner!==owner)return;
      const same=saved?.owner===owner && saved.points===old;
      let points=old+(same?saved.fraction||0:0);
      const decaying=config.indexDecay && same && saved.decayEnabled && saved.rate===config.indexDecayRate;
      if(decaying) {
        const elapsed=Math.max(0,now-saved.at);
        points*=elapsed===0?1:Math.pow(1-config.indexDecayRate/100,elapsed/DAY);
      }
      if(volume>0 && config.indexProgression && config.indexMultiplier>0 && points<5*width) points=toPoints(toVolume(points,width)+volume*config.indexMultiplier,width);
      const next=Math.floor(points+1e-8);
      if(next!==old) sov.upsertSystemState(id,{devIndices:{industrialPoints:next,industrialIncreasing:next>old}},{suppressStructureSync:true});
      mutateState(state=>{(state.industrialIndex??={})[id]={owner,points:next,fraction:points-next,at:now,decayEnabled:!!config.indexDecay,rate:config.indexDecayRate};});
      if (config.verbose === true) {
      const actual=Number(sov.getSystemState(id)?.devIndices?.industrialPoints);
      if(volume>0)diagnostics.mark("industrialProgression",actual===next,"Native points read back after batch");
      if(decaying)diagnostics.mark("industrialDecay",actual===next,"Native points read back after decay calculation");
      }
      if(config.verbose && next!==old) log(`Industrial index ${id}: ${old} -> ${next}; mined ${volume} m3.`);
    } finally {running=false;}
  }
  function sweep(){if(!config.indexDecay)return;try{for(const s of sov.listAllSovereigntySystemStates()) if(s.claimStructureID) update(s.solarSystemID,0,Date.now());}catch(e){if(config.verbose){diagnostics.mark('industrialDecay',false,'Native decay settlement failed');warn(`Industrial decay sweep failed: ${e.message}`);}}}
  function attach(exports,filename){
    if(!enabled()||hooked.has(exports))return;
    if(filename.endsWith('/services/sovereignty/sovState.js')&&typeof exports.upsertSystemState==='function'){
      sov=exports;dir=path.dirname(filename);width=require(path.join(dir,"sovConstants")).DEV_INDEX_LEVEL_WIDTH;if(!Number.isFinite(width)||width<=0)throw new Error("Invalid industrial index width");hooked.add(exports);
      // Defer until native module initialization is complete. One hourly wakeup, not a per-system loop.
      setImmediate(()=>{if(stopping)return;sweep();if(config.indexProgression){deadline=Date.now()+60000; batchTimer=setInterval(flush,60000);batchTimer.unref();}if(config.indexDecay&&!timer){timer=setInterval(sweep,3600000);timer.unref();}}).unref();
      const database = require(path.join(dir, '../../gameStore'));
      if (typeof database.registerShutdownHook !== 'function') throw new Error('Required GameStore shutdown hook unavailable');
      // Native runShutdownHooks iterates its Map in registration order. Append a final
      // hook during shutdown so the TCP and game-runtime hooks have stopped producers
      // before the last credit settlement; the early flush is also safe if a later hook fails.
      database.registerShutdownHook('nullsec-upgrades-industrial-index', () => {
        flush();
        database.registerShutdownHook('nullsec-upgrades-industrial-index-final', () => {
          stopping=true;
          if (batchTimer) clearInterval(batchTimer);
          if (timer) clearInterval(timer);
          flush();
        });
      });
      if(config.verbose===true)debugShutdownAttached=true;
      log('Industrial index sovereignty hook installed.');
    }
    if(config.indexProgression&&filename.endsWith('/services/mining/miningLedgerState.js')&&typeof exports.recordMiningLedgerEvent==='function'){
      const original=exports.recordMiningLedgerEvent;
      let lastEntryID=0;
      let items;
      exports.recordMiningLedgerEvent=function(payload){
        const result=original.apply(this,arguments);
        try { if(result?.success && result.duplicate !== true){
          const entry=result.data;
          const id=Number(entry?.entryID);
          if(!Number.isSafeInteger(id)||id<=lastEntryID)return result;
          lastEntryID=id;
          const quantity=Number(entry.quantity);
          if(quantity>0){
            items ||= require(path.join(path.dirname(filename),'../inventory/itemStore'));
            const unit=items.getInventoryItemUnitVolume({typeID:entry.typeID,singleton:0});
            if(Number.isFinite(unit)&&unit>0)credit(Number(entry.solarSystemID),unit*quantity);
          }
        }} catch(e) { if(config.verbose)warn(`Industrial credit skipped after native ledger settlement: ${e.message}`); }
        return result;
      };
      hooked.add(exports);if(config.verbose===true)debugLedgerAttached=true;log('Industrial index mining ledger hook installed.');
    }
  }
  function snapshot(id) {
    if(!config.verbose || !config.indexProgression || !sov || !deadline) return {available:false};
    const now=Date.now(), cached=snapshots.get(id);
    if(cached && now-cached.at<1000) return cached.value;
    try {
      const current=eligible(id);
      if(!current?.claimStructureID || !Number.isFinite(width) || width<=0) return {available:false};
      const owner=ownerKey(current);
      const saved=loadState().industrialIndex?.[id], old=Number(current.devIndices.industrialPoints)||0;
      const same=saved?.owner===owner && saved.points===old;
      let base=old+(same?saved.fraction||0:0);
      if(config.indexDecay && same && saved.decayEnabled && saved.rate===config.indexDecayRate) base*=Math.pow(1-config.indexDecayRate/100,Math.max(0,deadline-saved.at)/DAY);
      const row=pending.get(id), volume=row?.owner===owner?row.volume:0;
      const projected=volume>0 && base<5*width?toPoints(toVolume(base,width)+volume*config.indexMultiplier,width):base;
      const value={available:true,id,remaining:Math.max(0,Math.ceil((deadline-now)/1000)),volume,multiplier:config.indexMultiplier,current:old/width*100,pending:(projected-base)/width*100,projected:projected/width*100};
      if(snapshots.size>=256) snapshots.clear();
      snapshots.set(id,{at:now,value}); return value;
    } catch (_) {return {available:false};}
  }
  return {attach,snapshot,debugSnapshot:id=>{if(!config.verbose||!sov)return null;const s=sov.getSystemState(id);if(!s?.claimStructureID)return null;return {current:Number(s.devIndices?.industrialPoints)||0,saved:loadState().industrialIndex?.[id]||null,pending:pending.get(id)?.volume||0};},debugReady:key=>config.verbose===true&&!!sov&&Number.isFinite(width)&&debugShutdownAttached&&(key==='industrialProgression'?debugLedgerAttached&&!!batchTimer:!!timer)};
}
module.exports={create,toVolume,toPoints};
