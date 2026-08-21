/* ---------------- record / snapshot / fullscreen ---------------- */
let recorder=null, recChunks=[], recStart=0, recTimer=null;
const btnRec = document.getElementById("btnRec"), recTime = document.getElementById("recTime");
btnRec.onclick = toggleRec;
let recStream = null, recSize = null, recLocked = false;
/* about a quarter of a bit per pixel, which is generous for normal footage and
   merely adequate for this, bounded so a 4K recording does not ask for a gigabit */
function bitrateFor(w, h, fps){
  return Math.max(8_000_000, Math.min(160_000_000, Math.round(w*h*fps*0.25)));
}
/* the rate REC and the offline render work at, which is not the display rate
   and not necessarily the engine rate either */
function captureFps(){
  const e = document.getElementById("selCapFps");
  const v = e ? parseInt(e.value) : 30;
  return (v >= 1 && v <= 120) ? v : 30;
}
function toggleRec(){
  if(recorder){ recorder.stop(); return; }
  /* Each recording used to add another live capture stream to the canvas and
     never let go of it. Stopping the whole stream fixed that and introduced
     something worse: the audio track belongs to recDest and is shared, and is
     the same track object every time, so stopping it killed audio for the rest
     of the session. The first recording had sound and every one after it was
     silent. Only the video track is ours to stop. */
  if(recStream){ try{ recStream.getVideoTracks().forEach(t=>t.stop()); }catch(e){} }
  /* The canvas backing store is normally sized to the window, so recording
     captured whatever the pane happened to be - about 900 x 500 with the panel
     open - and upscaled it. That is the softness. Pin it to the processing
     raster for the duration, the way the offline render already does, so 1080p
     processing records 1080p and 4K records 4K. The CSS size does not change,
     so nothing moves on screen. */
  recSize = {w: canvas.width, h: canvas.height};
  canvas.width = procW; canvas.height = procH;
  recLocked = true;
  const capFps = captureFps();
  const stream = recStream = canvas.captureStream(capFps);
  /* Whatever is being listened to goes into the recording: the soundtrack of
     the clip, an audio file loaded for reactivity, or a live input. This used
     to test for the soundtrack alone, so building a piece against a track and
     then recording it handed back a silent video with nothing to say why.
     All three sources already run into recDest; only the gate was wrong. */
  let recAudio = false;
  if(audioCtx && recDest && audioMode !== "off"){
    const tracks = recDest.stream.getAudioTracks();
    for(const tr of tracks) stream.addTrack(tr);
    recAudio = tracks.length > 0;
  }
  let mime = "";
  for(const m of ["video/mp4;codecs=avc1.640028,mp4a.40.2","video/mp4;codecs=avc1.42E01E,mp4a.40.2",
                  "video/mp4;codecs=avc1.640028","video/mp4",
                  "video/webm;codecs=vp9,opus","video/webm;codecs=vp9","video/webm;codecs=vp8,opus","video/webm"]){
    if(MediaRecorder.isTypeSupported(m)){ mime=m; break; }
  }
  const isMp4 = mime.indexOf("mp4") >= 0;
  recChunks = [];
  /* Glitch material is about the worst case an encoder ever sees: every frame
     is high-entropy and almost nothing survives between frames. A flat 16 Mbit
     was thin at 1080p and meaningless at 4K, so scale it with the pixel rate. */
  recorder = new MediaRecorder(stream, {mimeType:mime, videoBitsPerSecond: bitrateFor(procW, procH, capFps)});
  recorder.ondataavailable = e=>{ if(e.data.size) recChunks.push(e.data); };
  recorder.onstop = ()=>{
    const blob = new Blob(recChunks, {type: isMp4 ? "video/mp4" : "video/webm"});
    dl(URL.createObjectURL(blob), "bendr-"+stamp()+(isMp4?".mp4":".webm"));
    recorder=null; btnRec.classList.remove("rec-on"); btnRec.textContent="● REC";
    if(recStream){ try{ recStream.getVideoTracks().forEach(t=>t.stop()); }catch(e){} recStream=null; }
    recLocked = false;
    if(recSize){ canvas.width = recSize.w; canvas.height = recSize.h; recSize = null; markSizeDirty(); }
    recTime.style.display="none"; clearInterval(recTimer);
    /* say whether the sound made it, because a silent file discovered later is
       the expensive way to find out that AUDIO REACT was set to OFF */
    toast("Recording saved, "+procW+"\u00d7"+procH+" @"+capFps+"fps, "
          + (recAudio ? "with audio" : "no audio — AUDIO REACT is OFF")
          + " ("+(blob.size/1048576).toFixed(1)+" MB "+(isMp4?"MP4":"WebM — this browser can't record MP4; use RENDER for MP4")+")");
  };
  recorder.start(250);
  recStart = performance.now();
  btnRec.classList.add("rec-on"); btnRec.textContent="■ STOP";
  recTime.style.display="inline";
  recTimer = setInterval(()=>{
    const s = Math.floor((performance.now()-recStart)/1000);
    recTime.textContent = Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
  }, 250);
}
/* the drawing buffer is only valid inside the frame callback now, so a still
   is a request that the next frame fulfils */
