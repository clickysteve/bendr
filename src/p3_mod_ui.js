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
const MODSRC = [
  {id:"lfo1", name:"LFO 1"}, {id:"lfo2", name:"LFO 2"},
  {id:"lfo3", name:"LFO 3"}, {id:"lfo4", name:"LFO 4"},
  {id:"chaos", name:"CHAOS"}, {id:"drift", name:"DRIFT"}, {id:"spike", name:"SPIKE"},
  {id:"bass", name:"AUD BASS"}, {id:"mid", name:"AUD MID"}, {id:"high", name:"AUD HIGH"},
  {id:"motion", name:"VID MOTION"}, {id:"bright", name:"VID BRIGHT"}, {id:"cut", name:"VID CUT"},
];
const LFOKEYS = ["lfo1","lfo2","lfo3","lfo4"];
const lfoState = {
  lfo1:{rate:0.3,  shape:"sine", phase:Math.random(), sync:0},
  lfo2:{rate:1.7,  shape:"snh",  phase:Math.random(), snh:0, sync:0},
  lfo3:{rate:0.07, shape:"tri",  phase:Math.random(), sync:0},
  lfo4:{rate:5.5,  shape:"sine", phase:Math.random(), sync:0},
};
const modVal = {lfo1:0, lfo2:0, lfo3:0, lfo4:0, chaos:0, drift:0, spike:0, bass:0, mid:0, high:0, motion:0, bright:0, cut:0};

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
  }
  return 0;
}
function updateMod(dt, t){
  for(const k of LFOKEYS){
    if(lfoState[k].sync > 0) lfoState[k].rate = (bpm/60)/lfoState[k].sync;
    modVal[k] = lfoOut(lfoState[k], dt);
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
  const st = {chan:{A:{},B:{}}, master:{}};
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
    const d = r.amt * (p.max-p.min) * modVal[r.src];
    if(p.master){ mCur[p.id] += d; }
    else {
      const rc = r.ch || "A";
      if(rc === "AB"){ chanCur.A[p.id] += d; chanCur.B[p.id] += d; }
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
    b.title = "Edit channel "+ch+"'s inputs and effects";
    b.onclick = ()=>{ setActiveChan(ch); };
    return b;
  };
  bar.appendChild(mk("A"));
  bar.appendChild(mk("B"));
  const tools = document.createElement("div");
  tools.className = "chantools";
  const lk = document.createElement("button");
  lk.id = "btnLinkChans"; lk.textContent = "LINK";
  lk.title = "Edit both channels at once";
  lk.onclick = ()=>{ linkChans = !linkChans; lk.classList.toggle("on", linkChans); };
  const cp = document.createElement("button");
  cp.textContent = "COPY \u2192";
  cp.title = "Copy this channel's settings to the other channel";
  cp.onclick = ()=>{
    pushHistory();
    const other = activeChan === "A" ? "B" : "A";
    copyChannel(activeChan, other);
    toast("Copied channel "+activeChan+" \u2192 "+other);
  };
  const sw = document.createElement("button");
  sw.textContent = "SWAP";
  sw.title = "Swap the two channels' settings";
  sw.onclick = ()=>{
    pushHistory();
    for(const p of CLIST){ const t = chanBase.A[p.id]; chanBase.A[p.id] = chanBase.B[p.id]; chanBase.B[p.id] = t; }
    refreshUI(); toast("Channels swapped");
  };
  tools.appendChild(lk); tools.appendChild(cp); tools.appendChild(sw);
  bar.appendChild(tools);
  panel.appendChild(bar);
}
function setActiveChan(ch){
  activeChan = ch;
  document.querySelectorAll(".chanbtn").forEach(b=>b.classList.toggle("on", b.dataset.chan===ch));
  document.body.classList.toggle("chan-b", ch==="B");
  refreshUI();
  if(window.__syncChanInputUI) window.__syncChanInputUI();
}
function buildPanel(){
  buildChanBar();
  for(const sec of SECTIONS){
    const d = document.createElement("div");
    d.className = "sec "+sec.cls;
    const h = document.createElement("h3");
    const tag = MASTER_SECS.has(sec.id) ? "<span class='sectag master'>MASTER</span>"
                                        : "<span class='sectag chan'></span>";
    h.innerHTML = "<span class='caret'>\u25be</span><span class='led'></span>"+sec.name+tag;
    const rb = document.createElement("button");
    rb.className = "secreset"; rb.textContent = "RESET";
    rb.title = "Reset this section to defaults";
    rb.onclick = e=>{ e.stopPropagation(); resetSection(sec.id); };
    h.appendChild(rb);
    h.title = "Click to collapse / expand";
    h.onclick = ()=>{ d.classList.toggle("collapsed"); saveCollapse(); };
    d.appendChild(h);
    const body = document.createElement("div"); body.className = "secbody";
    d.appendChild(body);
    secEls[sec.id] = d;
    sectionExtras(sec.id, body);
    const dOuter = d; const d2 = body;
    for(const p of PLIST.filter(p=>p.sec===sec.id)){
      const row = document.createElement("div"); row.className="prow";
      const lab = document.createElement("label"); lab.textContent = p.name; lab.title = "Click while MIDI learn is on to map a controller";
      lab.onclick = ()=>{ if(midiLearnMode){ setLearnTarget(p.id); } };
      const wrap = document.createElement("div"); wrap.className="sldwrap";
      const s = document.createElement("input");
      s.type="range"; s.min=p.min; s.max=p.max; s.step=(p.max-p.min)/400; s.value=getBase(p.id);
      s.addEventListener("input", ()=>{
        const v = parseFloat(s.value);
        setBase(p.id, v); val.textContent = fmt(p,v);
        if(p.master) morphOverride.add("M:"+p.id);
        else if(linkChans){ morphOverride.add("A:"+p.id); morphOverride.add("B:"+p.id); }
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
      row.appendChild(lab); row.appendChild(wrap); row.appendChild(val);
      d2.appendChild(row);
      uiRefs[p.id] = {slider:s, val, tick, row, label:lab};
    }
    if(sec.id==="feedback"){
      /* LFO settings live under the mod-heavy section */
    }
    panel.appendChild(d);
  }
  /* LFO config section */
  const d = mkSection("lfo", "mag", "LFO SETTINGS");
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
  for(const key of LFOKEYS){
    const row = document.createElement("div"); row.className="prow";
    const lab = document.createElement("label"); lab.textContent = key.toUpperCase()+" RATE";
    const wrap = document.createElement("div"); wrap.className="sldwrap";
    const s = document.createElement("input");
    s.type="range"; s.min=-2; s.max=1.2; s.step=0.01;
    s.value = Math.log10(lfoState[key].rate);
    const val = document.createElement("span"); val.className="val";
    const upd = ()=>{ lfoState[key].rate = Math.pow(10, parseFloat(s.value)); val.textContent = lfoState[key].rate.toFixed(2); };
    s.addEventListener("input", upd); upd();
    wrap.appendChild(s);
    const shp = document.createElement("select");
    for(const o of ["sine","tri","saw","sqr","snh"]){
      const op = document.createElement("option"); op.value=o; op.textContent=o.toUpperCase(); shp.appendChild(op);
    }
    shp.value = lfoState[key].shape;
    shp.onchange = ()=>{ lfoState[key].shape = shp.value; };
    shp.style.width = "56px";
    const sync = document.createElement("select");
    const DIVS = [["0","FREE"],["16","4 BAR"],["8","2 BAR"],["4","1 BAR"],["2","1/2"],["1","1/4"],["0.5","1/8"],["0.25","1/16"]];
    for(const [v,n] of DIVS){ const op=document.createElement("option"); op.value=v; op.textContent=n; sync.appendChild(op); }
    sync.title = "Tempo sync division (beats per cycle)";
    sync.value = String(lfoState[key].sync||0);
    sync.onchange = ()=>{ lfoState[key].sync = parseFloat(sync.value); s.disabled = lfoState[key].sync>0; };
    sync.style.width = "58px";
    row.appendChild(lab); row.appendChild(wrap); row.appendChild(val); row.appendChild(shp); row.appendChild(sync);
    d.appendChild(row);
    lfoUIRefs[key] = {slider:s, val, shp, sync, upd};
  }
  panel.appendChild(d);
  buildAudioSection();
}

/* ---- collapsible section plumbing ---- */
const secEls = {};
function mkSection(id, cls, name){
  const d = document.createElement("div"); d.className = "sec "+cls;
  const h = document.createElement("h3");
  h.innerHTML = "<span class='caret'>\u25be</span><span class='led'></span>"+name;
  h.title = "Click to collapse / expand";
  h.onclick = ()=>{ d.classList.toggle("collapsed"); saveCollapse(); };
  d.appendChild(h);
  const body = document.createElement("div"); body.className = "secbody";
  d.appendChild(body);
  secEls[id] = d;
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
  try{
    const st = JSON.parse(localStorage.getItem("bendr.collapse")||"{}");
    for(const k in st) if(secEls[k] && st[k]) secEls[k].classList.add("collapsed");
  }catch(e){}
}
function collapseAll(v){
  for(const k in secEls) secEls[k].classList.toggle("collapsed", v);
  saveCollapse();
}

/* ---- signal chain rail: drag to reorder, click to bypass ---- */
const STAGE_INFO = {
  sig:    {name:"TAPE / SYNC",  sec:["signal","sync","vhs"]},
  col:    {name:"COLOUR / ENH", sec:["enhancer","color"]},
  glitch: {name:"GLITCH LAB",   sec:["glitch"]},
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
    else if(linkChans){ chanBase.A[p.id]=p.def; chanBase.B[p.id]=p.def; morphOverride.add("A:"+p.id); morphOverride.add("B:"+p.id); }
    else { chanBase[activeChan][p.id] = p.def; morphOverride.add(activeChan+":"+p.id); }
  }
  if(id==="feedback"){ fbTrailMode=false; rescanMode=false; }
  if(id==="mixer"){ mixMode=0; wipeInv=false; const sm=document.getElementById("selMixMode"); if(sm) sm.value=0; }
  if(id==="frame"){ edgeMode=0; }
  if(id==="keyer"){ keyChroma=false; showKeyMatte=false; }
  refreshUI(); refreshToggles();
}

/* ---- section toggle rows ---- */
const toggleRefs = {};
function mkToggle(parent, id, labelFn, onClick){
  const b = document.createElement("button");
  b.textContent = labelFn();
  b.onclick = ()=>{ onClick(); b.textContent = labelFn(); };
  parent.appendChild(b);
  toggleRefs[id] = {btn:b, labelFn};
  return b;
}
function refreshToggles(){
  for(const k in toggleRefs) toggleRefs[k].btn.textContent = toggleRefs[k].labelFn();
  const fm = document.getElementById("fbModeBtn");
  if(fm) fm.textContent = "MODE: "+(fbTrailMode?"TRAIL":"MIX");
}
const MIXMODES = ["FADE","WIPE H","WIPE V","DIAGONAL","BOX","CIRCLE","SPLIT H","SPLIT V",
  "BLINDS V","BLINDS H","CLOCK","DIAG BARS","BLOCKS","LUMA KEY","CHROMA KEY",
  "ADD","DIFFERENCE","MULTIPLY","SCREEN","LIGHTEN"];
function sectionExtras(id, d){
  if(id==="mixer"){
    const tr = document.createElement("div"); tr.className="trow";

    const sel = document.createElement("select");
    sel.id = "selMixMode"; sel.style.flex = "1";
    sel.title = "Transition / blend mode between channel A and B";
    MIXMODES.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=m; sel.appendChild(o); });
    sel.value = mixMode;
    sel.onchange = ()=>{ mixMode = parseInt(sel.value); };
    tr.appendChild(sel);
    mkToggle(tr, "wipeInv", ()=>"WIPE: "+(wipeInv?"INV":"NORM"), ()=>{ wipeInv=!wipeInv; });
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Combines the two finished channels. Run the A>B FADER like a T-bar; wipes use SOFT for edge feather, DETAIL for blind/bar count, CTR X/Y for the origin. Give channel B a source first.";
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
    mkToggle(tr, "rescan", ()=>"RESCAN: "+(rescanMode?"FULL":"CLEAN"), ()=>{ rescanMode=!rescanMode; });
    d.appendChild(tr);
  }
  if(id==="keyer"){
    const tr = document.createElement("div"); tr.className="trow";
    mkToggle(tr, "keyMode", ()=>"KEY: "+(keyChroma?"CHROMA":"LUMA"), ()=>{ keyChroma=!keyChroma; });
    mkToggle(tr, "showKey", ()=>"VIEW MATTE: "+(showKeyMatte?"ON":"OFF"), ()=>{ showKeyMatte=!showKeyMatte; });
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Selects part of the image by brightness (or hue). Turn on VIEW MATTE: white = selected. KEY>FX glitches only the selection; KEY>FB grows feedback only there.";
    d.appendChild(note);
  }
  if(id==="frame"){
    const tr = document.createElement("div"); tr.className="trow";
    const EDGES = ["BLACK","TILE","MIRROR"];
    mkToggle(tr, "edgeMode", ()=>"EDGE: "+EDGES[edgeMode], ()=>{ edgeMode=(edgeMode+1)%3; });
    d.appendChild(tr);
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Frames this channel's picture inside the raster. Each channel has its own framing.";
    d.appendChild(note);
  }
  if(id==="glitch"){
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Digital corruption: pixel sorting, macroblock databending, halftone dropout, channel-driven warps.";
    d.appendChild(note);
  }
  if(id==="flow"){
    const note = document.createElement("div");
    note.style.cssText = "color:var(--dim); font-size:8.5px; padding:2px 0;";
    note.textContent = "Temporal smear: MOSH HOLD freezes frames while motion keeps pushing them, MELT drips, SWIRL advects, VECTOR TRASH shoves blocks.";
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
  panel.appendChild(d);
}
let refreshAudioDeviceUI = ()=>{};
function refreshAudioUI(){ for(const r of audioUIRefs) r.refresh(); }
function refreshLfoUI(){
  for(const k of LFOKEYS){
    const r = lfoUIRefs[k]; if(!r) continue;
    r.slider.value = Math.log10(lfoState[k].rate);
    r.val.textContent = lfoState[k].rate.toFixed(2);
    r.shp.value = lfoState[k].shape;
    if(r.sync){ r.sync.value = String(lfoState[k].sync||0); r.slider.disabled = (lfoState[k].sync||0)>0; }
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
function renderRoutes(){
  routesDiv.innerHTML = "";
  routes.forEach((r, i)=>{
    const row = document.createElement("div"); row.className="mrow";
    const src = document.createElement("select"); src.className="src";
    for(const m of MODSRC){ const o=document.createElement("option"); o.value=m.id; o.textContent=m.name; src.appendChild(o); }
    src.value = r.src; src.onchange = ()=>{ r.src = src.value; };
    const dst = document.createElement("select"); dst.className="dst";
    for(const p of PLIST){ const o=document.createElement("option"); o.value=p.id; o.textContent=p.name+" ("+p.sec+")"; dst.appendChild(o); }
    dst.value = r.dst; dst.onchange = ()=>{ r.dst = dst.value; syncChanSel(); };
    const chSel = document.createElement("select"); chSel.className="rch";
    for(const c of ["A","B","AB"]){ const o=document.createElement("option"); o.value=c; o.textContent=c; chSel.appendChild(o); }
    chSel.value = r.ch || "A";
    chSel.title = "Which channel this route modulates";
    chSel.onchange = ()=>{ r.ch = chSel.value; };
    const syncChanSel = ()=>{ chSel.style.visibility = (P[r.dst] && P[r.dst].master) ? "hidden" : "visible"; };
    syncChanSel();
    const amt = document.createElement("input");
    amt.type="range"; amt.min=-1; amt.max=1; amt.step=0.01; amt.value=r.amt;
    const av = document.createElement("span"); av.className="mamt"; av.textContent = (+r.amt).toFixed(2);
    amt.addEventListener("input", ()=>{ r.amt = parseFloat(amt.value); av.textContent = r.amt.toFixed(2); });
    const rm = document.createElement("button"); rm.className="rm"; rm.textContent="✕";
    rm.onclick = ()=>{ routes.splice(i,1); renderRoutes(); };
    row.appendChild(src); row.appendChild(chSel); row.appendChild(dst); row.appendChild(amt); row.appendChild(av); row.appendChild(rm);
    routesDiv.appendChild(row);
  });
}
document.getElementById("btnAddRoute").onclick = ()=>{
  routes.push({src:"lfo1", dst:"hWobble", amt:0.3, ch:activeChan});
  renderRoutes();
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
  if(st === 0xFA){ for(const k of LFOKEYS) lfoState[k].phase = 0; return; }
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
