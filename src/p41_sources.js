/* ---------------- inputs: each channel owns its own source ---------------- */
function newSource(ch){
  const v = document.createElement("video");
  v.playsInline = true; v.loop = true; v.crossOrigin = "anonymous";
  if(ch !== "A") v.muted = true;
  const pc = document.createElement("canvas");
  pc.width = 960; pc.height = 540;
  return {ch, video:v, mode:"pattern", pattern:"bars", cam:null,
          patCanvas:pc, pat:pc.getContext("2d"), patClock:0,
          aspect:16/9, has:0, speed:1, tpRate:1, feed:"PGM", name:"", audioHooked:false,
          glsl:"", glslProg:null, glslErr:"", glslF0:"none", glslF2:"none", glslFrame:0,
          text:{body:"BENDR", font:"mono", size:0.2, track:0, x:0.5, y:0.5, rot:0,
                scrollX:0, scrollY:0, repeat:1, ink:"#ffffff", bg:"#000000", outline:0,
                shape:"none", shpCount:1, shpSize:0.3, shpX:0.5, shpY:0.5,
                shpSpin:0, shpFill:"#ff2fa0", shpStroke:0, shpPulse:0}};
}
const SRC = {};
for(const ch of CHANNELS) SRC[ch] = newSource(ch);
/* the A-channel video keeps the old name so audio hookup keeps working */
const video = SRC.A.video;
const videoB = SRC.B.video;
function cur(){ return SRC[activeChan]; }

const fileIn = document.getElementById("fileIn");
document.getElementById("btnFile").onclick = ()=>{ fileIn.accept="video/*"; fileIn.dataset.chan = activeChan; fileIn.click(); };
fileIn.onchange = ()=>{ if(fileIn.files[0]) handleFile(fileIn.files[0], fileIn.dataset.chan || activeChan); fileIn.value=""; };
{
  const afi = document.getElementById("audioFileIn");
  if(afi) afi.onchange = ()=>{ if(afi.files[0]) loadAudioFile(afi.files[0]); afi.value=""; };
}

function handleFile(f, ch){
  ch = ch || activeChan;
  if(f.name.endsWith(".json")){ loadStateFile(f); return; }
  if(!f.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name)){ toast("Not a video file", true); return; }
  const S = SRC[ch];
  stopCam(ch);
  S.video.srcObject = null;
  /* the previous clip's blob keeps the whole file resident until it is revoked */
  if(S.objUrl){ try{ URL.revokeObjectURL(S.objUrl); }catch(e){} }
  S.objUrl = URL.createObjectURL(f);
  S.video.src = S.objUrl;
  S.name = f.name;
  S.speed = 1;
  S.video.playbackRate = 1; S.video.defaultPlaybackRate = 1;
  S.video.muted = (ch !== "A") ? true : masterMuted;
  S.video.play().catch(()=>{ S.video.muted = true; S.video.play().catch(()=>{}); });
  S.mode = "file";
  if(ch === "A"){ hookVideoAudio(); applyMute(); }
  syncChanInputUI();
  toast("Channel "+ch+": "+f.name+" ("+(f.size/1048576).toFixed(0)+" MB, streaming from disk)");
  setTimeout(()=>{
    if(S.mode==="file" && S.video.readyState < 2)
      toast("This browser can't decode that codec — try Chrome, or convert to H.264/WebM", true);
  }, 3500);
}
/* Camera and capture inputs. Anything the operating system presents as a
   camera turns up here: a built-in webcam, a USB one, an HDMI capture stick,
   and virtual cameras from streaming software. The browser withholds device
   names until camera access has been granted once, which is why the list
   reads DEVICE 1 / DEVICE 2 the first time and properly after that. */
let camDeviceId = "";
async function listCamDevices(){
  try{
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter(d=>d.kind==="videoinput");
  }catch(e){ return []; }
}
async function refreshCamDevUI(){
  const sel = document.getElementById("selCamDev");
  if(!sel) return;
  const devs = await listCamDevices();
  const cur = sel.value;
  sel.innerHTML = "";
  const o0 = document.createElement("option"); o0.value=""; o0.textContent="DEFAULT CAMERA"; sel.appendChild(o0);
  devs.forEach((dv,i)=>{
    const o = document.createElement("option"); o.value = dv.deviceId;
    o.textContent = (dv.label || ("DEVICE "+(i+1))).toUpperCase().slice(0,32);
    sel.appendChild(o);
  });
  sel.value = (cur && [...sel.options].some(o=>o.value===cur)) ? cur : camDeviceId;
}
async function openCam(ch){
  const S = SRC[ch];
  stopCam(ch);
  const vc = camDeviceId ? {deviceId:{exact:camDeviceId}, width:{ideal:1920}, height:{ideal:1080}}
                         : {width:{ideal:1920}, height:{ideal:1080}};
  S.cam = await navigator.mediaDevices.getUserMedia({video:vc, audio:false});
  S.video.srcObject = S.cam; S.video.muted = true;
  await S.video.play();
  S.mode = "cam";
  const tr = S.cam.getVideoTracks()[0];
  S.name = (tr && tr.label) ? tr.label.slice(0,18) : "camera";
  syncChanInputUI();
  refreshCamDevUI();
}
document.getElementById("btnCam").onclick = async ()=>{
  const ch = activeChan;
  try{
    await openCam(ch);
    toast("Channel "+ch+": "+SRC[ch].name+" live");
  }catch(e){ toast("Camera unavailable: "+e.message, true); }
};
{
  const sel = document.getElementById("selCamDev");
  if(sel){
    sel.onmousedown = ()=>refreshCamDevUI();
    sel.onchange = async ()=>{
      camDeviceId = sel.value;
      if(cur().mode === "cam"){
        try{ await openCam(activeChan); toast("Switched capture device"); }
        catch(e){ toast("Could not open that device: "+e.message, true); }
      }
    };
    refreshCamDevUI();
    if(navigator.mediaDevices && navigator.mediaDevices.addEventListener)
      navigator.mediaDevices.addEventListener("devicechange", refreshCamDevUI);
  }
}
/* Screen, window or tab capture. This is the general-purpose way in: anything
   running on the machine that is not a camera - another application, a browser
   tab, a whole desktop - arrives through here. */