let grabQueue = [];
function serviceGrabs(){
  if(!grabQueue.length) return;
  const q = grabQueue; grabQueue = [];
  for(const fn of q){ try{ fn(canvas); }catch(e){ console.error(e); } }
}
function grabCanvas(fn){ grabQueue.push(fn); }
/* so a test, or anything else outside the loop, can still read a frame */
window.__grab = (type)=>new Promise(res=>grabCanvas(c=>res(c.toDataURL(type||"image/png"))));
/* SNAP used to hand back whatever the display canvas happened to be. That is
   the size of the pane on screen and has nothing to do with the raster the
   picture was processed at, so a still taken from a half-width window came out
   around nine hundred pixels wide while the engine had been running at 1920.
   It renders one frame at the processing resolution now, the same way the
   offline render does, so a patch at 1080p always saves 1920x1080.

   While the recorder is running it takes the picture as it stands instead. It
   is already the right size, because REC pins the canvas to the same raster for
   the duration, and both the recorder and the pop-out hold a captureStream off
   this canvas: resizing it underneath a MediaRecorder mid-take is a good way to
   end up with a broken file. */
function snapStill(){
  if(recorder){
    grabCanvas(c=>c.toBlob(b=>{
      if(!b) return;
      dl(URL.createObjectURL(b), "bendr-"+stamp()+".png");
      toast("Still saved  " + c.width + "x" + c.height);
    }, "image/png"));
    return;
  }
  const W = procW, H = procH;
  const oldW = canvas.width, oldH = canvas.height;
  const wasLocked = recLocked;
  let shot = null;
  try{
    recLocked = true;                  /* the same latch REC uses to own the size */
    canvas.width = W; canvas.height = H;
    renderFrame(performance.now()/1000, 1/Math.max(1, captureFps()));
    /* copy it out in the same task as the draw: preserveDrawingBuffer is off,
       so the buffer stops being readable the moment this one yields */
    shot = document.createElement("canvas");
    shot.width = W; shot.height = H;
    shot.getContext("2d").drawImage(canvas, 0, 0);
  }catch(e){
    shot = null;
    toast("Still failed: " + (e && e.message), true);
  }finally{
    canvas.width = oldW; canvas.height = oldH;
    recLocked = wasLocked;
    markSizeDirty();
  }
  if(!shot) return;
  shot.toBlob(b=>{
    if(!b){ toast("Still failed", true); return; }
    dl(URL.createObjectURL(b), "bendr-"+stamp()+".png");
    toast("Still saved  " + W + "x" + H);
  }, "image/png");
}
document.getElementById("btnSnap").onclick = snapStill;
document.getElementById("btnFull").onclick = ()=>{
  const w = document.getElementById("canvasWrap");
  if(document.fullscreenElement) document.exitFullscreen();
  else w.requestFullscreen();
};

/* pop-out output window — the app itself opened in #output receiver mode.
   The popout runs its own render-driving loop, so fullscreening it (which
   occludes and throttles this window) no longer freezes the picture. */
let popWin = null, outStream = null, outTrack = null;
window.__getOutputStream = ()=>{
  if(!outStream){
    outStream = canvas.captureStream(0);   // frames pushed manually every tick
    outTrack = outStream.getVideoTracks()[0];
  }
  return outStream;
};
const btnPop = document.getElementById("btnPop");
btnPop.onclick = ()=>{
  if(popWin && !popWin.closed){ popWin.close(); popWin = null; btnPop.classList.remove("on"); return; }
  if(location.protocol.indexOf("http") === 0){
    /* served over http(s): open the app itself in #output receiver mode (clean URL) */
    popWin = window.open(location.href.split("#")[0]+"#output", "bendr_output", "width=1280,height=720");
    if(!popWin){ toast("Popup blocked — allow popups for this page", true); return; }
  } else {
    /* file:// — separate files are cross-origin, so build the output page in-window */
    popWin = window.open("", "bendr_output", "width=1280,height=720");
    if(!popWin){ toast("Popup blocked — allow popups for this page", true); return; }
    const pd = popWin.document;
    pd.title = "BENDR — OUTPUT";
    pd.body.style.cssText = "margin:0;background:#000;overflow:hidden;cursor:none;";
    const pv = pd.createElement("video");
    pv.muted = true; pv.autoplay = true; pv.playsInline = true;
    pv.style.cssText = "width:100vw;height:100vh;object-fit:contain;display:block;";
    pv.srcObject = window.__getOutputStream();
    pd.body.appendChild(pv);
    pv.play().catch(()=>{});
    pv.ondblclick = ()=>{
      if(pd.fullscreenElement) pd.exitFullscreen();
      else pv.requestFullscreen().catch(()=>{});
    };
    /* drive the render loop from the popout: when it goes fullscreen and occludes
       the main window, Chrome throttles the main rAF — the popout keeps ticking */
    const w = popWin;
    (function drive(){
      if(!w || w.closed) return;
      try{ w.requestAnimationFrame(drive); }catch(e){ return; }
      doTick();
    })();
  }
  const closePoll = setInterval(()=>{
    if(!popWin || popWin.closed){ clearInterval(closePoll); popWin = null; btnPop.classList.remove("on"); }
  }, 800);
  btnPop.classList.add("on");
  toast("Output window open — double-click it for fullscreen, or point OBS at it");
};

