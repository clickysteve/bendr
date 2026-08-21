
/* reset one control: default, or the bottom of its range with shift */
function resetParam(p, toMin){
  const v = toMin ? p.min : p.def;
  pushHistory();
  setBase(p.id, v);
  if(p.master) morphOverride.add("M:"+p.id);
  else if(linkChans){ for(const ch of CHANNELS) morphOverride.add(ch+":"+p.id); }
  else morphOverride.add(activeChan+":"+p.id);
  const r = uiRefs[p.id];
  if(r){ r.slider.value = v; setReadout(r.val, fmt(p, v)); }
}

/* ---------------- header menus ---------------- */
function closeMenus(except){
  for(const m of document.querySelectorAll(".menu")) if(m !== except) m.classList.remove("open");
}
function wireMenus(){
  for(const m of document.querySelectorAll(".menu")){
    const btn = m.querySelector(".menubtn");
    if(!btn || btn.__wired) continue;
    btn.__wired = true;
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      const open = m.classList.contains("open");
      closeMenus();
      if(!open) m.classList.add("open");
      hideTip();
    });
    const panel = m.querySelector(".menupanel");
    panel.addEventListener("click", e=>e.stopPropagation());
    /* choosing from a dropdown, or pressing a button, is a decision — close up.
       A panel of toggles is not: you set two or three of them in one visit, so
       it stays open until you click away. */
    const sticky = m.classList.contains("sticky") || m.id === "mnuRnd";
    panel.addEventListener("change", ()=>{ if(!sticky){ closeMenus(); hideTip(); } });
    if(!sticky) for(const btn of panel.querySelectorAll("button")){
      btn.addEventListener("click", ()=>{ closeMenus(); hideTip(); });
    }
  }
  addEventListener("click", ()=>closeMenus());
  addEventListener("keydown", e=>{ if(e.key === "Escape") closeMenus(); });
}

/* ---------------- hover tooltips ---------------- */
const tipEl = document.getElementById("tip");
let tipTimer = null;
function showTip(el, html){
  if(!tipEl) return;
  tipEl.innerHTML = html;
  tipEl.style.display = "block";
  const r = el.getBoundingClientRect();
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = r.left, y = r.bottom + 7;
  if(x + w > innerWidth - 8) x = Math.max(8, innerWidth - w - 8);
  if(y + h > innerHeight - 8) y = Math.max(8, r.top - h - 7);
  tipEl.style.left = x+"px"; tipEl.style.top = y+"px";
}
function hideTip(){ if(tipTimer){ clearTimeout(tipTimer); tipTimer=null; } if(tipEl) tipEl.style.display="none"; }
/* attach a tooltip: title is bolded, body follows, foot is dimmed */
function attachTip(el, title, body, foot){
  el.addEventListener("mouseenter", ()=>{
    if(tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(()=>{
      showTip(el, (title?"<b>"+title+"</b>":"") + (body||"") + (foot?"<i>"+foot+"</i>":""));
    }, 620);
  });
  el.addEventListener("mouseleave", hideTip);
  el.addEventListener("mousedown", hideTip);
}
/* anything with data-tip gets one automatically */
function wireDataTips(root){
  for(const el of (root||document).querySelectorAll("[data-tip]")){
    if(el.__tipped) continue;
    el.__tipped = true;
    attachTip(el, el.dataset.tipTitle || "", el.dataset.tip);
  }
}
addEventListener("scroll", hideTip, true);

/* ---------------- toast ---------------- */
function toast(msg, err){
  const d = document.createElement("div");
  d.className = "toastmsg"+(err?" err":"");
  d.textContent = msg;
  document.getElementById("toast").appendChild(d);
  setTimeout(()=>d.remove(), 4200);
}
window.addEventListener("error", e=>{ toast("Error: "+e.message, true); });

/* ---------------- modulation engine ---------------- */
const LFOKEYS = ["lfo1","lfo2","lfo3","lfo4","lfo5","lfo6","lfo7","lfo8"];
/* Modulators are a list, not a fixed set: as many LFOs as you like, plus
   envelopes, which fire and decay when something happens rather than running
   free, and macros, which are one knob driving as many parameters as you point
   it at. The first eight keep the ids lfo1..lfo8 so old patches still load. */
const LFO_DEFAULTS = [
  {rate:0.3,   shape:"sine"}, {rate:1.7,  shape:"snh"},
  {rate:0.07,  shape:"tri"},  {rate:5.5,  shape:"sine"},
  {rate:0.017, shape:"tri"},  {rate:0.9,  shape:"saw"},
  {rate:3.1,   shape:"sqr"},  {rate:0.13, shape:"drift"},
];
const FIXED_SRC = [
  {id:"chaos", name:"CHAOS"}, {id:"drift", name:"DRIFT"}, {id:"spike", name:"SPIKE"},
  {id:"bass", name:"AUD BASS"}, {id:"mid", name:"AUD MID"}, {id:"high", name:"AUD HIGH"},
  {id:"motion", name:"VID MOTION"}, {id:"bright", name:"VID BRIGHT"}, {id:"cut", name:"VID CUT"},
];
const ENV_TRIGS = [
  ["manual","MANUAL"], ["pad:sync","PAD SYNC"], ["pad:roll","PAD ROLL"],
  ["pad:rainbow","PAD RAINBOW"], ["pad:drop","PAD DROPOUT"], ["pad:melt","PAD MELT"],
  ["pad:kill","PAD V-HOLD"], ["aud:bass","AUDIO BASS HIT"], ["aud:mid","AUDIO MID HIT"],
  ["aud:high","AUDIO HIGH HIT"], ["cut","SCENE CUT"], ["tempo","EVERY BEAT"],
  ["tempo2","EVERY 2 BEATS"], ["tempo4","EVERY BAR"],
];
const ENV_MODES = [["once","ONE SHOT"],["gate","GATE"],["loop","LOOP"]];
/* every tap is also a trigger, so an envelope can be fired by the kick on
   input 1 while a different envelope is fired by the hats on input 3 */
function envTrigList(){
  return ENV_TRIGS.concat(audioTaps.map(t=>["aud:"+t.id, t.name.toUpperCase()+" HIT"]));
}
let mods = [];
let modSeq = 0;
function mkLfo(o){
  return Object.assign({id:"lfo"+(++modSeq)+"x", type:"lfo", name:"LFO "+modSeq,
    rate:0.4, shape:"sine", phase:Math.random(), snh:0, sync:0}, o||{});
}
function mkEnv(o){
  return Object.assign({id:"env"+(++modSeq), type:"env", name:"ENV "+modSeq,
    a:0.02, d:0.5, trig:"pad:sync", mode:"once",
    level:0, stage:"d", gate:false, prevGate:false, avg:0, beat:0, manual:false}, o||{});
}
function mkMacro(o){
  return Object.assign({id:"mac"+(++modSeq), type:"macro", name:"MACRO "+modSeq, val:0}, o||{});
}
function defaultMods(){
  modSeq = 8;
  return LFOKEYS.map((k,i)=>({id:k, type:"lfo", name:"LFO "+(i+1),
    rate:LFO_DEFAULTS[i].rate, shape:LFO_DEFAULTS[i].shape,
    phase:Math.random(), snh:0, sync:0}));
}
function modById(id){ return mods.find(m=>m.id===id); }
const MODSRC = [];
function rebuildMODSRC(){
  MODSRC.length = 0;
  for(const m of mods) MODSRC.push({id:m.id, name:m.name, type:m.type});
  for(const t of audioTaps) MODSRC.push({id:t.id, name:t.name, type:"audtap"});
  for(const f of FIXED_SRC) MODSRC.push({id:f.id, name:f.name, type:"fixed"});
  for(const m of MODSRC){
    if(modVal[m.id] === undefined) modVal[m.id] = 0;
    if(!modHist[m.id]) modHist[m.id] = {buf:new Float32Array(MODHIST_N), w:0};
  }
}
/* anything still reaching for the old fixed table gets a live view of the list */
const lfoState = new Proxy({}, {
  get(_, k){ return modById(k) || {rate:0, shape:"sine", phase:0, sync:0}; },
  has(_, k){ return !!modById(k); },
});
const modVal = {};

/* tempo: tap or MIDI clock; synced LFOs derive their rate from it */
let bpm = 120, extClockAt = -1e9, clockEma = 0;   // no external clock until one arrives
/* A number is not something you can check against music at a glance. */
let beatPhase = 0, beatCount = 0;
function advanceBeat(dt){
  beatPhase += dt*(bpm/60);
  if(beatPhase >= 1){
    beatPhase -= Math.floor(beatPhase);
    beatCount = (beatCount + 1) % 4;
    const led = document.getElementById("beatLed");
    if(led){
      led.classList.remove("hit", "bar");
      void led.offsetWidth;                 /* restart the animation */
      led.classList.add(beatCount === 0 ? "bar" : "hit");
    }
  }
}
const tapTimes = [];
function tapTempo(){
  beatPhase = 0; beatCount = 3;   /* the tap you just made is the beat */
  const now = performance.now();
  if(tapTimes.length && now-tapTimes[tapTimes.length-1] > 2200) tapTimes.length = 0;
  tapTimes.push(now);
  if(tapTimes.length >= 2){
    const ds = [];
    for(let i=1;i<tapTimes.length;i++) ds.push(tapTimes[i]-tapTimes[i-1]);
    const avg = ds.slice(-6).reduce((a,b)=>a+b,0)/Math.min(ds.length,6);
    bpm = Math.min(300, Math.max(30, 60000/avg));
    updateTempoUI();
  }
  if(tapTimes.length > 8) tapTimes.shift();
}
function updateTempoUI(){
  const el = document.getElementById("bpmVal");
  /* never fight the person typing: a MIDI clock arriving mid-edit would
     otherwise rewrite the field underneath them */
  if(el && document.activeElement !== el) el.value = bpm.toFixed(1);
  const ex = document.getElementById("bpmExt");
  if(ex) ex.textContent = (performance.now()-extClockAt<2000) ? "EXT" : "";
}
/* Tap is how you find a tempo you can hear; typing is how you set one you
   already know, and there is no reason a readout should refuse to be one. */
function setTempo(v, fromField){
  if(!isFinite(v)) return false;
  bpm = Math.min(300, Math.max(30, v));
  tapTimes.length = 0;          /* a typed tempo is not part of a tap series */
  if(!fromField) updateTempoUI();
  return true;
}
function initTempoField(){
  const el = document.getElementById("bpmVal");
  if(!el) return;
  let held = "120.0";
  el.addEventListener("focus", ()=>{ held = el.value; el.select(); });
  el.addEventListener("keydown", e=>{
    if(e.key === "Enter"){ commit(); el.blur(); return; }
    if(e.key === "Escape"){ el.value = held; el.blur(); return; }
    /* nudging matters more than it sounds: matching a record by ear is a
       sequence of small corrections, not one typed number */
    if(e.key === "ArrowUp" || e.key === "ArrowDown"){
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 1;
      const cur = parseFloat(el.value);
      if(setTempo((isFinite(cur)?cur:bpm) + (e.key==="ArrowUp"?step:-step))) el.value = bpm.toFixed(1);
      return;
    }
    e.stopPropagation();        /* the field owns its own keys while focused */
  });
  el.addEventListener("blur", commit);
  function commit(){
    const v = parseFloat(el.value.replace(/[^0-9.\-]/g, ""));
    if(!setTempo(v, true)) { el.value = bpm.toFixed(1); return; }
    el.value = bpm.toFixed(1);
    held = el.value;
  }
}
let routes = [];   // {src, dst, amt}
const chaosState = {cur:0, target:0, timer:0};
let spikeV = 0;
const audioBands = {bass:0, mid:0, high:0, peak:{bass:0.01, mid:0.01, high:0.01}};

function lfoOut(st, dt){
  st.phase = (st.phase + st.rate*dt) % 1;
  const ph = st.phase;
  switch(st.shape){
    case "sine": return Math.sin(ph*Math.PI*2);
    case "tri":  return 1-4*Math.abs(ph-0.5);
    case "saw":  return ph*2-1;
    case "sqr":  return ph<0.5?1:-1;
    case "snh":
      if(st.phase < st.rate*dt || st.lastPh > ph){ st.snh = Math.random()*2-1; }
      st.lastPh = ph;
      return st.snh;
    case "exp":  return Math.exp(-ph*4)*2-1;
    case "ramp": return 1-ph*2;
    case "pulse":return ph<0.15?1:-1;
    case "sine2":return Math.sin(ph*Math.PI*4);
    case "drift":
      st.d = (st.d||0)*0.97 + (Math.random()*2-1)*0.03;
      return Math.max(-1, Math.min(1, st.d*6));
  }
  return 0;
}
const LFO_SHAPES = ["sine","tri","saw","ramp","sqr","pulse","snh","exp","sine2","drift"];
/* value = beats per cycle, so smaller is faster */
const SYNC_DIVS = [
  ["0","FREE"], ["32","8 BAR"], ["16","4 BAR"], ["12","3 BAR"], ["8","2 BAR"],
  ["6","1.5 BAR"], ["4","1 BAR"], ["3","1/2 DOT"], ["2.6667","1 BAR TRIP"], ["2","1/2"],
  ["1.5","1/4 DOT"], ["1.3333","1/2 TRIP"], ["1","1/4"], ["0.75","1/8 DOT"],
  ["0.6667","1/4 TRIP"], ["0.5","1/8"], ["0.3333","1/8 TRIP"], ["0.25","1/16"],
  ["0.1667","1/16 TRIP"], ["0.125","1/32"],
];
/* per-route shaping: the same source can drive two destinations differently */
const ROUTE_CURVES = ["LIN","EXP","LOG","S","STEP"];
function shapeMod(v, curve){
  if(!curve) return v;
  const sg = v < 0 ? -1 : 1, u = Math.min(1, Math.abs(v));
  if(curve === 1) return sg*u*u;
  if(curve === 2) return sg*Math.sqrt(u);
  if(curve === 3) return sg*u*u*(3-2*u);
  return sg*Math.round(u*4)/4;
}
/* did this envelope's trigger just fire? */
function envFired(m, dt){
  if(m.trig === "manual"){
    if(m.manual){ m.manual = false; m.gate = true; return true; }
    m.gate = false; return false;
  }
  if(m.trig.indexOf("pad:") === 0){
    const on = !!bendHeld[m.trig.slice(4)];
    const fired = on && !m.prevGate;
    m.prevGate = on; m.gate = on;
    return fired;
  }
  if(m.trig === "cut"){
    const on = (modVal.cut || 0) > 0.45;
    const fired = on && !m.prevGate;
    m.prevGate = on; m.gate = on;
    return fired;
  }
  if(m.trig.indexOf("aud:") === 0){
    /* onset, not level: it fires on the attack rather than while it stays loud */
    const v = modVal[m.trig.slice(4)] || 0;
    m.avg = m.avg*0.92 + v*0.08;
    const on = v > m.avg*1.45 + 0.05;
    const fired = on && !m.prevGate;
    m.prevGate = on; m.gate = on;
    return fired;
  }
  if(m.trig.indexOf("tempo") === 0){
    const every = m.trig === "tempo4" ? 4 : m.trig === "tempo2" ? 2 : 1;
    m.beat = (m.beat || 0) + dt*(bpm/60);
    if(m.beat >= every){ m.beat -= every; m.gate = true; return true; }
    m.gate = false;
    return false;
  }
  return false;
}
function updateMod(dt, t){
  advanceBeat(dt);
  for(const m of mods){
    if(m.type === "lfo"){
      if(m.sync > 0) m.rate = (bpm/60)/m.sync;
      modVal[m.id] = lfoOut(m, dt);
    } else if(m.type === "env"){
      if(envFired(m, dt)) m.stage = "a";
      if(m.stage === "a"){
        m.level = Math.min(1, m.level + dt/Math.max(0.005, m.a));
        if(m.level >= 1) m.stage = "d";
      } else if(!(m.mode === "gate" && m.gate)){
        m.level *= Math.exp(-dt/Math.max(0.02, m.d));
        if(m.mode === "loop" && m.level < 0.02) m.stage = "a";
      }
      modVal[m.id] = m.level;
    } else {
      modVal[m.id] = m.val;
    }
  }
  chaosState.timer -= dt;
  if(chaosState.timer <= 0){ chaosState.target = Math.random()*2-1; chaosState.timer = 0.12+Math.random()*0.5; }
  chaosState.cur += (chaosState.target - chaosState.cur) * Math.min(1, dt*7);
  modVal.chaos = chaosState.cur;
  modVal.drift = 0.55*Math.sin(t*0.31) + 0.3*Math.sin(t*0.113+1.7) + 0.15*Math.sin(t*0.53+4.1);
  if(Math.random() < dt*1.6) spikeV = 0.7+Math.random()*0.3;
  spikeV *= Math.exp(-dt*9);
  modVal.spike = spikeV;
  modVal.bass = audioBands.bass; modVal.mid = audioBands.mid; modVal.high = audioBands.high;
}

/* ---- bends ---- */
const BENDS = {
  sync:   {tear:1.0, hWobble:0.85, jitter:0.8},
  roll:   {vRoll:0.55, humBar:0.7},
  rainbow:{colorize:0.95, colorBands:2.2, lumaHue:0.35, saturation:1.9, glow:0.5},
  drop:   {dropout:1.0, tracking:0.85, signalNoise:0.4},
  melt:   {fbAmount:0.955, fbZoom:0.35, fbHue:0.22},
  kill:   {vRoll:-0.9, tear:0.7, tearSize:0.9, brightness:-0.15},
};
const bendMix = {sync:0, roll:0, rainbow:0, drop:0, melt:0, kill:0};
const bendHeld = {sync:false, roll:false, rainbow:false, drop:false, melt:false, kill:false};

let morphA = null, morphB = null;
const morphOverride = new Set();   // params the user has touched since storing morph points
function morphModExtra(){
  let v = 0;
  for(const r of routes) if(r.dst === "morph") v += r.amt*(P.morph.max-P.morph.min)*modVal[r.src];
  return v;
}
function snapshotAll(){
  const st = {chan:{}, master:{}};
  for(const ch of CHANNELS) st.chan[ch] = {};
  for(const ch of CHANNELS) for(const p of CLIST) st.chan[ch][p.id] = chanBase[ch][p.id];
  for(const p of MLIST) st.master[p.id] = mBase[p.id];
  return st;
}
/* Copying 961 string-keyed floats from base to current every frame, and then
   clamping all 961 again, was the second largest per-frame cost after the
   uniform loop - and almost all of it was copying values onto themselves.
   Only the parameters that modulation actually wrote last frame need putting
   back, so the work is now proportional to the number of routes rather than to
   the size of the parameter set. A full resync happens whenever a base value
   changes, whenever morph or a snapshot glide is running, and once every
   thirty frames regardless, so a missed epoch bump heals itself. */
const CIDS = CLIST.map(p=>p.id), MIDS = MLIST.map(p=>p.id);
let paramEpoch = 0, curSynced = -1;
const curTouched = new Set();
function bumpParams(){ paramEpoch++; }
function syncAllCur(){
  for(const ch of CHANNELS){
    const cb = chanBase[ch], cc = chanCur[ch];
    for(let i=0;i<CIDS.length;i++) cc[CIDS[i]] = cb[CIDS[i]];
  }
  for(let i=0;i<MIDS.length;i++) mCur[MIDS[i]] = mBase[MIDS[i]];
}
function applyParams(dt){
  const morphing = !!(morphA && morphB);
  const full = curSynced !== paramEpoch || morphing || glideFrom || (frameNo % 30) === 0;
  if(full){
    syncAllCur();
    curSynced = paramEpoch;
    curTouched.clear();
  } else {
    for(const k of curTouched){
      const ci = k.indexOf(":");
      const ch = k.slice(0, ci), id = k.slice(ci+1);
      if(ch === "M") mCur[id] = mBase[id];
      else chanCur[ch][id] = chanBase[ch][id];
    }
    curTouched.clear();
  }

  /* preset morph: interpolate the whole rig between two stored snapshots */
  if(morphA && morphB){
    const m = Math.min(1, Math.max(0, mBase.morph + morphModExtra()));
    for(const ch of CHANNELS){
      const a = morphA.chan && morphA.chan[ch], b = morphB.chan && morphB.chan[ch];
      if(!a || !b) continue;
      for(const p of CLIST){
        if(morphOverride.has(ch+":"+p.id)) continue;
        if(a[p.id] !== undefined && b[p.id] !== undefined) chanCur[ch][p.id] = a[p.id] + (b[p.id]-a[p.id])*m;
      }
    }
    if(morphA.master && morphB.master){
      for(const p of MLIST){
        if(p.id === "morph" || morphOverride.has("M:"+p.id)) continue;
        const av = morphA.master[p.id], bv = morphB.master[p.id];
        if(av !== undefined && bv !== undefined) mCur[p.id] = av + (bv-av)*m;
      }
    }
  }

  /* mod routes */
  for(const r of routes){
    const p = P[r.dst]; if(!p) continue;
    let mv = modVal[r.src] || 0;
    /* AC coupling, as on a modular input. In AC the slow-moving part of the
       signal is removed and only what is changing gets through, so an envelope
       becomes a pair of spikes, a slow LFO becomes almost nothing, and a
       video-rate signal passes intact. One pole per route. */
    if(r.ac){
      const f = 0.4 + (r.acHz || 0.5)*12;
      if(r.acS === undefined) r.acS = mv;
      r.acS += (mv - r.acS)*Math.min(1, dt*f);
      mv = mv - r.acS;
    } else if(r.acS !== undefined) r.acS = undefined;
    if(r.inv) mv = -mv;
    mv = shapeMod(mv, r.curve || 0);
    const d = (p.max-p.min) * (r.amt*mv + (r.off || 0));
    if(p.master){ mCur[p.id] += d; curTouched.add("M:"+p.id); }
    else {
      const rc = r.ch || "A";
      if(rc === "AB"){ for(const ch of CHANNELS){ chanCur[ch][p.id] += d; curTouched.add(ch+":"+p.id); } }
      else { chanCur[rc][p.id] += d; curTouched.add(rc+":"+p.id); }
    }
  }

  /* bend pads hit the channel you're performing on */
  const bendTargets = linkChans ? CHANNELS : [activeChan];
  for(const b in bendMix){
    const target = bendHeld[b] ? 1 : 0;
    bendMix[b] += (target-bendMix[b]) * Math.min(1, dt*(target? 24 : 7));
    if(bendMix[b] > 0.002){
      for(const pid in BENDS[b]){
        const p = P[pid]; if(!p) continue;
        if(p.master){ mCur[pid] = mCur[pid] + (BENDS[b][pid]-mCur[pid])*bendMix[b]; curTouched.add("M:"+pid); }
        else for(const ch of bendTargets){
          chanCur[ch][pid] = chanCur[ch][pid] + (BENDS[b][pid]-chanCur[ch][pid])*bendMix[b];
          curTouched.add(ch+":"+pid);
        }
      }
    }
  }

  /* A bypassed section is switched out on its own, not as part of its stage.
     The way to switch a group of controls out of a signal path is to make them
     read as if nobody had touched them, so every parameter in the section takes
     its default for as long as the eye is shut. Everything downstream — the
     shaders, the presets, the modulation — needs to know nothing about it. */
  if(secBypassOn){
    for(const p of PLIST){
      if(!secBypass[p.sec]) continue;
      if(p.master){ mCur[p.id] = p.def; curTouched.add("M:"+p.id); }
      else for(const ch of CHANNELS){ chanCur[ch][p.id] = p.def; curTouched.add(ch+":"+p.id); }
    }
  }

  /* clamp only what was written: base values are already in range */
  if(full || morphing){
    for(const ch of CHANNELS){ const cc=chanCur[ch]; for(const p of CLIST) cc[p.id] = Math.min(p.max, Math.max(p.min, cc[p.id])); }
    for(const p of MLIST) mCur[p.id] = Math.min(p.max, Math.max(p.min, mCur[p.id]));
  } else {
    for(const k of curTouched){
      const ci = k.indexOf(":");
      const ch = k.slice(0, ci), id = k.slice(ci+1), p = P[id];
      if(!p) continue;
      if(ch === "M") mCur[id] = Math.min(p.max, Math.max(p.min, mCur[id]));
      else chanCur[ch][id] = Math.min(p.max, Math.max(p.min, chanCur[ch][id]));
    }
  }
}

/* ---------------- audio ---------------- */
let audioCtx=null, analyser=null, srcNode=null, micNode=null, micStream=null, outGainNode=null;
let recDest=null, audioMode="off";
const fftBuf = new Uint8Array(1024);
function ensureAudioCtx(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.55;
    recDest = audioCtx.createMediaStreamDestination();
  }
  if(audioCtx.state === "suspended") audioCtx.resume();
}
function hookVideoAudio(){
  ensureAudioCtx();
  if(!srcNode && video){
    try{
      srcNode = audioCtx.createMediaElementSource(video);
      outGainNode = audioCtx.createGain();
      srcNode.connect(outGainNode);
      outGainNode.connect(audioCtx.destination);
      srcNode.connect(recDest);
      if(typeof applyMute === "function") applyMute();
    }catch(e){ console.warn(e); }
  }
  if(srcNode){ try{ srcNode.connect(analyser); }catch(e){} }
  wireTaps();
}
/* ---- audio taps: one listener per input channel ----
   A single analyser fed by whatever the interface happened to sum down to is
   fine for a laptop microphone and useless for a desk. With a multi-output
   interface the kick, the hats and the vocal arrive on separate inputs, and the
   whole point is that each one drives something different. A tap is a listener:
   pick an input channel, pick a band inside it, and it becomes a modulation
   source with its own meter, its own gain, its own response and its own onset
   trigger, patchable to any parameter on any channel like an LFO.

   Channel 1 narrowed to 30-120 Hz is a kick. Channel 3 narrowed to 6-14 kHz is
   a hat. Nothing stops two taps sharing an input either, so one channel can
   drive feedback zoom off its low end and dropout off its transients. */