document.getElementById("btnScreen").onclick = async ()=>{
  const ch = activeChan, S = SRC[ch];
  if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){
    toast("This browser cannot capture the screen", true); return;
  }
  try{
    stopCam(ch);
    S.cam = await navigator.mediaDevices.getDisplayMedia({
      video:{frameRate:{ideal:60}}, audio:false});
    S.video.srcObject = S.cam; S.video.muted = true;
    await S.video.play();
    S.mode = "cam";
    const tr = S.cam.getVideoTracks()[0];
    S.name = "screen";
    if(tr) tr.addEventListener("ended", ()=>{
      if(SRC[ch].mode === "cam" && SRC[ch].name === "screen"){
        SRC[ch].mode = "pattern"; SRC[ch].name = "pattern"; syncChanInputUI();
        toast("Channel "+ch+": screen capture stopped");
      }
    });
    syncChanInputUI();
    toast("Channel "+ch+": screen capture live");
  }catch(e){
    if(e && e.name === "NotAllowedError") toast("Screen capture cancelled");
    else toast("Screen capture failed: "+(e && e.message), true);
  }
};
document.getElementById("btnPat").onclick = ()=>{
  const ch = activeChan;
  stopCam(ch);
  SRC[ch].mode = "pattern"; SRC[ch].name = "pattern";
  syncChanInputUI();
};
document.getElementById("btnFeed").onclick = ()=>{
  const ch = activeChan;
  stopCam(ch);
  SRC[ch].mode = "feed"; SRC[ch].name = "feed";
  syncChanInputUI();
  toast("Channel "+ch+" now re-enters "+(SRC[ch].feed||"PGM")+" \u2014 process it and mix it back in");
};
{
  const f = document.getElementById("selFeed");
  for(const o of FEED_SRCS){ const op=document.createElement("option"); op.value=o.id; op.textContent=o.name; f.appendChild(op); }
  f.onchange = ()=>{ stopCam(activeChan); const S = cur(); S.feed = f.value; S.mode = "feed"; S.name = "feed"; syncChanInputUI(); };
}
document.getElementById("btnSynth").onclick = ()=>{
  const ch = activeChan;
  stopCam(ch);
  SRC[ch].mode = "synth"; SRC[ch].name = "synth";
  syncChanInputUI();
  revealSection("gen");
  toast("Channel "+ch+": pattern synth \u2014 shape it in the PATTERN SYNTH section");
};
const selPat = document.getElementById("selPat");
selPat.onchange = ()=>{
  const S = cur();
  S.pattern = selPat.value;
  stopCam(activeChan);
  S.mode = "pattern";
  syncChanInputUI();
};
function stopCam(ch){
  const S = SRC[ch];
  if(S.cam){ S.cam.getTracks().forEach(t=>t.stop()); S.cam=null; }
}
/* What a source can actually be asked to do. A file has a timeline you can
   scrub; a generated source has a clock but nothing to scrub; a live camera or
   screen capture has neither, and asking a MediaStream-backed video element to
   seek or change rate throws rather than being ignored. Every transport
   control is gated on this, because a dead control that raises an exception is
   worse than one that is not there. */
function srcCaps(S){
  const m = S ? S.mode : "";
  if(m === "file") return {timeline:true, clock:true, audio:true, live:false};
  if(m === "pattern" || m === "text" || m === "synth" || m === "feed" || m === "glsl")
    return {timeline:false, clock:true, audio:false, live:false};
  return {timeline:false, clock:false, audio:false, live:true};   /* cam, screen */
}
function capsOf(ch){ return srcCaps(SRC[ch||activeChan]); }
const CAP_WHY = {
  live: "Not available on a live camera or screen capture: there is no timeline to move around in.",
  gen:  "Not available on a generated source: there is no file to seek, loop or mute.",
};
function syncChanInputUI(){
  const S = cur();
  const caps = srcCaps(S);
  const why = caps.live ? CAP_WHY.live : CAP_WHY.gen;
  for(const [id, need] of [["btnPlay","timeline"],["btnLoop","timeline"],["seek","timeline"],
                           ["btnMute","audio"],["btnVari","audio"],["spd","clock"]]){
    const el = document.getElementById(id);
    if(!el) continue;
    const off = !caps[need];
    el.disabled = off;
    el.classList.toggle("dim", off);
    el.title = off ? why : "";
  }
  { const tc = document.getElementById("tcode");
    if(tc && !caps.timeline) tc.textContent = caps.live ? "LIVE" : "--:-- / --:--"; }
  refreshSourceSections();
  for(const q of document.querySelectorAll(".mchan")) q.textContent = activeChan;
  /* say what every channel is looking at, in three places, because "which
     source is this channel on" was invisible until you opened the menu */
  const label = ch2=>{
    const T = SRC[ch2];
    if(T.mode === "file")    return T.name ? T.name.slice(0,14).toUpperCase() : "FILE";
    if(T.mode === "cam")     return (T.name === "screen") ? "SCREEN" : (T.name ? T.name.slice(0,12).toUpperCase() : "CAM");
    if(T.mode === "pattern") return (T.pattern||"pattern").toUpperCase();
    if(T.mode === "text")    return "TEXT";
    if(T.mode === "synth")   return "SYNTH "+GEN_SHAPES[genMode[ch2].shape];
    if(T.mode === "glsl")    return "SHADER";
    if(T.mode === "feed")    return "FEED \u2190 "+(T.feed||"PGM");
    return T.mode.toUpperCase();
  };
  for(const q of document.querySelectorAll(".msrc")) q.textContent = label(activeChan);
  { const mb = document.querySelector("#mnuSource .menubtn");
    if(mb) mb.innerHTML = "SRC <b>"+label(activeChan).slice(0,13)+"</b> <i>&#9662;</i>"; }
  for(const ch2 of CHANNELS){
    const btn = document.querySelector(".chanbtn.ch"+ch2+" small");
    if(btn) btn.textContent = label(ch2);
  }
  { const sb = document.getElementById("btnStill"); if(sb) sb.classList.toggle("on", !!stillHeld[activeChan]); }
  { const os = document.getElementById("osdsrc");
    if(os) os.textContent = CHANNELS.filter(c=>SRC[c].has).map(c=>c+" "+label(c)).join("   ·   "); }
  if(typeof refreshDockTabs === "function") refreshDockTabs();
  if(S.mode !== "text" && dockTab === "text") setDock("matrix");
  document.getElementById("btnFile").classList.toggle("on", S.mode==="file");
  document.getElementById("btnCam").classList.toggle("on", S.mode==="cam");
  document.getElementById("btnPat").classList.toggle("on", S.mode==="pattern");
  { const b=document.getElementById("btnSynth"); if(b) b.classList.toggle("on", S.mode==="synth"); }
  { const b=document.getElementById("btnFeed"); if(b) b.classList.toggle("on", S.mode==="feed");
    const f=document.getElementById("selFeed"); if(f) f.value = S.feed || "PGM"; }
  document.getElementById("btnText").classList.toggle("on", S.mode==="text");
  { const b=document.getElementById("btnGlsl"); if(b) b.classList.toggle("on", S.mode==="glsl"); }
  document.getElementById("btnFile").textContent = "FILE";
  selPat.value = S.pattern;
  const sp = document.getElementById("spd");
  sp.value = S.speed;
  sp.classList.toggle("hot", Math.abs(S.speed-1) > 0.001);
  const lp = document.getElementById("btnLoop");
  lp.classList.toggle("on", S.video.loop);
  if(dockTab === "text") syncTextEditor();
  if(dockTab === "glsl") syncGlslEditor();
  if(S.mode !== "glsl" && dockTab === "glsl") setDock("matrix");
}
window.__syncChanInputUI = syncChanInputUI;
setInterval(()=>{ if(!offline) syncChanInputUI(); }, 900);
/* swap two channels' *sources* (what sits on top), not just their effects */
window.__swapSources = function(a, b){
  const A = SRC[a], B = SRC[b];
  const keys = ["mode","pattern","cam","patClock","aspect","has","speed","tpRate","feed","name","text","glsl","glslF0","glslF2"];
  for(const k of keys){ const t = A[k]; A[k] = B[k]; B[k] = t; }
  /* video elements carry their own media, so swap what each channel points at */
  const tv = A.video, tp = A.patCanvas, tc = A.pat;
  A.video = B.video; B.video = tv;
  A.patCanvas = B.patCanvas; B.patCanvas = tp;
  A.pat = B.pat; B.pat = tc;
  const gm = genMode[a]; genMode[a] = genMode[b]; genMode[b] = gm;
  A.ch = a; B.ch = b;
  syncChanInputUI();
};