/* big performance randomize/mutate pads */
/* BYPASS was wired to nothing. The button had no handler at all and the B key
   called a setBypass that was never defined, so it threw on every press and
   every release, and the one control that answers "what have I actually done
   to this picture" had never worked. It is a momentary: held, not latched,
   because you want to glance at the clean signal and let go. */
function setBypass(on){
  bypass = on ? 1 : 0;
  const b = document.getElementById("btnBypass");
  if(b) b.classList.toggle("on", !!on);
  document.body.classList.toggle("bypassing", !!on);
}
{
  const b = document.getElementById("btnBypass");
  const dn = e=>{ e.preventDefault(); setBypass(true); };
  const up = ()=>setBypass(false);
  b.addEventListener("mousedown", dn);
  b.addEventListener("touchstart", dn, {passive:false});
  b.addEventListener("mouseup", up);
  b.addEventListener("mouseleave", up);
  b.addEventListener("touchend", up);
  /* a window that loses focus mid-hold would otherwise stay bypassed forever */
  window.addEventListener("blur", up);
}

document.getElementById("btnRnd").onclick = randomizeAll;
document.getElementById("btnMut").onclick = mutate;

/* what a roll is allowed to touch. A preference rather than part of the patch,
   so it lives with the browser and survives a load. */
function refreshRndOpts(){
  const set = (id, on)=>{ const b=document.getElementById(id); if(b) b.classList.toggle("on", !!on); };
  set("rndScopeActive", rndOpts.scope === "active");
  set("rndScopeAll",    rndOpts.scope === "all");
  set("rndScopeLink",   rndOpts.scope === "link");
  set("rndKeepSrc", rndOpts.keepSrc);
  set("rndKeepMod", rndOpts.keepMod);
  set("rndKeepMix", rndOpts.keepMix);
  try{ localStorage.setItem("bendr.rndopts", JSON.stringify(rndOpts)); }catch(e){}
}
try{
  const saved = JSON.parse(localStorage.getItem("bendr.rndopts") || "null");
  if(saved && typeof saved === "object"){
    if(["active","all","link"].indexOf(saved.scope) >= 0) rndOpts.scope = saved.scope;
    rndOpts.keepSrc = !!saved.keepSrc; rndOpts.keepMod = !!saved.keepMod; rndOpts.keepMix = !!saved.keepMix;
  }
}catch(e){}
for(const [id, fn] of [
  ["rndScopeActive", ()=>{ rndOpts.scope = "active"; }],
  ["rndScopeAll",    ()=>{ rndOpts.scope = "all"; }],
  ["rndScopeLink",   ()=>{ rndOpts.scope = "link"; }],
  ["rndKeepSrc",     ()=>{ rndOpts.keepSrc = !rndOpts.keepSrc; }],
  ["rndKeepMod",     ()=>{ rndOpts.keepMod = !rndOpts.keepMod; }],
  ["rndKeepMix",     ()=>{ rndOpts.keepMix = !rndOpts.keepMix; }],
]){
  const b = document.getElementById(id);
  if(b) b.onclick = ()=>{ fn(); refreshRndOpts(); };
}
refreshRndOpts();


/* bend buttons: mouse + touch */
for(const b of document.querySelectorAll(".bend[data-bend]")){
  const id = b.dataset.bend;
  const dn = e=>{ e.preventDefault(); bendHeld[id]=true; b.classList.add("held"); };
  const up = ()=>{ bendHeld[id]=false; b.classList.remove("held"); };
  b.addEventListener("mousedown", dn); b.addEventListener("touchstart", dn, {passive:false});
  b.addEventListener("mouseup", up); b.addEventListener("mouseleave", up); b.addEventListener("touchend", up);
}


/* ---------------- multiview ---------------- */
function setMultiView(on){
  multiView = on;
  document.body.classList.toggle("multi", on);
  const b = document.getElementById("btnMulti");
  if(b) b.classList.toggle("on", on);
}
document.getElementById("btnMulti").onclick = ()=>setMultiView(!multiView);

/* ---------------- snapshot bank ----------------
   Eight whole-panel states with a glide time. Recall crossfades every value
   from where it is now to where the slot says, which is the difference between
   a preset and a performance move. */
