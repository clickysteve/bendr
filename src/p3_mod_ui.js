
/* reset one control: default, or the bottom of its range with shift */
function resetParam(p, toMin){
  const v = toMin ? p.min : p.def;
  pushHistory();
  setBase(p.id, v);
  if(p.master) morphOverride.add("M:"+p.id);
  else if(linkChans){ for(const ch of CHANNELS) morphOverride.add(ch+":"+p.id); }
  else morphOverride.add(activeChan+":"+p.id);
  const r = uiRefs[p.id];
  if(r){ r.slider.value = v; r.val.textContent = fmt(p, v); }
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
    /* choosing from a dropdown, or pressing a button, is a decision — close up */
    panel.addEventListener("change", ()=>{ closeMenus(); hideTip(); });
    for(const btn of panel.querySelectorAll("button")){
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
let bpm = 120, extClockAt = 0, clockEma = 0;
const tapTimes = [];
function tapTempo(){
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
  if(el) el.textContent = bpm.toFixed(1) + ((performance.now()-extClockAt<2000)?" EXT":"");
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
function applyParams(dt){
  /* start from the stored base values for both channels and the master set */
  for(const ch of CHANNELS){ const cb=chanBase[ch], cc=chanCur[ch]; for(const p of CLIST) cc[p.id]=cb[p.id]; }
  for(const p of MLIST) mCur[p.id]=mBase[p.id];

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
    if(r.inv) mv = -mv;
    mv = shapeMod(mv, r.curve || 0);
    const d = (p.max-p.min) * (r.amt*mv + (r.off || 0));
    if(p.master){ mCur[p.id] += d; }
    else {
      const rc = r.ch || "A";
      if(rc === "AB"){ for(const ch of CHANNELS) chanCur[ch][p.id] += d; }
      else chanCur[rc][p.id] += d;
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
        if(p.master){ mCur[pid] = mCur[pid] + (BENDS[b][pid]-mCur[pid])*bendMix[b]; }
        else for(const ch of bendTargets) chanCur[ch][pid] = chanCur[ch][pid] + (BENDS[b][pid]-chanCur[ch][pid])*bendMix[b];
      }
    }
  }

  /* clamp */
  for(const ch of CHANNELS){ const cc=chanCur[ch]; for(const p of CLIST) cc[p.id] = Math.min(p.max, Math.max(p.min, cc[p.id])); }
  for(const p of MLIST) mCur[p.id] = Math.min(p.max, Math.max(p.min, mCur[p.id]));
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
}
/* audio input device + channel routing (for audio interfaces) */
let audioDeviceId = "", audioChannel = -1, micSplitter = null;   // channel -1 = mix
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
  const nCh = micNode.channelCount || 2;
  if(audioChannel >= 0 && audioChannel < nCh){
    micSplitter = audioCtx.createChannelSplitter(Math.max(2,nCh));
    micNode.connect(micSplitter);
    micSplitter.connect(analyser, audioChannel, 0);
  } else {
    micNode.connect(analyser);
  }
}
async function openMic(){
  if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; micNode=null; }
  const constraints = {audio: audioDeviceId ? {deviceId:{exact:audioDeviceId}, echoCancellation:false, autoGainControl:false, noiseSuppression:false}
                                            : {echoCancellation:false, autoGainControl:false, noiseSuppression:false}};
  micStream = await navigator.mediaDevices.getUserMedia(constraints);
  micNode = audioCtx.createMediaStreamSource(micStream);
  wireMic();
  refreshAudioDeviceUI();
}
async function setAudioMode(m){
  audioMode = m;
  if(m === "off"){
    if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; micNode=null; }
    audioBands.bass=audioBands.mid=audioBands.high=0;
    return;
  }
  ensureAudioCtx();
  if(m === "source"){ hookVideoAudio(); toast("Audio-reactive: video soundtrack"); }
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
function updateAudio(dt){
  if(audioMode==="off" || !analyser) return;
  analyser.getByteFrequencyData(fftBuf);
  const n = analyser.frequencyBinCount;
  const nyq = audioCtx.sampleRate/2;
  function bandAvg(lo, hi){
    let a = Math.floor(lo/nyq*n), b = Math.ceil(hi/nyq*n);
    if(b<=a) b=a+1;
    a=Math.max(0,Math.min(n-1,a)); b=Math.max(1,Math.min(n,b));
    let s=0; for(let i=a;i<b;i++) s+=fftBuf[i];
    return s/(b-a)/255;
  }
  const speed = 4 + audioCfg.response*36;
  for(const k of ["bass","mid","high"]){
    const c = audioCfg[k];
    const raw = bandAvg(c.lo, c.hi);
    audioBands.peak[k] = Math.max(audioBands.peak[k]*(1-dt*0.08), raw, 0.05);
    const v = Math.min(1.5, (raw/audioBands.peak[k]) * c.gain);
    audioBands[k] += (v-audioBands[k]) * Math.min(1, dt*speed);
  }
}