/* ---- text / shape generator ---- */
const FONTS = {
  mono:'"SF Mono", ui-monospace, Menlo, monospace',
  sans:'"Helvetica Neue", Helvetica, Arial, sans-serif',
  serif:'Georgia, "Times New Roman", serif',
  cond:'"Arial Narrow", "Helvetica Neue Condensed", sans-serif',
  impact:'Impact, "Haettenschweiler", sans-serif',
  courier:'"Courier New", Courier, monospace',
  times:'"Times New Roman", Times, serif',
  georgia:'Georgia, serif',
  garamond:'Garamond, "EB Garamond", serif',
  palatino:'Palatino, "Palatino Linotype", serif',
  baskerville:'Baskerville, "Libre Baskerville", serif',
  didot:'Didot, "Bodoni MT", serif',
  futura:'Futura, "Century Gothic", sans-serif',
  gill:'"Gill Sans", "Gill Sans MT", sans-serif',
  optima:'Optima, Candara, sans-serif',
  avenir:'Avenir, "Avenir Next", sans-serif',
  verdana:'Verdana, Geneva, sans-serif',
  tahoma:'Tahoma, Geneva, sans-serif',
  trebuchet:'"Trebuchet MS", sans-serif',
  rockwell:'Rockwell, "Courier Bold", serif',
  copperplate:'Copperplate, "Copperplate Gothic Light", fantasy',
  papyrus:'Papyrus, fantasy',
  chalkduster:'Chalkduster, fantasy',
  marker:'"Marker Felt", fantasy',
  bradley:'"Bradley Hand", cursive',
  snell:'"Snell Roundhand", cursive',
  zapfino:'Zapfino, cursive',
  andale:'"Andale Mono", monospace',
  menlo:'Menlo, monospace',
  monaco:'Monaco, monospace',
  cursive:'cursive',
  fantasy:'fantasy',
  system:'system-ui, -apple-system, sans-serif'
};
function drawTextSource(S, t){
  const g = S.pat, W = S.patCanvas.width, H = S.patCanvas.height, T = S.text;
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle = T.bg; g.fillRect(0,0,W,H);

  /* shapes underneath */
  if(T.shape !== "none"){
    const n = Math.max(1, Math.round(T.shpCount));
    const pulse = 1 + T.shpPulse*0.45*Math.sin(t*3.1);
    for(let i=0;i<n;i++){
      const f = n===1 ? 0 : i/(n-1);
      g.save();
      g.translate(T.shpX*W, T.shpY*H);
      g.rotate(T.shpSpin*t + f*Math.PI*2/Math.max(1,n));
      const sz = T.shpSize*H*pulse*(1 - f*0.55);
      g.fillStyle = T.shpFill; g.strokeStyle = T.shpFill; g.lineWidth = T.shpStroke;
      const stroked = T.shpStroke > 0.2;
      g.beginPath();
      switch(T.shape){
        case "circle": g.arc(0,0,sz,0,7); break;
        case "ring":   g.arc(0,0,sz,0,7); g.arc(0,0,sz*0.55,0,7); break;
        case "rect":   g.rect(-sz,-sz*0.62,sz*2,sz*1.24); break;
        case "tri":    g.moveTo(0,-sz); g.lineTo(sz*0.87,sz*0.5); g.lineTo(-sz*0.87,sz*0.5); g.closePath(); break;
        case "cross":  g.rect(-sz,-sz*0.18,sz*2,sz*0.36); g.rect(-sz*0.18,-sz,sz*0.36,sz*2); break;
        case "bars":   for(let b=0;b<8;b++) g.rect(-sz + b*sz/4, -sz, sz/8, sz*2); break;
        case "grid":   for(let b=-4;b<=4;b++){ g.rect(b*sz/4-sz*0.02,-sz,sz*0.04,sz*2); g.rect(-sz,b*sz/4-sz*0.02,sz*2,sz*0.04); } break;
        case "rings":  for(let b=1;b<=6;b++){ g.moveTo(sz*b/6,0); g.arc(0,0,sz*b/6,0,7); } break;
        case "starburst": for(let b=0;b<16;b++){ const a=b*Math.PI/8; g.moveTo(0,0); g.lineTo(Math.cos(a)*sz, Math.sin(a)*sz); } break;
      }
      if(T.shape==="rings" || T.shape==="starburst" || stroked){ g.lineWidth = Math.max(1,T.shpStroke||2); g.stroke(); }
      else g.fill();
      g.restore();
    }
  }

  /* text on top */
  const body = (T.body||"").split("\n");
  if(body.length && body.join("").length){
    const px = Math.max(4, T.size*H);
    g.font = "bold "+px+"px "+FONTS[T.font];
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = T.ink; g.strokeStyle = T.ink; g.lineWidth = T.outline;
    const reps = Math.max(1, Math.round(T.repeat));
    for(let r=0;r<reps;r++){
      g.save();
      const ox = ((T.x + T.scrollX*t) % 1 + 1) % 1;
      const oy = ((T.y + T.scrollY*t) % 1 + 1) % 1;
      g.translate(ox*W, oy*H + (r - (reps-1)/2)*px*1.35*Math.max(1,reps>1?1.2:1));
      g.rotate(T.rot*Math.PI/180);
      body.forEach((line,li)=>{
        const yy = (li - (body.length-1)/2)*px*1.15;
        if(T.track !== 0){
          /* manual letter spacing */
          const chars = [...line];
          const sp = T.track*px;
          let total = 0;
          for(const c of chars) total += g.measureText(c).width + sp;
          let cx = -total/2;
          for(const c of chars){
            const w = g.measureText(c).width;
            if(T.outline>0.2) g.strokeText(c, cx+w/2, yy); else g.fillText(c, cx+w/2, yy);
            cx += w + sp;
          }
        } else {
          if(T.outline>0.2) g.strokeText(line, 0, yy); else g.fillText(line, 0, yy);
        }
      });
      g.restore();
    }
  }
  g.setTransform(1,0,0,1,0,0);
}