const AUD_BANDS = [
  ["KICK",      30,   120],
  ["SNARE",     150,  400],
  ["TOM",       80,   300],
  ["HAT",       6000, 14000],
  ["BASS",      30,   150],
  ["LOW MID",   200,  800],
  ["MID",       300,  2200],
  ["HIGH MID",  2000, 5000],
  ["PRESENCE",  4000, 11000],
  ["AIR",       10000,16000],
  ["FULL RANGE",20,   16000],
];
const AUD_MAX = 16;             /* interfaces beyond this are rare and the UI stops reading */
let audioTaps = [], audTapSeq = 0;
const audNodes = {};            /* tap id -> {an, buf} */
function mkAudTap(o){
  const n = (audioTaps.length % AUD_BANDS.length);
  const b = AUD_BANDS[n];
  return Object.assign({
    id: "aud" + (++audTapSeq) + "t",
    name: "IN " + (((o && o.chan) || 0) + 1) + " " + b[0],
    chan: 0, lo: b[1], hi: b[2], gain: 1, resp: 0.5,
    /* runtime */ val: 0, peak: 0.05, raw: 0, avg: 0.02, hit: 0, prevHit: false, gate: false
  }, o || {});
}
function audTapById(id){ return audioTaps.find(t=>t.id===id); }
/* audio input device + channel routing (for audio interfaces) */
let audioDeviceId = "", audioChannel = -1, micSplitter = null;   // channel -1 = mix
let tapSplitter = null, tapSrcNode = null, audInChannels = 2;
async function listAudioDevices(){
  try{
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter(d=>d.kind==="audioinput");
  }catch(e){ return []; }
}
function wireMic(){
  if(!micNode) return;
  try{ micNode.disconnect(); }catch(e){}
  if(micSplitter){ try{ micSplitter.disconnect(); }catch(e){} micSplitter=null; }
  const nCh = audInChannels || micNode.channelCount || 2;
  if(audioChannel >= 0 && audioChannel < nCh){
    micSplitter = audioCtx.createChannelSplitter(Math.max(2,nCh));
    micNode.connect(micSplitter);
    micSplitter.connect(analyser, audioChannel, 0);
  } else {
    micNode.connect(analyser);
  }
  /* the live input reaches the recorder as well as the analyser, so a set
     played into the interface is captured with the picture it was driving.
     It is re-made here because wireMic disconnects everything first, and a
     channel change mid-take must not silence the recording. */
  if(recDest){ try{ micNode.connect(recDest); }catch(e){} }
  wireTaps();
}
/* Whichever input is selected also feeds the taps, split back out into its
   individual channels. The mic path is where a real interface turns up, but a
   stereo file or a video soundtrack still has a left and a right, and being
   able to put the left on one parameter and the right on another is worth
   having on its own. */
function currentAudioNode(){
  if(audioMode === "mic")    return micNode;
  if(audioMode === "file")   return audioFileNode;
  if(audioMode === "source") return srcNode;
  return null;
}
/* An analyser with nothing hanging off its output is pulled by the graph
   anyway, so the taps need no sink. A gain of zero into the destination was
   tried first, on the theory that an unlistened branch might not be rendered;
   measured against four steady tones on four channels it made no difference,
   so it came back out. */
function tapAnalyser(t){
  let e = audNodes[t.id];
  if(!e){
    const an = audioCtx.createAnalyser();
    an.fftSize = 2048; an.smoothingTimeConstant = 0.55;
    e = audNodes[t.id] = {an, buf:new Uint8Array(an.frequencyBinCount)};
  }
  return e;
}
function wireTaps(){
  if(!audioCtx) return;
  const node = currentAudioNode();
  /* unhook the feed as well as the splitter's outputs: leaving the old node
     wired to a dead splitter would pile up a new one on every rewire */
  if(tapSplitter){
    if(tapSrcNode){ try{ tapSrcNode.disconnect(tapSplitter); }catch(e){} }
    try{ tapSplitter.disconnect(); }catch(e){}
    tapSplitter = null;
  }
  tapSrcNode = node;
  if(!node || !audioTaps.length) return;
  const nCh = Math.max(2, Math.min(AUD_MAX, audInChannels || node.channelCount || 2));
  tapSplitter = audioCtx.createChannelSplitter(nCh);
  try{ node.connect(tapSplitter); }catch(e){ return; }
  for(const t of audioTaps){
    const e = tapAnalyser(t);
    const c = Math.max(0, Math.min(nCh-1, t.chan|0));
    try{ tapSplitter.connect(e.an, c, 0); }catch(err){}
  }
}
async function openMic(){
  if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; micNode=null; }
  /* ask for everything the device has. A browser that will not give sixteen
     channels quietly hands back what it can, which is the point of "ideal". */
  const base = {echoCancellation:false, autoGainControl:false, noiseSuppression:false,
                channelCount:{ideal:AUD_MAX}};
  const constraints = {audio: audioDeviceId ? Object.assign({deviceId:{exact:audioDeviceId}}, base) : base};
  micStream = await navigator.mediaDevices.getUserMedia(constraints);
  const tr = micStream.getAudioTracks()[0];
  let n = 0;
  try{ n = (tr.getSettings && tr.getSettings().channelCount) || 0; }catch(e){}
  micNode = audioCtx.createMediaStreamSource(micStream);
  audInChannels = Math.max(1, n || micNode.channelCount || 2);
  micNode.channelCountMode = "max";
  wireMic();
  refreshAudioDeviceUI();
  if(typeof buildAudTapList === "function") buildAudTapList();
}
/* An audio file as a modulation source. The point is being able to build a
   piece against the track it will be shown with, rather than only against
   whatever happens to be in the room. It goes through the same analyser as
   everything else, so the bands, the gains and the onset triggers behave
   identically whichever input is selected. */
let audioFileEl=null, audioFileNode=null, audioFileGain=null, audioFileName="";
function ensureAudioFileEl(){
  if(!audioFileEl){
    audioFileEl = document.createElement("audio");
    audioFileEl.loop = true;
    audioFileEl.preload = "auto";
    for(const ev of ["ended","play","pause","timeupdate"])
      audioFileEl.addEventListener(ev, ()=>refreshAudioFileUI());
  }
  return audioFileEl;
}
function wireAudioFile(){
  ensureAudioCtx();
  const el = ensureAudioFileEl();
  if(!audioFileNode){
    try{
      audioFileNode = audioCtx.createMediaElementSource(el);
      audioFileGain = audioCtx.createGain();
      audioFileNode.connect(audioFileGain);
      audioFileGain.connect(audioCtx.destination);
      if(recDest) audioFileNode.connect(recDest);
    }catch(e){ console.warn(e); return; }
  }
  try{ audioFileNode.connect(analyser); }catch(e){}
  wireTaps();
}
async function loadAudioFile(f){
  if(!f) return;
  ensureAudioCtx();
  const el = ensureAudioFileEl();
  if(el.dataset.url) URL.revokeObjectURL(el.dataset.url);
  const u = URL.createObjectURL(f);
  el.dataset.url = u; el.src = u;
  audioFileName = f.name;
  wireAudioFile();
  audioMode = "file";
  const sel = document.getElementById("selAudio"); if(sel) sel.value = "file";
  try{ await el.play(); }catch(e){}
  refreshAudioFileUI();
  toast("Audio-reactive: " + f.name);
}
let refreshAudioFileUI = ()=>{};
async function setAudioMode(m){
  audioMode = m;
  if(m === "off"){
    if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; micNode=null; }
    if(audioFileEl) audioFileEl.pause();
    audioBands.bass=audioBands.mid=audioBands.high=0;
    for(const t of audioTaps){ t.val = 0; modVal[t.id] = 0; }
    wireTaps();
    return;
  }
  ensureAudioCtx();
  if(m === "source"){ hookVideoAudio(); toast("Audio-reactive: video soundtrack"); }
  if(m === "file"){
    wireAudioFile();
    if(!audioFileEl || !audioFileEl.src){
      const fi = document.getElementById("audioFileIn");
      if(fi) fi.click();
    } else {
      try{ await audioFileEl.play(); }catch(e){}
    }
    refreshAudioFileUI();
  }
  if(m === "mic"){
    try{
      await openMic();
      toast("Audio-reactive: live input");
    }catch(e){ toast("Audio input access denied", true); audioMode="off"; document.getElementById("selAudio").value="off"; }
  }
}
/* configurable band ranges (Hz), gain, and response speed */
const audioCfg = {
  bass:{lo:30,   hi:150,   gain:1},
  mid: {lo:300,  hi:2200,  gain:1},
  high:{lo:4000, hi:11000, gain:1},
  response:0.5,   // 0 = slow/smooth, 1 = twitchy
};
function bandAvgOf(buf, n, nyq, lo, hi){
  let a = Math.floor(lo/nyq*n), b = Math.ceil(hi/nyq*n);
  if(b<=a) b=a+1;
  a=Math.max(0,Math.min(n-1,a)); b=Math.max(1,Math.min(n,b));
  let s=0; for(let i=a;i<b;i++) s+=buf[i];
  return s/(b-a)/255;
}
function updateAudio(dt){
  if(audioMode==="off" || !analyser) return;
  const nyq = audioCtx.sampleRate/2;
  analyser.getByteFrequencyData(fftBuf);
  const n = analyser.frequencyBinCount;
  const speed = 4 + audioCfg.response*36;
  for(const k of ["bass","mid","high"]){
    const c = audioCfg[k];
    const raw = bandAvgOf(fftBuf, n, nyq, c.lo, c.hi);
    audioBands.peak[k] = Math.max(audioBands.peak[k]*(1-dt*0.08), raw, 0.05);
    const v = Math.min(1.5, (raw/audioBands.peak[k]) * c.gain);
    audioBands[k] += (v-audioBands[k]) * Math.min(1, dt*speed);
  }
  /* each tap tracks its own running peak, so a quiet input channel still reads
     across the full range rather than sitting at a tenth of the meter */
  for(const t of audioTaps){
    const e = audNodes[t.id];
    if(!e){ t.val = 0; continue; }
    e.an.getByteFrequencyData(e.buf);
    const bn = e.an.frequencyBinCount;
    const raw = bandAvgOf(e.buf, bn, nyq, t.lo, t.hi);
    t.raw = raw;
    t.peak = Math.max(t.peak*(1-dt*0.08), raw, 0.05);
    const v = Math.min(1.5, (raw/t.peak) * t.gain);
    const sp = 4 + t.resp*36;
    t.val += (v - t.val) * Math.min(1, dt*sp);
    /* onset: a jump well above the running average, which is what makes a tap
       usable as an envelope trigger rather than only as a level */
    t.hit = raw > Math.max(0.08, t.avg*1.6) ? 1 : 0;
    t.avg = t.avg*0.92 + raw*0.08;
    modVal[t.id] = t.val;
  }
}

/* ---------------- UI build ---------------- */
const panel = document.getElementById("panel");
const uiRefs = {};   // id -> {slider, val, tick, row, label}
let midiLearnMode = false, midiLearnTarget = null;
const midiMap = {};  // "ch:cc" -> paramId
/* Mapping worked; knowing what you had mapped did not. The only trace was a
   dot appended to a label somewhere in a seven-screen column. */
function renderMidiMap(){
  const host = document.getElementById("midimap");
  if(!host) return;
  host.innerHTML = "";
  const keys = Object.keys(midiMap);
  if(!keys.length){
    const d = document.createElement("div");
    d.style.cssText = "color:var(--dim); font-size:8.5px; padding:3px 0;";
    d.textContent = "Nothing mapped yet. Turn on MIDI LEARN under ENGINE, click a parameter name, then move a control.";
    host.appendChild(d);
    return;
  }
  keys.sort((a,b)=>{
    const [ac,an] = a.split(":").map(Number), [bc,bn] = b.split(":").map(Number);
    return ac-bc || an-bn;
  });
  for(const k of keys){
    const [ch, cc] = k.split(":");
    const pid = midiMap[k], p = P[pid];
    const row = document.createElement("div"); row.className = "mmaprow";
    const src = document.createElement("span"); src.className = "mmapcc";
    src.textContent = "CH " + (parseInt(ch,10)+1) + "  CC " + cc;
    const arrow = document.createElement("span"); arrow.className = "arrow"; arrow.textContent = "\u2192";
    const dst = document.createElement("span"); dst.className = "mmapdst";
    dst.textContent = p ? p.name + "  (" + p.sec + ")" : pid;
    const go = document.createElement("button"); go.className = "rgo"; go.textContent = "\u25ce";
    attachTip(go, "SHOW THIS PARAMETER", "Scrolls to the control this is mapped onto and flashes it.");
    go.onclick = ()=>{ if(typeof focusParam === "function") focusParam(pid); };
    const rm = document.createElement("button"); rm.textContent = "\u2715";
    attachTip(rm, "UNMAP", "Forgets this mapping. The control itself is untouched.");
    rm.onclick = ()=>{
      delete midiMap[k];
      const r = uiRefs[pid];
      if(r && !Object.values(midiMap).includes(pid)) r.label.classList.remove("mapped");
      renderMidiMap();
    };
    row.appendChild(src); row.appendChild(arrow); row.appendChild(dst); row.appendChild(go); row.appendChild(rm);
    host.appendChild(row);
  }
}

function fmt(p, v){ return (Math.abs(v)<10 ? v.toFixed(2) : v.toFixed(1)); }
/* ---- readouts you can type into ----
   A slider is a good way to find a value and a poor way to state one. Matching
   a setting you already know, or copying one from a patch you wrote down, meant
   nudging a four-hundred-step range until the number beside it agreed. So the
   number beside it is the field. Click it and type. Enter commits, Escape puts
   back what was there, the arrows nudge by a fortieth of the range and shift
   makes that a four-hundredth, which is one step of the slider.

   The typed value goes in exactly as typed rather than snapped to the slider's
   step, because the parameter underneath is continuous and the slider is only
   how it is usually reached. */