const SNAP_N = 8;
const snapSlots = new Array(SNAP_N).fill(null);
let snapStoreArm = false, snapGlide = 0.6;
let glideFrom = null, glideTo = null, glideT = 0, glideLen = 0;
function snapCapture(){
  const st = snapshotAll();
  return {chan:st.chan, master:st.master,
    g:{mixMode, mixMode2, mixModeM, wipeInv, wipeInv2, wipeInvM,
       mixBlend, mixBlend2, mixBlendM, mixKey, mixKey2, mixKeyM,
       osdMode, osdDate, fbWrap, fbMirror, fbBlend,
       fbNL, fbInvert, fbTrailMode, rescanMode, keyChroma, edgeMode, fieldSrc, flowField, flowEdge,
       outModel, b1:busSrc.b1.slice(), b2:busSrc.b2.slice()},
    chain: chainOrder.slice(), stages: {...stageEnabled}};
}
function snapStore(i){
  snapSlots[i] = snapCapture();
  refreshSnapUI();
  toast("Snapshot "+(i+1)+" stored");
}
function snapRecall(i){
  const st = snapSlots[i];
  if(!st){ toast("Snapshot "+(i+1)+" is empty — arm STORE and click it", true); return; }
  pushHistory();
  /* discrete things jump; continuous things glide */
  const g = st.g || {};
  if(g.b1) busSrc.b1 = g.b1.slice();
  if(g.b2) busSrc.b2 = g.b2.slice();
  for(const k of ["mixMode","mixMode2","mixModeM","mixBlend","mixBlend2","mixBlendM",
                  "mixKey","mixKey2","mixKeyM","osdMode","osdDate","fbWrap","fbMirror","fbBlend","fbNL",
                  "edgeMode","fieldSrc","flowField","flowEdge","outModel"]){
    if(g[k] !== undefined) eval(k+" = g."+k);
  }
  for(const k of ["wipeInv","wipeInv2","wipeInvM","fbInvert","fbTrailMode","rescanMode","keyChroma"]){
    if(g[k] !== undefined) eval(k+" = g."+k);
  }
  if(st.chain) chainOrder = st.chain.slice();
  if(st.stages) stageEnabled = {...stageEnabled, ...st.stages};
  if(snapGlide < 0.02){
    applySnapValues(st, 1, null);
    glideFrom = glideTo = null;
  } else {
    glideFrom = snapCapture(); glideTo = st; glideT = 0; glideLen = snapGlide;
  }
  morphOverride.clear();
  refreshUI(); refreshToggles(); renderChain(); refreshSnapUI(); refreshBusUI();
  toast("Snapshot "+(i+1)+(snapGlide>=0.02 ? " — gliding over "+snapGlide.toFixed(1)+"s" : ""));
}
function applySnapValues(to, m, from){
  for(const ch of CHANNELS){
    const t = to.chan && to.chan[ch]; if(!t) continue;
    const f = from && from.chan && from.chan[ch];
    for(const p of CLIST){
      if(t[p.id] === undefined) continue;
      const a = f && f[p.id] !== undefined ? f[p.id] : chanBase[ch][p.id];
      chanBase[ch][p.id] = a + (t[p.id]-a)*m;
    }
  }
  if(to.master) for(const p of MLIST){
    if(to.master[p.id] === undefined) continue;
    const a = from && from.master && from.master[p.id] !== undefined ? from.master[p.id] : mBase[p.id];
    mBase[p.id] = a + (to.master[p.id]-a)*m;
  }
}
/* a glide in flight must not keep writing over a preset, an init or an undo
   that happens while it is travelling */
function cancelGlide(){ glideFrom = glideTo = null; }
function updateGlide(dt){
  if(!glideTo) return;
  glideT = Math.min(1, glideT + dt/Math.max(0.02, glideLen));
  const m = glideT*glideT*(3-2*glideT);
  applySnapValues(glideTo, m, glideFrom);
  if(glideT >= 1){ glideFrom = glideTo = null; refreshUI(); }
}
function refreshSnapUI(){
  for(let i=0;i<SNAP_N;i++){
    const b = document.getElementById("snap"+i);
    if(b) b.classList.toggle("full", !!snapSlots[i]);
  }
  const sb = document.getElementById("snapStoreBtn");
  if(sb) sb.classList.toggle("on", snapStoreArm);
}
window.__animateParam = function(pid){
  const m = mkLfo({rate:0.25, shape:"sine"});
  mods.push(m); rebuildMODSRC(); buildModPage();
  addRoute(m.id, pid);
  toast(m.name+" \u2192 "+P[pid].name+" \u2014 shape it on the MOD tab");
};
window.__snapHit = i=>{ if(snapStoreArm){ snapStore(i); snapStoreArm=false; } else snapRecall(i); refreshSnapUI(); };

/* ---------------- performance recorder ----------------
   Samples every base value 24 times a second and stores only what changed, so
   a long take is a few hundred kilobytes rather than a video. Playing it back
   moves the controls, which means the same performance can be replayed against
   different footage. */