/* text editor wiring */
let dockTab = "matrix";
function setDock(t){
  /* the text editor belongs to a text source, so it is only live on a channel
     that is actually set to TEXT */
  if(t === "text" && cur().mode !== "text"){
    toast("Channel "+activeChan+" is not a text source \u2014 pick TEXT under SOURCE first", true);
    t = dockTab === "text" ? "matrix" : dockTab;
  }
  if(t === "glsl" && cur().mode !== "glsl"){
    toast("Channel "+activeChan+" is not a shader source \u2014 pick SHADER under SOURCE first", true);
    t = dockTab === "glsl" ? "matrix" : dockTab;
  }
  dockTab = t;
  const map = {mix:"mixdock", matrix:"matrix", mod:"modgrid", text:"textdock", glsl:"glsldock", out:"outdock", scope:"scopedock", audio:"audiodock", perform:"performdock"};
  for(const k in map){
    const el = document.getElementById(map[k]);
    if(el) el.classList.toggle("on", k===t);
  }
  document.querySelectorAll("#dockTabs button[data-dock]").forEach(b=>b.classList.toggle("on", b.dataset.dock===t));
  const hint = document.getElementById("dockHint");
  if(hint) hint.textContent = t==="mod" ? "right-click any parameter to patch it"
                            : t==="text" ? "typing here never triggers shortcuts"
                            : t==="perform" ? "shift and a number recalls a snapshot \u00b7 Q W E R T Y hold the pads"
                            : t==="mix" ? "the faders themselves are on the strip under the picture"
                            : t==="audio" ? "band ranges decide what each modulator is listening for"
                            : t==="out" ? "the display and the glass in front of it, shared by every channel"
                            : t==="scope" ? "what the signal actually looks like, and what is inside the machine"
                            : "patch sources into any parameter";
  if(t==="text") syncTextEditor();
  refreshDockTabs();
}
/* grey the TEXT tab unless this channel is a text source */
function refreshDockTabs(){
  /* both of these tabs belong to a source rather than to the rig, so each one
     reads as unavailable on a channel that is not using that source */
  for(const [tab, mode, pane, note] of [["text","text","textdock","textNeedsSrc"],
                                        ["glsl","glsl","glsldock","glslNeedsSrc"]]){
    const b = document.querySelector('#dockTabs button[data-dock="'+tab+'"]');
    if(!b) continue;
    const ok = cur().mode === mode;
    b.classList.toggle("dim", !ok);
    const td = document.getElementById(pane);
    if(td) td.classList.toggle("notext", !ok);
    const n = document.getElementById(note);
    if(n) n.style.display = ok ? "none" : "block";
  }
}
window.__refreshDockTabs = refreshDockTabs;
const textEd = null;
const TXT_CTRL = [["txtBody","body","s"],["txtFont","font","s"],["txtSize","size","f"],["txtTrack","track","f"],
  ["txtX","x","f"],["txtY","y","f"],["txtRot","rot","f"],["txtScrollX","scrollX","f"],["txtScrollY","scrollY","f"],
  ["txtRepeat","repeat","f"],["txtInk","ink","s"],["txtBg","bg","s"],["txtOutline","outline","f"],
  ["shpKind","shape","s"],["shpCount","shpCount","f"],["shpSize","shpSize","f"],["shpX","shpX","f"],["shpY","shpY","f"],
  ["shpSpin","shpSpin","f"],["shpFill","shpFill","s"],["shpStroke","shpStroke","f"],["shpPulse","shpPulse","f"]];
function syncTextEditor(){
  const T = cur().text;
  const ce = document.getElementById("textEdChan");
  if(ce) ce.textContent = "\u2014 CHANNEL "+activeChan;
  for(const [id,key,kind] of TXT_CTRL){
    const el = document.getElementById(id); if(!el) continue;
    el.value = T[key];
  }
}
for(const [id,key,kind] of TXT_CTRL){
  const el = document.getElementById(id); if(!el) continue;
  const handler = ()=>{
    const T = cur().text;
    T[key] = (kind==="f") ? parseFloat(el.value) : el.value;
    const S = cur();
    if(S.mode !== "text"){ stopCam(activeChan); S.mode = "text"; S.name = "text"; syncChanInputUI(); }
  };
  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
}
document.getElementById("btnGlsl").onclick = ()=>{
  const S = cur();
  stopCam(activeChan);
  S.mode = "glsl"; S.name = "shader";
  if(!S.glsl) S.glsl = GLSL_DEFAULT;
  S.glslErr = "";
  syncChanInputUI(); syncGlslEditor();
  setDock("glsl");
  setTimeout(()=>{ const t=document.getElementById("glslBody"); if(t) t.focus(); }, 60);
  closeMenus();
};
document.getElementById("btnText").onclick = ()=>{
  const S = cur();
  stopCam(activeChan);
  S.mode = "text"; S.name = "text";
  syncChanInputUI(); syncTextEditor();
  setDock("text");
  setTimeout(()=>{ const t=document.getElementById("txtBody"); if(t) t.focus(); }, 60);
};