function setReadout(el, text){
  if(!el) return;
  if(el.tagName === "INPUT"){
    /* never fight the person typing: a modulator or a snapshot recall landing
       mid-edit would otherwise rewrite the field underneath them */
    if(document.activeElement === el) return;
    el.value = text;
  } else el.textContent = text;
}
function makeReadoutField(p, el, slider){
  el.type = "text"; el.inputMode = "decimal";
  el.autocomplete = "off"; el.spellcheck = false;
  el.setAttribute("aria-label", p.name + " value");
  el.title = "Type a value \u2014 " + fmt(p, p.min) + " to " + fmt(p, p.max);
  let held = el.value;
  const put = v=>{
    v = Math.min(p.max, Math.max(p.min, v));
    slider.value = v;
    /* through the slider's own handler, so link, morph override, the mirrored
       copy of the control and everything else it does still happens */
    slider.dispatchEvent(new Event("input", {bubbles:true}));
    setBase(p.id, v);          /* then the exact number, not the nearest step */
    el.value = fmt(p, v);
  };
  const commit = ()=>{
    const v = parseFloat(String(el.value).replace(/[^0-9.+\-eE]/g, ""));
    if(!isFinite(v)){ el.value = held; return; }
    put(v);
    held = el.value;
  };
  el.addEventListener("focus", ()=>{ held = el.value; el.select(); });
  el.addEventListener("pointerdown", ()=>{ if(typeof armGesture === "function") armGesture(); });
  el.addEventListener("keydown", e=>{
    if(e.key === "Enter"){ commit(); el.blur(); return; }
    if(e.key === "Escape"){ el.value = held; el.blur(); return; }
    if(e.key === "ArrowUp" || e.key === "ArrowDown"){
      e.preventDefault();
      const step = (p.max - p.min) / (e.shiftKey ? 400 : 40);
      /* nudge from the value, not from the text. The field shows two decimals,
         so reading the displayed number back and adding to it made every press
         after the first compound its own rounding: up a fortieth then down a
         four-hundredth came out higher than it started. The typed text only
         wins when it is actually something the person has typed. */
      const shown = fmt(p, getBase(p.id));
      const typed = parseFloat(el.value);
      const cur = (String(el.value).trim() !== shown && isFinite(typed)) ? typed : getBase(p.id);
      put(cur + (e.key === "ArrowUp" ? step : -step));
      return;
    }
  });
  el.addEventListener("blur", commit);
  el.addEventListener("dblclick", e=>e.stopPropagation());
  return el;
}
const chanThumbs = {};
function buildChanBar(){
  const bar = document.createElement("div");
  bar.id = "chanbar";
  const mk = (ch)=>{
    const b = document.createElement("button");
    b.className = "chanbtn ch"+ch;
    b.dataset.chan = ch;
    /* the four buttons all said BARS and nothing else, so you could not tell
       what was loaded where without opening a menu per channel */
    b.innerHTML = "<b>"+ch+"</b>";
    const cv = document.createElement("canvas");
    cv.width = 48; cv.height = 27;
    cv.className = "chanthumb";
    b.appendChild(cv);
    const sm = document.createElement("small"); sm.textContent = "\u2014";
    b.appendChild(sm);
    chanThumbs[ch] = cv.getContext("2d", {willReadFrequently:false});
    attachTip(b, "CHANNEL "+ch, "Everything below this bar - the source, the framing, the whole effect chain and the bend pads - belongs to the channel selected here. Channels A and B feed mixer bus 1; C and D feed bus 2.", "Sections tagged MASTER are shared across all four.");
    b.onclick = ()=>{ setActiveChan(ch); };
    return b;
  };
  for(const ch of CHANNELS) bar.appendChild(mk(ch));
  const tools = document.createElement("div");
  tools.className = "chantools";
  const lk = document.createElement("button");
  lk.id = "btnLinkChans"; lk.textContent = "LINK";
  attachTip(lk, "LINK", "Edits all four channels at once, so every slider and every bend pad moves them together.");
  lk.onclick = ()=>{ linkChans = !linkChans; lk.classList.toggle("on", linkChans); };
  /* COPY and SWAP used to be locked to the channel's partner on the same bus,
     which meant A could only ever talk to B. They now take a destination, so
     any channel can be copied onto or exchanged with any other. */
  const dst = document.createElement("select");
  dst.id = "chanDest"; dst.className = "chandest";
  attachTip(dst, "TARGET CHANNEL", "The channel that COPY writes to and SWAP exchanges with. Any of the other three, not just the partner on the same bus.", "It opens on the bus partner and remembers your choice while that stays valid.");
  fillChanDest(dst);
  dst.onchange = ()=>{ copyDest = dst.value; };
  /* what COPY copies. ALL is the expectation — copying a channel copies the
     channel — and FX ONLY is the old behaviour, which is genuinely useful when
     you want one treatment across different footage. */
  const cm = document.createElement("button");
  cm.className = "copymode";
  const setCM = ()=>{ cm.textContent = copyMode === "all" ? "ALL" : "FX ONLY"; };
  attachTip(cm, "WHAT COPY TAKES", "ALL copies the source as well as the effects, so the target channel becomes this one. FX ONLY copies the treatment and leaves the target looking at whatever it was already looking at, which is how you put one look on four different clips.", "A live camera or screen capture cannot be on two channels at once, so that one is never copied.");
  cm.onclick = ()=>{ copyMode = (copyMode === "all") ? "fx" : "all"; setCM(); };
  setCM();
  const cp = document.createElement("button");
  cp.textContent = "COPY";
  attachTip(cp, "COPY", "Copies this channel onto the channel in the selector. The button beside it decides whether the source comes too.", "Shift-click copies onto all three of the others at once.");
  cp.onclick = (e)=>{
    if(e.shiftKey){
      pushHistory();
      for(const ch of CHANNELS) if(ch !== activeChan) copyChannel(activeChan, ch);
      toast("Copied channel "+activeChan+" onto all others");
      return;
    }
    const other = copyDest;
    if(other === activeChan) return;
    pushHistory();
    copyChannel(activeChan, other);
    toast("Copied channel "+activeChan+" \u2192 "+other);
  };
  const sw = document.createElement("button");
  sw.textContent = "SWAP";
  attachTip(sw, "SWAP", "Exchanges this channel with the one in the selector, sources as well as effects - so whatever was sitting on top swaps places.");
  sw.onclick = ()=>{
    const other = copyDest;
    if(other === activeChan) return;
    pushHistory();
    swapChannels(activeChan, other);
    if(window.__swapSources) window.__swapSources(activeChan, other);
    refreshUI(); toast("Swapped "+activeChan+" \u2194 "+other+" (effects and sources)");
  };
  tools.appendChild(lk); tools.appendChild(dst); tools.appendChild(cm); tools.appendChild(cp); tools.appendChild(sw);
  bar.appendChild(tools);
  panel.appendChild(bar);
}
/* the selector never offers the channel you are standing on */
function fillChanDest(sel){
  sel = sel || document.getElementById("chanDest");
  if(!sel) return;
  const want = (copyDest && copyDest !== activeChan) ? copyDest : BUSPAIR[activeChan];
  sel.innerHTML = "";
  for(const ch of CHANNELS){
    if(ch === activeChan) continue;
    const o = document.createElement("option");
    o.value = ch; o.textContent = "\u2192 " + ch;
    sel.appendChild(o);
  }
  sel.value = want;
  copyDest = sel.value;
}
function setActiveChan(ch){
  activeChan = ch;
  fillChanDest();
  document.querySelectorAll(".chanbtn").forEach(b=>b.classList.toggle("on", b.dataset.chan===ch));
  for(const c of CHANNELS) document.body.classList.toggle("chan-"+c.toLowerCase(), c===ch);
  refreshUI(); refreshToggles();
  if(window.__syncChanInputUI) window.__syncChanInputUI();
}

/* ---- mixer strip: the fader bank, always visible under the picture ----
   A crossfader wants to be horizontal, and the one control you ride while
   looking at something else should never be behind a tab. The transition
   detail (softness, wipe geometry, key) stays in the sidebar, where it is
   setup rather than performance. */
const STRIP_PARAMS = new Set(["abMix","cdMix","busMix"]);
function buildMixStrip(){
  const host = document.getElementById("mixbuses");
  if(!host) return;
  host.innerHTML = "";
  const buses = [
    {key:"b1", pid:"abMix", label:"BUS 1", routed:true,
     get:()=>mixMode, set:v=>{mixMode=v;}, inv:()=>wipeInv, tinv:()=>{wipeInv=!wipeInv;},
     getBlend:()=>mixBlend, setBlend:v=>{mixBlend=v;}, getKey:()=>mixKey, setKey:v=>{mixKey=v;}},
    {key:"b2", pid:"cdMix", label:"BUS 2", routed:true,
     get:()=>mixMode2, set:v=>{mixMode2=v;}, inv:()=>wipeInv2, tinv:()=>{wipeInv2=!wipeInv2;},
     getBlend:()=>mixBlend2, setBlend:v=>{mixBlend2=v;}, getKey:()=>mixKey2, setKey:v=>{mixKey2=v;}},
    {key:"bM", pid:"busMix", label:"MASTER · BUS 1 ↔ BUS 2", routed:false,
     get:()=>mixModeM, set:v=>{mixModeM=v;}, inv:()=>wipeInvM, tinv:()=>{wipeInvM=!wipeInvM;},
     getBlend:()=>mixBlendM, setBlend:v=>{mixBlendM=v;}, getKey:()=>mixKeyM, setKey:v=>{mixKeyM=v;}},
  ];
  for(const bus of buses){
    const p = P[bus.pid];
    const el = document.createElement("div");
    el.className = "mixbus" + (bus.routed ? "" : " mixmaster");
    const h = document.createElement("h5");
    h.textContent = bus.label;
    attachTip(h, bus.label, SECHELP[bus.routed ? (bus.key==="b1"?"mixer":"mixer2") : "mixerM"]);
    el.appendChild(h);

    const row = document.createElement("div"); row.className = "mixrow";
    if(bus.routed){
      for(const side of [0,1]){
        const sel = document.createElement("select");
        sel.id = "busSrc"+bus.key+side;
        attachTip(sel, side===0 ? "BUS INPUT A" : "BUS INPUT B",
          "Which channel feeds this side of the bus. Any channel can go to any bus, so A can wipe against C, or D against B.");
        for(const c of CHANNELS){
          const o = document.createElement("option"); o.value=c; o.textContent="CH "+c; sel.appendChild(o);
        }
        sel.value = busSrc[bus.key][side];
        sel.onchange = ()=>{ busSrc[bus.key][side] = sel.value; };
        row.appendChild(sel);
        if(side===0){
          const a = document.createElement("span"); a.className="arrow"; a.textContent="↔";
          row.appendChild(a);
        }
      }
    }
    const mode = document.createElement("select");
    mode.id = bus.key==="b1" ? "selMixMode" : (bus.key==="b2" ? "selMixMode2" : "selMixModeM");
    attachTip(mode, "TRANSITION",
      "How the fader reveals the second input: a plain dissolve, one of twelve wipe shapes, a slide in from an edge, or a stretch. This is independent of the key, so a wipe and a key can run at the same time.");
    MIXMODES.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=m; mode.appendChild(o); });
    mode.value = bus.get();
    mode.onchange = ()=>{ bus.set(parseInt(mode.value)); refreshToggles(); };
    row.appendChild(mode);
    const iv = document.createElement("button");
    iv.textContent = "INV";
    attachTip(iv, "INVERT WIPE", "Runs the wipe from the other side.",
      "Only wipes have a direction to reverse, so this greys out on a dissolve, a slide or a stretch.");
    iv.classList.toggle("on", bus.inv());
    iv.onclick = ()=>{ if(iv.disabled) return; bus.tinv(); iv.classList.toggle("on", bus.inv()); };
    stripInvBtns[bus.key] = {btn:iv, get:bus.inv, mode:bus.get};
    row.appendChild(iv);
    el.appendChild(row);

    /* mix type and key are their own choices, not alternatives to the wipe */
    const row2 = document.createElement("div"); row2.className = "mixrow";
    const bl = document.createElement("select");
    bl.id = "selMixBlend"+bus.key;
    attachTip(bl, "MIX TYPE",
      "How the two pictures combine where both are visible. DISSOLVE crossfades; ADDITIVE sums them, which is the classic full-additive mix; NON-ADD keeps whichever is brighter, so neither picture dims the other; then difference, multiply and screen.");
    MIXBLENDS.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=m; bl.appendChild(o); });
    bl.value = bus.getBlend();
    bl.onchange = ()=>{ bus.setBlend(parseInt(bl.value)); };
    const ky = document.createElement("select");
    ky.id = "selMixKey"+bus.key;
    attachTip(ky, "KEY / COMPOSITE",
      "A compositing stage on top of the transition. LUMA WHITE drops the bright parts of the incoming picture out, LUMA BLACK drops the dark parts, CHROMA drops a colour, and PICTURE IN PICTURE insets it as a subscreen.",
      "Because this is separate from the transition, you can run a circle wipe and a luma key together. The threshold, softness and subscreen controls are on the MIX tab.");
    MIXKEYS.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=m; ky.appendChild(o); });
    ky.value = bus.getKey();
    ky.onchange = ()=>{ bus.setKey(parseInt(ky.value)); };
    row2.appendChild(bl); row2.appendChild(ky);
    el.appendChild(row2);

    const fr = document.createElement("div"); fr.className = "mixfader";
    const wrap = document.createElement("div"); wrap.className = "sldwrap";
    const sl = document.createElement("input");
    sl.type = "range"; sl.min = p.min; sl.max = p.max; sl.step = (p.max-p.min)/400;
    sl.value = getBase(p.id);
    attachTip(sl, p.name, PHELP[p.id] || "", "Double-click to return it to zero.");
    const val = document.createElement("input"); val.className = "mval";
    val.value = fmt(p, getBase(p.id));
    sl.addEventListener("input", ()=>{
      const v = parseFloat(sl.value);
      setBase(p.id, v); setReadout(val, fmt(p, v));
      morphOverride.add("M:"+p.id);
    });
    sl.addEventListener("dblclick", ()=>{ resetParam(p); });
    makeReadoutField(p, val, sl);
    const tick = document.createElement("div"); tick.className = "modtick";
    wrap.appendChild(sl); wrap.appendChild(tick);
    fr.appendChild(wrap); fr.appendChild(val);
    el.appendChild(fr);
    /* the melt amount rides next to the fader because it is a performance
       control, not a setup one. Its width, hold and direction stay on the
       MIX tab with the rest of the transition detail. */
    const ep = P[MIXBUS[bus.key][MIXP_EDGE]];
    const er = document.createElement("div"); er.className = "mixfader mixmelt";
    const elab = document.createElement("span"); elab.className = "mlab"; elab.textContent = "MELT";
    attachTip(elab, "EDGE MELT", PHELP[ep.id] || "", "Width, hold, swirl, chroma and creep are on the MIX tab.");
    const ewrap = document.createElement("div"); ewrap.className = "sldwrap";
    const esl = document.createElement("input");
    esl.type = "range"; esl.min = ep.min; esl.max = ep.max; esl.step = (ep.max-ep.min)/400;
    esl.value = getBase(ep.id);
    const eval_ = document.createElement("input"); eval_.className = "mval";
    eval_.value = fmt(ep, getBase(ep.id));
    esl.addEventListener("input", ()=>{
      const v = parseFloat(esl.value);
      setBase(ep.id, v); setReadout(eval_, fmt(ep, v));
      morphOverride.add("M:"+ep.id);
      const r0 = uiRefs[ep.id]; if(r0 && r0.slider !== esl){ r0.slider.value = v; setReadout(r0.val, fmt(ep, v)); }
    });
    esl.addEventListener("dblclick", ()=>{ resetParam(ep); });
    esl.addEventListener("contextmenu", e=>{ e.preventDefault(); openModMenu(e, ep); });
    makeReadoutField(ep, eval_, esl);
    const etick = document.createElement("div"); etick.className = "modtick";
    ewrap.appendChild(esl); ewrap.appendChild(etick);
    er.appendChild(elab); er.appendChild(ewrap); er.appendChild(eval_);
    el.appendChild(er);
    stripMelt.push({p:ep, slider:esl, val:eval_, tick:etick});
    /* registering here means refreshUI and the modulation ticks drive it too */
    uiRefs[p.id] = {slider:sl, val, tick, row:el, label:h};
    host.appendChild(el);
  }
  refreshBusUI(); refreshToggles();
}
const stripInvBtns = {};
/* the melt faders are a second view of parameters the MIX tab also draws,
   so they are refreshed alongside rather than through uiRefs */
const stripMelt = [];

/* 349 controls in a seven-screen column, and until now no way to ask for one.
   Matches the parameter name, its section, and the body of its help text - so
   "roll" finds V ROLL, and "lose lock" finds the sync controls that describe
   it. The two chips answer the other two questions you actually have live:
   what is moving, and what have I changed. */
let filterOn = false;
/* the manual, opened at one section and laid out as reference */
function openSectionHelp(id){
  const box = document.getElementById("helpSection");
  const body = document.getElementById("helpBody");
  const toc = document.getElementById("helpToc");
  if(!box) return;
  const sec = SECTIONS.find(x=>x.id===id);
  box.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = sec ? sec.name : id.toUpperCase();
  box.appendChild(h);
  if(SECHELP[id]){
    const p0 = document.createElement("p");
    p0.textContent = SECHELP[id];
    box.appendChild(p0);
  }
  for(const p of PLIST){
    if(p.sec !== id) continue;
    const row = document.createElement("div"); row.className = "hsparam";
    const nm = document.createElement("div"); nm.className = "hsname"; nm.textContent = p.name;
    const bd = document.createElement("div"); bd.className = "hsbody";
    bd.textContent = PHELP[p.id] || "";
    row.appendChild(nm); row.appendChild(bd);
    box.appendChild(row);
  }
  const back = document.createElement("button");
  back.textContent = "\u2039 THE WHOLE MANUAL";
  back.style.marginTop = "12px";
  back.onclick = ()=>{ box.classList.remove("on"); body.style.display = ""; if(toc) toc.style.display = ""; };
  box.appendChild(back);
  box.classList.add("on");
  body.style.display = "none";
  if(toc) toc.style.display = "none";
  document.getElementById("help").classList.add("show");
  document.getElementById("helpBox").scrollTop = 0;
}
/* contents, search, and a close that is not "any click anywhere" */
/* The probe. Every one of these signals already exists and already drives
   something; none of them was ever visible. A tool you cannot see inside is a
   tool you can only use the way it was designed to be used, which is the
   opposite of the point. */
const PROBES = [
  {v:0, name:"PICTURE", note:"Normal output."},
  {v:1, name:"SYNC TRACE", note:"The per-scanline horizontal displacement the sync model is producing this frame, drawn as a trace against a centre line. Every shear, every loss of lock and every recovery is visible as a shape here before it is visible in the picture."},
  {v:2, name:"LINE STATE", note:"The other three values the sync model hands the GPU per scanline: AGC gain in red, noise gain in green, and lost high-frequency detail in blue. Bands and drifts in this are what the tape controls are actually doing."},
];
function buildProbeUI(){
  const row = document.getElementById("probeRow");
  const note = document.getElementById("probeNote");
  if(!row) return;
  row.innerHTML = "";
  const refresh = ()=>{
    for(const b of row.children) b.classList.toggle("on", +b.dataset.v === probeMode);
    const p = PROBES.find(x=>x.v === probeMode);
    note.textContent = p ? p.note : "";
  };
  for(const p of PROBES){
    const b = document.createElement("button");
    b.textContent = p.name; b.dataset.v = p.v;
    b.onclick = ()=>{ probeMode = p.v; refresh(); };
    row.appendChild(b);
  }
  refresh();
}
function initHelpUI(){
  const help = document.getElementById("help");
  const box = document.getElementById("helpBox");
  const body = document.getElementById("helpBody");
  const toc = document.getElementById("helpToc");
  const sec = document.getElementById("helpSection");
  const search = document.getElementById("helpSearch");
  if(!help || !body) return;
  const close = ()=>{ help.classList.remove("show"); };
  document.getElementById("helpClose").onclick = close;
  /* clicking the backdrop closes; clicking inside the panel does not, so you
     can keep it open beside the control you are setting up */
  help.addEventListener("click", e=>{ if(e.target === help) close(); });
  const heads = Array.prototype.slice.call(body.querySelectorAll("h3"));
  for(const h of heads){
    const b = document.createElement("button");
    b.textContent = h.textContent;
    b.onclick = ()=>{ h.scrollIntoView({block:"start"}); };
    toc.appendChild(b);
  }
  search.addEventListener("keydown", e=>e.stopPropagation());
  search.addEventListener("input", ()=>{
    const q = search.value.trim().toLowerCase();
    let group = null, groupHit = false;
    const groups = [];
    for(const node of Array.prototype.slice.call(body.children)){
      if(node.tagName === "H3"){ group = [node]; groups.push(group); groupHit = false; }
      else if(group) group.push(node);
      else groups.push([node]);
    }
    for(const g of groups){
      const text = g.map(n=>n.textContent).join(" ").toLowerCase();
      const hit = !q || text.indexOf(q) >= 0;
      for(const n of g) n.classList.toggle("nomatch", !hit);
    }
    toc.style.display = q ? "none" : "";
  });
  window.__openHelp = ()=>{
    sec.classList.remove("on"); body.style.display = ""; toc.style.display = "";
    search.value = ""; search.dispatchEvent(new Event("input"));
    help.classList.add("show"); box.scrollTop = 0;
  };
}
function buildFilterBar(){
  const bar = document.createElement("div"); bar.id = "pfilter";
  const inp = document.createElement("input");
  inp.type = "text"; inp.id = "pfilterInput"; inp.placeholder = "FILTER  \u2014  press /";
  inp.spellcheck = false;
  const mk = (label, tip)=>{
    const b = document.createElement("button"); b.className = "fchip"; b.textContent = label;
    attachTip(b, label, tip);
    b.onclick = ()=>{ b.classList.toggle("on"); applyFilter(); };
    return b;
  };
  const cMod = mk("MOVING", "Show only the parameters something is currently driving \u2014 a modulator, or a bend pad you are holding.");
  const cChg = mk("CHANGED", "Show only the parameters that are away from their default on the channel you are editing.");
  const clr = document.createElement("button"); clr.className = "fchip"; clr.textContent = "\u2715";
  attachTip(clr, "CLEAR FILTER", "Back to the whole panel. Escape does the same.");
  clr.onclick = ()=>{ inp.value = ""; cMod.classList.remove("on"); cChg.classList.remove("on"); applyFilter(); };
  const count = document.createElement("span"); count.id = "pfilterCount";
  inp.addEventListener("input", ()=>applyFilter());
  inp.addEventListener("keydown", e=>{
    e.stopPropagation();
    if(e.key === "Escape"){ inp.value=""; cMod.classList.remove("on"); cChg.classList.remove("on"); applyFilter(); inp.blur(); }
  });
  bar.appendChild(inp); bar.appendChild(cMod); bar.appendChild(cChg); bar.appendChild(clr); bar.appendChild(count);
  panel.appendChild(bar);
  window.__focusFilter = ()=>{ inp.focus(); inp.select(); };
  applyFilter = function(){
    const q = (inp.value||"").trim().toLowerCase();
    const modOnly = cMod.classList.contains("on"), chgOnly = cChg.classList.contains("on");
    filterOn = !!(q || modOnly || chgOnly);
    document.body.classList.toggle("filtering", filterOn);
    const routed = new Set(routes.map(r=>r.dst));
    for(const b in bendMix) if(bendMix[b] > 0.01) for(const pid in BENDS[b]) routed.add(pid);
    let shown = 0;
    for(const p of PLIST){
      const r = uiRefs[p.id];
      if(!r || !r.row || !r.row.closest("#panel")) continue;
      let ok = true;
      if(q) ok = p.name.toLowerCase().indexOf(q) >= 0
              || p.sec.toLowerCase().indexOf(q) >= 0
              || (PHELP[p.id]||"").toLowerCase().indexOf(q) >= 0;
      if(ok && modOnly) ok = routed.has(p.id);
      if(ok && chgOnly) ok = Math.abs(getBase(p.id) - p.def) > 1e-6;
      r.row.style.display = ok ? "" : "none";
      if(ok) shown++;
    }
    for(const id in secEls){
      const d = secEls[id];
      if(!d.closest || !d.closest("#panel")) continue;
      /* a section that does not belong to this channel's source stays hidden
         whatever the filter says */
      if(d.classList.contains("srcoff")){ d.style.display = "none"; continue; }
      if(!filterOn){ d.style.display = ""; continue; }
      const any = Array.prototype.some.call(d.querySelectorAll(".prow"), x=>x.style.display !== "none");
      d.style.display = any ? "" : "none";
    }
    count.textContent = filterOn ? shown+" OF "+PLIST.length : "";
  };
}
/* Which sections belong to which source. The pattern synth is not a stage in
   the chain, it is what the channel is looking at, so on a channel playing a
   file it is a panel of controls that do nothing. It goes away. */