const perfRec = {mode:"off", data:[], t:0, len:0, loop:true, cursor:0, acc:0};
const PERF_HZ = 24;
function perfFlat(){
  const o = {};
  for(const ch of CHANNELS){ const cb = chanBase[ch]; for(const p of CLIST) o[ch+":"+p.id] = cb[p.id]; }
  for(const p of MLIST) o["M:"+p.id] = mBase[p.id];
  for(const k in bendHeld) o["#"+k] = bendHeld[k] ? 1 : 0;
  o["#mix"] = mixMode; o["#mix2"] = mixMode2; o["#mixM"] = mixModeM;
  o["#wrap"] = fbWrap; o["#nl"] = fbNL; o["#blend"] = fbBlend; o["#mir"] = fbMirror;
  o["#ff"] = flowField; o["#fe"] = flowEdge; o["#model"] = outModel; o["#field"] = fieldSrc;
  return o;
}
function perfApply(k, v){
  if(k.charAt(0) === "#"){
    const n = k.slice(1);
    if(n in bendHeld){ bendHeld[n] = !!v; markBend(n, !!v); return; }
    const map = {mix:"mixMode", mix2:"mixMode2", mixM:"mixModeM", wrap:"fbWrap", nl:"fbNL",
                 blend:"fbBlend", mir:"fbMirror", ff:"flowField", fe:"flowEdge",
                 model:"outModel", field:"fieldSrc"};
    if(map[n]) eval(map[n]+" = v");
    return;
  }
  const i = k.indexOf(":");
  const ch = k.slice(0,i), id = k.slice(i+1);
  if(ch === "M") mBase[id] = v; else if(chanBase[ch]) chanBase[ch][id] = v;
}
let perfLast = null;
function perfStart(){
  perfRec.data = [{t:0, v:perfFlat()}];
  perfLast = {...perfRec.data[0].v};
  perfRec.mode = "rec"; perfRec.t = 0; perfRec.acc = 0; perfRec.cursor = 0;
  refreshPerfUI(); toast("Recording performance — every control you touch is being written down");
}
function perfStop(){
  if(perfRec.mode === "rec") perfRec.len = perfRec.t;
  perfRec.mode = "off"; refreshPerfUI();
}
function perfPlay(){
  if(!perfRec.data.length){ toast("Nothing recorded yet", true); return; }
  perfRec.mode = "play"; perfRec.t = 0; perfRec.cursor = 0; perfRec.acc = 0;
  /* the opening keyframe puts the rig back where the take started */
  const f0 = perfRec.data[0];
  for(const k in f0.v) perfApply(k, f0.v[k]);
  refreshUI(); refreshToggles(); refreshPerfUI();
}
function perfClear(){ perfRec.data = []; perfRec.len = 0; perfRec.mode = "off"; refreshPerfUI(); }
function updatePerf(dt){
  if(perfRec.mode === "off") return;
  perfRec.t += dt;
  if(perfRec.mode === "rec"){
    perfRec.acc += dt;
    if(perfRec.acc < 1/PERF_HZ) return;
    perfRec.acc = 0;
    const now = perfFlat(), d = {};
    let n = 0;
    for(const k in now) if(now[k] !== perfLast[k]){ d[k] = now[k]; perfLast[k] = now[k]; n++; }
    if(n) perfRec.data.push({t:perfRec.t, v:d});
    perfRec.len = perfRec.t;
    if(perfRec.t > 900) perfStop();     /* fifteen minutes is plenty */
  } else {
    while(perfRec.cursor < perfRec.data.length && perfRec.data[perfRec.cursor].t <= perfRec.t){
      const f = perfRec.data[perfRec.cursor++];
      for(const k in f.v) perfApply(k, f.v[k]);
    }
    if(perfRec.cursor >= perfRec.data.length && perfRec.t >= perfRec.len){
      if(perfRec.loop){
        perfRec.t = 0; perfRec.cursor = 0;
        const f0 = perfRec.data[0];
        for(const k in f0.v) perfApply(k, f0.v[k]);
      } else { perfRec.mode = "off"; }
    }
    refreshUIThrottled();
  }
  refreshPerfUI();
}
let uiThrottle = 0;
function refreshUIThrottled(){
  if(++uiThrottle % 6) return;
  refreshUI();
}
function refreshPerfUI(){
  const st = document.getElementById("perfState");
  if(!st) return;
  const m = perfRec.mode;
  st.textContent = (m==="off" ? (perfRec.len ? "TAKE "+perfRec.len.toFixed(1)+"s" : "NO TAKE")
                  : m==="rec" ? "REC "+perfRec.t.toFixed(1)+"s"
                  : "PLAY "+perfRec.t.toFixed(1)+" / "+perfRec.len.toFixed(1)+"s");
  const rb = document.getElementById("perfRecBtn"), pb = document.getElementById("perfPlayBtn"),
        lb = document.getElementById("perfLoopBtn");
  if(rb) rb.classList.toggle("rec-on", m==="rec");
  if(pb) pb.classList.toggle("on", m==="play");
  if(lb) lb.classList.toggle("on", perfRec.loop);
}

/* Crash and reload insurance. A tab crash, an accidental refresh or a laptop
   going flat used to lose the patch, the eight snapshots and the take. */
let patchDirty = 0, autosaveLastJson = "";
function writeAutosave(){
  /* This was gated on a counter that only pushHistory ever incremented, so the
     autosave only wrote when an undo entry was pushed. Everything that does not
     push one — changing a channel's source, every mode toggle, the shader
     editor, the text page — was never recorded, and reopening the window came
     back with the source you had two edits ago. Comparing the payload cannot
     miss anything and cannot need a new call site every time something is
     added: one stringify every seven seconds is nothing next to what the
     render loop is doing. */
  try{
    const st = captureState();
    st.snapSlots = snapSlots;
    st.snapGlide = snapGlide;
    const body = JSON.stringify(st);
    if(body === autosaveLastJson) return;
    autosaveLastJson = body;
    localStorage.setItem("bendr.autosave", '{"t":' + Date.now() + ',"st":' + body + '}');
  }catch(e){}
}
setInterval(writeAutosave, 7000);
window.addEventListener("beforeunload", writeAutosave);
function restoreAutosave(){
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem("bendr.autosave") || "null"); }catch(e){}
  if(!saved || !saved.st) return false;
  /* anything older than half a day is more likely to confuse than to help */
  if(Date.now() - (saved.t||0) > 12*3600*1000) return false;
  try{
    pushHistory();
    restoreState(saved.st);
    toast("Picked up where you left off \u2014 press Z for a clean start");
    return true;
  }catch(e){ return false; }
}