/* ---------------- UI build ---------------- */
const panel = document.getElementById("panel");
const uiRefs = {};   // id -> {slider, val, tick, row, label}
let midiLearnMode = false, midiLearnTarget = null;
const midiMap = {};  // "ch:cc" -> paramId

function fmt(p, v){ return (Math.abs(v)<10 ? v.toFixed(2) : v.toFixed(1)); }
function buildChanBar(){
  const bar = document.createElement("div");
  bar.id = "chanbar";
  const mk = (ch)=>{
    const b = document.createElement("button");
    b.className = "chanbtn ch"+ch;
    b.dataset.chan = ch;
    b.innerHTML = "<b>"+ch+"</b><small>CHANNEL</small>";
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
  const cp = document.createElement("button");
  cp.textContent = "COPY \u2192";
  attachTip(cp, "COPY", "Copies this channel's effect settings onto its partner on the same bus: A to B, or C to D. Sources are left alone.");
  cp.onclick = ()=>{
    pushHistory();
    const other = BUSPAIR[activeChan];
    copyChannel(activeChan, other);
    toast("Copied channel "+activeChan+" \u2192 "+other);
  };
  const sw = document.createElement("button");
  sw.textContent = "SWAP";
  attachTip(sw, "SWAP", "Exchanges this channel with its partner on the same bus, sources as well as effects - so whatever was sitting on top swaps places.");
  sw.onclick = ()=>{
    pushHistory();
    const other = BUSPAIR[activeChan];
    for(const p of CLIST){ const t = chanBase[activeChan][p.id]; chanBase[activeChan][p.id] = chanBase[other][p.id]; chanBase[other][p.id] = t; }
    if(window.__swapSources) window.__swapSources(activeChan, other);
    refreshUI(); toast("Swapped "+activeChan+" \u2194 "+other+" (effects and sources)");
  };
  tools.appendChild(lk); tools.appendChild(cp); tools.appendChild(sw);
  bar.appendChild(tools);
  panel.appendChild(bar);
}
function setActiveChan(ch){
  activeChan = ch;
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
     get:()=>mixMode, set:v=>{mixMode=v;}, inv:()=>wipeInv, tinv:()=>{wipeInv=!wipeInv;}},
    {key:"b2", pid:"cdMix", label:"BUS 2", routed:true,
     get:()=>mixMode2, set:v=>{mixMode2=v;}, inv:()=>wipeInv2, tinv:()=>{wipeInv2=!wipeInv2;}},
    {key:"bM", pid:"busMix", label:"MASTER · BUS 1 ↔ BUS 2", routed:false,
     get:()=>mixModeM, set:v=>{mixModeM=v;}, inv:()=>wipeInvM, tinv:()=>{wipeInvM=!wipeInvM;}},
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
      "How the two sides meet: a plain dissolve, one of twelve wipe shapes, a luma or chroma key, or a blend. The softness, wipe geometry and key settings live in the sidebar.");
    MIXMODES.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=m; mode.appendChild(o); });
    mode.value = bus.get();
    mode.onchange = ()=>{ bus.set(parseInt(mode.value)); refreshToggles(); };
    row.appendChild(mode);
    const iv = document.createElement("button");
    iv.textContent = "INV";
    attachTip(iv, "INVERT WIPE",
      "Runs the wipe from the other side.",
      "Only wipes have a direction to reverse, so this greys out on FADE, on the keys and on the blend modes. Keys have their own KEY INVERT in the MIX tab.");
    iv.classList.toggle("on", bus.inv());
    iv.onclick = ()=>{ if(iv.disabled) return; bus.tinv(); iv.classList.toggle("on", bus.inv()); };
    stripInvBtns[bus.key] = {btn:iv, get:bus.inv, mode:bus.get};
    row.appendChild(iv);
    el.appendChild(row);

    const fr = document.createElement("div"); fr.className = "mixfader";
    const wrap = document.createElement("div"); wrap.className = "sldwrap";
    const sl = document.createElement("input");
    sl.type = "range"; sl.min = p.min; sl.max = p.max; sl.step = (p.max-p.min)/400;
    sl.value = getBase(p.id);
    attachTip(sl, p.name, PHELP[p.id] || "", "Double-click to return it to zero.");
    const val = document.createElement("span"); val.className = "mval";
    val.textContent = fmt(p, getBase(p.id));
    sl.addEventListener("input", ()=>{
      const v = parseFloat(sl.value);
      setBase(p.id, v); val.textContent = fmt(p, v);
      morphOverride.add("M:"+p.id);
    });
    sl.addEventListener("dblclick", ()=>{ resetParam(p); });
    const tick = document.createElement("div"); tick.className = "modtick";
    wrap.appendChild(sl); wrap.appendChild(tick);
    fr.appendChild(wrap); fr.appendChild(val);
    el.appendChild(fr);
    /* registering here means refreshUI and the modulation ticks drive it too */
    uiRefs[p.id] = {slider:sl, val, tick, row:el, label:h};
    host.appendChild(el);
  }
  refreshBusUI(); refreshToggles();
}
const stripInvBtns = {};