const SEC_FOR_SRC = { gen: ["synth"], text: ["text"] };
function refreshSourceSections(){
  const mode = (typeof SRC !== "undefined" && SRC[activeChan]) ? SRC[activeChan].mode : "";
  for(const id in SEC_FOR_SRC){
    const d = secEls[id];
    if(!d) continue;
    const off = SEC_FOR_SRC[id].indexOf(mode) < 0;
    d.classList.toggle("srcoff", off);
    /* the filter writes an inline display, so clearing the class is not enough
       to bring a section back */
    if(!off) d.style.display = "";
  }
  /* the deck transport: a live input can be held or let run and nothing else,
     so the shuttle and jog keys are dimmed rather than left to throw */
  const btns = tapeBtnRefs[0];
  if(btns && typeof srcCaps === "function"){
    const caps = srcCaps(SRC[activeChan]);
    for(const k in btns){
      const off = caps.live && k !== "play" && k !== "still";
      btns[k].disabled = off;
      btns[k].classList.toggle("dim", off);
    }
  }
  if(filterOn) applyFilter();
}
let applyFilter = ()=>{};
function buildPanel(){
  buildChanBar();
  buildFilterBar();
  buildZones();
  for(const sec of SECTIONS){
    const d = document.createElement("div");
    d.className = "sec "+sec.cls;
    const h = document.createElement("h3");
    const tag = MASTER_SECS.has(sec.id) ? "<span class='sectag master'>MASTER</span>"
                                        : "<span class='sectag chan'></span>";
    h.innerHTML = "<span class='caret'>\u25be</span><span class='led'></span>"+sec.name+tag;
    /* Sections that belong to a bypassable stage get the bypass here as well as
       on the rail above the picture, wired to the same state. Clicking a rail
       pill used to be the only way, it was silent, and a bypassed pill looked
       almost exactly like the three that are not controls at all. */
    const stg = stageOfSection(sec.id);
    if(stg){
      const by = document.createElement("button");
      by.className = "secbypass";
      by.dataset.stage = stg;
      by.dataset.sec = sec.id;
      attachTip(by, "SWITCH THIS SECTION OUT",
        "Takes this section out of the signal path and nothing else, on every channel. Its controls keep their values and stop having any effect, so shutting the eye and opening it again puts you back exactly where you were.",
        "The pills on the rail above the picture switch out a whole stage at once, which is several sections.");
      /* not the title as well: clicking the header collapses the section, and
         one target cannot mean two things */
      by.onclick = e=>{
        e.stopPropagation();
        secBypass[sec.id] = !secBypass[sec.id];
        secBypassOn = Object.keys(secBypass).some(k=>secBypass[k]);
        bumpParams();
        refreshBypassBtns();
      };
      by.innerHTML = EYE_OPEN;        /* until refreshBypassBtns runs */
      h.appendChild(by);
    }
    /* the manual is an essay; this is the reference. Same words, but arranged
       as "what is in front of me right now" rather than as prose. */
    const hb = document.createElement("button");
    hb.className = "sechelp"; hb.textContent = "?";
    attachTip(hb, "SECTION REFERENCE", "Opens the manual at this section, with every control in it and what each one does.");
    hb.onclick = e=>{ e.stopPropagation(); openSectionHelp(sec.id); };
    h.appendChild(hb);
    const rb = document.createElement("button");
    rb.className = "secreset"; rb.textContent = "RESET";
    attachTip(rb, "RESET SECTION", "Returns every control in this section to its default, on the channel you are editing.", "Individual controls reset with a double-click, or the \u21ba that appears when you hover the row.");
    rb.onclick = e=>{ e.stopPropagation(); resetSection(sec.id); };
    h.appendChild(rb);
    /* only the sidebar collapses. A section in the dock sits in a fixed
       side-by-side layout where a collapsed one is indistinguishable from an
       empty one, and the dock as a whole already folds. */
    if(sec.zone === "chain") h.onclick = ()=>{ d.classList.toggle("collapsed"); saveCollapse(); };
    d.appendChild(h);
    /* only the channel signal path reorders — the mix, the master out and the
       tools stay where they are, because their position carries meaning */
    if(sec.zone === "chain") makeSectionDraggable(d, h, sec.id);
    if(SECHELP[sec.id]) attachTip(h, sec.name, SECHELP[sec.id],
      (sec.zone === "chain" ? "Click to collapse \u00b7 drag the handle to reorder \u00b7 " : "Click to collapse \u00b7 ")
      + "RESET returns the whole section to defaults");
    const body = document.createElement("div"); body.className = "secbody";
    d.appendChild(body);
    secEls[sec.id] = d;
    sectionExtras(sec.id, body);
    const dOuter = d; const d2 = body;
    for(const p of PLIST.filter(p=>p.sec===sec.id && !STRIP_PARAMS.has(p.id))){
      const row = document.createElement("div"); row.className="prow";
      const lab = document.createElement("label"); lab.textContent = p.name;
      lab.htmlFor = "prm_" + p.id;
      attachTip(lab, p.name, PHELP[p.id] || "",
        "Type into the number to set it exactly \u00b7 double-click the slider or press \u21ba to reset \u00b7 right-click to patch a modulator \u00b7 click while MIDI learn is on to map a controller");
      lab.onclick = ()=>{ if(midiLearnMode){ setLearnTarget(p.id); } };
      lab.addEventListener("dblclick", ()=>resetParam(p));
      row.addEventListener("contextmenu", e=>{ e.preventDefault(); openModMenu(e, p); });
      const wrap = document.createElement("div"); wrap.className="sldwrap";
      const s = document.createElement("input");
      s.type="range"; s.min=p.min; s.max=p.max; s.step=(p.max-p.min)/400; s.value=getBase(p.id);
      s.id = "prm_" + p.id;
      s.setAttribute("aria-label", p.name + " (" + p.sec + ")");
      s.addEventListener("pointerdown", armGesture);
      s.addEventListener("input", ()=>{
        const v = parseFloat(s.value);
        setBase(p.id, v); setReadout(val, fmt(p,v));
        if(p.master) morphOverride.add("M:"+p.id);
        else if(linkChans){ for(const ch of CHANNELS) morphOverride.add(ch+":"+p.id); }
        else morphOverride.add(activeChan+":"+p.id);
        if(p.id==="abMix" && v>0.03 && !window.__chanHasSource("B")){
          if(!window.__abHintT || performance.now()-window.__abHintT>6000){
            window.__abHintT=performance.now();
            toast("A>B FADER brings in channel B — give channel B a source first (switch to B and pick FILE / CAM / PATTERN)");
          }
        }
      });
      s.addEventListener("dblclick", ()=>{ setBase(p.id, p.def); s.value=p.def; setReadout(val, fmt(p,p.def)); });
      const tick = document.createElement("div"); tick.className="modtick";
      wrap.appendChild(s); wrap.appendChild(tick);
      const val = document.createElement("input"); val.className="val"; val.value = fmt(p,getBase(p.id));
      makeReadoutField(p, val, s);
      const rst = document.createElement("button"); rst.className="prst"; rst.textContent="\u21ba";
      attachTip(rst, "RESET " + p.name, "Back to the default ("+fmt(p,p.def)+").",
        "Shift-click for the bottom of the range ("+fmt(p,p.min)+"). Double-clicking the slider does the same as a plain click.");
      rst.onclick = e=>{ e.stopPropagation(); resetParam(p, e.shiftKey); };
      row.appendChild(lab); row.appendChild(wrap); row.appendChild(val); row.appendChild(rst);
      d2.appendChild(row);
      uiRefs[p.id] = {slider:s, val, tick, row, label:lab};
    }
    sectionExtrasAfter(sec.id, body);
    /* the transition sections live on the dock's MIX tab and preset morph on
       PERFORM; only the channel path and the master out are in the sidebar */
    const DOCKZONE = {mix:"mixdock", perform:"performdock", outdock:"outdock"};
    const host = DOCKZONE[sec.zone] ? document.getElementById(DOCKZONE[sec.zone])
                                    : (zoneEls[sec.zone] || zoneEls.chain);
    host.appendChild(d);
  }
  /* The clock is a header control now. It is global, it is two widgets wide,
     and it was taking a whole sidebar section to show one number. */
  {
    const tap = document.getElementById("btnTap");
    if(tap) tap.onclick = tapTempo;
    initTempoField();
    updateTempoUI();
  }
  buildAudioSection();
}

/* ---- MOD page: every source, live ---- */
const modHist = {};   // id -> Float32Array ring
const MODHIST_N = 140;
mods = defaultMods();
rebuildMODSRC();
function pushModHistory(){
  for(const id in modHist){
    const h = modHist[id];
    h.buf[h.w] = modVal[id] || 0;
    h.w = (h.w+1) % MODHIST_N;
  }
}
const modCards = {};
function buildModPage(){
  const grid = document.getElementById("modgrid");
  if(!grid) return;
  for(const k in modCards) delete modCards[k];
  for(const k in modMacroRefs) delete modMacroRefs[k];
  grid.innerHTML = "";

  const addCard = document.createElement("div");
  addCard.className = "modcard addcard";
  const ah = document.createElement("h4"); ah.textContent = "ADD MODULATOR";
  addCard.appendChild(ah);
  for(const [label, make, tip] of [
    ["+ LFO", mkLfo, "A free-running or tempo-synced oscillator. Ten shapes, twenty sync divisions. Add as many as you want."],
    ["+ ENVELOPE", mkEnv, "Fires and decays when something happens rather than running continuously: a bend pad, an audio hit, a scene cut, or the tempo. This is how you get punctuation instead of constant motion."],
    ["+ MACRO", mkMacro, "One knob driving as many parameters as you point it at, each with its own depth, curve and direction. Build a 'more broken' control that means something specific to this patch."],
  ]){
    const btn = document.createElement("button");
    btn.textContent = label; btn.style.width = "100%";
    attachTip(btn, label.replace("+ ", ""), tip);
    btn.onclick = ()=>{
      const m = make();
      mods.push(m); rebuildMODSRC(); buildModPage(); renderRoutes();
      setTimeout(()=>focusModSource(m.id), 30);
      toast(m.name + " added");
    };
    addCard.appendChild(btn);
  }
  {
    const btn = document.createElement("button");
    btn.textContent = "+ AUDIO TAP"; btn.style.width = "100%";
    attachTip(btn, "AUDIO TAP",
      "A listener on one input channel, narrowed to one band. On an interface with separate outputs into it, that means the kick on input 1 can drive one parameter while the hats on input 3 drive another. Set the channel and the band on the AUDIO REACT · CHANNEL TAPS panel, then patch it like any other modulator. Every tap is also an envelope trigger.");
    btn.onclick = ()=>{
      if(audioTaps.length >= AUD_MAX){ toast("That is as many taps as the interface list goes to", true); return; }
      const t = mkAudTap();
      audioTaps.push(t);
      rebuildMODSRC(); wireTaps(); buildAudTapList(); buildModPage(); renderRoutes();
      setTimeout(()=>focusModSource(t.id), 30);
      toast(t.name + " added");
    };
    addCard.appendChild(btn);
  }
  grid.appendChild(addCard);

  const groups = [
    {cls:"", ids:mods.map(m=>m.id)},
    {cls:"audio", ids:audioTaps.map(t=>t.id)},
    {cls:"audio", ids:["bass","mid","high"]},
    {cls:"vid", ids:["motion","bright","cut"]},
    {cls:"", ids:["chaos","drift","spike"]},
  ];
  for(const g of groups) for(const id of g.ids){
    const src = MODSRC.find(x=>x.id===id);
    if(!src) continue;
    const m = modById(id);
    const tp = audTapById(id);
    const own = m || tp;
    const card = document.createElement("div");
    card.className = "modcard " + g.cls + (own ? " usermod" : "");
    const h = document.createElement("h4");
    const nm = document.createElement("span");
    nm.textContent = src.name;
    if(own){
      nm.className = "modname";
      nm.title = "Click to rename";
      nm.onclick = ()=>{
        const v = (prompt("Name this modulator", own.name) || "").trim();
        if(!v) return;
        own.name = v; rebuildMODSRC(); buildModPage(); renderRoutes();
      };
    }
    h.appendChild(nm);
    if(m && m.type !== "lfo"){
      const tag = document.createElement("i");
      tag.className = "mtype"; tag.textContent = m.type === "env" ? "ENV" : "MACRO";
      h.appendChild(tag);
    }
    if(tp){
      const tag = document.createElement("i");
      tag.className = "mtype"; tag.textContent = "IN " + ((tp.chan|0)+1);
      h.appendChild(tag);
    }
    const val = document.createElement("span");
    val.style.cssText = "margin-left:auto; color:var(--txt); font-size:9px;";
    h.appendChild(val);
    if(own){
      const del = document.createElement("button");
      del.className = "moddel"; del.textContent = "✕";
      attachTip(del, "REMOVE", "Deletes this modulator and every route using it.");
      del.onclick = ()=>{
        if(tp){
          audioTaps.splice(audioTaps.indexOf(tp), 1);
          if(audNodes[tp.id]){ try{ audNodes[tp.id].an.disconnect(); }catch(e){} delete audNodes[tp.id]; }
          /* an envelope pointed at a tap that no longer exists would never fire
             again and would never say why, so it falls back to manual */
          for(const mm of mods) if(mm.trig === "aud:"+tp.id) mm.trig = "manual";
          wireTaps(); buildAudTapList();
        } else {
          mods.splice(mods.indexOf(m), 1);
        }
        routes = routes.filter(r=>r.src !== own.id);
        rebuildMODSRC(); buildModPage(); renderRoutes();
        toast(own.name + " removed");
      };
      h.appendChild(del);
    }
    card.appendChild(h);
    const cv = document.createElement("canvas");
    cv.width = 250; cv.height = 44;
    card.appendChild(cv);

    if(tp){
      /* everything a tap needs sits on its own card: which input it listens to,
         how wide a slice of the spectrum, how hard it pushes and how quickly it
         follows. The graph above is its meter. */
      const mkrow = (label, el)=>{
        const r = document.createElement("div"); r.className = "mcrow";
        const l = document.createElement("label"); l.textContent = label;
        r.appendChild(l); r.appendChild(el);
        card.appendChild(r);
        return r;
      };
      const chs = document.createElement("select");
      const fillCh = ()=>{
        chs.innerHTML = "";
        const n = Math.max(2, Math.min(AUD_MAX, audInChannels||2));
        for(let i2=0;i2<n;i2++){
          const o=document.createElement("option"); o.value=i2; o.textContent="INPUT "+(i2+1); chs.appendChild(o);
        }
        chs.value = String(Math.min(n-1, tp.chan|0));
      };
      fillCh();
      chs.onmousedown = fillCh;
      chs.onchange = ()=>{ tp.chan = parseInt(chs.value)||0; wireTaps(); rebuildMODSRC(); buildModPage(); renderRoutes(); };
      mkrow("INPUT", chs);

      const bnd = document.createElement("select");
      for(const [nmb,lo,hi] of AUD_BANDS){
        const o=document.createElement("option"); o.value=lo+","+hi; o.textContent=nmb; bnd.appendChild(o);
      }
      const cust = document.createElement("option"); cust.value="custom"; cust.textContent="CUSTOM"; bnd.appendChild(cust);
      const matchBand = ()=>{
        const hit = AUD_BANDS.find(b=>b[1]===tp.lo && b[2]===tp.hi);
        bnd.value = hit ? (hit[1]+","+hit[2]) : "custom";
      };
      matchBand();
      bnd.onchange = ()=>{
        if(bnd.value === "custom") return;
        const [lo,hi] = bnd.value.split(",").map(Number);
        tp.lo = lo; tp.hi = hi; tp.peak = 0.05;
        loS.value = Math.log10(tp.lo); hiS.value = Math.log10(tp.hi); updHz();
      };
      mkrow("BAND", bnd);

      const loS = document.createElement("input");
      loS.type="range"; loS.step=0.001; loS.min=Math.log10(20); loS.max=Math.log10(16000); loS.value=Math.log10(tp.lo);
      const loV = document.createElement("span"); loV.className="mcval";
      const hiS = document.createElement("input");
      hiS.type="range"; hiS.step=0.001; hiS.min=Math.log10(20); hiS.max=Math.log10(16000); hiS.value=Math.log10(tp.hi);
      const hiV = document.createElement("span"); hiV.className="mcval";
      const updHz = ()=>{ loV.textContent = hzFmt(tp.lo); hiV.textContent = hzFmt(tp.hi); matchBand(); };
      loS.addEventListener("input", ()=>{
        tp.lo = Math.min(Math.pow(10, parseFloat(loS.value)), tp.hi-5); tp.peak = 0.05; updHz(); });
      hiS.addEventListener("input", ()=>{
        tp.hi = Math.max(Math.pow(10, parseFloat(hiS.value)), tp.lo+5); tp.peak = 0.05; updHz(); });
      { const r = mkrow("LO", loS); r.appendChild(loV); }
      { const r = mkrow("HI", hiS); r.appendChild(hiV); }
      updHz();

      const gS = document.createElement("input");
      gS.type="range"; gS.min=0; gS.max=3; gS.step=0.01; gS.value=tp.gain;
      const gV = document.createElement("span"); gV.className="mcval";
      const updG = ()=>{ tp.gain = parseFloat(gS.value); gV.textContent = tp.gain.toFixed(2); };
      gS.addEventListener("input", updG); updG();
      { const r = mkrow("GAIN", gS); r.appendChild(gV); }

      const rS = document.createElement("input");
      rS.type="range"; rS.min=0; rS.max=1; rS.step=0.01; rS.value=tp.resp;
      const rV = document.createElement("span"); rV.className="mcval";
      const updR = ()=>{ tp.resp = parseFloat(rS.value); rV.textContent = tp.resp.toFixed(2); };
      rS.addEventListener("input", updR); updR();
      { const r = mkrow("RESPONSE", rS); r.appendChild(rV); }
    }
    if(m && m.type === "lfo"){
      const r1 = document.createElement("div"); r1.className = "mcrow";
      const l1 = document.createElement("label"); l1.textContent = "RATE";
      const s1 = document.createElement("input");
      s1.type = "range"; s1.min = -2; s1.max = 1.2; s1.step = 0.01; s1.value = Math.log10(m.rate);
      const v1 = document.createElement("span"); v1.className = "mcval";
      const upd1 = ()=>{ m.rate = Math.pow(10, parseFloat(s1.value)); v1.textContent = m.rate.toFixed(2)+"Hz"; };
      s1.addEventListener("input", upd1); upd1();
      r1.appendChild(l1); r1.appendChild(s1); r1.appendChild(v1);
      card.appendChild(r1);
      const r2 = document.createElement("div"); r2.className = "mcrow";
      const l2 = document.createElement("label"); l2.textContent = "SHAPE";
      const sh = document.createElement("select");
      for(const o of LFO_SHAPES){ const op = document.createElement("option"); op.value = o; op.textContent = o.toUpperCase(); sh.appendChild(op); }
      sh.value = m.shape;
      sh.onchange = ()=>{ m.shape = sh.value; };
      const sy = document.createElement("select");
      for(const [v,n] of SYNC_DIVS){ const op = document.createElement("option"); op.value = v; op.textContent = n; sy.appendChild(op); }
      sy.value = String(m.sync || 0);
      sy.onchange = ()=>{ m.sync = parseFloat(sy.value); s1.disabled = m.sync > 0; };
      s1.disabled = (m.sync || 0) > 0;
      r2.appendChild(l2); r2.appendChild(sh); r2.appendChild(sy);
      card.appendChild(r2);
    }
    else if(m && m.type === "env"){
      const fmtT = v => v < 1 ? Math.round(v*1000)+"ms" : v.toFixed(2)+"s";
      for(const [label, key, lo, hi] of [["ATTACK","a",0.005,4], ["DECAY","d",0.02,20]]){
        const r = document.createElement("div"); r.className = "mcrow";
        const l = document.createElement("label"); l.textContent = label;
        const sl = document.createElement("input");
        sl.type = "range"; sl.min = Math.log10(lo); sl.max = Math.log10(hi); sl.step = 0.01;
        sl.value = Math.log10(Math.max(lo, m[key]));
        const vv = document.createElement("span"); vv.className = "mcval";
        const upd = ()=>{ m[key] = Math.pow(10, parseFloat(sl.value)); vv.textContent = fmtT(m[key]); };
        sl.addEventListener("input", upd); upd();
        r.appendChild(l); r.appendChild(sl); r.appendChild(vv);
        card.appendChild(r);
      }
      const r3 = document.createElement("div"); r3.className = "mcrow";
      const l3 = document.createElement("label"); l3.textContent = "TRIG";
      const tg = document.createElement("select");
      for(const [v,n] of envTrigList()){ const op = document.createElement("option"); op.value = v; op.textContent = n; tg.appendChild(op); }
      tg.value = m.trig;
      tg.onchange = ()=>{ m.trig = tg.value; };
      r3.appendChild(l3); r3.appendChild(tg);
      card.appendChild(r3);
      const r4 = document.createElement("div"); r4.className = "mcrow";
      const l4 = document.createElement("label"); l4.textContent = "MODE";
      const md = document.createElement("select");
      for(const [v,n] of ENV_MODES){ const op = document.createElement("option"); op.value = v; op.textContent = n; md.appendChild(op); }
      md.value = m.mode;
      md.onchange = ()=>{ m.mode = md.value; };
      const fire = document.createElement("button");
      fire.textContent = "FIRE";
      attachTip(fire, "FIRE", "Triggers the envelope by hand, whatever it is patched to.");
      fire.onclick = ()=>{ m.manual = true; };
      r4.appendChild(l4); r4.appendChild(md); r4.appendChild(fire);
      card.appendChild(r4);
    }
    else if(m && m.type === "macro"){
      const r1 = document.createElement("div"); r1.className = "mcrow";
      const l1 = document.createElement("label"); l1.textContent = "VALUE";
      const s1 = document.createElement("input");
      s1.type = "range"; s1.min = -1; s1.max = 1; s1.step = 0.005; s1.value = m.val;
      const v1 = document.createElement("span"); v1.className = "mcval";
      const upd1 = ()=>{ m.val = parseFloat(s1.value); v1.textContent = m.val.toFixed(2); };
      s1.addEventListener("input", upd1);
      s1.addEventListener("dblclick", ()=>{ s1.value = 0; upd1(); });
      upd1();
      r1.appendChild(l1); r1.appendChild(s1); r1.appendChild(v1);
      card.appendChild(r1);
      modMacroRefs[m.id] = {slider:s1, upd:upd1};
    }

    const dests = document.createElement("div");
    dests.className = "dests";
    card.appendChild(dests);
    const pk = document.createElement("button");
    pk.className = "patchpick";
    pk.textContent = "PATCH TO\u2026";
    attachTip(pk, "PATCH TO", "Points this modulator at a parameter. Opens a search field: type a few letters of the name or the section and press Enter.");
    pk.onclick = ()=>openParamPicker(null, pid=>{
      addRoute(id, pid);
      toast(src.name + " \u2192 " + P[pid].name);
    }, "PATCH " + src.name.toUpperCase() + " TO");
    card.appendChild(pk);
    grid.appendChild(card);
    modCards[id] = {cv, ctx:cv.getContext("2d"), val, dests, card};
  }
}
const modMacroRefs = {};