/* test pattern drawing — per source */
const noiseC = document.createElement("canvas"); noiseC.width=240; noiseC.height=135;
const noiseCtx = noiseC.getContext("2d");
const noiseImg = noiseCtx.createImageData(240,135);
function drawPattern(S, t){
  const pat = S.pat, w = S.patCanvas.width, h = S.patCanvas.height;
  const patternType = S.pattern;
  if(patternType === "bars"){
    const bars = ["#c0c0c0","#c0c000","#00c0c0","#00c000","#c000c0","#c00000","#0000c0"];
    const bw = w/bars.length;
    for(let i=0;i<bars.length;i++){ pat.fillStyle = bars[i]; pat.fillRect(i*bw, 0, bw+1, h*0.6); }
    const g = pat.createLinearGradient(0,0,w,0);
    g.addColorStop(0,"#000"); g.addColorStop(1,"#fff");
    pat.fillStyle = g; pat.fillRect(0, h*0.6, w, h*0.18);
    pat.fillStyle = "#111"; pat.fillRect(0, h*0.78, w, h*0.22);
    const bx = (0.5+0.42*Math.sin(t*0.7))*w;
    pat.fillStyle = "#fff"; pat.fillRect(bx-25, h*0.80, 50, h*0.09);
    pat.fillStyle = "hsl("+Math.floor((t*30)%360)+",90%,55%)";
    pat.beginPath(); pat.arc((0.5+0.42*Math.cos(t*0.45))*w, h*0.915, h*0.045, 0, 7); pat.fill();
    pat.fillStyle = "#ddd"; pat.font = "bold "+Math.floor(h*0.06)+"px monospace";
    pat.fillText("BENDR "+S.ch+"  "+t.toFixed(1).padStart(7,"0"), w*0.03, h*0.95);
  } else if(patternType === "testcard"){
    pat.fillStyle = "#666"; pat.fillRect(0,0,w,h);
    pat.strokeStyle = "#999"; pat.lineWidth = 1;
    for(let x=0;x<=w;x+=w/16){ pat.beginPath(); pat.moveTo(x,0); pat.lineTo(x,h); pat.stroke(); }
    for(let y=0;y<=h;y+=h/9){ pat.beginPath(); pat.moveTo(0,y); pat.lineTo(w,y); pat.stroke(); }
    const cols = ["#c0c0c0","#c0c000","#00c0c0","#00c000","#c000c0","#c00000","#0000c0","#000"];
    const cw = w*0.5/cols.length;
    for(let i=0;i<cols.length;i++){ pat.fillStyle=cols[i]; pat.fillRect(w*0.25+i*cw, h*0.35, cw+1, h*0.12); }
    pat.fillStyle = "#111";
    pat.beginPath(); pat.arc(w/2, h/2, h*0.38, 0, 7); pat.lineWidth = h*0.03; pat.strokeStyle="#eee"; pat.stroke();
    const g2 = pat.createLinearGradient(w*0.25,0,w*0.75,0);
    g2.addColorStop(0,"#000"); g2.addColorStop(1,"#fff");
    pat.fillStyle=g2; pat.fillRect(w*0.25, h*0.55, w*0.5, h*0.08);
    pat.strokeStyle="#fff"; pat.lineWidth=2;
    pat.beginPath(); pat.moveTo(w/2,h*0.1); pat.lineTo(w/2,h*0.9); pat.moveTo(w*0.15,h/2); pat.lineTo(w*0.85,h/2); pat.stroke();
    const sweep = t*0.8;
    pat.strokeStyle="hsl("+Math.floor((t*40)%360)+",90%,60%)"; pat.lineWidth=4;
    pat.beginPath(); pat.moveTo(w/2,h/2);
    pat.lineTo(w/2+Math.cos(sweep)*h*0.36, h/2+Math.sin(sweep)*h*0.36); pat.stroke();
  } else if(patternType === "osc"){
    const N = 6;
    for(let i=0;i<N;i++){
      const g = pat.createLinearGradient(0, 0, w, 0);
      const ph = t*(0.13+i*0.07) + i*1.3;
      for(let sIdx=0;sIdx<=6;sIdx++){
        const f = sIdx/6;
        const hue = ( Math.sin(f*3.14159*2 + ph)*60 + i*60 + t*25 )%360;
        const lig = 45 + 25*Math.sin(f*9 + ph*1.7 + i);
        g.addColorStop(f, "hsl("+((hue+360)%360)+",95%,"+lig.toFixed(0)+"%)");
      }
      pat.fillStyle = g;
      const y0 = (i/N)*h + Math.sin(t*0.5+i)*h*0.02;
      pat.fillRect(0, y0, w, h/N+h*0.04);
    }
  } else if(patternType === "grid"){
    pat.fillStyle = "#000"; pat.fillRect(0,0,w,h);
    pat.strokeStyle = "#fff"; pat.lineWidth = 2;
    const step = w/24;
    for(let x=step/2;x<w;x+=step){ pat.beginPath(); pat.moveTo(x,0); pat.lineTo(x,h); pat.stroke(); }
    for(let y=step/2;y<h;y+=step){ pat.beginPath(); pat.moveTo(0,y); pat.lineTo(w,y); pat.stroke(); }
    pat.lineWidth = 5;
    pat.strokeStyle = "hsl("+Math.floor((t*20)%360)+",80%,60%)";
    pat.strokeRect(w*0.02, h*0.03, w*0.96, h*0.94);
    pat.beginPath(); pat.arc(w/2+Math.sin(t*0.6)*w*0.3, h/2, h*0.08, 0, 7);
    pat.fillStyle="#fff"; pat.fill();
  } else if(patternType === "ramp"){
    const g = pat.createLinearGradient(0,0,w,0);
    g.addColorStop(0,"#000"); g.addColorStop(1,"#fff");
    pat.fillStyle = g; pat.fillRect(0,0,w,h*0.5);
    const n = 12;
    for(let i=0;i<n;i++){
      pat.fillStyle = "hsl("+Math.floor((i/n*360 + t*30)%360)+",90%,55%)";
      pat.fillRect(i*w/n, h*0.5, w/n+1, h*0.5);
    }
  } else if(patternType === "hramp" || patternType === "vramp" || patternType === "radial"){
    const img = pat.createImageData(w, h), d = img.data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      let v;
      if(patternType==="hramp") v = x/w;
      else if(patternType==="vramp") v = 1-y/h;
      else v = Math.min(1, Math.hypot(x/w-0.5, y/h-0.5)*2);
      const g = (v*255)|0;
      d[i]=g; d[i+1]=g; d[i+2]=g; d[i+3]=255;
    }
    pat.putImageData(img,0,0);
  } else if(patternType === "oscbars"){
    const img = pat.createImageData(w, h), d = img.data;
    const f1 = 0.06 + 0.05*Math.sin(t*0.23), f2 = 0.021 + 0.02*Math.sin(t*0.17);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      d[i]   = 128+127*Math.sin(x*f1 + t*2.0);
      d[i+1] = 128+127*Math.sin(y*f2 + t*1.3);
      d[i+2] = 128+127*Math.sin((x*f1+y*f2)*0.7 - t*1.7);
      d[i+3] = 255;
    }
    pat.putImageData(img,0,0);
  } else if(patternType === "plasma"){
    const img = pat.createImageData(w, h), d = img.data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4, u=x/w, v=y/h;
      const a = Math.sin(u*9+t) + Math.sin(v*11-t*0.7) + Math.sin((u+v)*7+t*0.5)
              + Math.sin(Math.hypot(u-0.5,v-0.5)*18 - t*1.3);
      d[i]   = 128+110*Math.sin(a*1.1);
      d[i+1] = 128+110*Math.sin(a*1.1+2.1);
      d[i+2] = 128+110*Math.sin(a*1.1+4.2);
      d[i+3] = 255;
    }
    pat.putImageData(img,0,0);
  } else if(patternType === "lissa"){
    pat.fillStyle="#000"; pat.fillRect(0,0,w,h);
    pat.lineWidth = 2.5;
    for(let k=0;k<3;k++){
      pat.strokeStyle = ["#ff2fa0","#2ee6d6","#ffd400"][k];
      pat.beginPath();
      const a = 3+k, b = 4+k*2, ph = t*(0.4+k*0.15);
      for(let i=0;i<=400;i++){
        const th = i/400*Math.PI*2;
        const x = w/2 + Math.sin(a*th+ph)*w*0.4;
        const y = h/2 + Math.sin(b*th)*h*0.4;
        i? pat.lineTo(x,y) : pat.moveTo(x,y);
      }
      pat.stroke();
    }
  } else if(patternType === "checker"){
    const n = 8, cw = w/n, chh = h/(n/2);
    const off = Math.floor(t*2)%2;
    for(let yy=0;yy<n/2;yy++) for(let xx=0;xx<n;xx++){
      pat.fillStyle = ((xx+yy+off)%2) ? "#fff" : "#000";
      pat.fillRect(xx*cw, yy*chh, cw+1, chh+1);
    }
  } else if(patternType === "static"){
    const d = noiseImg.data;
    for(let i=0;i<d.length;i+=4){
      const v = (Math.random()*255)|0;
      d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=255;
    }
    noiseCtx.putImageData(noiseImg,0,0);
    pat.imageSmoothingEnabled = false;
    pat.drawImage(noiseC, 0, 0, w, h);
    pat.imageSmoothingEnabled = true;
  }
}