/* keyboard */
/* A select that has been used keeps focus, and typingNow then swallows every
   keyboard shortcut - so choosing a transition and then reaching for a bend pad
   did nothing at all. Hand focus back as soon as the choice is made. */
document.addEventListener("change", e=>{
  if(e.target && e.target.tagName === "SELECT") e.target.blur();
}, true);
function typingNow(e){
  const t = e.target;
  return t && (t.tagName==="INPUT" || t.tagName==="SELECT" || t.tagName==="TEXTAREA" || t.isContentEditable);
}
window.addEventListener("keydown", e=>{
  if(typingNow(e)) return;
  const k = e.key.toLowerCase();
  /* with shift held e.key is "!" not "1", so this has to come off e.code */
  if(e.shiftKey && /^Digit[1-8]$/.test(e.code||"")){ window.__snapHit(+e.code.slice(5)-1); return; }
  if(e.shiftKey && (e.code === "KeyR")){ toggleRec(); return; }
  if(!e.shiftKey && k>="1" && k<="9"){ loadPreset(+k-1); return; }
  /* the panic key: empties every buffer that feeds itself, touching no controls */
  if(k==="0"){ flushBuffers(); return; }
  if(k==="v"){ setMultiView(!multiView); return; }
  if(k===" "){ e.preventDefault(); randomizeAll(); return; }
  if(k==="m"){ mutate(); return; }
  if(k==="z"){ if(e.shiftKey) redo(); else undo(); return; }
  if(k==="f"){ document.getElementById("btnFull").click(); return; }
  if(k==="s"){ document.getElementById("btnSnap").click(); return; }
  if(k==="h"){ if(help.classList.contains("show")) help.classList.remove("show"); else window.__openHelp(); return; }
  if(e.key === "Escape" && help.classList.contains("show")){ help.classList.remove("show"); return; }
  /* / used to focus the panel filter, which only ever searched the panel. It
     opens the search that finds anything, anywhere; the filter box is still
     there to narrow what is in front of you. */
  if(k==="/"){ e.preventDefault(); if(window.__findParam) window.__findParam(); else if(window.__focusFilter) window.__focusFilter(); return; }
  if(k==="d"){ setDock(dockTab==="mod" ? "matrix" : "mod"); return; }
  if(k==="p"){ btnPlay.click(); return; }
  if(k==="b"){ if(!e.repeat) setBypass(true); return; }
  if(k==="q"){ bendHeld.sync=true; markBend("sync",true); }
  if(k==="w"){ bendHeld.roll=true; markBend("roll",true); }
  if(k==="e"){ bendHeld.rainbow=true; markBend("rainbow",true); }
  if(k==="r" && !e.metaKey && !e.ctrlKey){ if(e.repeat) return; bendHeld.drop=true; markBend("drop",true); }
  if(k==="t"){ bendHeld.melt=true; markBend("melt",true); }
  if(k==="y"){ bendHeld.kill=true; markBend("kill",true); }
});
window.addEventListener("keyup", e=>{
  if(typingNow(e)) return;
  const k = e.key.toLowerCase();
  if(k==="b") setBypass(false);
  if(k==="q"){ bendHeld.sync=false; markBend("sync",false); }
  if(k==="w"){ bendHeld.roll=false; markBend("roll",false); }
  if(k==="e"){ bendHeld.rainbow=false; markBend("rainbow",false); }
  if(k==="r"){ bendHeld.drop=false; markBend("drop",false); }   /* recording is SHIFT+R */
  if(k==="t"){ bendHeld.melt=false; markBend("melt",false); }
  if(k==="y"){ bendHeld.kill=false; markBend("kill",false); }
});
function markBend(id, on){
  const el = document.querySelector(".bend[data-bend='"+id+"']");
  if(el) el.classList.toggle("held", on);
}

/* drag & drop */
const dropHint = document.getElementById("dropHint");
function isFileDrag(e){
  if(dragStage) return false;                       /* reordering the chain, not dropping a file */
  const t = e.dataTransfer && e.dataTransfer.types;
  return !t || Array.prototype.indexOf.call(t, "Files") !== -1;
}
window.addEventListener("dragover", e=>{
  if(!isFileDrag(e)) return;
  e.preventDefault(); dropHint.classList.add("show");
});
window.addEventListener("dragleave", e=>{ if(e.relatedTarget===null) dropHint.classList.remove("show"); });
window.addEventListener("drop", e=>{
  dropHint.classList.remove("show");
  if(!isFileDrag(e)) return;
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f, activeChan);
});


/* ---- codec mosh ---------------------------------------------------------
   Datamoshing done the way it is actually done, rather than approximated with
   a shader. The finished picture is encoded to video every frame; the encoded
   chunks are damaged on the way past; the damaged stream is decoded and the
   result is what you see.

   The whole effect rests on one fact about how video is stored. A keyframe is
   a complete picture. Everything between keyframes is only the difference from
   the frame before, carried mostly as motion vectors: "this block moved here".
   Throw the keyframes away and the decoder never gets a new picture, so it
   keeps applying new movement to an old one. The motion of the current shot
   paints itself onto a picture from before the cut. That is the bloom.

   Nothing here is speculative about the codec: we hand a VideoEncoder real
   frames and hand a VideoDecoder real chunks, and every artefact is the
   decoder's own reaction to a stream it cannot fully resolve. The cost is that
   the pipeline is asynchronous, so the moshed picture lands a frame or two
   behind, and that a decoder pushed this way will occasionally give up, which
   is why there is a resurrection policy below rather than a try/catch.        */