function drawModPage(){
  /* the mod page lives in the dock now, so only draw when that tab is showing */
  const grid = document.getElementById("modgrid");
  if(!grid || !grid.classList.contains("on")) return;
  for(const id in modCards){
    const c = modCards[id];
    const g = c.ctx, W = c.cv.width, H = c.cv.height;
    g.clearRect(0,0,W,H);
    g.strokeStyle = "#1e1e26"; g.beginPath(); g.moveTo(0,H/2); g.lineTo(W,H/2); g.stroke();
    const h = modHist[id];
    const mm = modById(id);
    g.strokeStyle = mm ? (mm.type==="env" ? "#b4ff5a" : mm.type==="macro" ? "#ff2fa0" : "#ff7a18")
                       : (["bass","mid","high"].includes(id) ? "#2ee6d6" : "#ff3ea5");
    g.lineWidth = 1.5; g.beginPath();
    for(let i=0;i<MODHIST_N;i++){
      const v = h.buf[(h.w+i)%MODHIST_N];
      const x = i/(MODHIST_N-1)*W;
      const y = H/2 - v*(H/2-3);
      i ? g.lineTo(x,y) : g.moveTo(x,y);
    }
    g.stroke();
    c.val.textContent = (modVal[id]||0).toFixed(2);
    const rs = routes.filter(r=>r.src===id);
    c.dests.innerHTML = rs.length
      ? rs.map(r=>"<b>"+(P[r.dst]?P[r.dst].name:r.dst)+"</b> "+(P[r.dst]&&P[r.dst].master?"":r.ch||"A")+" "+r.amt.toFixed(2)).join(" &nbsp; ")
      : "not patched \u2014 right-click a parameter to assign";
  }
}

/* ---- right-click modulation assign ---- */
let modMenuEl = null;
function closeModMenu(){ if(modMenuEl){ modMenuEl.remove(); modMenuEl = null; } }
document.addEventListener("click", closeModMenu);
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModMenu(); });
function routesFor(pid){
  return routes.filter(r=>r.dst===pid && (P[pid].master || !r.ch || r.ch===activeChan || r.ch==="AB"));
}
function openModMenu(ev, p){
  closeModMenu();
  const m = document.createElement("div");
  m.className = "modmenu";
  modMenuEl = m;
  const head = document.createElement("div");
  head.className = "mmhead";
  head.textContent = p.name + (p.master ? "  \u00b7 MASTER" : "  \u00b7 CH "+activeChan);
  m.appendChild(head);

  const existing = routesFor(p.id);
  if(existing.length){
    for(const r of existing){
      const row = document.createElement("div");
      row.className = "mmrow existing";
      const nm = MODSRC.find(x=>x.id===r.src);
      row.innerHTML = "<span>\u25cf "+(nm?nm.name:r.src)+"</span>";
      const amt = document.createElement("input");
      amt.type="range"; amt.min=-1; amt.max=1; amt.step=0.01; amt.value=r.amt;
      /* this used to call renderRoutes() on every pointer move, which tears
         down and rebuilds every route row including a 349-option select - nine
         to twenty-six milliseconds per input event. Update in place while
         dragging; rebuild once when the drag ends. */
      amt.addEventListener("input", ()=>{
        r.amt = parseFloat(amt.value);
        const live = routeAmtRefs[routes.indexOf(r)];
        if(live){ live.slider.value = r.amt; live.val.textContent = r.amt.toFixed(2); }
      });
      amt.addEventListener("change", ()=>renderRoutes());
      amt.addEventListener("click", e=>e.stopPropagation());
      const del = document.createElement("button");
      del.textContent = "\u2715";
      del.onclick = e=>{ e.stopPropagation(); routes.splice(routes.indexOf(r),1); renderRoutes(); closeModMenu(); };
      row.appendChild(amt); row.appendChild(del);
      m.appendChild(row);
    }
    const sep = document.createElement("div"); sep.className="mmsep"; sep.textContent="ADD ANOTHER";
    m.appendChild(sep);
  }
  {
    const b = document.createElement("div");
    b.className = "mmrow anim";
    b.textContent = "\u2726  ANIMATE \u2014 new LFO just for this";
    b.onclick = e=>{ e.stopPropagation(); window.__animateParam(p.id); closeModMenu(); };
    m.appendChild(b);
  }

  /* Which modulators are already doing something. Eight LFOs, envelopes and
     macros all look identical in a list, so picking an unused one meant
     remembering what you had patched. Used ones carry a count and what they
     drive; free ones say so.

     The list is grouped now. Ungrouped, it was one flat column of twenty-odd
     identical rows in a menu that stopped at 340 pixels, so AUD BASS sat right
     on the cut and AUD MID and AUD HIGH were below it. They were there, but
     nothing said so, and a list that ends mid-family reads as a list that ends.
     Headings make the shape of it visible whether or not it fits. */
  const MMGROUP = [
    ["MODULATORS",  x=>x.type === "lfo" || x.type === "env" || x.type === "macro"],
    ["AUDIO TAPS",  x=>x.type === "audtap"],
    ["AUDIO BANDS", x=>["bass","mid","high"].indexOf(x.id) >= 0],
    ["PICTURE",     x=>["motion","bright","cut"].indexOf(x.id) >= 0],
    ["SIGNALS",     x=>["chaos","drift","spike"].indexOf(x.id) >= 0],
  ];
  const ordered = [];
  for(const [label, test] of MMGROUP){
    const hits = MODSRC.filter(test);
    if(hits.length) ordered.push([label, hits]);
  }
  /* anything a future version adds still turns up rather than vanishing */
  const placed = new Set(ordered.flatMap(g=>g[1].map(x=>x.id)));
  const rest = MODSRC.filter(x=>!placed.has(x.id));
  if(rest.length) ordered.push(["OTHER", rest]);

  /* flattened back out to headings and rows so the loop below stays one level
     deep, the way it was before there were families to separate */
  const flat = [];
  for(const [label, group] of ordered){
    flat.push({head:label});
    for(const src of group) flat.push({src});
  }
  for(const item of flat){
    if(item.head){
      const gh = document.createElement("div");
      gh.className = "mmgroup"; gh.textContent = item.head;
      m.appendChild(gh);
      continue;
    }
    const src = item.src;
    const used = routes.filter(r=>r.src===src.id);
    const b = document.createElement("div");
    b.className = "mmrow " + (used.length ? "used" : "free");
    const nm = document.createElement("span");
    nm.className = "mmname"; nm.textContent = src.name;
    b.appendChild(nm);
    const tag = document.createElement("span");
    if(used.length){
      tag.className = "mmuse";
      tag.textContent = used.length === 1 ? "1 DEST" : used.length + " DESTS";
      const names = used.map(r=>{ const q = P[r.dst]; return (q ? q.name : r.dst) + (r.ch && !P[r.dst].master ? " ("+r.ch+")" : ""); });
      attachTip(b, src.name, "Already driving " + names.join(", ") + ".",
                "Clicking adds another destination; a modulator can drive as many as you like.");
    } else {
      tag.className = "mmfree";
      tag.textContent = "FREE";
      attachTip(b, src.name, "Not patched to anything yet.");
    }
    b.appendChild(tag);
    b.onclick = e=>{
      e.stopPropagation();
      routes.push({src:src.id, dst:p.id, amt:0.3, ch:(p.master?"A":activeChan)});
      renderRoutes();
      closeModMenu();
      toast(src.name+" \u2192 "+p.name);
    };
    m.appendChild(b);
  }
  document.body.appendChild(m);
  /* measure it rather than assuming: the menu grows with however many
     modulators and taps exist, and it must not open off the bottom */
  const w = m.offsetWidth || 236;
  const h = Math.min(m.scrollHeight, Math.round(window.innerHeight * 0.72));
  m.style.left = Math.max(6, Math.min(ev.clientX, window.innerWidth - w - 8)) + "px";
  m.style.top  = Math.max(6, Math.min(ev.clientY, window.innerHeight - h - 8)) + "px";
}

/* ---- collapsible + drag-reorderable section plumbing ---- */
const secEls = {};
let dragSec = null;
const zoneEls = {};
function buildZones(){
  for(const z of ZONES){
    const wrap = document.createElement("div");
    wrap.className = "zone zone-"+z.id;
    const h = document.createElement("div");
    h.className = "zonehead";
    const lab = document.createElement("span");
    lab.textContent = z.label;
    h.appendChild(lab);
    attachTip(h, z.label, z.note);
    if(z.id === "chain"){
      const fc = document.createElement("button");
      fc.textContent = "FOLLOW CHAIN";
      attachTip(fc, "FOLLOW CHAIN", "Reorders these sections to match the order of the stages on the rail above the picture, so the panel reads in the order the signal is actually processed.");
      fc.onclick = ()=>{ orderChainZone(true); saveSectionOrder(); toast("Panel follows the signal chain"); };
      const rs = document.createElement("button");
      rs.textContent = "RESET ORDER";
      attachTip(rs, "RESET ORDER", "Puts these sections back into the default signal-path order. Does not touch any value.");
      rs.onclick = ()=>{ orderChainZone(false); saveSectionOrder(); toast("Panel order reset"); };
      const rf = document.createElement("button");
      rf.textContent = "RESET FX";
      attachTip(rf, "RESET THIS CHANNEL", "Every effect on this channel back to default in one press, without touching what the channel is looking at. The source stays loaded, the pattern synth keeps its patch, and the other three channels and the master are untouched. LINK does all four. Undoable with Z.");
      rf.onclick = ()=>resetChannelFX();
      h.appendChild(fc); h.appendChild(rs); h.appendChild(rf);
    }
    wrap.appendChild(h);
    const body = document.createElement("div");
    body.className = "zonebody";
    wrap.appendChild(body);
    zoneEls[z.id] = body;
    panel.appendChild(wrap);
  }
}
/* default: source, framing, frame store, feedback, then the chain stages in
   rail order, then the keyer */
const CHAIN_HEAD = ["gen","frame","time","feedback"];
const CHAIN_TAIL = ["keyer"];
function chainZoneOrder(followRail){
  const stageSecs = followRail
    ? chainOrder.flatMap(k => (STAGE_INFO[k] ? STAGE_INFO[k].sec : []))
    : ["signal","sync","vhs","enhancer","contour","color","glitch","lab","flow"];
  const seen = new Set();
  const out = [];
  for(const id of CHAIN_HEAD.concat(stageSecs, CHAIN_TAIL)){
    if(secEls[id] && !seen.has(id)){ seen.add(id); out.push(id); }
  }
  /* anything not accounted for keeps its place at the end */
  for(const sec of SECTIONS) if(sec.zone === "chain" && !seen.has(sec.id) && secEls[sec.id]) out.push(sec.id);
  return out;
}
function orderChainZone(followRail){
  const body = zoneEls.chain;
  if(!body) return;
  for(const id of chainZoneOrder(followRail)) body.appendChild(secEls[id]);
}
function makeSectionDraggable(el, head, id){
  const grab = document.createElement("span");
  grab.className = "grab"; grab.textContent = "\u2059";
  grab.draggable = true;
  grab.title = "Drag to reorder this section";
  grab.onclick = e=>e.stopPropagation();
  grab.addEventListener("dragstart", e=>{
    dragSec = el; el.classList.add("secdrag");
    e.dataTransfer.effectAllowed = "move";
    try{ e.dataTransfer.setData("text/plain", id); }catch(err){}
    e.stopPropagation();
  });
  grab.addEventListener("dragend", ()=>{
    if(dragSec) dragSec.classList.remove("secdrag");
    dragSec = null;
    document.querySelectorAll(".sec").forEach(x=>x.classList.remove("secover"));
    saveSectionOrder();
  });
  head.insertBefore(grab, head.firstChild);
  el.addEventListener("dragover", e=>{
    if(!dragSec || dragSec===el) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    el.classList.add("secover");
  });
  el.addEventListener("dragleave", ()=> el.classList.remove("secover"));
  el.addEventListener("drop", e=>{
    if(!dragSec || dragSec===el) return;
    e.preventDefault(); e.stopPropagation();
    el.classList.remove("secover");
    const host = el.parentNode;
    if(host && host === dragSec.parentNode) host.insertBefore(dragSec, el);
    saveSectionOrder();
  });
}
function saveSectionOrder(){
  try{
    if(!zoneEls.chain) return;
    const ids = [...zoneEls.chain.children].map(el=>{
      for(const k in secEls) if(secEls[k]===el) return k;
      return null;
    }).filter(Boolean);
    localStorage.setItem("bendr.secorder2", JSON.stringify(ids));
  }catch(e){}
}
function loadSectionOrder(){
  try{
    const ids = JSON.parse(localStorage.getItem("bendr.secorder2")||"[]");
    if(!ids.length || !zoneEls.chain) return;
    const valid = ids.filter(id=>{
      const sec = SECTIONS.find(x=>x.id===id);
      return sec && sec.zone === "chain" && secEls[id];
    });
    for(const id of valid) zoneEls.chain.appendChild(secEls[id]);
  }catch(e){}
}
function mkSection(id, cls, name, hostEl){
  const d = document.createElement("div"); d.className = "sec "+cls;
  const h = document.createElement("h3");
  h.innerHTML = "<span class='caret'>\u25be</span><span class='led'></span>"+name;
  h.onclick = ()=>{ d.classList.toggle("collapsed"); saveCollapse(); };
  if(SECHELP[id]) attachTip(h, name, SECHELP[id], "Click to collapse");
  d.appendChild(h);
  const body = document.createElement("div"); body.className = "secbody";
  d.appendChild(body);
  secEls[id] = d;
  const host = hostEl || zoneEls.tools;
  if(host) host.appendChild(d);
  /* callers append to the body */
  d.appendChild = body.appendChild.bind(body);
  return d;
}
function saveCollapse(){
  try{
    const st = {};
    for(const k in secEls) st[k] = secEls[k].classList.contains("collapsed");
    localStorage.setItem("bendr.collapse", JSON.stringify(st));
  }catch(e){}
}
function loadCollapse(){
  /* a state saved before dock sections stopped collapsing would leave BUS 2
     and MASTER folded away with no caret to open them again */
  let st = null;
  try{ st = JSON.parse(localStorage.getItem("bendr.collapse")); }catch(e){}
  if(!st){
    /* first run: the second bus and the master crossfade are folded away, since
       they do nothing until you bring channels C and D in */
    /* the three transition columns share a dock tab now, so there is room for
       all of them; only the pattern synth starts folded */
    st = {gen:true};
  }
  const SECZONE = {};
  for(const q of SECTIONS) SECZONE[q.id] = q.zone;
  for(const k in st) if(secEls[k] && st[k] && SECZONE[k] === "chain") secEls[k].classList.add("collapsed");
}
function revealSection(id){
  const d = secEls[id];
  if(!d) return;
  d.classList.remove("collapsed"); saveCollapse();
  d.scrollIntoView({block:"start", behavior:"smooth"});
}
function collapseAll(v){
  for(const k in secEls) secEls[k].classList.toggle("collapsed", v);
  saveCollapse();
}

/* ---- signal chain rail: drag to reorder, click to bypass ---- */
/* which bypassable stage a panel section belongs to, if any */
function stageOfSection(id){
  for(const k in STAGE_INFO) if(STAGE_INFO[k].sec.indexOf(id) >= 0) return k;
  return null;
}
const EYE_OPEN =
  '<svg viewBox="0 0 24 16" width="15" height="11" aria-hidden="true">' +
  '<path d="M1 8s4-6.2 11-6.2S23 8 23 8s-4 6.2-11 6.2S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.7"/>' +
  '<circle cx="12" cy="8" r="2.7" fill="currentColor"/></svg>';
const EYE_SHUT =
  '<svg viewBox="0 0 24 16" width="15" height="11" aria-hidden="true">' +
  '<path d="M1 8s4-6.2 11-6.2S23 8 23 8s-4 6.2-11 6.2S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.7" opacity="0.65"/>' +
  '<circle cx="12" cy="8" r="2.7" fill="currentColor" opacity="0.5"/>' +
  '<path d="M3 15 21 1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
function refreshBypassBtns(){
  for(const b of document.querySelectorAll(".secbypass")){
    const off = !!secBypass[b.dataset.sec];
    b.classList.toggle("off", off);
    /* A drawn eye rather than a glyph: the filled circle that stood in for one
       reads as a record button, which is the last thing this should look like.
       Open when the stage is in the path, struck through when it is out. */
    b.innerHTML = off ? EYE_SHUT : EYE_OPEN;
    b.setAttribute("aria-label", off ? "stage bypassed" : "stage on");
    const sec = b.closest(".sec");
    if(sec) sec.classList.toggle("bypassed", off);
  }
}
const STAGE_INFO = {
  sig:    {name:"TAPE / SYNC",  sec:["signal","sync","vhs"]},
  col:    {name:"COLOUR / ENH", sec:["enhancer","contour","color"]},
  glitch: {name:"GLITCH LAB",   sec:["glitch"]},
  lab:    {name:"SIGNAL LAB",   sec:["lab"]},
  flow:   {name:"FLOW / MOSH",  sec:["flow"]},
  scan:   {name:"SCAN",         sec:["scan"]},
  dct:    {name:"BLOCK",        sec:["dct"]},
  tdisp:  {name:"TIME",         sec:["tdisp"]},
};
let dragStage = null;
const isTouch = window.matchMedia("(hover:none) and (pointer:coarse)").matches;
function moveStage(id, dir){
  const i = chainOrder.indexOf(id);
  const j = i + dir;
  if(i<0 || j<0 || j>=chainOrder.length) return;
  const arr = chainOrder.slice();
  arr.splice(j, 0, arr.splice(i,1)[0]);
  chainOrder = arr;
  renderChain();
}
function renderChain(){
  const host = document.getElementById("chainStages");
  if(!host) return;
  host.innerHTML = "";
  chainOrder.forEach((id, i)=>{
    if(i>0){ const a = document.createElement("span"); a.className="arrow"; a.textContent="\u25b8"; host.appendChild(a); }
    const el = document.createElement("div");
    el.className = "stagepill" + (stageEnabled[id] ? "" : " off");
    el.draggable = true;
    el.dataset.stage = id;
    el.innerHTML = "<span class='grip'>\u2059</span><span class='dot'></span>" + STAGE_INFO[id].name;
    el.title = isTouch ? "Tap to bypass \u00b7 use the arrows to reorder" : "Drag to reorder \u00b7 click to bypass this stage";
    el.onclick = ()=>{ stageEnabled[id] = !stageEnabled[id]; renderChain(); refreshBypassBtns();
      toast(STAGE_INFO[id].name + (stageEnabled[id] ? " back in the chain" : " bypassed")); };
    if(isTouch){
      /* HTML5 drag doesn't exist on touch — give each pill move arrows */
      const mk = (txt, dir, disabled)=>{
        const b = document.createElement("span");
        b.textContent = txt;
        b.style.cssText = "padding:0 6px; color:"+(disabled?"#33333d":"var(--cyan)")+"; font-size:12px;";
        if(!disabled) b.onclick = e=>{ e.stopPropagation(); moveStage(id, dir); };
        return b;
      };
      el.insertBefore(mk("\u25c2", -1, i===0), el.firstChild);
      el.appendChild(mk("\u25b8", 1, i===chainOrder.length-1));
    }
    el.addEventListener("dragstart", e=>{
      dragStage = id; el.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try{ e.dataTransfer.setData("text/plain", id); }catch(err){}
    });
    el.addEventListener("dragend", ()=>{
      dragStage = null; el.classList.remove("dragging");
      document.querySelectorAll(".stagepill").forEach(p=>p.classList.remove("dragover"));
    });
    el.addEventListener("dragover", e=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; el.classList.add("dragover"); });
    el.addEventListener("dragleave", ()=>el.classList.remove("dragover"));
    el.addEventListener("drop", e=>{
      e.preventDefault(); e.stopPropagation();
      el.classList.remove("dragover");
      const from = dragStage || e.dataTransfer.getData("text/plain");
      if(!from || from===id) return;
      const arr = chainOrder.filter(x=>x!==from);
      arr.splice(arr.indexOf(id), 0, from);
      chainOrder = arr;
      renderChain();
    });
    host.appendChild(el);
  });
}
/* mark panel sections whose stage is live */
function refreshStageLeds(){
  for(const st in STAGE_INFO){
    for(const sid of STAGE_INFO[st].sec){
      const el = secEls[sid];
      if(el) el.classList.toggle("active", !!stageEnabled[st]);
    }
  }
}

/* ---- section reset ---- */
/* "How do I clear everything I have done to this channel without losing the
   clip I loaded" had no answer: there was a per-section RESET and a global
   INIT and nothing between them. The pattern synth is deliberately exempt,
   because on a synth channel that patch is the picture, not an effect. */