/* transport — controls the active channel */
const btnPlay = document.getElementById("btnPlay");
const seek = document.getElementById("seek");
const tcode = document.getElementById("tcode");
let seeking = false, masterMuted = false, variMode = false;
btnPlay.onclick = ()=>{ if(!capsOf().timeline) return; const v = cur().video; if(v.paused) v.play(); else v.pause(); };
video.addEventListener("play", ()=> btnPlay.textContent="❚❚");
video.addEventListener("pause", ()=> btnPlay.textContent="▶");
document.getElementById("btnLoop").onclick = e=>{
  const v = cur().video; v.loop = !v.loop; e.target.classList.toggle("on", v.loop);
};
const spdEl = document.getElementById("spd");
/* browsers only accept a limited playback-rate range, but the generated
   sources are happy with anything, so the element gets a clamped copy */
function videoRate(v){ return Math.min(16, Math.max(0.0625, Math.abs(v) || 1)); }
function setSpeed(v, ch){
  const S = SRC[ch||activeChan];
  S.speed = v;
  try{
    S.video.playbackRate = videoRate(v);
    S.video.defaultPlaybackRate = videoRate(v);
  }catch(e){}
  if(!ch || ch===activeChan){
    spdEl.value = v;
    spdEl.classList.toggle("hot", Math.abs(v-1) > 0.001);
  }
}
spdEl.addEventListener("input", e=>{ if(!capsOf().clock) return; setSpeed(parseFloat(e.target.value)); });
spdEl.addEventListener("dblclick", ()=>{ setSpeed(1); });
for(const ch of CHANNELS){
  const S = SRC[ch];
  S.video.addEventListener("loadeddata", ()=>{ try{ S.video.playbackRate = videoRate(S.speed); }catch(e){} });
  S.video.addEventListener("ratechange", ()=>{
    if(Math.abs(S.video.playbackRate-videoRate(S.speed))>0.01 && !S.video.srcObject){ try{ S.video.playbackRate = videoRate(S.speed); }catch(e){} }
  });
}
/* ---- tape transport: per-channel deck mode ---- */
const transport = {};
for(const ch of CHANNELS) transport[ch] = "play";
const TP_RATE = {play:1, still:0, ff:4, rew:-4, jogf:0.25, jogr:-0.25};
function setTransport(mode, ch){
  ch = ch || activeChan;
  const S = SRC[ch];
  const caps = srcCaps(S);
  /* a live stream can be held or let run, and that is the whole of it: there
     is nothing to shuttle through */
  if(caps.live && mode !== "play" && mode !== "still"){
    toast("Shuttle and jog need a timeline \u2014 this channel is a live input", true);
    return;
  }
  transport[ch] = mode;
  /* a generated source has a clock rather than a tape, so the transport drives
     the clock and never touches the video element */
  if(caps.clock && !caps.timeline){
    S.tpRate = TP_RATE[mode];
    if(typeof refreshToggles === "function") refreshToggles();
    return;
  }
  const v = S.video;
  try{
    if(mode === "play"){ v.playbackRate = videoRate(S.speed); if(v.paused) v.play(); }
    else if(mode === "still"){ v.pause(); }
    else if(mode === "ff"){ v.playbackRate = videoRate(Math.abs(S.speed)*4 || 4); if(v.paused) v.play(); }
    else { v.pause(); }   // rew / jog are driven frame by frame below
  }catch(e){}
  if(typeof refreshToggles === "function") refreshToggles();
}
window.__setTransport = setTransport;
window.__transportOf = ch=>transport[ch||activeChan] || "play";
/* reverse and jog can't use playbackRate, so scrub currentTime each frame */
function driveTransport(dt){
  for(const ch of CHANNELS){
    const m = transport[ch];
    if(m === "play" || m === "still" || m === "ff") continue;
    const S = SRC[ch];
    /* scrubbing currentTime is only meaningful, and only legal, on a file */
    if(S.mode !== "file") continue;
    const v = S.video;
    if(!v.duration || !isFinite(v.duration)) continue;
    const r = TP_RATE[m] * (Math.abs(S.speed) || 1);
    let nt = v.currentTime + r*dt;
    if(nt < 0) nt += v.duration;
    if(nt > v.duration) nt -= v.duration;
    try{ v.currentTime = nt; }catch(e){}
  }
}
function applyMute(){
  if(typeof outGainNode !== "undefined" && outGainNode){
    outGainNode.gain.value = masterMuted ? 0 : 1;
    if(!video.error) video.muted = false;
  } else {
    video.muted = masterMuted;
  }
  const b = document.getElementById("btnMute");
  if(b) b.classList.toggle("on", masterMuted);
}
document.getElementById("btnMute").onclick = ()=>{ masterMuted = !masterMuted; applyMute(); };
document.getElementById("btnVari").onclick = e=>{
  variMode = !variMode;
  e.target.classList.toggle("on", variMode);
  for(const ch of CHANNELS) if("preservesPitch" in SRC[ch].video) SRC[ch].video.preservesPitch = !variMode;
  toast(variMode ? "Varispeed: pitch follows speed (tape mode)" : "Time-stretch: pitch held constant");
};
seek.addEventListener("input", ()=>{
  if(!capsOf().timeline) return;
  seeking=true;
  const v = cur().video;
  if(v.duration && isFinite(v.duration)){ try{ v.currentTime = seek.value*v.duration; }catch(e){} }
});
seek.addEventListener("change", ()=>{ seeking=false; });
function fmtT(s){ if(!isFinite(s)) return "--:--"; s=Math.floor(s); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }


/* ---- shader source -------------------------------------------------------
   A channel whose picture is a fragment shader you paste in.

   The convention is the one the online shader sites settled on: you write
   `void mainImage(out vec4 fragColor, in vec2 fragCoord)` and a set of
   uniforms is provided for you. That convention is worth supporting because
   it is what almost every published shader is written to, and because it puts
   an entire generative language inside a channel — with the whole of the rest
   of the rig sitting downstream of it, which is the part that makes it more
   than a viewer. iChannel0 can be another channel, a bus, or the finished
   programme, so a shader can equally be a processing stage.

   Nothing is bundled: the code is whatever you paste, it stays in your patch,
   and it runs on your GPU. Compilation is on a button rather than on every
   keystroke, so a half-typed shader cannot take the picture down.            */

const GLSL_DEFAULT =
  "// the channel is a fragment shader now.\n" +
  "// paste an image pass here and press COMPILE.\n" +
  "void mainImage(out vec4 O, in vec2 fragCoord){\n" +
  "  vec2 uv = fragCoord/iResolution.xy;\n" +
  "  vec3 c = 0.5 + 0.5*cos(iTime + uv.xyx*4.0 + vec3(0,2,4));\n" +
  "  c *= 0.6 + 0.4*sin(iTime*0.7 + length(uv-0.5)*24.0);\n" +
  "  O = vec4(c, 1.0);\n" +
  "}\n";

/* The preamble. Everything the convention promises, declared whether or not
   the pasted code uses it, plus the two legacy aliases that turn up in older
   published shaders. */
const GLSL_HEAD =
  "#version 300 es\n" +
  "precision highp float;\n" +
  "precision highp int;\n" +
  "out vec4 bendr_O;\n" +
  "uniform vec3 iResolution;\n" +
  "uniform float iTime, iTimeDelta, iFrameRate, iSampleRate;\n" +
  "uniform int iFrame;\n" +
  "uniform vec4 iMouse, iDate;\n" +
  "uniform sampler2D iChannel0, iChannel1, iChannel2, iChannel3;\n" +
  "uniform vec3 iChannelResolution[4];\n" +
  "uniform float iChannelTime[4];\n" +
  "#define texture2D texture\n" +
  "#define textureCube texture\n" +
  "#define iGlobalTime iTime\n" +
  "#line 1\n";
const GLSL_TAIL =
  "\nvoid main(){\n" +
  "  vec4 c = vec4(0.0,0.0,0.0,1.0);\n" +
  "  mainImage(c, gl_FragCoord.xy);\n" +
  "  bendr_O = vec4(c.rgb, 1.0);\n" +
  "}\n";

function glslWrap(body){
  /* a pasted file may carry its own version line, which has to be first or
     not present at all */
  body = String(body || "").replace(/^\s*#version[^\n]*\n/, "");
  return GLSL_HEAD + body + GLSL_TAIL;
}

/* Compiled outside makeProg/checkPrograms deliberately: those exist to fail
   the build loudly at startup, and this must never do that. A shader typed by
   hand is expected to fail, and the failure is the feedback. */
function glslCompile(ch, body){
  ch = ch || activeChan;
  const src = glslWrap(body);
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, src); gl.compileShader(fs);
  if(!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
    const log = gl.getShaderInfoLog(fs) || "compile failed";
    gl.deleteShader(vs); gl.deleteShader(fs);
    return {ok:false, log:log};
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    const log = gl.getProgramInfoLog(prog) || "link failed";
    gl.deleteProgram(prog);
    return {ok:false, log:log};
  }
  const S = SRC[ch];
  if(S.glslProg && S.glslProg.prog) { try{ gl.deleteProgram(S.glslProg.prog); }catch(e){} }
  S.glslProg = {prog:prog, loc:{}};
  S.glsl = body;
  S.glslErr = "";
  S.glslFrame = 0;
  return {ok:true, log:""};
}