function buildPanel(){
  buildChanBar();
  buildZones();
  for(const sec of SECTIONS){
    const d = document.createElement("div");
    d.className = "sec "+sec.cls;
    const h = document.createElement("h3");
    const tag = MASTER_SECS.has(sec.id) ? "<span class='sectag master'>MASTER</span>"
                                        : "<span class='sectag chan'></span>";
    h.innerHTML = "<span class='caret'>\u25be</span><span class='led'></span>"+sec.name+tag;
    const rb = document.createElement("button");
    rb.className = "secreset"; rb.textContent = "RESET";
    attachTip(rb, "RESET SECTION", "Returns every control in this section to its default, on the channel you are editing.", "Individual controls reset with a double-click, or the \u21ba that appears when you hover the row.");
    rb.onclick = e=>{ e.stopPropagation(); resetSection(sec.id); };
    h.appendChild(rb);
    h.onclick = ()=>{ d.classList.toggle("collapsed"); saveCollapse(); };
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
      attachTip(lab, p.name, PHELP[p.id] || "",
        "Double-click the slider or press \u21ba to reset \u00b7 right-click to patch a modulator \u00b7 click while MIDI learn is on to map a controller");
      lab.onclick = ()=>{ if(midiLearnMode){ setLearnTarget(p.id); } };
      lab.addEventListener("dblclick", ()=>resetParam(p));
      row.addEventListener("contextmenu", e=>{ e.preventDefault(); openModMenu(e, p); });
      const wrap = document.createElement("div"); wrap.className="sldwrap";
      const s = document.createElement("input");
      s.type="range"; s.min=p.min; s.max=p.max; s.step=(p.max-p.min)/400; s.value=getBase(p.id);
      s.addEventListener("input", ()=>{
        const v = parseFloat(s.value);
        setBase(p.id, v); val.textContent = fmt(p,v);
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
      s.addEventListener("dblclick", ()=>{ setBase(p.id, p.def); s.value=p.def; val.textContent = fmt(p,p.def); });
      const tick = document.createElement("div"); tick.className="modtick";
      wrap.appendChild(s); wrap.appendChild(tick);
      const val = document.createElement("span"); val.className="val"; val.textContent = fmt(p,getBase(p.id));
      const rst = document.createElement("button"); rst.className="prst"; rst.textContent="\u21ba";
      attachTip(rst, "RESET " + p.name, "Back to the default ("+fmt(p,p.def)+").",
        "Shift-click for the bottom of the range ("+fmt(p,p.min)+"). Double-clicking the slider does the same as a plain click.");
      rst.onclick = e=>{ e.stopPropagation(); resetParam(p, e.shiftKey); };
      row.appendChild(lab); row.appendChild(wrap); row.appendChild(val); row.appendChild(rst);
      d2.appendChild(row);
      uiRefs[p.id] = {slider:s, val, tick, row, label:lab};
    }
    /* the three transition sections live in the dock's MIX tab, not the sidebar */
    const host = sec.zone === "mix" ? document.getElementById("mixdock") : (zoneEls[sec.zone] || zoneEls.chain);
    host.appendChild(d);
  }
  /* LFO config section */
  const d = mkSection("lfo", "mag", "TEMPO / CLOCK");
  /* tempo row */
  {
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = "TEMPO";
    const tap = document.createElement("button"); tap.textContent = "TAP";
    tap.title = "Tap tempo — synced LFOs follow it. MIDI clock overrides automatically.";
    tap.onclick = tapTempo;
    const bv = document.createElement("span"); bv.className="val"; bv.id="bpmVal";
    bv.style.width = "70px"; bv.textContent = bpm.toFixed(1);
    const note = document.createElement("span");
    note.style.cssText = "color:var(--dim); font-size:8.5px; flex:1;";
    note.textContent = "SYNC locks an LFO to tempo";
    row.appendChild(lab); row.appendChild(tap); row.appendChild(bv); row.appendChild(note);
    d.appendChild(row);
  }
  const lfnote = document.createElement("div");
  lfnote.style.cssText = "color:var(--dim); font-size:8.5px; padding:4px 0 2px;";
  lfnote.textContent = "Tap to set the tempo; any modulator with a sync division follows it, and MIDI clock overrides it automatically. Rates, shapes, envelopes and macros live on the MOD tab of the dock, where you can also add as many more as you want.";
  d.appendChild(lfnote);
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
  grid.appendChild(addCard);

  const groups = [
    {cls:"", ids:mods.map(m=>m.id)},
    {cls:"audio", ids:["bass","mid","high"]},
    {cls:"vid", ids:["motion","bright","cut"]},
    {cls:"", ids:["chaos","drift","spike"]},
  ];
  for(const g of groups) for(const id of g.ids){
    const src = MODSRC.find(x=>x.id===id);
    if(!src) continue;
    const m = modById(id);
    const card = document.createElement("div");
    card.className = "modcard " + g.cls + (m ? " usermod" : "");
    const h = document.createElement("h4");
    const nm = document.createElement("span");
    nm.textContent = src.name;
    if(m){
      nm.className = "modname";
      nm.title = "Click to rename";
      nm.onclick = ()=>{
        const v = (prompt("Name this modulator", m.name) || "").trim();
        if(!v) return;
        m.name = v; rebuildMODSRC(); buildModPage(); renderRoutes();
      };
    }
    h.appendChild(nm);
    if(m && m.type !== "lfo"){
      const tag = document.createElement("i");
      tag.className = "mtype"; tag.textContent = m.type === "env" ? "ENV" : "MACRO";
      h.appendChild(tag);
    }
    const val = document.createElement("span");
    val.style.cssText = "margin-left:auto; color:var(--txt); font-size:9px;";
    h.appendChild(val);
    if(m){
      const del = document.createElement("button");
      del.className = "moddel"; del.textContent = "✕";
      attachTip(del, "REMOVE", "Deletes this modulator and every route using it.");
      del.onclick = ()=>{
        mods.splice(mods.indexOf(m), 1);
        routes = routes.filter(r=>r.src !== m.id);
        rebuildMODSRC(); buildModPage(); renderRoutes();
        toast(m.name + " removed");
      };
      h.appendChild(del);
    }
    card.appendChild(h);
    const cv = document.createElement("canvas");
    cv.width = 250; cv.height = 44;
    card.appendChild(cv);

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
      for(const [v,n] of ENV_TRIGS){ const op = document.createElement("option"); op.value = v; op.textContent = n; tg.appendChild(op); }
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
    const pk = document.createElement("select");
    pk.className = "patchpick";
    const ph = document.createElement("option"); ph.value = ""; ph.textContent = "PATCH TO…"; pk.appendChild(ph);
    let lastSec = null, grp = null;
    for(const pp of PLIST){
      if(pp.sec !== lastSec){
        lastSec = pp.sec;
        grp = document.createElement("optgroup");
        const sd = SECTIONS.find(x=>x.id===pp.sec);
        grp.label = sd ? sd.name : pp.sec.toUpperCase();
        pk.appendChild(grp);
      }
      const o = document.createElement("option"); o.value = pp.id; o.textContent = pp.name;
      grp.appendChild(o);
    }
    pk.onchange = ()=>{
      if(!pk.value) return;
      addRoute(id, pk.value);
      toast(src.name + " → " + P[pk.value].name);
      pk.value = "";
    };
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
      amt.addEventListener("input", ()=>{ r.amt = parseFloat(amt.value); renderRoutes(); });
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

  for(const src of MODSRC){
    const b = document.createElement("div");
    b.className = "mmrow";
    b.textContent = src.name;
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
  const w = 200, h = Math.min(m.scrollHeight, 340);
  m.style.left = Math.min(ev.clientX, window.innerWidth - w - 8) + "px";
  m.style.top  = Math.min(ev.clientY, window.innerHeight - h - 8) + "px";
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
      rs.textContent = "RESET";
      attachTip(rs, "RESET LAYOUT", "Puts these sections back into the default signal-path order.");
      rs.onclick = ()=>{ orderChainZone(false); saveSectionOrder(); toast("Panel order reset"); };
      h.appendChild(fc); h.appendChild(rs);
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
function mkSection(id, cls, name){
  const d = document.createElement("div"); d.className = "sec "+cls;
  const h = document.createElement("h3");
  h.innerHTML = "<span class='caret'>\u25be</span><span class='led'></span>"+name;
  h.onclick = ()=>{ d.classList.toggle("collapsed"); saveCollapse(); };
  if(SECHELP[id]) attachTip(h, name, SECHELP[id], "Click to collapse");
  d.appendChild(h);
  const body = document.createElement("div"); body.className = "secbody";
  d.appendChild(body);
  secEls[id] = d;
  if(zoneEls.tools) zoneEls.tools.appendChild(d);
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
  let st = null;
  try{ st = JSON.parse(localStorage.getItem("bendr.collapse")); }catch(e){}
  if(!st){
    /* first run: the second bus and the master crossfade are folded away, since
       they do nothing until you bring channels C and D in */
    /* the three transition columns share a dock tab now, so there is room for
       all of them; only the pattern synth starts folded */
    st = {gen:true};
  }
  for(const k in st) if(secEls[k] && st[k]) secEls[k].classList.add("collapsed");
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
const STAGE_INFO = {
  sig:    {name:"TAPE / SYNC",  sec:["signal","sync","vhs"]},
  col:    {name:"COLOUR / ENH", sec:["enhancer","contour","color"]},
  glitch: {name:"GLITCH LAB",   sec:["glitch"]},
  lab:    {name:"SIGNAL LAB",   sec:["lab"]},
  flow:   {name:"FLOW / MOSH",  sec:["flow"]},
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
    el.onclick = ()=>{ stageEnabled[id] = !stageEnabled[id]; renderChain(); };
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
function resetSection(id){
  for(const p of PLIST) if(p.sec===id){
    if(p.master){ mBase[p.id] = p.def; morphOverride.add("M:"+p.id); }
    else if(linkChans){ for(const ch of CHANNELS){ chanBase[ch][p.id]=p.def; morphOverride.add(ch+":"+p.id); } }
    else { chanBase[activeChan][p.id] = p.def; morphOverride.add(activeChan+":"+p.id); }
  }
  if(id==="feedback"){ fbTrailMode=false; rescanMode=false; fbWrap=0; fbMirror=0; fbBlend=0; fbNL=0; fbInvert=false; }
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
function mkToggle(parent, id, labelFn, onClick, tip){
  const b = document.createElement("button");
  b.textContent = labelFn();
  if(tip) attachTip(b, labelFn().split(":")[0].trim(), tip);
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
const MIXMODES = ["FADE","WIPE H","WIPE V","DIAGONAL","BOX","CIRCLE","SPLIT H","SPLIT V",
  "BLINDS V","BLINDS H","CLOCK","DIAG BARS","BLOCKS","LUMA KEY","CHROMA KEY",
  "ADD","DIFFERENCE","MULTIPLY","SCREEN","LIGHTEN"];

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

function sectionExtras(id, d){
  if(id==="mixer" || id==="mixer2" || id==="mixerM"){
    const which = id==="mixer" ? 1 : (id==="mixer2" ? 2 : 3);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent =
      which===1 ? "How bus 1's transition looks. The fader, the routing and the transition mode are on the mixer strip under the picture; SOFT feathers the wipe edge, DETAIL sets blind and bar counts, CTR X/Y moves the origin, and the KEY controls apply to the two key transitions."
    : which===2 ? "The same for bus 2. It only renders while the master fader is above zero, so leaving it alone costs nothing."
    : "The same again for the master crossfade between the two buses.";
    d.appendChild(note);
  }
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
  if(id==="feedback"){
    const tr = document.createElement("div"); tr.className="trow";
    const bm = document.createElement("button"); bm.textContent="MODE: MIX"; bm.id="fbModeBtn";
    bm.onclick = ()=>{ fbTrailMode=!fbTrailMode; bm.textContent = "MODE: "+(fbTrailMode?"TRAIL":"MIX"); };
    tr.appendChild(bm);
    mkToggle(tr, "rescan", ()=>"RESCAN: "+(rescanMode?"FULL":"CLEAN"), ()=>{ rescanMode=!rescanMode; }, "CLEAN taps the loop before the display stage. FULL taps it after, so scanlines, mask, curvature and bloom all go back round \u2014 the software equivalent of pointing a camera at the monitor it is feeding.");
    d.appendChild(tr);
    const tr2 = document.createElement("div"); tr2.className="trow";
    const WRAPS=["CLAMP","REPEAT","MIRROR"], MIRS=["NO MIRROR","MIRROR H","MIRROR V","QUAD"],
          BLENDS=["MIX","ADD","SCREEN","MAX","MIN","DIFF"], NLS=["CLAMP","SOFT","WRAP","FOLD"];
    mkToggle(tr2, "fbWrap", ()=>"EDGE: "+WRAPS[fbWrap], ()=>{ fbWrap=(fbWrap+1)%3; }, "What the loop does with picture that lands outside the frame. CLAMP smears the edge inward and builds tunnels; REPEAT tiles it into lattices; MIRROR reflects it into mandalas. This one choice decides the whole family of shapes the loop can make.");
    mkToggle(tr2, "fbMirror", ()=>MIRS[fbMirror], ()=>{ fbMirror=(fbMirror+1)%4; }, "Mirrors the fed-back image about the centre before it re-enters, forcing symmetry into the loop. QUAD mirrors both axes.");
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
  if(id==="crt"){
    const tr = document.createElement("div"); tr.className="trow";
    const MODELS=["FLAT / RAW","APERTURE GRILLE","SLOT MASK","SHADOW MASK","LCD STRIPE","MONO MONITOR","GREEN SCREEN"];
    mkToggle(tr, "outModel", ()=>"DISPLAY: "+MODELS[outModel], ()=>{ outModel=(outModel+1)%7; }, "Which display the output is drawn on. Each model has its own phosphor mask geometry, so the same picture reads as an aperture-grille tube, a shadow mask, an LCD panel or a mono monitor.");
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "The master display stage: pick a tube, set the beam profile, then the output transform (gamma / levels / warmth) and persistence.";
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
const lfoUIRefs = {};
const audioUIRefs = [];
const meterEls = {};
function hzFmt(v){ return v>=1000 ? (v/1000).toFixed(1)+"k" : Math.round(v); }
function buildAudioSection(){
  const d = mkSection("audio", "cyan", "AUDIO REACT");
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
    const val = document.createElement("span"); val.className="val";
    const upd = ()=>{
      const v = log ? Math.pow(10, parseFloat(s.value)) : parseFloat(s.value);
      set(v); val.textContent = fmtFn(v);
    };
    s.addEventListener("input", upd); upd();
    wrap.appendChild(s);
    row.appendChild(lab); row.appendChild(wrap); row.appendChild(val);
    d.appendChild(row);
    audioUIRefs.push({s, val, get, log, fmtFn,
      refresh(){ s.value = log ? Math.log10(get()) : get(); val.textContent = fmtFn(get()); }});
  }
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
  for(const p of PLIST){
    const r = uiRefs[p.id]; if(!r) continue;
    const v = getBase(p.id);
    r.slider.value = v; r.val.textContent = fmt(p,v);
  }
  const fm = document.getElementById("fbModeBtn");
  if(fm) fm.textContent = "MODE: "+(fbTrailMode?"TRAIL":"MIX");
  if(tapeBtnRefs[0] && window.__transportOf){
    const m = window.__transportOf(activeChan);
    for(const k in tapeBtnRefs[0]) tapeBtnRefs[0][k].classList.toggle("on", k===m);
  }
}
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
  for(const k in meterEls){
    meterEls[k].style.width = (Math.min(1,audioBands[k])*100).toFixed(0)+"%";
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
function renderRoutes(){
  routesDiv.innerHTML = "";
  routes.forEach((r, i)=>{
    const row = document.createElement("div"); row.className="mrow";
    const src = document.createElement("select"); src.className="src";
    for(const m of MODSRC){ const o=document.createElement("option"); o.value=m.id; o.textContent=m.name; src.appendChild(o); }
    src.value = r.src; src.onchange = ()=>{ r.src = src.value; };
    const go = document.createElement("button"); go.className="rgo"; go.textContent="\u25ce";
    attachTip(go, "SHOW THIS SOURCE", "Jumps to the MOD page and flashes this modulator's card, so you can see what it is doing and what else it is driving.");
    go.onclick = ()=>focusModSource(r.src);
    const dst = document.createElement("select"); dst.className="dst";
    for(const p of PLIST){ const o=document.createElement("option"); o.value=p.id; o.textContent=p.name+" ("+p.sec+")"; dst.appendChild(o); }
    dst.value = r.dst; dst.onchange = ()=>{ r.dst = dst.value; syncChanSel(); };
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
    const inv = document.createElement("button"); inv.className="rinv"; inv.textContent="INV";
    inv.classList.toggle("on", !!r.inv);
    attachTip(inv, "INVERT", "Flips this route only. The same source can push one parameter up while pulling another down.");
    inv.onclick = ()=>{ r.inv = !r.inv; inv.classList.toggle("on", !!r.inv); };
    const cv = document.createElement("select"); cv.className="rcurve";
    ROUTE_CURVES.forEach((n,ci)=>{ const o=document.createElement("option"); o.value=ci; o.textContent=n; cv.appendChild(o); });
    cv.value = r.curve || 0;
    attachTip(cv, "RESPONSE CURVE", "How the source's travel maps onto this destination. LIN is straight through, EXP holds back until the source is near its extremes, LOG does the opposite, S eases both ends, STEP quantises into four levels.");
    cv.onchange = ()=>{ r.curve = parseInt(cv.value); };
    const rm = document.createElement("button"); rm.className="rm"; rm.textContent="✕";
    rm.onclick = ()=>{ routes.splice(i,1); renderRoutes(); };
    row.appendChild(go); row.appendChild(src); row.appendChild(chSel); row.appendChild(dst);
    row.appendChild(inv); row.appendChild(cv);
    row.appendChild(amt); row.appendChild(av); row.appendChild(rm);
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
async function initMidi(){
  if(!navigator.requestMIDIAccess){ toast("WebMIDI not available (use Chrome)", true); return; }
  try{
    const access = await navigator.requestMIDIAccess();
    const hook = inp => { inp.onmidimessage = onMidi; };
    access.inputs.forEach(hook);
    access.onstatechange = e => { if(e.port.type==="input" && e.port.state==="connected") hook(e.port); };
    toast("MIDI connected — click a parameter name to learn");
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
    if(r){ r.slider.value = v; r.val.textContent = fmt(p,v); }
  }
}