function resetChannelFX(){
  pushHistory();
  const targets = linkChans ? CHANNELS : [activeChan];
  for(const p of CLIST){
    if(p.sec === "gen") continue;
    for(const ch of targets){ chanBase[ch][p.id] = p.def; morphOverride.add(ch+":"+p.id); }
  }
  /* the per-channel mode switches are part of "what I have done to it" */
  fbTrailMode=false; rescanMode=false;
  fbWrap=0; fbMirror=0; fbBlend=0; fbNL=0; fbInvert=false; fbFlip=0; fbTap=0; fbNoServo=false;
  fieldSrc=0; flowField=0; flowEdge=0;
  scanRevH=false; scanRevV=false; syncLatch=false;
  keyChroma=false; showKeyMatte=false;
  for(const ch of targets){
    if(window.__setTransport) window.__setTransport("play", ch);
    stageEnabled && Object.keys(stageEnabled).forEach(k=>{ stageEnabled[k] = true; });
  }
  /* and so is anything patched into it */
  routes = routes.filter(r=>targets.indexOf(r.ch||"A") < 0);
  refreshUI(); renderRoutes(); refreshToggles(); refreshBypassBtns(); renderChain();
  toast("Reset the effects on channel " + targets.join("+") + " — source untouched");
}
function resetSection(id){
  for(const p of PLIST) if(p.sec===id){
    if(p.master){ mBase[p.id] = p.def; morphOverride.add("M:"+p.id); }
    else if(linkChans){ for(const ch of CHANNELS){ chanBase[ch][p.id]=p.def; morphOverride.add(ch+":"+p.id); } }
    else { chanBase[activeChan][p.id] = p.def; morphOverride.add(activeChan+":"+p.id); }
  }
  if(id==="feedback"){ fbTrailMode=false; rescanMode=false; fbWrap=0; fbMirror=0; fbBlend=0; fbNL=0; fbInvert=false; fbFlip=0; }
  if(id==="lab"){ fieldSrc=0; }
  if(id==="flow"){ flowField=0; flowEdge=0; }
  if(id==="gen"){ genMode[activeChan] = {shape:0, wave:0, col:1}; }
  if(id==="vhs" && window.__setTransport){ window.__setTransport("play"); if(tapeBtnRefs[0]) for(const k in tapeBtnRefs[0]) tapeBtnRefs[0][k].classList.toggle("on", k==="play"); }
  if(id==="crt"){ outModel=0; }
  if(id==="mixer"){ mixMode=0; wipeInv=false; const sm=document.getElementById("selMixMode"); if(sm) sm.value=0; }
  if(id==="frame"){ edgeMode=0; }
  if(id==="keyer"){ keyChroma=false; showKeyMatte=false; }
  refreshUI(); refreshToggles();
}

/* ---- section toggle rows ---- */
const toggleRefs = {};
function mkToggle(parent, id, labelFn, onClick, tip, options){
  const b = document.createElement("button");
  b.textContent = labelFn();
  /* these cycle through a set you could not see. Now the set is in the tip. */
  if(tip) attachTip(b, labelFn().split(":")[0].trim(), tip,
    options && options.length ? "Cycles through: " + options.join(" \u00b7 ") : "Click to cycle");
  b.onclick = ()=>{ onClick(); b.textContent = labelFn(); };
  parent.appendChild(b);
  toggleRefs[id] = {btn:b, labelFn};
  return b;
}
function refreshBusUI(){
  for(const key of ["b1","b2"]) for(const side of [0,1]){
    const el = document.getElementById("busSrc"+key+side);
    if(el) el.value = busSrc[key][side];
  }
}
function refreshToggles(){
  /* the nine mixer selects are state, not just widgets - nothing was putting
     them back in step, so after a preset or an INIT they described a mixer
     that was not there */
  const setSel = (id, v)=>{ const e = document.getElementById(id); if(e) e.value = String(v); };
  setSel("selMixMode", mixMode);   setSel("selMixMode2", mixMode2);  setSel("selMixModeM", mixModeM);
  setSel("selMixBlendb1", mixBlend); setSel("selMixBlendb2", mixBlend2); setSel("selMixBlendbM", mixBlendM);
  setSel("selMixKeyb1", mixKey);     setSel("selMixKeyb2", mixKey2);     setSel("selMixKeybM", mixKeyM);
  for(const k in stripInvBtns){
    const r = stripInvBtns[k];
    /* a wipe is the only transition with a direction to reverse */
    const isWipe = r.mode() >= 1 && r.mode() <= 12;
    r.btn.disabled = !isWipe;
    r.btn.classList.toggle("dim", !isWipe);
    r.btn.classList.toggle("on", isWipe && r.get());
  }
  for(const k in toggleRefs) toggleRefs[k].btn.textContent = toggleRefs[k].labelFn();
  const fm = document.getElementById("fbModeBtn");
  if(fm) fm.textContent = "MODE: "+(fbTrailMode?"TRAIL":"MIX");
  if(tapeBtnRefs[0] && window.__transportOf){
    const m = window.__transportOf(activeChan);
    for(const k in tapeBtnRefs[0]) tapeBtnRefs[0][k].classList.toggle("on", k===m);
  }
}
const tapeBtnRefs = [];
/* three independent choices, as on a real mixer */
const MIXMODES = ["MIX / DISSOLVE","WIPE H","WIPE V","DIAGONAL","BOX","CIRCLE","SPLIT H","SPLIT V",
  "BLINDS V","BLINDS H","CLOCK","DIAG BARS","BLOCKS",
  "SLIDE \u2192","SLIDE \u2190","SLIDE \u2191","SLIDE \u2193",
  "STRETCH \u2192","STRETCH \u2190","STRETCH \u2191","STRETCH \u2193"];
/* The first six keep the index they have always had, so patches saved before
   the list grew still load with the mix type they were saved with. */
const MIXBLENDS = ["DISSOLVE","ADDITIVE","NON-ADD","DIFFERENCE","MULTIPLY","SCREEN",
  "DARKEN","EXCLUSION","SUBTRACT","OVERLAY","HARD LIGHT","SOFT LIGHT","VIVID LIGHT","PIN LIGHT",
  "COLOUR DODGE","COLOUR BURN","DIVIDE","WRAP ADD","XOR BITS","AND BITS",
  "HUE","SATURATION","COLOUR","LUMINOSITY"];
const MIXKEYS = ["KEY OFF","LUMA WHITE","LUMA BLACK","CHROMA","PICTURE IN PICTURE"];

/* ---- PERFORM dock: snapshot bank + performance recorder ---- */
function buildPerformDock(){
  const host = document.getElementById("pfmain");
  if(!host) return;
  host.innerHTML = "";

  const colA = document.createElement("div"); colA.className = "pfcol";
  const hA = document.createElement("h4"); hA.textContent = "SNAPSHOTS"; colA.appendChild(hA);
  const grid = document.createElement("div"); grid.className = "snapgrid";
  for(let i=0;i<SNAP_N;i++){
    const b = document.createElement("button");
    b.id = "snap"+i; b.className = "snapbtn"; b.textContent = (i+1);
    attachTip(b, "SNAPSHOT "+(i+1),
      "Click to recall this slot, gliding every control from where it is now to where the slot says. Arm STORE first to save into it instead.",
      "Keyboard: shift+"+(i+1)+". A filled slot is outlined.");
    b.onclick = ()=>window.__snapHit(i);
    grid.appendChild(b);
  }
  colA.appendChild(grid);
  const rowA = document.createElement("div"); rowA.className = "trow";
  const sb = document.createElement("button"); sb.id = "snapStoreBtn"; sb.textContent = "STORE";
  attachTip(sb, "STORE", "Arm this, then click a slot to write the whole rig into it. It disarms itself afterwards.");
  sb.onclick = ()=>{ snapStoreArm = !snapStoreArm; refreshSnapUI(); };
  const cl = document.createElement("button"); cl.textContent = "CLEAR ALL";
  attachTip(cl, "CLEAR ALL", "Empties all eight slots.");
  cl.onclick = ()=>{ for(let i=0;i<SNAP_N;i++) snapSlots[i]=null; refreshSnapUI(); toast("Snapshots cleared"); };
  rowA.appendChild(sb); rowA.appendChild(cl);
  colA.appendChild(rowA);

  const colG = document.createElement("div"); colG.className = "pfcol";
  const hG = document.createElement("h4"); hG.textContent = "GLIDE"; colG.appendChild(hG);
  const gv = document.createElement("div");
  gv.style.cssText = "color:var(--cyan); font-size:15px; letter-spacing:1px; padding:2px 0 4px;";
  gv.textContent = snapGlide.toFixed(2)+"s";
  const gs = document.createElement("input");
  gs.type = "range"; gs.min = 0; gs.max = 12; gs.step = 0.05; gs.value = snapGlide;
  gs.style.width = "170px";
  attachTip(gs, "GLIDE", "How long a snapshot recall takes to travel. At zero it is a hard cut, like a preset; wound up it becomes a slow transformation of the whole rig, and is the most musical control in here.");
  gs.addEventListener("input", ()=>{ snapGlide = parseFloat(gs.value); gv.textContent = snapGlide.toFixed(2)+"s"; });
  colG.appendChild(gv); colG.appendChild(gs);

  const colB = document.createElement("div"); colB.className = "pfcol";
  const hB = document.createElement("h4"); hB.textContent = "PERFORMANCE RECORDER"; colB.appendChild(hB);
  const rowB = document.createElement("div"); rowB.className = "trow"; rowB.style.minWidth = "300px";
  const rb = document.createElement("button"); rb.id = "perfRecBtn"; rb.textContent = "● REC";
  attachTip(rb, "RECORD PERFORMANCE",
    "Writes down every control you move, twenty-four times a second, storing only what changed. Not video — gestures.",
    "Because it is gestures, you can play the take back against completely different footage.");
  rb.onclick = ()=>{ if(perfRec.mode==="rec") perfStop(); else perfStart(); };
  const pb = document.createElement("button"); pb.id = "perfPlayBtn"; pb.textContent = "▶ PLAY";
  attachTip(pb, "PLAY TAKE", "Replays the recorded take, moving the controls as you moved them. Touching anything while it plays fights the playback, which is a perfectly good way to perform over your own take.");
  pb.onclick = ()=>{ if(perfRec.mode==="play") perfStop(); else perfPlay(); };
  const lb = document.createElement("button"); lb.id = "perfLoopBtn"; lb.textContent = "LOOP";
  attachTip(lb, "LOOP TAKE", "Runs the take round and round instead of stopping at the end.");
  lb.onclick = ()=>{ perfRec.loop = !perfRec.loop; refreshPerfUI(); };
  const cb = document.createElement("button"); cb.textContent = "CLR";
  attachTip(cb, "CLEAR TAKE", "Throws the recorded take away.");
  cb.onclick = ()=>{ perfClear(); toast("Take cleared"); };
  rowB.appendChild(rb); rowB.appendChild(pb); rowB.appendChild(lb); rowB.appendChild(cb);
  colB.appendChild(rowB);
  const stt = document.createElement("div");
  stt.id = "perfState";
  stt.style.cssText = "color:var(--cyan); font-size:11px; letter-spacing:2px; padding:5px 0 0;";
  stt.textContent = "NO TAKE";
  colB.appendChild(stt);

  const note = document.createElement("div");
  note.className = "pfnote";
  note.textContent = "Snapshots hold the whole rig — all four channels, every bus, every mode — and GLIDE decides how long it takes to get there. The recorder captures the moves rather than the picture, so a take built slowly over an hour can be replayed in real time, against other footage, and recorded out.";

  host.appendChild(colA); host.appendChild(colG); host.appendChild(colB); host.appendChild(note);
  refreshSnapUI(); refreshPerfUI();
}