let moshEnc = null, moshDec = null, moshTex = null;
let moshW = 0, moshH = 0;                 /* size the pair was configured for */
let moshCodec = "";                       /* which codec we settled on */
let moshSeen = false;                     /* has a key chunk reached the decoder */
let moshNeedKey = false;                  /* force a key on the next encode */
let moshRing = [];                        /* recent deltas, for re-injection */
let moshLast = null;
let moshStamp = 0;                        /* monotonic stamps for the decoder */
let moshCount = 0;                        /* frames handed to the encoder */
let moshFails = 0;                        /* decoder deaths since the last good run */
let moshGood = 0;                         /* frames decoded since the last death */
let moshBuilding = false;
let moshHasFrame = false;
let moshOff = false;                      /* given up: unsupported or too fragile */
let moshNote = "";
const MOSH_SUPPORTED = (typeof VideoEncoder === "function" && typeof VideoDecoder === "function"
                        && typeof VideoFrame === "function" && typeof EncodedVideoChunk === "function");

/* deterministic-ish cheap noise; Math.random is fine here, this is a fault
   generator and nothing downstream needs to reproduce it */
function moshRnd(){ return Math.random(); }

function moshReset(){
  moshSeen = false; moshNeedKey = true; moshRing.length = 0; moshLast = null;
  moshStamp = 0; moshGood = 0;
}

function moshStop(){
  try{ if(moshEnc && moshEnc.state !== "closed") moshEnc.close(); }catch(e){}
  try{ if(moshDec && moshDec.state !== "closed") moshDec.close(); }catch(e){}
  moshEnc = null; moshDec = null; moshW = 0; moshH = 0; moshHasFrame = false;
  moshReset();
}

/* The decoder is the fragile half: feed it a stream with holes in it for long
   enough and it will eventually error rather than produce a frame. Rebuilding
   it and demanding a fresh keyframe is the correct response, and it is also
   visible in a good way — the picture snaps back and starts falling apart
   again. We only give up entirely if it dies repeatedly without ever managing
   a run of good frames, which means the environment cannot do this at all. */
function moshDied(){
  moshFails++;
  if(moshGood > 30) moshFails = 1;        /* it was working; treat as a one-off */
  if(moshFails > 6){
    moshOff = true; moshNote = "decoder unavailable";
    moshStop();
    return;
  }
  try{ if(moshDec && moshDec.state !== "closed") moshDec.close(); }catch(e){}
  moshDec = null;
  moshReset();
}

async function moshBuild(w, h){
  if(moshBuilding || moshOff || !MOSH_SUPPORTED) return;
  moshBuilding = true;
  moshStop();
  /* even dimensions, and small enough that a software encoder keeps up */
  w = Math.max(64, w & ~1); h = Math.max(64, h & ~1);
  const CANDIDATES = [
    {codec:"avc1.42001f", extra:{avc:{format:"annexb"}}, dec:{}},
    {codec:"vp8",         extra:{},                      dec:{}},
    {codec:"vp09.00.10.08", extra:{},                    dec:{}},
  ];
  try{
    for(const c of CANDIDATES){
      const ecfg = Object.assign({codec:c.codec, width:w, height:h, framerate:30,
                                  bitrate:2_000_000, latencyMode:"realtime"}, c.extra);
      let ok = false;
      try{ ok = (await VideoEncoder.isConfigSupported(ecfg)).supported; }catch(e){ ok = false; }
      if(!ok) continue;
      const dcfg = Object.assign({codec:c.codec, codedWidth:w, codedHeight:h,
                                  optimizeForLatency:true}, c.dec);
      try{ if(!(await VideoDecoder.isConfigSupported(dcfg)).supported) continue; }catch(e){ continue; }
      const enc = new VideoEncoder({output:(chunk)=>moshChunk(chunk), error:()=>{ moshStop(); }});
      const dec = new VideoDecoder({output:(frame)=>{ moshGood++; moshUpload(frame); },
                                    error:()=>{ moshDied(); }});
      enc.configure(ecfg); dec.configure(dcfg);
      moshEnc = enc; moshDec = dec; moshW = w; moshH = h; moshCodec = c.codec;
      moshReset();
      moshNote = c.codec;
      break;
    }
    if(!moshEnc){ moshOff = true; moshNote = "no codec"; }
  }catch(e){
    moshOff = true; moshNote = "unavailable";
  }
  moshBuilding = false;
}

/* EncodedVideoChunk is immutable and single-use as far as timestamps go, so we
   keep our own copies: the bytes plus the type. Re-emitting means building a
   fresh chunk with the next stamp, which is what lets the same difference be
   applied more than once. */