/* the channel's shader, compiled lazily so a patch that was loaded with a
   shader on it comes up running rather than needing a press */
function glslProgOf(ch){
  const S = SRC[ch];
  if(S.glslProg) return S.glslProg;
  if(S.glslErr) return null;
  const r = glslCompile(ch, S.glsl || GLSL_DEFAULT);
  if(!r.ok){ S.glslErr = r.log; return null; }
  return S.glslProg;
}

/* ---- the shader dock ---- */
const GLSL_FEEDS = [["none","NONE (BLACK)"],["A","CH A"],["B","CH B"],["C","CH C"],["D","CH D"],
                    ["BUS1","BUS 1"],["BUS2","BUS 2"],["PGM","PROGRAMME"],["self","THIS CHANNEL, LAST FRAME"]];
function buildGlslDock(){
  for(const id of ["glslCh0","glslCh2"]){
    const sel = document.getElementById(id);
    if(!sel) continue;
    sel.innerHTML = "";
    for(const [v,n] of GLSL_FEEDS){
      const o = document.createElement("option");
      o.value = v; o.textContent = n; sel.appendChild(o);
    }
    sel.onchange = ()=>{ SRC[activeChan][id==="glslCh0" ? "glslF0" : "glslF2"] = sel.value; };
  }
  const body = document.getElementById("glslBody");
  const log = document.getElementById("glslLog");
  const btn = document.getElementById("glslCompile");
  const rev = document.getElementById("glslRevert");
  if(btn) btn.onclick = ()=>{
    const r = glslCompile(activeChan, body.value);
    if(r.ok){
      log.className = "ok";
      log.textContent = "compiled ok · running on channel " + activeChan;
      const dirty = document.getElementById("glslDirty");
      if(dirty) dirty.style.display = "none";
      SRC[activeChan].glslErr = "";
      toast("Shader compiled onto channel " + activeChan);
    } else {
      log.className = "";
      log.textContent = r.log.trim();
      SRC[activeChan].glslErr = r.log;
    }
  };
  if(rev) rev.onclick = ()=>{ body.value = SRC[activeChan].glsl || GLSL_DEFAULT; log.textContent = ""; log.className = ""; };
  /* Pasting a shader in and then having to go and find a button is the wrong
     shape: the paste is the intent. A paste compiles on its own a moment
     later, once the text has actually landed, and so does clicking away.
     Typing does not, because a shader is broken for most of the time you are
     writing one and the errors would never stop. */
  if(body) body.addEventListener("paste", ()=>{
    setTimeout(()=>{ if(SRC[activeChan].mode === "glsl") btn.click(); }, 30);
  });
  if(body) body.addEventListener("blur", ()=>{
    if(SRC[activeChan].mode !== "glsl") return;
    if(body.value !== (SRC[activeChan].glsl || "")) btn.click();
  });
  if(body) body.addEventListener("input", ()=>{
    const d = document.getElementById("glslDirty");
    if(d) d.style.display = (body.value !== (SRC[activeChan].glsl || "")) ? "inline" : "none";
  });
  if(body) body.addEventListener("keydown", e=>{
    /* tab indents rather than leaving the field, which is what you want in a
       code box and nowhere else */
    if(e.key === "Tab"){
      e.preventDefault();
      const a = body.selectionStart, b = body.selectionEnd;
      body.value = body.value.slice(0,a) + "  " + body.value.slice(b);
      body.selectionStart = body.selectionEnd = a+2;
    }
    /* cmd/ctrl + enter compiles, because that is what every editor does */
    if(e.key === "Enter" && (e.metaKey || e.ctrlKey)){ e.preventDefault(); btn.click(); }
    e.stopPropagation();
  });
}
function syncGlslEditor(){
  const S = SRC[activeChan];
  const d = document.getElementById("glsldock");
  if(!d) return;
  const off = S.mode !== "glsl";
  d.classList.toggle("notext", off);
  const ns = document.getElementById("glslNeedsSrc");
  if(ns) ns.style.display = off ? "block" : "none";
  const body = document.getElementById("glslBody");
  if(body && document.activeElement !== body) body.value = S.glsl || GLSL_DEFAULT;
  const c0 = document.getElementById("glslCh0"), c2 = document.getElementById("glslCh2");
  if(c0) c0.value = S.glslF0 || "none";
  if(c2) c2.value = S.glslF2 || "none";
  const note = document.getElementById("glslNote");
  if(note) note.textContent = "CHANNEL " + activeChan;
  const log = document.getElementById("glslLog");
  if(log && S.glslErr){ log.className = ""; log.textContent = S.glslErr.trim(); }
}
buildGlslDock();

/* Move a channel's source onto another channel: what it is looking at, plus
   everything that defines that source. A file is shared rather than reloaded
   (both channels point at the same object URL, and only the channel that
   created it revokes it); a camera or screen capture cannot be duplicated, so
   the destination is pointed at a pattern and told why. */
function copySource(from, to){
  const A = SRC[from], B = SRC[to];
  if(A.mode === "cam"){
    stopCam(to);
    B.mode = "pattern"; B.name = "pattern";
    toast("A live input cannot be on two channels at once — " + to + " kept its own source", true);
    syncChanInputUI();
    return;
  }
  stopCam(to);
  B.mode = A.mode; B.name = A.name; B.pattern = A.pattern; B.feed = A.feed;
  B.speed = A.speed; B.tpRate = A.tpRate; B.patClock = A.patClock; B.aspect = A.aspect;
  B.text = JSON.parse(JSON.stringify(A.text));
  B.glsl = A.glsl; B.glslF0 = A.glslF0; B.glslF2 = A.glslF2;
  B.glslProg = null; B.glslErr = ""; B.glslFrame = 0;   /* compiled per channel */
  if(typeof genMode !== "undefined" && genMode[from]) genMode[to] = {...genMode[from]};
  if(A.mode === "file" && A.video.src){
    B.video.srcObject = null;
    B.video.src = A.video.src;          /* the same blob, not another copy of it */
    B.video.loop = A.video.loop;
    B.video.muted = true;
    try{ B.video.currentTime = A.video.currentTime; }catch(e){}
    B.video.play().catch(()=>{});
  }
  B.has = A.has;
  syncChanInputUI();
}