/* anything that reads better underneath the section's own controls */
function sectionExtrasAfter(id, d){
  if(id==="morph"){
    const tr2 = document.createElement("div"); tr2.className="trow";
    const sa = document.createElement("button"); sa.textContent="STORE A"; sa.id="morphBtnA";
    sa.title = "Snapshot every slider as morph point A";
    sa.onclick = ()=>{ morphA = snapshotAll(); morphOverride.clear(); sa.classList.add("on"); toast("Morph point A stored (both channels)"); };
    const sb = document.createElement("button"); sb.textContent="STORE B"; sb.id="morphBtnB";
    sb.title = "Snapshot every slider as morph point B";
    sb.onclick = ()=>{ morphB = snapshotAll(); morphOverride.clear(); sb.classList.add("on"); toast("Morph point B stored \u2014 MORPH now blends the whole rig"); };
    const sc = document.createElement("button"); sc.textContent="CLR";
    sc.title = "Clear morph points";
    sc.onclick = ()=>{ morphA=morphB=null; morphOverride.clear(); sa.classList.remove("on"); sb.classList.remove("on"); };
    tr2.appendChild(sa); tr2.appendChild(sb); tr2.appendChild(sc);
    d.appendChild(tr2);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Snapshot two whole panel states, then MORPH blends every slider between them. Moving any slider takes that control back.";
    d.appendChild(note);
  }
}
function sectionExtras(id, d){
  if(id==="mixer" || id==="mixer2" || id==="mixerM"){
    const which = id==="mixer" ? 1 : (id==="mixer2" ? 2 : 3);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent =
      which===1 ? "The detail behind bus 1's three mixer stages. SOFT feathers the wipe edge, DETAIL sets blind and bar counts, CTR X/Y moves the wipe origin. KEY THRESH, SOFT, INVERT and HUE shape whichever key is selected, and the PIP controls place the subscreen. The transition, mix type and key selectors are on the strip under the picture."
    : which===2 ? "The same for bus 2. It only renders while the master fader is above zero, so leaving it alone costs nothing."
    : "The same again for the master crossfade between the two buses.";
    d.appendChild(note);
  }
  if(id==="scan"){
    const tr = document.createElement("div"); tr.className="trow";
    mkToggle(tr, "scanRevH", ()=>"SWEEP: "+(scanRevH?"REVERSED":"NORMAL"), ()=>{ scanRevH=!scanRevH; },
      "Reverses the horizontal sweep. Not a mirror of the picture: the beam genuinely travels the other way, so it composes with everything that depends on scan order - the wobble phase, the velocity brightness, the sync model upstream.");
    mkToggle(tr, "scanRevV", ()=>"FIELD: "+(scanRevV?"REVERSED":"NORMAL"), ()=>{ scanRevV=!scanRevV; },
      "Reverses the field, so the raster is written from the bottom up.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "The picture is drawn as a stack of glowing lines whose vertical position is pushed by brightness, then photographed. Where the lines bunch you get a bright ridge, where they splay you get a gap - that density, not the displacement, is what the look actually is. SCAN DISPLACE is the only control that has to be above zero; TILT turns a deflection into an apparent surface; VELOCITY GAIN brightens the beam where it sweeps slower. LINES and DETAIL cost real geometry, so they are the two to pull back if it gets heavy.";
    d.appendChild(note);
  }
  if(id==="sync"){
    const tr = document.createElement("div"); tr.className="trow";
    mkToggle(tr, "syncLatch", ()=>"LOCK: "+(syncLatch?"LATCHED OFF":"RECOVERS"), ()=>{ syncLatch=!syncLatch; },
      "Normally a loss of lock shears the picture and then the loop re-acquires over the next few hundred milliseconds, because that is what a working circuit does. LATCHED means it never comes back: every shear stays where it happened and the next one lands on top of it. Turn it off again and the whole accumulated mess unwinds at once.");
    d.appendChild(tr);
  }
  if(id==="feedback"){
    const tr = document.createElement("div"); tr.className="trow";
    const bm = document.createElement("button"); bm.textContent="MODE: MIX"; bm.id="fbModeBtn";
    bm.onclick = ()=>{ fbTrailMode=!fbTrailMode; bm.textContent = "MODE: "+(fbTrailMode?"TRAIL":"MIX"); };
    tr.appendChild(bm);
    mkToggle(tr, "rescan", ()=>"RESCAN: "+(rescanMode?"FULL":"CLEAN"), ()=>{ rescanMode=!rescanMode; }, "CLEAN taps the loop before the display stage. FULL taps it after, so scanlines, mask, curvature and bloom all go back round \u2014 the software equivalent of pointing a camera at the monitor it is feeding.");
    mkToggle(tr, "fbServo", ()=>"SERVO: "+(fbNoServo?"DEFEATED":"ON"), ()=>{ fbNoServo=!fbNoServo; },
      "The auto-level servo keeps the loop off the black and white attractors, which is why AUTO LEVEL exists and why the interesting settings stay findable. Defeating it removes the safety net: the loop is then free to run away to white or collapse to black and stay there, which is what a feedback rig with no operator actually does.");
    d.appendChild(tr);
    const tr2 = document.createElement("div"); tr2.className="trow";
    const WRAPS=["CLAMP","REPEAT","MIRROR"], MIRS=["NO MIRROR","MIRROR H","MIRROR V","QUAD"],
          BLENDS=["MIX","ADD","SCREEN","MAX","MIN","DIFF"], NLS=["CLAMP","SOFT","WRAP","FOLD"],
          FLIPS=["NONE","FLIP H","FLIP V","FLIP BOTH"];
    mkToggle(tr2, "fbWrap", ()=>"EDGE: "+WRAPS[fbWrap], ()=>{ fbWrap=(fbWrap+1)%3; }, "What the loop does with picture that lands outside the frame. CLAMP smears the edge inward and builds tunnels; REPEAT tiles it into lattices; MIRROR reflects it into mandalas. This one choice decides the whole family of shapes the loop can make.");
    mkToggle(tr2, "fbMirror", ()=>MIRS[fbMirror], ()=>{ fbMirror=(fbMirror+1)%4; }, "Mirrors the fed-back image about the centre before it re-enters, forcing symmetry into the loop. QUAD mirrors both axes.");
    mkToggle(tr2, "fbFlip", ()=>"SIGN: "+FLIPS[fbFlip], ()=>{ fbFlip=(fbFlip+1)%4; }, "Flips the sign of one or both axes of the loop transform. A flip is a reflection, not a rotation, so it cannot be reached with ROTATE at any angle: it makes the loop alternate hand each pass. With a rotation near a whole fraction of a turn this is what separates a steady spiral from a pinwheel, and it is the switch that turns a locked pattern into a drifting one.");
    d.appendChild(tr2);
    const tr3 = document.createElement("div"); tr3.className="trow";
    mkToggle(tr3, "fbBlend", ()=>"INJECT: "+BLENDS[fbBlend], ()=>{ fbBlend=(fbBlend+1)%6; }, "How the live picture is injected into the loop each pass. MIX crossfades; ADD and SCREEN build brightness; MAX keeps the brighter of the two, which is what gives long non-fading trails; DIFF subtracts, and is where the harsh psychedelic looks come from.");
    mkToggle(tr3, "fbNL", ()=>"CURVE: "+NLS[fbNL], ()=>{ fbNL=(fbNL+1)%4; }, "The non-linearity applied every pass, and the most important structural choice after EDGE. CLAMP simply limits; SOFT saturates gently; WRAP folds values that leave the range back round to the other end, which makes hard banded structure; FOLD reflects them, which makes smoother interference.");
    mkToggle(tr3, "fbInvert", ()=>"INVERT: "+(fbInvert?"ON":"OFF"), ()=>{ fbInvert=!fbInvert; }, "Inverts the picture on every pass, so the loop alternates polarity and structures strobe.");
    d.appendChild(tr3);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "EDGE decides the family: CLAMP = tunnels, REPEAT = lattices, MIRROR = mandalas. CURVE is where the structure lives. LOOP NOISE keeps patterns regenerating — at zero the loop dies into a flat attractor.";
    d.appendChild(note);
  }
  if(id==="lab"){
    const tr = document.createElement("div"); tr.className="trow";
    const FIELDS=["H RAMP","V RAMP","RADIAL","H SINE","NOISE"];
    mkToggle(tr, "fieldSrc", ()=>"FIELD: "+FIELDS[fieldSrc], ()=>{ fieldSrc=(fieldSrc+1)%5; }, "The shape of the modulation field: a horizontal or vertical ramp, radial from the centre, a sine, or noise.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "FIELD MOD is video-rate modulation: the field varies across the frame, so FIELD>HUE and FIELD>WARP modulate per-pixel rather than per-frame.";
    d.appendChild(note);
  }
  if(id==="field"){
    const tr0 = document.createElement("div"); tr0.className="trow";
    const IM = ["WEAVE","BOB","BLEND"];
    mkToggle(tr0, "ilMode", ()=>"FIELDS: "+IM[ilMode], ()=>{ ilMode=(ilMode+1)%3; },
      "How the two fields are recombined. WEAVE interleaves them, which is what an interlaced signal actually is, so anything that moved between them serrates. BOB shows only the current field and fills the gaps from its neighbours, so the picture jitters up and down by half a line at field rate - the signature of a cheap deinterlacer. BLEND averages them, which removes the comb and ghosts everything that moves.", IM);
    mkToggle(tr0, "ilOrder", ()=>"FIELD ORDER: "+(ilOrder?"SWAPPED":"NORMAL"), ()=>{ ilOrder=!ilOrder; },
      "Swaps which field is which. On a real signal this is a fault, and it produces the stuttering backward-and-forward motion that is instantly recognisable and almost impossible to fake convincingly any other way.");
    d.appendChild(tr0);
    const fnote = document.createElement("div");
    fnote.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    fnote.textContent = "Interlace is applied to the master output, after the mixer and before the display, because that is where it happened.";
    d.appendChild(fnote);
  }
  if(id==="codec"){
    const trc = document.createElement("div"); trc.className="trow";
    mkToggle(trc, "moshRecycle", ()=>"FEED: "+(moshRecycle?"RECYCLED":"CLEAN"),
      ()=>{ moshRecycle=!moshRecycle; },
      "CLEAN encodes the clean picture every frame, so the damage never compounds and the moshed image stays legible. RECYCLED encodes what came out of the decoder instead, so each pass is built on the last one's wreckage and the picture walks away and does not come back.");
    const st = document.createElement("span");
    st.id = "moshStat"; st.style.cssText = "color:var(--dim); font-size:8.5px; padding:0 4px; align-self:center;";
    trc.appendChild(st);
    d.appendChild(trc);
    const cnote = document.createElement("div");
    cnote.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    cnote.textContent = "A real encode/decode round trip: CODEC MOSH above zero starts it. It costs a frame or two of delay and some CPU, and the decoder will occasionally give up and re-acquire, which looks like the picture snapping back.";
    d.appendChild(cnote);
  }
  if(id==="crt"){
    const tr = document.createElement("div"); tr.className="trow";
    const MODELS=["FLAT / RAW","APERTURE GRILLE","SLOT MASK","SHADOW MASK","LCD STRIPE","MONO MONITOR","GREEN SCREEN"];
    mkToggle(tr, "outModel", ()=>"DISPLAY: "+MODELS[outModel], ()=>{ outModel=(outModel+1)%7; }, "Which display the output is drawn on. Each model has its own phosphor mask geometry, so the same picture reads as an aperture-grille tube, a shadow mask, an LCD panel or a mono monitor.", MODELS);
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "The master display stage: pick a tube, set the beam profile, then the output transform (gamma / levels / warmth) and persistence.";
    d.appendChild(note);
  }
  if(id==="overlay"){
    const tr = document.createElement("div"); tr.className="trow";
    const TM = ["REC","PLAY","PAUSE","STOP","F FWD","REWIND"];
    const DM = ["NO DATE","DATE","DATE + TIME"];
    mkToggle(tr, "osdMode", ()=>"DECK: "+TM[osdMode], ()=>{ osdMode=(osdMode+1)%6; osdLast=""; },
      "Which transport the burnt-in display is showing. REC blinks the way it did, and the counter only runs on the transports that would actually move the tape - forward on PLAY and REC, seven times as fast on the shuttles, and backwards on rewind.", TM);
    mkToggle(tr, "osdDate", ()=>DM[osdDate], ()=>{ osdDate=(osdDate+1)%3; osdLast=""; },
      "The date stamp in the corner. Today's date, taken from this machine.", DM);
    mkToggle(tr, "osdZero", ()=>"COUNTER 0", ()=>{ osdCounter=0; osdLast=""; },
      "Resets the tape counter to zero, the way the button on the front of the deck did.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Everything between the picture and the eye. The lens comes first (distortion, fringing, the anamorphic streak), then the glass in front of the screen (smears, reflections, dust, leaks), then the panel itself, then the deck's own display burnt in over the top. DECK DISPLAY has to be above zero for the readout to appear.";
    d.appendChild(note);
  }
  if(id==="keyer"){
    const tr = document.createElement("div"); tr.className="trow";
    mkToggle(tr, "keyMode", ()=>"KEY: "+(keyChroma?"CHROMA":"LUMA"), ()=>{ keyChroma=!keyChroma; }, "Whether the key selects by brightness or by hue.");
    mkToggle(tr, "showKey", ()=>"VIEW MATTE: "+(showKeyMatte?"ON":"OFF"), ()=>{ showKeyMatte=!showKeyMatte; }, "Shows the key as a black-and-white matte, so you can see exactly what is selected before you apply anything to it.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Selects part of the image by brightness (or hue). Turn on VIEW MATTE: white = selected. KEY>FX glitches only the selection; KEY>FB grows feedback only there.";
    d.appendChild(note);
  }
  if(id==="frame"){
    const tr = document.createElement("div"); tr.className="trow";
    const EDGES = ["BLACK","TILE","MIRROR"];
    mkToggle(tr, "edgeMode", ()=>"EDGE: "+EDGES[edgeMode], ()=>{ edgeMode=(edgeMode+1)%3; }, "What fills the frame when the picture is zoomed or moved away from the edges: black, a tiled repeat, or a mirrored reflection.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Frames this channel's picture inside the raster. Each channel has its own framing.";
    d.appendChild(note);
  }
  if(id==="vhs"){
    const tr = document.createElement("div"); tr.className="trow";
    const MODES = [["rew","\u25c0\u25c0"],["still","\u23f8"],["play","\u25b6"],["ff","\u25b6\u25b6"],["jogr","JOG \u25c0"],["jogf","JOG \u25b6"]];
    const btns = {};
    for(const [m,lab] of MODES){
      const b = document.createElement("button");
      b.textContent = lab; b.style.flex = "1"; b.style.minWidth = "0";
      const TPT = {
        rew:["REWIND","Scrubs this channel's source backwards, with shuttle noise bands marching through the picture."],
        still:["STILL","Freezes the source and parks the noise bar a paused deck lays across a held field."],
        play:["PLAY","Normal playback at the speed set in the transport bar above the picture."],
        ff:["SHUTTLE","Runs the source forward at four times speed, with shuttle bands."],
        jogr:["JOG BACK","Creeps the source backwards a quarter speed, frame by frame."],
        jogf:["JOG FORWARD","Creeps the source forwards a quarter speed."]
      };
      attachTip(b, TPT[m][0], TPT[m][1], "Applies to the channel you are editing. Works on generated patterns and text as well as files.");
      b.onclick = ()=>{
        if(window.__setTransport) window.__setTransport(m);
        for(const k in btns) btns[k].classList.toggle("on", k===m);
      };
      btns[m] = b; tr.appendChild(b);
    }
    btns.play.classList.add("on");
    d.appendChild(tr);
    tapeBtnRefs[0] = btns;
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "A whole deck, per channel. Transport drives this channel's source: STILL parks a noise bar across a held field, shuttle and jog scrub with head-crossing bands. TAPE SPEED runs SP to EP \u2014 the slower the tape, the less bandwidth survives. GENERATIONS compounds GEN LOSS as if the tape had been dubbed that many times. TRACK PHASE places the mistracking band, SERVO HUNT makes the auto-tracking circuit search for it.";
    d.appendChild(note);
  }
  if(id==="gen"){
    const tr = document.createElement("div"); tr.className="trow";
    mkToggle(tr, "genShape", ()=>GEN_SHAPES[genMode[activeChan].shape],
      ()=>{ const M=genMode[activeChan]; M.shape=(M.shape+1)%GEN_SHAPES.length; },
      "The geometry the oscillator is drawn through. SCAN is two ramps crossing, which is the classic video-synth starting point; the others bend the coordinate system into rings, spirals, tunnels, cells and polygons before the oscillator ever sees it.");
    d.appendChild(tr);
    const tr2 = document.createElement("div"); tr2.className="trow";
    mkToggle(tr2, "genWave", ()=>GEN_WAVES[genMode[activeChan].wave],
      ()=>{ const M=genMode[activeChan]; M.wave=(M.wave+1)%GEN_WAVES.length; },
      "The oscillator waveform. SINE gives soft gradients, TRIANGLE gives clean ramps up and down, SAW gives hard sawtooth edges, SQUARE and PULSE give solid shapes, and S&H gives stepped random values.");
    mkToggle(tr2, "genCol", ()=>GEN_COLS[genMode[activeChan].col],
      ()=>{ const M=genMode[activeChan]; M.col=(M.col+1)%GEN_COLS.length; },
      "How the pattern is coloured. MONO leaves it as brightness; RGB PHASE runs the same oscillator into the three channels at different phases, which is how analogue video synths make colour; HSV SWEEP maps the pattern to hue; DUOTONE mixes two inks; BANDS quantises into flat colour steps.");
    d.appendChild(tr2);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Set this channel to SYNTH under SOURCE and the picture is computed rather than filmed. Signal flow: coordinates \u2192 shape \u2192 oscillator \u2192 cross modulation \u2192 wavefolder \u2192 comparator \u2192 colouriser. Every control here is a modulation destination, so patch an LFO into FREQ X or CROSS MOD and it becomes a moving source.";
    d.appendChild(note);
  }
  if(id==="time"){
    const tr = document.createElement("div"); tr.className="trow";
    const st = document.createElement("button"); st.id="btnStill"; st.textContent="STILL";
    attachTip(st, "STILL", "Freezes this channel's source outright. The effects keep running on the held frame, so you can wreck a still.",
      "STROBE below does the same thing rhythmically \u2014 it holds each frame for a while and then lets the next one through.");
    st.onclick = ()=>{ window.__toggleStill(); st.classList.toggle("on", window.__stillOf()); };
    tr.appendChild(st);
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "A bent frame store. ECHO blends in a frame from the past and DELAY FRM says how far back; STUTTER freezes at random; STROBE freezes on a regular beat; SHAKE knocks the picture off its position.";
    d.appendChild(note);
  }
  if(id==="glitch"){
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Digital corruption: pixel sorting, macroblock databending, halftone dropout, channel-driven warps.";
    d.appendChild(note);
  }
  if(id==="flow"){
    const tr = document.createElement("div"); tr.className="trow";
    const FF = ["MOTION","CONTOUR","CURL","RADIAL","SPIRAL","CHROMA","WEAVE"];
    const FE = ["CLAMP","REPEAT","MIRROR"];
    mkToggle(tr, "flowField", ()=>"FIELD: "+FF[flowField], ()=>{ flowField=(flowField+1)%7; }, "The vector field this stage advects along. MOTION is real optical flow estimated from the picture frame to frame \u2014 that is the one that makes proper datamosh. CONTOUR runs along brightness edges, CURL churns, RADIAL and SPIRAL push out and around, CHROMA steers by colour, WEAVE crosshatches.");
    mkToggle(tr, "flowEdge", ()=>"EDGE: "+FE[flowEdge], ()=>{ flowEdge=(flowEdge+1)%3; }, "What the flow stage does with picture dragged off the edge of the frame: clamp it, wrap it round, or mirror it.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Temporal smear with its own frame store. P-FRAME PUSH advects the held frame along the FIELD \u2014 on MOTION that is real optical flow, which is what makes proper datamosh: the picture stops updating but the movement keeps dragging it. MOSH GATE picks whether only moving (+) or only still (\u2212) parts hold. CURL rotates the whole field, so drift becomes orbit.";
    d.appendChild(note);
  }
}

/* ---- audio react section: band ranges, gains, response, live meters ---- */
const audioUIRefs = [];
const meterEls = {};
function hzFmt(v){ return v>=1000 ? (v/1000).toFixed(1)+"k" : Math.round(v); }
function buildAudioSection(){
  const dock = document.getElementById("audiodock");
  const d = mkSection("audio", "cyan", "AUDIO REACT \u00b7 INPUT", dock);
  /* the input picker belongs next to the meters, not three menus away */
  {
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = "LISTEN TO";
    const sel = document.createElement("select"); sel.id = "selAudioSrc"; sel.style.flex = "1";
    attachTip(sel, "AUDIO SOURCE",
      "Where the audio-reactive modulators listen. VIDEO taps the soundtrack of the clip loaded into channel A. INPUT opens a microphone, an audio interface or any capture device. FILE plays an audio file you load here, which is how you build a piece against the track it will be shown with.");
    for(const [v,t] of [["off","OFF"],["source","VIDEO SOUNDTRACK"],["mic","LIVE INPUT"],["file","AUDIO FILE"]]){
      const o = document.createElement("option"); o.value=v; o.textContent=t; sel.appendChild(o);
    }
    sel.value = audioMode;
    sel.onchange = ()=>{ const m = document.getElementById("selAudio"); if(m) m.value = sel.value; setAudioMode(sel.value); };
    row.appendChild(lab); row.appendChild(sel);
    d.appendChild(row);
  }
  /* audio file: load, transport, position */
  {
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = "FILE";
    const ld = document.createElement("button"); ld.textContent = "LOAD";
    attachTip(ld, "LOAD AUDIO FILE", "Any audio file your browser can decode: wav, mp3, m4a, flac, ogg. It stays on your machine and streams from disk like the video does.");
    ld.onclick = ()=>{ const fi = document.getElementById("audioFileIn"); if(fi) fi.click(); };
    const pp = document.createElement("button"); pp.textContent = "PLAY";
    pp.onclick = async ()=>{
      const el = ensureAudioFileEl();
      if(!el.src){ const fi = document.getElementById("audioFileIn"); if(fi) fi.click(); return; }
      ensureAudioCtx(); wireAudioFile();
      if(el.paused){ try{ await el.play(); }catch(e){} } else el.pause();
      refreshAudioFileUI();
    };
    /* PLAY is a pause toggle, which leaves the track wherever you stopped it.
       Stopping and going back to the top is a different thing and there was no
       way to ask for it: a piece built against a track wants to start from the
       top of the track, not from wherever the last take ended. */
    const st = document.createElement("button"); st.textContent = "STOP";
    attachTip(st, "STOP", "Stops the track and returns it to the beginning, so the next PLAY starts from the top. PAUSE leaves it where it is.");
    st.onclick = ()=>{
      const el = ensureAudioFileEl();
      el.pause();
      try{ el.currentTime = 0; }catch(e){}
      /* the meters are left to fall on their own. Zeroing them here looked
         tidier and did nothing: updateAudio reads the analyser again on the
         very next frame and writes over it, so all the line achieved was
         appearing to do something. */
      refreshAudioFileUI();
    };
    const lp = document.createElement("button"); lp.textContent = "LOOP"; lp.classList.add("on");
    lp.onclick = ()=>{ const el = ensureAudioFileEl(); el.loop = !el.loop; lp.classList.toggle("on", el.loop); };
    row.appendChild(lab); row.appendChild(ld); row.appendChild(pp); row.appendChild(st); row.appendChild(lp);
    d.appendChild(row);
    const nrow = document.createElement("div"); nrow.className="prow";
    const nlab = document.createElement("label"); nlab.textContent = "POSITION";
    const sk = document.createElement("input"); sk.type="range"; sk.min=0; sk.max=1; sk.step=0.0005; sk.value=0;
    sk.style.flex = "1";
    let scrubbing = false;
    sk.addEventListener("pointerdown", ()=>{ scrubbing = true; });
    sk.addEventListener("pointerup", ()=>{ scrubbing = false; });
    sk.addEventListener("input", ()=>{
      const el = ensureAudioFileEl();
      if(el.duration) el.currentTime = parseFloat(sk.value)*el.duration;
    });
    const tc = document.createElement("span"); tc.className="val"; tc.style.width="86px"; tc.textContent="--:-- / --:--";
    nrow.appendChild(nlab); nrow.appendChild(sk); nrow.appendChild(tc);
    d.appendChild(nrow);
    const nm = document.createElement("div");
    nm.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0 6px;";
    nm.textContent = "No audio file loaded";
    d.appendChild(nm);
    const mmss = t=>{
      if(!isFinite(t)) return "--:--";
      const m2 = Math.floor(t/60), s2 = Math.floor(t%60);
      return (m2<10?"0":"")+m2+":"+(s2<10?"0":"")+s2;
    };
    refreshAudioFileUI = ()=>{
      const el = audioFileEl;
      pp.textContent = (el && !el.paused) ? "PAUSE" : "PLAY";
      pp.classList.toggle("on", !!(el && !el.paused));
      if(el) lp.classList.toggle("on", el.loop);
      nm.textContent = audioFileName ? audioFileName : "No audio file loaded";
      if(el && el.duration && !scrubbing){
        sk.value = el.currentTime/el.duration;
        tc.textContent = mmss(el.currentTime)+" / "+mmss(el.duration);
      }
    };
  }
  const sep = document.createElement("div");
  sep.style.cssText = "border-top:1px solid var(--line); margin:6px 0 8px;";
  d.appendChild(sep);
  /* the band controls get their own panel so the dock reads as columns */
  let dTarget = d;
  /* live meters */
  const mrow = document.createElement("div");
  mrow.style.cssText = "display:flex; gap:6px; padding:2px 0 8px;";
  for(const k of ["bass","mid","high"]){
    const box = document.createElement("div");
    box.style.cssText = "flex:1; height:8px; background:#22222c; border-radius:2px; overflow:hidden; position:relative;";
    const fill = document.createElement("div");
    fill.style.cssText = "height:100%; width:0%; background:linear-gradient(90deg,var(--cyan),var(--mag)); transition:width 60ms linear;";
    box.appendChild(fill); mrow.appendChild(box);
    meterEls[k] = fill;
  }
  d.appendChild(mrow);
  function slider(label, get, set, min, max, fmtFn, log){
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = label;
    const wrap = document.createElement("div"); wrap.className="sldwrap";
    const s = document.createElement("input");
    s.type="range"; s.step=0.001;
    if(log){ s.min=Math.log10(min); s.max=Math.log10(max); s.value=Math.log10(get()); }
    else { s.min=min; s.max=max; s.value=get(); }
    const val = document.createElement("input"); val.className="val";
    const upd = ()=>{
      const v = log ? Math.pow(10, parseFloat(s.value)) : parseFloat(s.value);
      set(v); setReadout(val, fmtFn(v));
    };
    s.addEventListener("input", upd); upd();
    /* the band edges are the strongest case in the whole app for typing: a
       crossover is a number you know in hertz, not a position on a log slider
       running from 20 to 16000. "1.2k" is accepted, because that is how anyone
       writing a crossover down writes it. */
    val.type="text"; val.inputMode="decimal"; val.autocomplete="off"; val.spellcheck=false;
    val.setAttribute("aria-label", label);
    val.title = "Type a value \u2014 " + fmtFn(min) + " to " + fmtFn(max);
    let held = val.value;
    const putV = v=>{
      set(Math.min(max, Math.max(min, v)));
      /* read it back: the low and high edges of a band hold each other apart,
         so what was asked for and what was taken are not always the same */
      const actual = get();
      s.value = log ? Math.log10(actual) : actual;
      val.value = fmtFn(actual);
    };
    const commitV = ()=>{
      const t = String(val.value).trim().toLowerCase();
      const mul = /k$/.test(t) ? 1000 : 1;
      const n = parseFloat(t.replace(/[^0-9.+\-eE]/g, ""));
      if(!isFinite(n)){ val.value = fmtFn(get()); return; }
      putV(n * mul);
      held = val.value;
    };
    val.addEventListener("focus", ()=>{ held = val.value; val.select(); });
    val.addEventListener("keydown", e=>{
      if(e.key === "Enter"){ commitV(); val.blur(); return; }
      if(e.key === "Escape"){ val.value = held; val.blur(); return; }
    });
    val.addEventListener("blur", commitV);
    wrap.appendChild(s);
    row.appendChild(lab); row.appendChild(wrap); row.appendChild(val);
    dTarget.appendChild(row);
    audioUIRefs.push({s, val, get, log, fmtFn,
      refresh(){ s.value = log ? Math.log10(get()) : get(); setReadout(val, fmtFn(get())); }});
  }
  dTarget = mkSection("audioband", "cyan", "AUDIO REACT \u00b7 BANDS", document.getElementById("audiodock"));
  for(const k of ["bass","mid","high"]){
    const K = k.toUpperCase();
    slider(K+" LO",  ()=>audioCfg[k].lo,  v=>{audioCfg[k].lo=Math.min(v, audioCfg[k].hi-5);},  20, 16000, hzFmt, true);
    slider(K+" HI",  ()=>audioCfg[k].hi,  v=>{audioCfg[k].hi=Math.max(v, audioCfg[k].lo+5);},  20, 16000, hzFmt, true);
    slider(K+" GAIN",()=>audioCfg[k].gain,v=>{audioCfg[k].gain=v;}, 0, 3, v=>v.toFixed(2), false);
  }
  slider("RESPONSE", ()=>audioCfg.response, v=>{audioCfg.response=v;}, 0, 1, v=>v.toFixed(2), false);
  /* input device + channel (for audio interfaces) — applies to MIC/live mode */
  {
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = "DEVICE";
    const sel = document.createElement("select"); sel.id = "selAudioDev"; sel.style.flex = "1";
    sel.title = "Audio input device (used when AUDIO = MIC). Select MIC once to grant access and reveal device names.";
    const op = document.createElement("option"); op.value=""; op.textContent="DEFAULT INPUT"; sel.appendChild(op);
    sel.onmousedown = async ()=>{
      const devs = await listAudioDevices();
      const cur = sel.value;
      sel.innerHTML = "";
      const o0 = document.createElement("option"); o0.value=""; o0.textContent="DEFAULT INPUT"; sel.appendChild(o0);
      devs.forEach((dv,i)=>{
        const o = document.createElement("option"); o.value = dv.deviceId;
        o.textContent = (dv.label || ("INPUT "+(i+1))).toUpperCase().slice(0,34);
        sel.appendChild(o);
      });
      sel.value = cur;
    };
    sel.onchange = async ()=>{
      audioDeviceId = sel.value;
      if(audioMode==="mic"){ try{ await openMic(); toast("Audio input switched"); }catch(e){ toast("Couldn't open that device", true); } }
    };
    row.appendChild(lab); row.appendChild(sel);
    d.appendChild(row);
  }
  {
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = "CHANNEL";
    const sel = document.createElement("select"); sel.id = "selAudioCh"; sel.style.flex = "1";
    sel.title = "Which input channel to analyse — pick a single channel on a multi-channel interface";
    row.appendChild(lab); row.appendChild(sel);
    d.appendChild(row);
    refreshAudioDeviceUI = ()=>{
      const nCh = (micNode && micNode.channelCount) ? micNode.channelCount : 2;
      sel.innerHTML = "";
      const o0 = document.createElement("option"); o0.value="-1"; o0.textContent="MIX (ALL)"; sel.appendChild(o0);
      for(let i=0;i<nCh;i++){ const o=document.createElement("option"); o.value=i; o.textContent="CH "+(i+1); sel.appendChild(o); }
      sel.value = String(audioChannel);
    };
    refreshAudioDeviceUI();
    sel.onchange = ()=>{ audioChannel = parseInt(sel.value); if(audioMode==="mic") wireMic(); };
  }
  /* the rack of taps, with a meter each, so a desk with ten sends into the
     interface reads as ten meters rather than one */
  {
    tapDock = mkSection("audiotaps", "cyan", "AUDIO REACT · CHANNEL TAPS",
                        document.getElementById("audiodock"));
    buildAudTapList();
  }
}
let tapDock = null;
const tapMeterEls = {};
function buildAudTapList(){
  if(!tapDock) return;
  for(const k in tapMeterEls) delete tapMeterEls[k];
  /* mkSection rebinds appendChild to the section body, so the body is what has
     to be emptied — clearing the section itself would take the header with it */
  const body = tapDock.querySelector(".secbody");
  if(body) body.innerHTML = "";
  {
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:0 0 6px;";
    note.textContent = "A tap listens to one input channel through one band, and becomes a modulation source you can patch to anything — and an envelope trigger. On an interface fed by separate sends, put the kick on input 1 and the hats on input 3 and they drive different parameters. The controls live on each tap's card on the MOD page; these are the meters. Live input reports "
      + Math.max(2, audInChannels||2) + " channel" + ((audInChannels||2)===1?"":"s") + ".";
    tapDock.appendChild(note);
  }
  {
    const row = document.createElement("div"); row.className="prow";
    const add = document.createElement("button"); add.textContent = "+ TAP";
    attachTip(add, "ADD AUDIO TAP", "Adds a listener on an input channel. It appears on the MOD page with its input, band, gain and response, and in every modulation source list.");
    add.onclick = ()=>{
      if(audioTaps.length >= AUD_MAX){ toast("That is as many taps as the interface list goes to", true); return; }
      const t = mkAudTap();
      audioTaps.push(t);
      rebuildMODSRC(); wireTaps(); buildAudTapList();
      if(typeof buildModPage === "function"){ buildModPage(); renderRoutes(); }
      toast(t.name + " added");
    };
    const go = document.createElement("button"); go.textContent = "MOD PAGE";
    go.onclick = ()=>{ const b = document.querySelector('[data-dock="mod"]'); if(b) b.click(); };
    row.appendChild(add); row.appendChild(go);
    tapDock.appendChild(row);
  }
  for(const t of audioTaps){
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:6px; padding:2px 0;";
    const lab = document.createElement("span");
    lab.style.cssText = "font-size:8.5px; color:var(--txt); min-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
    lab.textContent = t.name;
    const sub = document.createElement("span");
    sub.style.cssText = "font-size:8px; color:var(--dim); min-width:74px;";
    sub.textContent = "IN " + ((t.chan|0)+1) + " · " + hzFmt(t.lo) + "-" + hzFmt(t.hi);
    const box = document.createElement("div");
    box.style.cssText = "flex:1; height:8px; background:#22222c; border-radius:2px; overflow:hidden;";
    const fill = document.createElement("div");
    fill.style.cssText = "height:100%; width:0%; background:linear-gradient(90deg,var(--cyan),var(--mag)); transition:width 60ms linear;";
    box.appendChild(fill);
    row.appendChild(lab); row.appendChild(sub); row.appendChild(box);
    tapDock.appendChild(row);
    tapMeterEls[t.id] = fill;
  }
  if(!audioTaps.length){
    const e = document.createElement("div");
    e.style.cssText = "color:var(--dim); font-size:8.5px; padding:4px 0;";
    e.textContent = "No taps yet.";
    tapDock.appendChild(e);
  }
}
let refreshAudioDeviceUI = ()=>{};
function refreshAudioUI(){ for(const r of audioUIRefs) r.refresh(); }
function refreshLfoUI(){
  for(const id in modMacroRefs){
    const m = modById(id), r = modMacroRefs[id];
    if(m && r){ r.slider.value = m.val; r.upd(); }
  }
}
function refreshUI(){
  bumpParams();
  for(const p of PLIST){
    const r = uiRefs[p.id]; if(!r) continue;
    const v = getBase(p.id);
    r.slider.value = v; setReadout(r.val, fmt(p,v));
  }
  for(const m of stripMelt){ const v = getBase(m.p.id); m.slider.value = v; setReadout(m.val, fmt(m.p, v)); }
  const fm = document.getElementById("fbModeBtn");
  if(fm) fm.textContent = "MODE: "+(fbTrailMode?"TRAIL":"MIX");
  if(tapeBtnRefs[0] && window.__transportOf){
    const m = window.__transportOf(activeChan);
    for(const k in tapeBtnRefs[0]) tapeBtnRefs[0][k].classList.toggle("on", k===m);
  }
}
/* the codec pair reports what it actually managed to negotiate, because
   "nothing is happening" and "this browser has no encoder" look identical */
setInterval(()=>{
  const el = document.getElementById("moshStat");
  if(!el) return;
  if(!MOSH_SUPPORTED) el.textContent = "no WebCodecs in this browser";
  else if(moshOff) el.textContent = moshNote || "off";
  else if(!moshEnc) el.textContent = "idle";
  else el.textContent = moshCodec + "  " + moshW + "x" + moshH
       + "  q" + (moshDec ? moshDec.decodeQueueSize : 0)
       + (moshFails ? "  re-acquired " + moshFails : "");
}, 500);

/* mod tick indicators (cheap: 15Hz) */
setInterval(()=>{
  const routed = new Set(routes.map(r=>r.dst));
  for(const b in bendMix) if(bendMix[b]>0.01) for(const pid in BENDS[b]) routed.add(pid);
  for(const p of PLIST){
    const r = uiRefs[p.id]; if(!r) continue;
    if(routed.has(p.id)){
      const f = (getCur(p.id)-p.min)/(p.max-p.min);
      r.tick.style.display = "block";
      r.tick.style.left = "calc("+(f*100).toFixed(1)+"% - 1px)";
    } else r.tick.style.display = "none";
  }
  for(const m of stripMelt){
    if(routed.has(m.p.id)){
      const f = (getCur(m.p.id)-m.p.min)/(m.p.max-m.p.min);
      m.tick.style.display = "block";
      m.tick.style.left = "calc("+(f*100).toFixed(1)+"% - 1px)";
    } else m.tick.style.display = "none";
  }
  for(const k in meterEls){
    meterEls[k].style.width = (Math.min(1,audioBands[k])*100).toFixed(0)+"%";
  }
  for(const t of audioTaps){
    const el = tapMeterEls[t.id];
    if(el) el.style.width = (Math.min(1,t.val)*100).toFixed(0)+"%";
  }
}, 66);

/* ---------------- mod matrix UI ---------------- */
const routesDiv = document.getElementById("routes");
/* ---- moving between the matrix, the mod page and the panel ---- */
function flashEl(el){
  if(!el) return;
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
  setTimeout(()=>el.classList.remove("flash"), 1600);
}
function focusModSource(id){
  setDock("mod");
  const c = modCards[id];
  if(c && c.card){ c.card.scrollIntoView({block:"nearest", behavior:"smooth"}); flashEl(c.card); }
}
function focusParam(pid){
  const r = uiRefs[pid], p = P[pid];
  if(!r || !p) return;
  /* the mixer faders live on the strip and the transition detail on the MIX tab */
  if(STRIP_PARAMS.has(pid)) document.body.classList.remove("nomix");
  else if(p.sec === "mixer" || p.sec === "mixer2" || p.sec === "mixerM") setDock("mix");
  const sec = secEls[p.sec];
  if(sec) sec.classList.remove("collapsed");
  r.row.scrollIntoView({block:"center", behavior:"smooth"});
  flashEl(r.row);
}
function addRoute(srcId, dstId){
  routes.push({src:srcId, dst:dstId, amt:0.3,
    ch:(P[dstId] && P[dstId].master) ? "A" : activeChan, inv:false, curve:0});
  renderRoutes();
  return routes.length-1;
}
/* ---- the parameter picker ----
   A dropdown carrying four hundred parameters is not a control, it is a filing
   cabinet with the drawers taken out. Even grouped into sections you are
   scrolling a list the height of six screens looking for a word you already
   know. So: type it. The picker opens on a search field, narrows as you type
   across the parameter name, its internal id and its section name, and Enter
   takes the highlighted one. The whole list is still there to browse if you do
   not know what you are looking for, grouped and marked with what is already
   patched, but nobody has to scroll to find CONTRAST.

   It replaces both places the long list used to appear: the destination on a
   route row, and PATCH TO on a modulator card. */
let pickEl = null, pickRows = [], pickIdx = 0;
function closeParamPicker(){
  if(!pickEl) return;
  pickEl.remove(); pickEl = null; pickRows = [];
}
function secLabel(id){ const sd = SECTIONS.find(x=>x.id===id); return sd ? sd.name : String(id).toUpperCase(); }
function openParamPicker(curId, onPick, title){
  closeParamPicker();
  const ov = document.createElement("div"); ov.className = "ppick";
  const box = document.createElement("div"); box.className = "ppbox";
  const head = document.createElement("div"); head.className = "pphead";
  const ht = document.createElement("span"); ht.textContent = title || "PATCH TO";
  head.appendChild(ht);
  if(curId && P[curId]){
    const c = document.createElement("span"); c.className = "ppcur";
    c.textContent = "now: " + P[curId].name;
    head.appendChild(c);
  }
  const inp = document.createElement("input");
  inp.className = "ppsearch"; inp.type = "text"; inp.spellcheck = false;
  inp.placeholder = "Type a parameter, or a section name";
  const list = document.createElement("div"); list.className = "pplist";
  const note = document.createElement("div"); note.className = "ppnote";
  box.appendChild(head); box.appendChild(inp); box.appendChild(list); box.appendChild(note);
  ov.appendChild(box);
  document.body.appendChild(ov);
  pickEl = ov;

  function setIdx(i){
    if(!pickRows.length){ note.textContent = ""; return; }
    pickIdx = Math.max(0, Math.min(pickRows.length - 1, i));
    for(let k=0;k<pickRows.length;k++) pickRows[k].classList.toggle("sel", k === pickIdx);
    const row = pickRows[pickIdx];
    row.scrollIntoView({block:"nearest"});
    const h = PHELP[row.dataset.pid];
    note.textContent = h ? h : "";
  }
  function build(q){
    q = (q || "").trim().toLowerCase();
    list.innerHTML = ""; pickRows = [];
    const routed = new Set(routes.map(r=>r.dst));
    let lastSec = null;
    for(const p of PLIST){
      if(q && (p.name + " " + p.id + " " + secLabel(p.sec)).toLowerCase().indexOf(q) < 0) continue;
      if(p.sec !== lastSec){
        lastSec = p.sec;
        const h = document.createElement("div"); h.className = "ppsec"; h.textContent = secLabel(p.sec);
        list.appendChild(h);
      }
      const r = document.createElement("div");
      r.className = "pprow" + (p.id === curId ? " on" : "");
      r.dataset.pid = p.id;
      const n = document.createElement("span"); n.className = "ppname"; n.textContent = p.name;
      r.appendChild(n);
      if(p.master){ const t = document.createElement("i"); t.className = "ppmaster"; t.textContent = "MASTER"; r.appendChild(t); }
      if(routed.has(p.id)){ const t = document.createElement("i"); t.className = "pptag"; t.textContent = "PATCHED"; r.appendChild(t); }
      const idx = pickRows.length;
      r.onclick = ()=>{ onPick(p.id); closeParamPicker(); };
      r.onmouseenter = ()=>setIdx(idx);
      list.appendChild(r); pickRows.push(r);
    }
    if(!pickRows.length){
      const e = document.createElement("div"); e.className = "ppempty";
      e.textContent = "Nothing matches that";
      list.appendChild(e);
      note.textContent = "";
      return;
    }
    /* open on what is already chosen rather than at the top of the alphabet */
    const at = pickRows.findIndex(r=>r.dataset.pid === curId);
    setIdx(at >= 0 ? at : 0);
  }
  build("");
  inp.addEventListener("input", ()=>build(inp.value));
  /* the app takes single letters as shortcuts, so nothing typed here escapes */
  inp.addEventListener("keydown", e=>{
    e.stopPropagation();
    if(e.key === "ArrowDown"){ e.preventDefault(); setIdx(pickIdx + 1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); setIdx(pickIdx - 1); }
    else if(e.key === "PageDown"){ e.preventDefault(); setIdx(pickIdx + 10); }
    else if(e.key === "PageUp"){ e.preventDefault(); setIdx(pickIdx - 10); }
    else if(e.key === "Enter"){
      e.preventDefault();
      if(pickRows[pickIdx]){ onPick(pickRows[pickIdx].dataset.pid); closeParamPicker(); }
    }
    else if(e.key === "Escape"){ e.preventDefault(); closeParamPicker(); }
  });
  ov.addEventListener("mousedown", e=>{ if(e.target === ov) closeParamPicker(); });
  setTimeout(()=>inp.focus(), 0);
}
/* This list used to be a select carrying every parameter, on every route row
   and every modulator card. It was built lazily to keep seven thousand hidden
   option nodes out of the document; now it is not built at all, because the
   picker above replaced it. */
function destLabel(id){ const p = P[id]; return p ? p.name+"  \u00b7 "+p.sec : "\u2014"; }
const routeAmtRefs = {};
function renderRoutes(){
  for(const k in routeAmtRefs) delete routeAmtRefs[k];
  routesDiv.innerHTML = "";
  routes.forEach((r, i)=>{
    const row = document.createElement("div"); row.className="mrow";
    const src = document.createElement("select"); src.className="src";
    for(const m of MODSRC){ const o=document.createElement("option"); o.value=m.id; o.textContent=m.name; src.appendChild(o); }
    src.value = r.src; src.onchange = ()=>{ r.src = src.value; };
    const go = document.createElement("button"); go.className="rgo"; go.textContent="\u25ce";
    attachTip(go, "SHOW THIS SOURCE", "Jumps to the MOD page and flashes this modulator's card, so you can see what it is doing and what else it is driving.");
    go.onclick = ()=>focusModSource(r.src);
    const dst = document.createElement("button"); dst.className="dst";
    const dstLabel = ()=>{ dst.textContent = destLabel(r.dst); };
    dstLabel();
    attachTip(dst, "DESTINATION", "Which parameter this route drives. Click to search the whole list by name or section.");
    dst.onclick = ()=>openParamPicker(r.dst, id=>{
      r.dst = id; dstLabel(); syncChanSel();
    }, "ROUTE DESTINATION");
    const chSel = document.createElement("select"); chSel.className="rch";
    for(const c of CHANNELS.concat(["AB"])){ const o=document.createElement("option"); o.value=c; o.textContent=(c==="AB"?"ALL":c); chSel.appendChild(o); }
    chSel.value = r.ch || "A";
    chSel.title = "Which channel this route modulates";
    chSel.onchange = ()=>{ r.ch = chSel.value; };
    const syncChanSel = ()=>{ chSel.style.visibility = (P[r.dst] && P[r.dst].master) ? "hidden" : "visible"; };
    syncChanSel();
    const amt = document.createElement("input");
    amt.type="range"; amt.min=-1; amt.max=1; amt.step=0.01; amt.value=r.amt;
    const av = document.createElement("span"); av.className="mamt"; av.textContent = (+r.amt).toFixed(2);
    amt.addEventListener("input", ()=>{ r.amt = parseFloat(amt.value); av.textContent = r.amt.toFixed(2); });
    routeAmtRefs[routes.indexOf(r)] = {slider:amt, val:av};
    const inv = document.createElement("button"); inv.className="rinv"; inv.textContent="INV";
    inv.classList.toggle("on", !!r.inv);
    attachTip(inv, "INVERT", "Flips this route only. The same source can push one parameter up while pulling another down.");
    inv.onclick = ()=>{ r.inv = !r.inv; inv.classList.toggle("on", !!r.inv); };
    const cv = document.createElement("select"); cv.className="rcurve";
    const ac = document.createElement("button"); ac.className = "racbtn"; ac.textContent = "AC";
    ac.classList.toggle("on", !!r.ac);
    attachTip(ac, "AC COUPLE", "Removes the slow-moving part of this source and passes only what is changing. An envelope becomes a pair of spikes, a slow LFO becomes almost nothing, and anything fast passes intact. It turns any source into its own derivative, which roughly doubles what the matrix can say.", "Shift-click to slow the corner frequency, so more of the movement survives.");
    ac.onclick = e=>{
      if(e.shiftKey){ r.acHz = ((r.acHz || 0.5) <= 0.15) ? 1 : Math.max(0.05, (r.acHz || 0.5) - 0.25); toast("AC corner "+(0.4+(r.acHz)*12).toFixed(1)+" Hz"); return; }
      r.ac = !r.ac; r.acS = undefined; ac.classList.toggle("on", !!r.ac);
    };
    ROUTE_CURVES.forEach((n,ci)=>{ const o=document.createElement("option"); o.value=ci; o.textContent=n; cv.appendChild(o); });
    cv.value = r.curve || 0;
    attachTip(cv, "RESPONSE CURVE", "How the source's travel maps onto this destination. LIN is straight through, EXP holds back until the source is near its extremes, LOG does the opposite, S eases both ends, STEP quantises into four levels.");
    cv.onchange = ()=>{ r.curve = parseInt(cv.value); };
    const rm = document.createElement("button"); rm.className="rm"; rm.textContent="✕";
    rm.onclick = ()=>{ routes.splice(i,1); renderRoutes(); };
    row.appendChild(go); row.appendChild(src); row.appendChild(chSel); row.appendChild(dst);
    row.appendChild(inv); row.appendChild(cv);
    row.appendChild(ac); row.appendChild(amt); row.appendChild(av); row.appendChild(rm);
    routesDiv.appendChild(row);
  });
}
document.getElementById("btnAddRoute").onclick = ()=>{
  addRoute("lfo1", "hWobble");
};

/* ---------------- MIDI ---------------- */
function setLearnTarget(pid){
  midiLearnTarget = pid;
  for(const id in uiRefs) uiRefs[id].label.classList.toggle("learn", id===pid);
  toast("Move a MIDI control to map → "+P[pid].name);
}
/* MIDI was written and never switched on. initMidi existed and nothing called
   it; midiLearnMode was declared, read in two places, and never set anywhere.
   So none of it worked: no CC learn, no clock, no note triggers, in any build
   — while the manual and the readme both described all three. This is the
   button that turns it on, and it is also the arm/disarm for learn. */
let midiReady = false;
async function toggleMidiLearn(){
  const b = document.getElementById("btnMidi");
  if(!midiReady){
    await initMidi();
    if(!midiReady) return;              /* unavailable or refused; initMidi said so */
  }
  midiLearnMode = !midiLearnMode;
  if(!midiLearnMode){
    midiLearnTarget = null;
    for(const id in uiRefs) uiRefs[id].label.classList.remove("learn");
  }
  if(b) b.classList.toggle("on", midiLearnMode);
  document.body.classList.toggle("midilearn", midiLearnMode);
  toast(midiLearnMode ? "MIDI learn on \u2014 click a parameter name, then move a control"
                      : "MIDI learn off");
}
async function initMidi(){
  if(!navigator.requestMIDIAccess){ toast("WebMIDI not available (use Chrome)", true); return; }
  try{
    const access = await navigator.requestMIDIAccess();
    const hook = inp => { inp.onmidimessage = onMidi; };
    access.inputs.forEach(hook);
    access.onstatechange = e => { if(e.port.type==="input" && e.port.state==="connected") hook(e.port); };
    midiReady = true;
    toast("MIDI connected \u2014 click a parameter name to learn");
  }catch(e){ toast("MIDI access denied", true); }
}
const NOTE_BENDS = {36:"sync", 37:"roll", 38:"rainbow", 39:"drop", 40:"melt", 41:"kill"};   // C1..F1
function onMidi(e){
  const st = e.data[0];
  /* MIDI realtime: clock + start */
  if(st === 0xF8){
    const ts = e.timeStamp;
    if(onMidi._lastClock){
      const d = ts - onMidi._lastClock;
      if(d > 5 && d < 200){
        clockEma = clockEma ? clockEma*0.9 + d*0.1 : d;
        bpm = Math.min(300, Math.max(30, 60000/(clockEma*24)));
        extClockAt = performance.now();
        if(!onMidi._uiT || performance.now()-onMidi._uiT > 500){ onMidi._uiT = performance.now(); updateTempoUI(); }
      }
    }
    onMidi._lastClock = ts;
    return;
  }
  if(st === 0xFA){ for(const m of mods) if(m.type === "lfo") m.phase = 0; return; }
  if(st >= 0xF0) return;
  const d1 = e.data[1], d2 = e.data[2];
  const type = st & 0xf0;
  /* notes C1-F1 play the bend pads */
  if(type === 0x90 || type === 0x80){
    const b = NOTE_BENDS[d1];
    if(b){
      const on = (type === 0x90 && d2 > 0);
      bendHeld[b] = on;
      const el = document.querySelector(".bend[data-bend='"+b+"']");
      if(el) el.classList.toggle("held", on);
    }
    return;
  }
  if(type !== 0xB0) return;   // CC below
  const key = (st&0x0f)+":"+d1;
  if(midiLearnMode && midiLearnTarget){
    midiMap[key] = midiLearnTarget;
    renderMidiMap();
    uiRefs[midiLearnTarget].label.classList.remove("learn");
    uiRefs[midiLearnTarget].label.classList.add("mapped");
    toast("Mapped CC"+d1+" → "+P[midiLearnTarget].name);
    midiLearnTarget = null;
    return;
  }
  const pid = midiMap[key];
  if(pid){
    const p = P[pid];
    const v = p.min + (d2/127)*(p.max-p.min);
    setBase(pid, v);
    const r = uiRefs[pid];
    if(r){ r.slider.value = v; setReadout(r.val, fmt(p,v)); }
  }
}