function moshCopy(c){
  const b = new Uint8Array(c.byteLength);
  c.copyTo(b);
  return {type:c.type, data:b};
}
function moshEmit(rec){
  if(!moshDec || moshDec.state !== "configured") return;
  if(moshDec.decodeQueueSize > 6) return;        /* never build latency */
  moshStamp += 33333;
  try{
    moshDec.decode(new EncodedVideoChunk({type:rec.type, timestamp:moshStamp,
                                          duration:33333, data:rec.data}));
  }catch(e){ moshDied(); }
}

function moshChunk(chunk){
  if(!moshDec) return;
  const rec = moshCopy(chunk);
  const rate = mCur.moshRate;
  if(rec.type === "key"){
    /* the decoder needs exactly one whole picture to have something to damage */
    if(!moshSeen || moshNeedKey){ moshSeen = true; moshNeedKey = false; moshEmit(rec); return; }
    if(moshRnd() < mCur.moshKey) return;         /* the removal that makes the effect */
    moshEmit(rec);
    return;
  }
  moshRing.push(rec);
  if(moshRing.length > 90) moshRing.shift();
  moshLast = rec;
  if(!moshSeen) return;                          /* nothing to apply movement to yet */
  if(moshRnd() < mCur.moshSkip*rate) return;     /* the picture stalls */
  moshEmit(rec);
  if(moshRnd() < mCur.moshHold*rate){
    /* the same movement applied again, to a picture it was never measured from */
    const n = 1 + Math.floor(moshRnd()*mCur.moshHold*5);
    for(let i=0;i<n;i++) moshEmit(rec);
  }
  if(moshRnd() < mCur.moshShuffle*rate && moshRing.length > 10){
    moshEmit(moshRing[Math.floor(moshRnd()*(moshRing.length-6))]);
  }
}

function moshUpload(frame){
  try{
    if(!moshTex){
      moshTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, moshTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, moshTex);
    /* the decoded frame is top-down; everything else here is bottom-up */
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    moshHasFrame = true;
  }catch(e){ /* a frame we cannot upload is a frame we skip */ }
  try{ frame.close(); }catch(e){}
}

/* called once per rendered frame, with the finished picture on the canvas */
function moshPush(){
  if(moshOff || !MOSH_SUPPORTED) return;
  /* the offline render advances frames as fast as it can, and the codec pair is
     asynchronous, so feeding it there would queue without bound and land the
     wrong picture on the wrong frame. It is a realtime stage. */
  if(offline){ if(moshEnc) moshStop(); return; }
  if(mCur.moshAmt < 0.003){
    if(moshEnc) moshStop();
    return;
  }
  /* Keep the round trip cheap. A software encoder has to finish inside a frame
     or the queue grows without bound and the picture falls further behind every
     second, so this is capped well below the processing resolution. It also
     happens to be the right look: the artefact is the codec, not the detail. */
  const tw = Math.min(640, canvas.width), th = Math.round(tw * canvas.height / Math.max(1,canvas.width));
  if(!moshEnc || Math.abs(moshW - (tw & ~1)) > 1 || Math.abs(moshH - (th & ~1)) > 1){
    moshBuild(tw, th);
    return;
  }
  if(!moshDec){                               /* rebuilt after a death */
    try{
      moshDec = new VideoDecoder({output:(frame)=>{ moshGood++; moshUpload(frame); },
                                  error:()=>{ moshDied(); }});
      moshDec.configure({codec:moshCodec, codedWidth:moshW, codedHeight:moshH, optimizeForLatency:true});
      moshNeedKey = true; moshSeen = false;
    }catch(e){ moshDied(); return; }
  }
  if(moshEnc.state !== "configured") return;
  if(moshEnc.encodeQueueSize > 2) return;
  /* bitrate starve: the encoder spends what it has on movement and lets the
     detail go, which is where the blocking comes from */
  const q = mCur.moshQ;
  const want = Math.round(4_000_000 * Math.pow(0.02, q));
  if(Math.abs(want - (moshEnc.__br||0)) > want*0.25){
    try{ moshEnc.configure({codec:moshCodec, width:moshW, height:moshH, framerate:30,
                            bitrate:want, latencyMode:"realtime",
                            avc: moshCodec.indexOf("avc") === 0 ? {format:"annexb"} : undefined});
         moshEnc.__br = want; moshNeedKey = true; moshSeen = false; }catch(e){}
  }
  let vf = null;
  try{ vf = new VideoFrame(canvas, {timestamp: (moshCount++)*33333, duration:33333}); }
  catch(e){ return; }
  const period = Math.max(2, Math.round((1 - mCur.moshResync)*300) + 2);
  const wantKey = !moshSeen || moshNeedKey || (mCur.moshResync > 0.003 && (moshCount % period) === 0);
  try{ moshEnc.encode(vf, {keyFrame: wantKey}); }catch(e){ moshStop(); }
  try{ vf.close(); }catch(e){}
}

/* blend the decoded picture over the clean one, straight to the screen */
function moshDraw(){
  if(!moshHasFrame || !moshTex || mCur.moshAmt < 0.003) return;
  const a = Math.min(1, mCur.moshAmt);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.enable(gl.BLEND);
  gl.blendColor(0,0,0,a);
  gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
  gl.useProgram(progCOPY.prog);
  gl.uniform2f(U(progCOPY,"u_res"), canvas.width, canvas.height);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, moshTex);
  gl.uniform1i(U(progCOPY,"u_tex"), 0);
  draw();
  gl.disable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}
