/* ---------------- presets ---------------- */
const PRESETS = [
["CLEAN FEED", {chromaBleed:0.06,rainbow:0,dotCrawl:0,ringing:0.05,signalNoise:0,chromaNoise:0,hWobble:0,jitter:0,humBar:0,headSwitch:0,tapeWow:0,genLoss:0,glow:0.05,scanlines:0.1,aperture:0.05,curvature:0.15,vignette:0.2}, []],
["RAINBOW RITE", {colorize:0.85,colorBands:1.8,colorSweep:0.25,saturation:1.3,glow:0.45,contrast:1.15,chromaBleed:0.3,hWobble:0.07,tapeWow:0.15,jitter:0.1,scanlines:0.3,aperture:0.2,curvature:0.3,vignette:0.35},
 [{src:"drift",dst:"colorBands",amt:0.18},{src:"lfo1",dst:"colorSweep",amt:0.2},{src:"bass",dst:"colorize",amt:0.15},{src:"chaos",dst:"chromaDelay",amt:0.1}]],
["PSYCH WASH", {lumaHue:0.65,rgbSep:0.35,sharpEcho:0.45,echoSpace:0.35,invFlick:0.28,saturation:2.1,posterize:0.3,glow:0.5,contrast:1.3,chromaBleed:0.4,hWobble:0.1,tapeWow:0.2,scanlines:0.3,curvature:0.3,vignette:0.4},
 [{src:"lfo1",dst:"hue",amt:0.35},{src:"chaos",dst:"rgbSep",amt:0.2},{src:"lfo2",dst:"invFlick",amt:0.25},{src:"drift",dst:"lumaHue",amt:0.25}]],
["ENHANCER BURN", {sharpEcho:0.85,echoSpace:0.45,rgbSep:0.22,ringing:0.6,contrast:1.55,saturation:1.6,glow:0.7,solarize:0.2,chromaBleed:0.25,signalNoise:0.08,hWobble:0.06,scanlines:0.35,aperture:0.25,curvature:0.3,vignette:0.4},
 [{src:"drift",dst:"echoSpace",amt:0.3},{src:"lfo2",dst:"sharpEcho",amt:0.2},{src:"mid",dst:"glow",amt:0.3},{src:"lfo1",dst:"hue",amt:0.15}]],
["BROADCAST DECAY", {chromaBleed:0.35,chromaDelay:0.12,rainbow:0.3,dotCrawl:0.3,ringing:0.35,signalNoise:0.12,chromaNoise:0.1,hWobble:0.1,wobbleFreq:0.15,jitter:0.2,humBar:0.25,tapeWow:0.1,headSwitch:0.2,genLoss:0.15,saturation:1.1,glow:0.2,scanlines:0.35,aperture:0.2,curvature:0.35,vignette:0.4},
 [{src:"chaos",dst:"tear",amt:0.12},{src:"drift",dst:"hWobble",amt:0.15},{src:"lfo1",dst:"chromaDelay",amt:0.1}]],
["DEAD DECK", {chromaBleed:0.6,chromaDelay:0.25,rainbow:0.15,dotCrawl:0.2,signalNoise:0.3,chromaNoise:0.25,hWobble:0.2,jitter:0.5,tracking:0.55,dropout:0.5,headSwitch:0.8,tapeWow:0.5,genLoss:0.55,humBar:0.2,saturation:0.85,contrast:1.1,glow:0.1,scanlines:0.3,vignette:0.45},
 [{src:"lfo2",dst:"tracking",amt:0.35},{src:"spike",dst:"tear",amt:0.5},{src:"chaos",dst:"chromaDelay",amt:0.2},{src:"drift",dst:"tapeWow",amt:0.3}]],
["RAINBOW CEREMONY", {chromaBleed:0.5,rainbow:0.85,dotCrawl:0.6,ringing:0.5,chromaNoise:0.2,saturation:1.7,hue:0.02,posterize:0.15,glow:0.4,fbAmount:0.35,fbHue:0.06,scanlines:0.3,aperture:0.3,curvature:0.3,vignette:0.35,hWobble:0.06,jitter:0.15},
 [{src:"lfo1",dst:"hue",amt:0.25},{src:"drift",dst:"chromaDelay",amt:0.25},{src:"lfo2",dst:"rainbow",amt:0.2}]],
["TEMPLE OF MELT", {fbAmount:0.88,fbZoom:0.22,fbRotate:0.06,fbHue:0.1,chromaBleed:0.3,rainbow:0.25,saturation:1.5,glow:0.5,posterize:0.1,signalNoise:0.06,tapeWow:0.2,scanlines:0.2,curvature:0.25,vignette:0.3},
 [{src:"bass",dst:"fbZoom",amt:0.3},{src:"lfo1",dst:"fbRotate",amt:0.12},{src:"mid",dst:"glow",amt:0.35},{src:"drift",dst:"fbHue",amt:0.15}]],
["SYNC DEATH", {tear:0.55,tearSize:0.5,hWobble:0.45,wobbleFreq:0.4,vRoll:0.12,jitter:0.6,humBar:0.5,signalNoise:0.25,chromaBleed:0.3,headSwitch:0.6,contrast:1.2,saturation:1.15,scanlines:0.4,vignette:0.45},
 [{src:"spike",dst:"vRoll",amt:0.4},{src:"chaos",dst:"tear",amt:0.4},{src:"lfo2",dst:"hWobble",amt:0.3},{src:"high",dst:"jitter",amt:0.4}]],
["NEON HAZE", {chromaBleed:0.75,chromaDelay:-0.3,rainbow:0.5,lumaHue:0.3,rgbSep:0.15,colorize:0.3,colorBands:1.2,saturation:2.0,hue:0.08,posterize:0.35,solarize:0.25,glow:0.65,fbAmount:0.55,fbHue:0.14,fbZoom:0.08,tapeWow:0.3,genLoss:0.2,scanlines:0.25,aperture:0.35,curvature:0.3,vignette:0.4},
 [{src:"drift",dst:"hue",amt:0.3},{src:"lfo1",dst:"solarize",amt:0.2},{src:"bass",dst:"saturation",amt:0.25},{src:"chaos",dst:"fbShiftX",amt:0.1}]],
["TOTAL COLLAPSE", {chromaBleed:0.7,chromaDelay:0.4,rainbow:0.7,dotCrawl:0.5,ringing:0.6,signalNoise:0.45,chromaNoise:0.4,hWobble:0.5,wobbleFreq:0.6,tear:0.6,tearSize:0.6,vRoll:0.2,jitter:0.7,humBar:0.5,tracking:0.7,dropout:0.7,headSwitch:0.9,tapeWow:0.6,genLoss:0.5,saturation:1.4,posterize:0.25,solarize:0.15,glow:0.3,fbAmount:0.5,fbHue:0.1,scanlines:0.4,vignette:0.5},
 [{src:"chaos",dst:"vRoll",amt:0.3},{src:"spike",dst:"dropout",amt:0.6},{src:"lfo2",dst:"tracking",amt:0.4},{src:"bass",dst:"tear",amt:0.4},{src:"drift",dst:"hue",amt:0.4}]],
["DATAMOSH", {mosh:0.86,moshBlock:0.35,melt:0.12,blockShift:0.4,blockSize:0.3,chromaBleed:0.35,signalNoise:0.05,saturation:1.2,contrast:1.1,glow:0.15,scanlines:0.12,aperture:0.08,curvature:0.2,vignette:0.3},
 [{src:"cut",dst:"moshBlock",amt:0.55},{src:"motion",dst:"mosh",amt:-0.25},{src:"spike",dst:"blockShift",amt:0.4},{src:"chaos",dst:"timeGrad",amt:0.2}]],
["PIXEL SORT", {pixelSort:0.9,sortThresh:0.42,driftWarp:0.12,contrast:1.3,saturation:1.35,chromaBleed:0.2,ringing:0.2,glow:0.25,scanlines:0.15,curvature:0.2,vignette:0.3},
 [{src:"lfo3",dst:"sortThresh",amt:0.22},{src:"bright",dst:"sortThresh",amt:-0.15},{src:"lfo1",dst:"pixelSort",amt:0.12}]],
["DOT MATRIX", {dotify:0.92,dotSize:0.45,contrast:1.5,saturation:1.5,glow:0.3,brightness:0.05,chromaBleed:0.15,scanlines:0.1,aperture:0.1,curvature:0.25,vignette:0.35},
 [{src:"lfo1",dst:"dotSize",amt:0.2},{src:"bass",dst:"dotSize",amt:0.25},{src:"drift",dst:"hue",amt:0.2}]],
["LIQUID MELT", {melt:0.62,swirl:0.5,mosh:0.35,timeGrad:0.25,driftWarp:0.3,saturation:1.6,glow:0.4,chromaBleed:0.4,lumaBleed:0.25,posterize:0.1,scanlines:0.15,curvature:0.25,vignette:0.35},
 [{src:"lfo3",dst:"swirl",amt:0.3},{src:"drift",dst:"melt",amt:0.25},{src:"lfo1",dst:"hue",amt:0.2},{src:"mid",dst:"driftWarp",amt:0.25}]],
["DATABENT", {blockShift:0.75,blockSize:0.45,fmWarp:0.45,driftWarp:0.35,pixelSort:0.3,sortThresh:0.55,chromaNoise:0.25,signalNoise:0.12,saturation:1.4,contrast:1.25,glow:0.2,scanlines:0.18,vignette:0.35},
 [{src:"spike",dst:"blockShift",amt:0.5},{src:"chaos",dst:"fmWarp",amt:0.3},{src:"cut",dst:"blockSize",amt:0.4},{src:"lfo2",dst:"driftWarp",amt:0.25}]],
];
function applyState(bases, rts, extra){
  for(const p of PLIST){ p.base = (bases[p.id] !== undefined) ? bases[p.id] : p.def; }
  routes = (rts||[]).map(r=>({...r}));
  if(extra){
    for(const k of LFOKEYS){ if(extra[k]) Object.assign(lfoState[k], extra[k]); }
    if(extra.audioCfg){
      for(const k of ["bass","mid","high"]) if(extra.audioCfg[k]) Object.assign(audioCfg[k], extra.audioCfg[k]);
      if(extra.audioCfg.response !== undefined) audioCfg.response = extra.audioCfg.response;
    }
    if(extra.fbTrailMode !== undefined) fbTrailMode = extra.fbTrailMode;
  }
  refreshUI(); renderRoutes(); refreshLfoUI(); refreshAudioUI();
}
function loadPreset(i){
  const pr = PRESETS[i]; if(!pr) return;
  pushHistory();
  applyState(pr[1], pr[2]);
  document.getElementById("selPreset").value = i;
  toast("Preset: "+pr[0]);
}
const selPreset = document.getElementById("selPreset");
PRESETS.forEach((p,i)=>{
  const o = document.createElement("option"); o.value=i; o.textContent = (i+1)+" · "+p[0];
  selPreset.appendChild(o);
});
selPreset.onchange = ()=> loadPreset(+selPreset.value);

function randomizeAll(){
  pushHistory();
  const bases = {};
  for(const p of PLIST){
    let v;
    const r = Math.random();
    if(p.sec==="crt"){ v = p.base; }
    else if(p.sec==="frame"){ v = Math.random()<0.7 ? p.def : p.def + (Math.random()*2-1)*0.3*(p.max-p.min); }
    else if(p.sec==="mixer"){ v = p.base; }
    else if(p.id==="mosh"){ v = Math.random()<0.6 ? 0 : Math.random()*0.85; }
    else if(p.sec==="glitch"||p.sec==="flow"){ v = Math.random()<0.45 ? p.def : p.min + Math.pow(Math.random(),1.5)*(p.max-p.min); }
    else if(p.id==="fbAmount"){ v = Math.random()<0.5 ? Math.random()*0.5 : 0.5+Math.random()*0.45; }
    else if(p.id==="vRoll"){ v = Math.random()<0.75 ? 0 : (Math.random()*2-1)*0.3; }
    else if(p.id==="saturation"){ v = 0.6+Math.random()*1.6; }
    else if(p.id==="contrast"){ v = 0.8+Math.random()*0.7; }
    else if(p.id==="brightness"){ v = (Math.random()*2-1)*0.25; }
    else {
      const bias = Math.pow(Math.random(), 1.6);
      v = p.min + bias*(p.max-p.min);
      if(p.min<0 && Math.random()<0.5) v = -v*0.8;
      v = Math.min(p.max, Math.max(p.min, v));
    }
    bases[p.id]=v;
  }
  const nR = 2+Math.floor(Math.random()*4);
  const rts = [];
  for(let i=0;i<nR;i++){
    rts.push({
      src: MODSRC[Math.floor(Math.random()*7)].id,   // LFOs + chaos/drift/spike
      dst: PLIST[Math.floor(Math.random()*PLIST.length)].id,
      amt: (Math.random()*2-1)*0.55,
    });
  }
  if(Math.random()<0.35){
    const arr = chainOrder.slice();
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    chainOrder = arr;
  }
  for(const k of LFOKEYS){
    lfoState[k].rate = Math.pow(10, -1.5+Math.random()*2.2);
    if(Math.random()<0.4) lfoState[k].shape = ["sine","tri","saw","sqr","snh"][Math.floor(Math.random()*5)];
  }
  applyState(bases, rts);
  renderChain();
}
function mutate(){
  pushHistory();
  for(const p of PLIST){
    p.base += (Math.random()*2-1)*0.09*(p.max-p.min);
    p.base = Math.min(p.max, Math.max(p.min, p.base));
  }
  for(const r of routes){ r.amt = Math.min(1, Math.max(-1, r.amt + (Math.random()*2-1)*0.15)); }
  refreshUI(); renderRoutes();
}
/* ---- undo history ---- */
const histStack = [];
function captureState(){
  const bases = {}; for(const p of PLIST) bases[p.id]=p.base;
  const st = {bases, routes: routes.map(r=>({...r})),
    audioCfg: JSON.parse(JSON.stringify(audioCfg)),
    fbTrailMode, rescanMode, keyChroma, mixMode, edgeMode, linkB, wipeInv,
    chainOrder: chainOrder.slice(), stageEnabled: {...stageEnabled}};
  for(const k of LFOKEYS) st[k] = {rate:lfoState[k].rate, shape:lfoState[k].shape, sync:lfoState[k].sync||0};
  return st;
}
function restoreState(st){
  if(st.rescanMode !== undefined) rescanMode = st.rescanMode;
  if(st.chainOrder && st.chainOrder.length===4) chainOrder = st.chainOrder.slice();
  if(st.stageEnabled) stageEnabled = {...stageEnabled, ...st.stageEnabled};
  if(st.linkB !== undefined) linkB = st.linkB;
  if(st.wipeInv !== undefined) wipeInv = st.wipeInv;
  const smEl = document.getElementById("selMixMode"); if(smEl) smEl.value = mixMode;
  if(st.keyChroma !== undefined) keyChroma = st.keyChroma;
  if(st.mixMode !== undefined) mixMode = st.mixMode;
  if(st.edgeMode !== undefined) edgeMode = st.edgeMode;
  applyState(st.bases||{}, st.routes||[], st);
  refreshToggles();
  renderChain();
}
function pushHistory(){
  histStack.push(captureState());
  if(histStack.length > 24) histStack.shift();
}
function undo(){
  const st = histStack.pop();
  if(st) restoreState(st);
}
document.getElementById("btnUndo").onclick = undo;
function initPatch(){
  pushHistory();
  fbTrailMode=false; rescanMode=false; keyChroma=false;
  mixMode=0; edgeMode=0; showKeyMatte=false; linkB=true; wipeInv=false;
  { const sm=document.getElementById("selMixMode"); if(sm) sm.value=0; }
  chainOrder = ["sig","col","glitch","flow"];
  stageEnabled = {sig:true, col:true, glitch:true, flow:true};
  morphOverride.clear();
  morphA=null; morphB=null; morphOverride.clear();
  for(const el of ["morphBtnA","morphBtnB"]){ const b=document.getElementById(el); if(b) b.classList.remove("on"); }
  Object.assign(lfoState.lfo1, {rate:0.3,  shape:"sine", sync:0});
  Object.assign(lfoState.lfo2, {rate:1.7,  shape:"snh",  sync:0});
  Object.assign(lfoState.lfo3, {rate:0.07, shape:"tri",  sync:0});
  Object.assign(lfoState.lfo4, {rate:5.5,  shape:"sine", sync:0});
  Object.assign(audioCfg.bass, {lo:30,   hi:150,   gain:1});
  Object.assign(audioCfg.mid,  {lo:300,  hi:2200,  gain:1});
  Object.assign(audioCfg.high, {lo:4000, hi:11000, gain:1});
  audioCfg.response = 0.5;
  applyState({}, []);
  refreshToggles();
  renderChain();
  document.getElementById("selPreset").value = 0;
  toast("Init patch — everything back to defaults (Z to undo)");
}
document.getElementById("btnInit").onclick = initPatch;

/* save / load */
document.getElementById("btnSave").onclick = ()=>{
  const bases = {}; for(const p of PLIST) bases[p.id]=p.base;
  const state = {app:"bendr", v:4, bases, routes, audioCfg, fbTrailMode, rescanMode, keyChroma, mixMode, edgeMode, linkB, wipeInv,
    chainOrder: chainOrder.slice(), stageEnabled: {...stageEnabled}};
  for(const k of LFOKEYS) state[k] = {rate:lfoState[k].rate, shape:lfoState[k].shape};
  const blob = new Blob([JSON.stringify(state,null,1)], {type:"application/json"});
  dl(URL.createObjectURL(blob), "bendr-"+stamp()+".json");
  toast("State saved");
};
document.getElementById("btnLoad").onclick = ()=>{ fileIn.accept=".json"; fileIn.click(); };
function loadStateFile(f){
  f.text().then(txt=>{
    try{
      const s = JSON.parse(txt);
      pushHistory();
      restoreState(s);
      toast("State loaded: "+f.name);
    }catch(e){ toast("Bad preset file", true); }
  });
}
function stamp(){
  const d = new Date();
  return d.getFullYear()+""+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"-"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")+String(d.getSeconds()).padStart(2,"0");
}
function dl(url, name){
  const a = document.createElement("a"); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 30000);
}

/* ---------------- inputs ---------------- */
const video = document.createElement("video");
video.playsInline = true; video.loop = true; video.crossOrigin = "anonymous";
const videoB = document.createElement("video");
videoB.playsInline = true; videoB.loop = true; videoB.muted = true; videoB.crossOrigin = "anonymous";
let hasB = false;
let inputMode = "pattern";   // pattern | file | cam
let camStream = null;

/* channel B loader */
const fileInB = document.createElement("input");
fileInB.type = "file"; fileInB.accept = "video/*"; fileInB.style.display = "none";
document.body.appendChild(fileInB);
window.__loadB = ()=> fileInB.click();
document.getElementById("btnFileB").onclick = ()=> fileInB.click();
fileInB.onchange = ()=>{
  const f = fileInB.files[0]; fileInB.value = "";
  if(!f) return;
  videoB.src = URL.createObjectURL(f);
  videoB.playbackRate = 1;
  videoB.play().then(()=>{ hasB = true; window.__bLoaded = true; }).catch(()=>{ hasB = true; window.__bLoaded = true; });
  document.getElementById("btnFileB").classList.add("on");
  toast("Channel B: "+f.name+" — raise A>B MIX in the MIXER section");
};
const patCanvas = document.createElement("canvas");
patCanvas.width = 960; patCanvas.height = 540;
const pat = patCanvas.getContext("2d");

const fileIn = document.getElementById("fileIn");
document.getElementById("btnFile").onclick = ()=>{ fileIn.accept="video/*"; fileIn.click(); };
fileIn.onchange = ()=>{ if(fileIn.files[0]) handleFile(fileIn.files[0]); fileIn.value=""; };
function handleFile(f){
  if(f.name.endsWith(".json")){ loadStateFile(f); return; }
  if(!f.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name)){ toast("Not a video file", true); return; }
  stopCam();
  video.srcObject = null;
  video.src = URL.createObjectURL(f);
  setSpeed(1);   // fresh file, fresh speed — SPD slider is per-session, not per-file
  video.muted = masterMuted;
  video.play().catch(()=>{ video.muted = true; video.play().catch(()=>{}); toast("Muted (browser autoplay) — press P or click ▶"); });
  applyMute();
  inputMode = "file";
  setInputButtons();
  hookVideoAudio();
  toast("Loaded: "+f.name+" ("+(f.size/1048576).toFixed(0)+" MB, streaming from disk)");
  setTimeout(()=>{
    if(inputMode==="file" && video.readyState < 2)
      toast("This browser can't decode that codec — try Chrome, or convert to H.264/WebM", true);
  }, 3500);
}
document.getElementById("btnCam").onclick = async ()=>{
  try{
    stopCam();
    camStream = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280}, height:{ideal:720}}, audio:false});
    video.srcObject = camStream; video.muted = true;
    await video.play();
    inputMode = "cam"; setInputButtons();
    toast("Webcam live");
  }catch(e){ toast("Webcam unavailable: "+e.message, true); }
};
document.getElementById("btnPat").onclick = ()=>{ stopCam(); inputMode="pattern"; setInputButtons(); };
function stopCam(){ if(camStream){ camStream.getTracks().forEach(t=>t.stop()); camStream=null; } }
function setInputButtons(){
  document.getElementById("btnFile").classList.toggle("on", inputMode==="file");
  document.getElementById("btnCam").classList.toggle("on", inputMode==="cam");
  document.getElementById("btnPat").classList.toggle("on", inputMode==="pattern");
}
setInputButtons();

/* test pattern drawing — selectable generator */
let patternType = "bars";
const selPat = document.getElementById("selPat");
selPat.onchange = ()=>{ patternType = selPat.value; stopCam(); inputMode="pattern"; setInputButtons(); };
const noiseC = document.createElement("canvas"); noiseC.width=240; noiseC.height=135;
const noiseCtx = noiseC.getContext("2d");
const noiseImg = noiseCtx.createImageData(240,135);
function drawPattern(t){
  const w = patCanvas.width, h = patCanvas.height;
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
    pat.fillText("BENDR  "+t.toFixed(1).padStart(7,"0"), w*0.03, h*0.95);
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
    /* video-synth colour waves */
    const N = 6;
    for(let i=0;i<N;i++){
      const g = pat.createLinearGradient(0, 0, w, 0);
      const ph = t*(0.13+i*0.07) + i*1.3;
      for(let s=0;s<=6;s++){
        const f = s/6;
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

/* transport */
const btnPlay = document.getElementById("btnPlay");
const seek = document.getElementById("seek");
const tcode = document.getElementById("tcode");
let seeking = false;
btnPlay.onclick = ()=>{ if(video.paused) video.play(); else video.pause(); };
video.addEventListener("play", ()=> btnPlay.textContent="❚❚");
video.addEventListener("pause", ()=> btnPlay.textContent="▶");
document.getElementById("btnLoop").onclick = e=>{ video.loop=!video.loop; e.target.classList.toggle("on", video.loop); };
let playSpeed = 1, masterMuted = false;
const spdEl = document.getElementById("spd");
function setSpeed(v){
  playSpeed = v;
  spdEl.value = v;
  video.playbackRate = v;
  video.defaultPlaybackRate = v;
  spdEl.classList.toggle("hot", Math.abs(v-1) > 0.001);
}
spdEl.addEventListener("input", e=>{ setSpeed(parseFloat(e.target.value)); });
spdEl.addEventListener("dblclick", ()=>{ setSpeed(1); });
function applyMute(){
  if(typeof outGainNode !== "undefined" && outGainNode){
    outGainNode.gain.value = masterMuted ? 0 : 1;
    if(!video.error) video.muted = false;
  } else {
    video.muted = masterMuted;
  }
  document.getElementById("btnMute").classList.toggle("on", masterMuted);
}
document.getElementById("btnMute").onclick = ()=>{ masterMuted = !masterMuted; applyMute(); };
let variMode = false;
document.getElementById("btnVari").onclick = e=>{
  variMode = !variMode;
  e.target.classList.toggle("on", variMode);
  if("preservesPitch" in video) video.preservesPitch = !variMode;
  toast(variMode ? "Varispeed: pitch follows speed (tape mode)" : "Time-stretch: pitch held constant");
};
/* playbackRate resets when a new source loads — reapply */
video.addEventListener("loadeddata", ()=>{ video.playbackRate = playSpeed; });
video.addEventListener("ratechange", ()=>{
  if(Math.abs(video.playbackRate-playSpeed)>0.01 && !video.srcObject) video.playbackRate = playSpeed;
});
seek.addEventListener("input", ()=>{ seeking=true; if(video.duration) video.currentTime = seek.value*video.duration; });
seek.addEventListener("change", ()=>{ seeking=false; });
function fmtT(s){ if(!isFinite(s)) return "--:--"; s=Math.floor(s); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }

/* ---------------- record / snapshot / fullscreen ---------------- */
let recorder=null, recChunks=[], recStart=0, recTimer=null;
const btnRec = document.getElementById("btnRec"), recTime = document.getElementById("recTime");
btnRec.onclick = toggleRec;
function toggleRec(){
  if(recorder){ recorder.stop(); return; }
  const stream = canvas.captureStream(60);
  if(audioCtx && recDest && audioMode==="source"){
    for(const tr of recDest.stream.getAudioTracks()) stream.addTrack(tr);
  }
  let mime = "";
  for(const m of ["video/webm;codecs=vp9,opus","video/webm;codecs=vp9","video/webm;codecs=vp8,opus","video/webm"]){
    if(MediaRecorder.isTypeSupported(m)){ mime=m; break; }
  }
  recChunks = [];
  recorder = new MediaRecorder(stream, {mimeType:mime, videoBitsPerSecond: 16_000_000});
  recorder.ondataavailable = e=>{ if(e.data.size) recChunks.push(e.data); };
  recorder.onstop = ()=>{
    const blob = new Blob(recChunks, {type:"video/webm"});
    dl(URL.createObjectURL(blob), "bendr-"+stamp()+".webm");
    recorder=null; btnRec.classList.remove("rec-on"); btnRec.textContent="● REC";
    recTime.style.display="none"; clearInterval(recTimer);
    toast("Recording saved ("+(blob.size/1048576).toFixed(1)+" MB WebM)");
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
document.getElementById("btnSnap").onclick = ()=>{
  canvas.toBlob(b=>{ if(b){ dl(URL.createObjectURL(b), "bendr-"+stamp()+".png"); toast("Still saved"); } }, "image/png");
};
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
document.getElementById("bigRand").onclick = randomizeAll;
document.getElementById("bigMut").onclick = mutate;

/* bend buttons: mouse + touch */
for(const b of document.querySelectorAll(".bend[data-bend]")){
  const id = b.dataset.bend;
  const dn = e=>{ e.preventDefault(); bendHeld[id]=true; b.classList.add("held"); };
  const up = ()=>{ bendHeld[id]=false; b.classList.remove("held"); };
  b.addEventListener("mousedown", dn); b.addEventListener("touchstart", dn, {passive:false});
  b.addEventListener("mouseup", up); b.addEventListener("mouseleave", up); b.addEventListener("touchend", up);
}

/* keyboard */
const KEYBEND = {q:"sync", w:"roll", e:"rainbow", r_shift:null, t:"melt", y:"kill"};
window.addEventListener("keydown", e=>{
  if(e.target.tagName==="INPUT" || e.target.tagName==="SELECT") return;
  const k = e.key.toLowerCase();
  if(k>="1" && k<="9"){ loadPreset(+k-1); return; }
  if(k===" "){ e.preventDefault(); randomizeAll(); return; }
  if(k==="m"){ mutate(); return; }
  if(k==="z"){ undo(); return; }
  if(k==="f"){ document.getElementById("btnFull").click(); return; }
  if(k==="s"){ document.getElementById("btnSnap").click(); return; }
  if(k==="h"){ help.classList.toggle("show"); return; }
  if(k==="p"){ btnPlay.click(); return; }
  if(k==="b"){ setBypass(true); return; }
  if(k==="q"){ bendHeld.sync=true; markBend("sync",true); }
  if(k==="w"){ bendHeld.roll=true; markBend("roll",true); }
  if(k==="e"){ bendHeld.rainbow=true; markBend("rainbow",true); }
  if(k==="r" && !e.metaKey && !e.ctrlKey){ if(e.repeat) return; bendHeld.drop=true; markBend("drop",true); }
  if(k==="t"){ bendHeld.melt=true; markBend("melt",true); }
  if(k==="y"){ bendHeld.kill=true; markBend("kill",true); }
});
window.addEventListener("keyup", e=>{
  const k = e.key.toLowerCase();
  if(k==="b") setBypass(false);
  if(k==="q"){ bendHeld.sync=false; markBend("sync",false); }
  if(k==="w"){ bendHeld.roll=false; markBend("roll",false); }
  if(k==="e"){ bendHeld.rainbow=false; markBend("rainbow",false); }
  if(k==="r"){ if(bendHeld.drop){ bendHeld.drop=false; markBend("drop",false); } else if(!e.metaKey && !e.ctrlKey) toggleRec(); }
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
  if(f) handleFile(f);
});

/* ---------------- physical sync model (CPU-side PLL simulation) ----------------
   Real sync corruption isn't random rectangles: it's a phase-locked loop losing
   grip. We evolve smooth correlated processes per scanline and hand the GPU a
   displacement/gain/noise profile each frame. */
const SNC = 25;
const syncOU = new Float32Array(SNC);    // slow drift (Ornstein-Uhlenbeck)
const syncOUF = new Float32Array(SNC);   // fast chatter (tracking band, head switch)
let syncEvents = [];                     // loss-of-lock events: shear + recovery down the frame
let trackC = 0.65, trackV = 0;           // tracking band centre, drifting
const dispData = new Float32Array(SROWS*4);
function gaussR(){ return (Math.random()+Math.random()+Math.random()-1.5)*1.633; }
function updateSyncModel(dt, t){
  const jit=P.jitter.cur, tear=P.tear.cur, tsz=P.tearSize.cur, wob=P.hWobble.cur,
        wfq=P.wobbleFreq.cur, wow=P.tapeWow.cur, trk=P.tracking.cur, hsw=P.headSwitch.cur;
  const sdt = Math.min(dt, 0.05), rq = Math.sqrt(sdt);
  for(let i=0;i<SNC;i++){
    syncOU[i]  += -6*syncOU[i]*sdt  + 2.4*rq*gaussR();
    syncOUF[i] += -45*syncOUF[i]*sdt + 10*rq*gaussR();
  }
  /* spawn loss-of-lock events: sharp shear at one line, exponential re-lock below */
  const rate = tear*tear*15 + trk*1.1;
  if(Math.random() < rate*sdt && syncEvents.length < 10){
    const whole = Math.random() < 0.18;   // occasionally the whole frame gets sucked sideways
    syncEvents.push({
      t0:t, r0: whole ? SROWS-1 : Math.floor(Math.random()*SROWS),
      A:(0.05+0.45*Math.random()*Math.random())*(Math.random()<0.5?-1:1)*(0.35+0.65*tear),
      L:(10+tsz*90)*(0.5+Math.random())*(whole?6:1),
      rel:0.08+Math.random()*0.5, env:0});
  }
  for(const ev of syncEvents){
    const age = t-ev.t0;
    ev.env = Math.min(age/0.03,1)*Math.exp(-Math.max(0,age-0.03)/ev.rel);
  }
  syncEvents = syncEvents.filter(ev=>ev.env>0.012);
  /* tracking band drifts vertically like a real mistracking head */
  trackV += -0.6*trackV*sdt + 0.35*rq*gaussR();
  trackC += trackV*sdt*0.25;
  if(trackC<0.08){trackC=0.08; trackV=Math.abs(trackV);}
  if(trackC>0.92){trackC=0.92; trackV=-Math.abs(trackV);}
  const hsRows = Math.max(0, Math.floor(SROWS*0.05*hsw));
  const bw = 0.035+0.05*trk;
  for(let r=0;r<SROWS;r++){
    const fy = r/SROWS;
    let d = (Math.sin(fy*5.2+t*0.9)+0.6*Math.sin(fy*17.0-t*1.4))*0.006*wow
          + Math.sin(fy*(6.0+wfq*80.0)+t*4.2)*0.013*wob;
    const xc = fy*(SNC-1), ic = Math.min(SNC-2, Math.floor(xc)), fc = xc-ic;
    const sm = fc*fc*(3-2*fc);
    const ouv  = syncOU[ic]*(1-sm)+syncOU[ic+1]*sm;
    const oufv = syncOUF[ic]*(1-sm)+syncOUF[ic+1]*sm;
    d += ouv*0.004*(0.12+jit);            // the picture is never perfectly still
    const g0 = (fy-trackC)/bw;
    const bp = Math.exp(-g0*g0);
    d += bp*trk*oufv*0.02;
    let ng = bp*trk*(0.3+0.4*Math.abs(oufv));
    for(const ev of syncEvents){
      if(r<=ev.r0) d += ev.A*ev.env*Math.exp(-(ev.r0-r)/ev.L);
    }
    if(r<hsRows){
      const k = (hsRows-r)/hsRows;
      d += (0.045*k*k + 0.02*k*oufv)*hsw;
      ng += hsw*0.9*k*k;
    }
    const g = 1 - Math.min(0.38, Math.abs(d)*2.0);
    const o = r*4;
    dispData[o]=d; dispData[o+1]=g; dispData[o+2]=ng; dispData[o+3]=0;
  }
  gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,SROWS,1,0,gl.RGBA,gl.FLOAT,dispData);
}

/* ---------------- main loop ---------------- */
const osd = document.getElementById("osd");
let lastT = performance.now()/1000, fpsAcc=0, fpsN=0, fpsShow=0, patClock=0;
let stutterHeld=false, stutterT=0;
let srcAspectB = 16/9;
let offline = false;

/* video content analysis — the picture itself as a mod source */
const anaC = document.createElement("canvas"); anaC.width=32; anaC.height=18;
const anaCtx = anaC.getContext("2d", {willReadFrequently:true});
const anaPrev = new Float32Array(576);
let mdAvg=0.02, motionPeak=0.05, cutV=0;
function updateContentAnalysis(dt){
  let s = null;
  if(inputMode==="pattern") s = patCanvas;
  else if(video.readyState>=2 && video.videoWidth>0) s = video;
  if(!s){ modVal.motion *= 1-Math.min(1,dt*4); cutV *= Math.exp(-dt*5); modVal.cut = cutV; return; }
  try{ anaCtx.drawImage(s, 0, 0, 32, 18); }catch(e){ return; }
  const d = anaCtx.getImageData(0,0,32,18).data;
  let sum=0, diff=0;
  for(let i=0,j=0;i<d.length;i+=4,j++){
    const l = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114)/255;
    sum += l; diff += Math.abs(l-anaPrev[j]); anaPrev[j] = l;
  }
  const mean = sum/576, md = diff/576;
  modVal.bright = mean;
  motionPeak = Math.max(motionPeak*(1-dt*0.05), md, 0.02);
  modVal.motion += (Math.min(1, md/motionPeak) - modVal.motion)*Math.min(1, dt*10);
  if(md > Math.max(0.06, mdAvg*3.5)) cutV = 1;          // scene cut knocks the sync loose
  mdAvg = mdAvg*0.95 + md*0.05;
  cutV *= Math.exp(-dt*5);
  modVal.cut = cutV;
}

function sizeCanvas(){
  if(offline) return;
  const wrap = document.getElementById("canvasWrap");
  if(!wrap) return;
  const dpr = Math.min(window.devicePixelRatio||1, isTouch ? 1.5 : 2);
  const w = Math.floor(wrap.clientWidth*dpr), h = Math.floor(wrap.clientHeight*dpr);
  if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
}
window.addEventListener("resize", sizeCanvas);

function runPass(pr, inTex, outFbo, outW, outH, extras){
  gl.bindFramebuffer(gl.FRAMEBUFFER, outFbo);
  gl.viewport(0,0,outW,outH);
  gl.useProgram(pr.prog);
  gl.uniform2f(U(pr,"u_res"), outW, outH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inTex);
  gl.uniform1i(U(pr,"u_tex"), 0);
  if(extras) extras(pr);
  setParamUniforms(pr);
  draw();
}
function sigExtras(pr, now){
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.uniform1i(U(pr,"u_dispT"), 1);
  gl.uniform1f(U(pr,"u_rows"), SROWS);
  gl.uniform1f(U(pr,"u_rollBar"), Math.min(1, Math.pow(Math.abs(P.vRoll.cur),1.2)*5));
  gl.uniform1f(U(pr,"u_time"), now);
  gl.uniform1f(U(pr,"u_frame"), frameNo);
  gl.uniform1f(U(pr,"u_bypass"), bypass);
  gl.uniform1f(U(pr,"u_vrollpos"), vrollpos);
  gl.uniform1f(U(pr,"u_humpos"), humpos);
  gl.uniform1f(U(pr,"u_keyMode"), keyChroma?1:0);
}
function colExtras(pr, now){
  gl.uniform1f(U(pr,"u_time"), now);
  gl.uniform1f(U(pr,"u_bypass"), bypass);
  gl.uniform1f(U(pr,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(pr,"u_showKey"), showKeyMatte?1:0);
}

function stageNeeded(id){
  if(id === "glitch") return P.pixelSort.cur>0.003 || P.blockShift.cur>0.003 || P.dotify.cur>0.003 || P.driftWarp.cur>0.003 || P.fmWarp.cur>0.003;
  if(id === "flow") return P.mosh.cur>0.003 || P.melt.cur>0.003 || P.swirl.cur>0.003 || P.moshBlock.cur>0.003 || Math.abs(P.timeGrad.cur)>0.003;
  return true;
}
function runStage(id, inTex, dstRT, now){
  if(id === "sig")    return runPass(progSIG, inTex, dstRT.fbo, procW, procH, pr=>sigExtras(pr,now));
  if(id === "col")    return runPass(progCOL, inTex, dstRT.fbo, procW, procH, pr=>colExtras(pr,now));
  if(id === "glitch") return runPass(progGLITCH, inTex, dstRT.fbo, procW, procH, pr=>{ gl.uniform1f(U(pr,"u_time"), now); });
  if(id === "flow"){
    /* advect our own history, then keep a copy for the next frame */
    runPass(progFLOW, inTex, dstRT.fbo, procW, procH, pr=>{
      gl.uniform1f(U(pr,"u_time"), now);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, flowA.tex);
      gl.uniform1i(U(pr,"u_flowPrev"), 1);
    });
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, dstRT.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, flowB.fbo);
    gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    const t = flowA; flowA = flowB; flowB = t;
    return;
  }
}

function renderFrame(now, dt){
  frameNo++;
  sizeCanvas();
  updateAudio(dt);
  updateContentAnalysis(dt);
  updateMod(dt, now);
  applyParams(dt);
  updateSyncModel(dt, now);

  const vr = P.vRoll.cur;
  vrollpos = (vrollpos + Math.sign(vr)*Math.pow(Math.abs(vr),2.2)*dt*3.0) % 1;
  humpos = (humpos + dt*(0.05 + P.humBar.cur*0.1)) % 1;

  /* upload channel A */
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  if(inputMode==="pattern"){
    patClock += dt*playSpeed;
    drawPattern(patClock);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, patCanvas);
    srcAspect = patCanvas.width/patCanvas.height; hasSrc=1;
  } else if(video.readyState >= 2 && video.videoWidth>0){
    try{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      srcAspect = video.videoWidth/video.videoHeight; hasSrc=1;
    }catch(err){}
  }
  /* upload channel B */
  let bReady = 0;
  if(hasB && videoB.readyState >= 2 && videoB.videoWidth>0){
    gl.bindTexture(gl.TEXTURE_2D, srcTexB);
    try{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoB);
      srcAspectB = videoB.videoWidth/videoB.videoHeight; bReady=1;
    }catch(err){}
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  /* time base: bent frame store */
  const delayN = Math.max(1, Math.min(RING_N-1, Math.round(P.delayF.cur)));
  const useTime = P.echo.cur>0.003 || P.stutter.cur>0.003 || stutterHeld;
  if(useTime) ensureRing();
  if(P.stutter.cur>0.003){
    if(!stutterHeld && Math.random() < Math.pow(P.stutter.cur,2)*dt*10){
      stutterHeld = true; stutterT = 0.08 + Math.random()*0.6*P.stutter.cur;
    }
  }
  if(stutterHeld){ stutterT -= dt; if(stutterT<=0) stutterHeld=false; }
  const hasDelay = (ring && ringFilled >= delayN) ? 1 : 0;
  const readIdx = ring ? ((ringW - delayN + RING_N*2) % RING_N) : 0;

  /* pass 1: A/B mix + feedback + echo -> rtA */
  gl.bindFramebuffer(gl.FRAMEBUFFER, rtA.fbo);
  gl.viewport(0,0,procW,procH);
  gl.useProgram(progFB.prog);
  gl.uniform2f(U(progFB,"u_res"), procW, procH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (rescanMode?rtCRT:finalA).tex);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bReady?srcTexB:srcTex);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, hasDelay?ring[readIdx].tex:srcTex);
  gl.uniform1i(U(progFB,"u_src"), 0);
  gl.uniform1i(U(progFB,"u_prev"), 1);
  gl.uniform1i(U(progFB,"u_srcB"), 2);
  gl.uniform1i(U(progFB,"u_delayT"), 3);
  gl.uniform1f(U(progFB,"u_srcAspect"), srcAspect);
  gl.uniform1f(U(progFB,"u_srcBAspect"), srcAspectB);
  gl.uniform1f(U(progFB,"u_hasSrc"), hasSrc);
  gl.uniform1f(U(progFB,"u_hasB"), bReady);
  gl.uniform1f(U(progFB,"u_hasDelay"), hasDelay);
  gl.uniform1f(U(progFB,"u_time"), now);
  gl.uniform1f(U(progFB,"u_fbMode"), fbTrailMode?1:0);
  gl.uniform1f(U(progFB,"u_mixMode"), mixMode);
  gl.uniform1f(U(progFB,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(progFB,"u_edgeMode"), edgeMode);
  gl.uniform1f(U(progFB,"u_linkB"), linkB?1:0);
  gl.uniform1f(U(progFB,"u_wipeInv"), wipeInv?1:0);
  setParamUniforms(progFB);
  draw();

  /* capture into the frame ring (frozen while stuttering) */
  if(useTime && ring && !stutterHeld){
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rtA.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, ring[ringW].fbo);
    gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    ringW = (ringW+1)%RING_N; ringFilled = Math.min(ringFilled+1, RING_N);
  }

  /* ---- dynamic signal chain: stages run in the order set on the rail ---- */
  const active = chainOrder.filter(id=>stageEnabled[id] && stageNeeded(id));
  let srcT = rtA.tex;
  const scratch = [rtB, rtC];
  let si = 0;
  for(let k=0; k<active.length; k++){
    const last = (k === active.length-1);
    const dst = last ? finalB : scratch[si];
    runStage(active[k], srcT, dst, now);
    srcT = dst.tex;
    si ^= 1;
  }
  if(active.length === 0) runPass(progCOPY, srcT, finalB.fbo, procW, procH, null);

  /* pass 4: CRT -> screen */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.useProgram(progCRT.prog);
  gl.uniform2f(U(progCRT,"u_res"), canvas.width, canvas.height);
  gl.uniform2f(U(progCRT,"u_procRes"), procW, procH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, finalB.tex);
  gl.uniform1i(U(progCRT,"u_tex"), 0);
  gl.uniform1f(U(progCRT,"u_time"), now);
  setParamUniforms(progCRT);
  draw();

  /* full rescan: also render the CRT stage into a texture the feedback loop can eat */
  if(rescanMode){
    gl.bindFramebuffer(gl.FRAMEBUFFER, rtCRT.fbo);
    gl.viewport(0,0,procW,procH);
    gl.uniform2f(U(progCRT,"u_res"), procW, procH);
    draw();
  }

  /* swap feedback buffers */
  const tmp = finalA; finalA = finalB; finalB = tmp;

  if(!offline){
    if(inputMode==="file" && video.duration && !seeking){
      seek.value = video.currentTime/video.duration;
      tcode.textContent = fmtT(video.currentTime)+" / "+fmtT(video.duration);
    }
    fpsAcc += 1/Math.max(dt,1e-4); fpsN++;
    if(fpsN>=30){ fpsShow = Math.round(fpsAcc/fpsN); fpsAcc=0; fpsN=0;
      osd.textContent = procH+"p · "+fpsShow+" fps" + (recorder?" · REC":"") + (audioMode!=="off"?" · AUD":"") + (rescanMode?" · RESCAN":"");
      updateTempoUI();
    }
  }
}

let lastTickMs = 0;
function doTick(){
  if(offline) return;
  const nowMs = performance.now();
  if(nowMs - lastTickMs < 6) return;   // both windows may drive; render once per ~frame
  lastTickMs = nowMs;
  const now = nowMs/1000;
  let dt = now-lastT; lastT = now;
  dt = Math.min(dt, 0.1);
  renderFrame(now, dt);
  if(outTrack && outTrack.requestFrame){ try{ outTrack.requestFrame(); }catch(e){} }
}
window.__tick = doTick;
function frame(){
  requestAnimationFrame(frame);
  doTick();
}

/* ---------------- offline MP4 render (WebCodecs) ---------------- */
let renderCancel = false;
document.getElementById("btnRenderCancel").onclick = ()=>{ renderCancel = true; };
document.getElementById("btnRender").onclick = ()=>{ offlineRender().catch(e=>{
  console.error(e); toast("Render failed: "+e.message, true);
  offline=false; document.getElementById("renderOv").style.display="none";
}); };
async function offlineRender(){
  if(inputMode!=="file" || !video.duration){ toast("Load a video file into channel A first", true); return; }
  if(!("VideoEncoder" in window)){ toast("This browser has no WebCodecs — use Chrome", true); return; }
  const fps = 30, W = procW, H = procH;
  const candidates = [["avc1.640028","avc"],["avc1.42003e","avc"],["vp09.00.10.08","vp9"]];
  let codec=null, mcodec=null;
  for(const [c,m] of candidates){
    try{
      const s = await VideoEncoder.isConfigSupported({codec:c, width:W, height:H, bitrate:14_000_000, framerate:fps});
      if(s.supported){ codec=c; mcodec=m; break; }
    }catch(e){}
  }
  if(!codec){ toast("No supported video encoder found", true); return; }
  offline = true; renderCancel = false;
  const ov = document.getElementById("renderOv");
  const ovTxt = document.getElementById("renderTxt");
  const ovBar = document.getElementById("renderBar");
  ov.style.display = "flex";
  const wasPlaying = !video.paused;
  video.pause(); if(hasB) videoB.pause();
  const oldW = canvas.width, oldH = canvas.height;
  canvas.width = W; canvas.height = H;
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {codec: mcodec, width: W, height: H},
    fastStart: "in-memory",
  });
  const enc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => { console.error(e); toast("Encoder error: "+e.message, true); renderCancel = true; },
  });
  enc.configure({codec, width:W, height:H, bitrate:14_000_000, framerate:fps});
  const total = Math.max(1, Math.floor(video.duration*fps));
  const seekTo = (v,t)=>new Promise(res=>{
    const h = ()=>{ v.removeEventListener("seeked", h); res(); };
    v.addEventListener("seeked", h);
    v.currentTime = Math.min(t, v.duration-0.001);
  });
  const t0 = 1000;   // virtual clock offset so time-based effects behave
  for(let i=0; i<total && !renderCancel; i++){
    const t = i/fps;
    await seekTo(video, t);
    if(hasB && videoB.duration) await seekTo(videoB, t % videoB.duration);
    renderFrame(t0+t, 1/fps);
    const vf = new VideoFrame(canvas, {timestamp: Math.round(i*1e6/fps), duration: Math.round(1e6/fps)});
    enc.encode(vf, {keyFrame: i%(fps*2)===0});
    vf.close();
    while(enc.encodeQueueSize > 6 && !renderCancel) await new Promise(r=>setTimeout(r,5));
    if(i%3===0){
      ovTxt.textContent = "RENDERING "+Math.round(i/total*100)+"%  ("+i+"/"+total+" frames, "+codec.split(".")[0].toUpperCase()+")";
      ovBar.style.width = (i/total*100)+"%";
      await new Promise(r=>setTimeout(r,0));
    }
  }
  if(!renderCancel){
    ovTxt.textContent = "FINALIZING…";
    await enc.flush();
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], {type:"video/mp4"});
    dl(URL.createObjectURL(blob), "bendr-"+stamp()+".mp4");
    toast("Rendered "+total+" frames → MP4, "+(blob.size/1048576).toFixed(1)+" MB (video only — REC captures audio)");
  } else {
    try{ enc.close(); }catch(e){}
    toast("Render cancelled", true);
  }
  canvas.width = oldW; canvas.height = oldH;
  ov.style.display = "none";
  offline = false; lastT = performance.now()/1000;
  if(wasPlaying) video.play();
  if(hasB) videoB.play();
}

/* ---------------- init ---------------- */
window.__pcur = id=>P[id]&&P[id].cur;
window.__dbg = ()=>({inputMode, rs:video.readyState, err:video.error&&video.error.message, vw:video.videoWidth, hasSrc, srcAspect, cur:video.currentTime, paused:video.paused, rate:video.playbackRate, spd:playSpeed});

/* ---------------- init ---------------- */
const OUTPUT_MODE = (location.hash === "#output") && !!window.opener;
if(OUTPUT_MODE){
  /* this window is a clean output monitor: show the opener's canvas stream
     and drive the opener's render loop so the picture never freezes, even
     when the main window is fully occluded (e.g. this one is fullscreen). */
  document.title = "BENDR — OUTPUT";
  document.body.innerHTML = "";
  document.body.style.cssText = "margin:0;background:#000;overflow:hidden;cursor:none;";
  const pv = document.createElement("video");
  pv.muted = true; pv.autoplay = true; pv.playsInline = true;
  pv.style.cssText = "width:100vw;height:100vh;object-fit:contain;display:block;";
  document.body.appendChild(pv);
  const hookStream = ()=>{
    try{
      pv.srcObject = window.opener.__getOutputStream();
      pv.play().catch(()=>{});
    }catch(e){ setTimeout(hookStream, 300); }
  };
  hookStream();
  pv.ondblclick = ()=>{
    if(document.fullscreenElement) document.exitFullscreen();
    else pv.requestFullscreen().catch(()=>{});
  };
  (function driveLoop(){
    requestAnimationFrame(driveLoop);
    try{ if(window.opener && !window.opener.closed && window.opener.__tick) window.opener.__tick(); }catch(e){}
  })();
} else {
  /* mobile: one pane at a time via the bottom tab bar */
  function setMTab(t){
    document.body.classList.remove("mtab-controls","mtab-bends","mtab-matrix","mtab-video");
    document.body.classList.add("mtab-"+t);
    document.querySelectorAll("#mtabs button").forEach(b=>b.classList.toggle("on", b.dataset.mtab===t));
    try{ localStorage.setItem("bendr.mtab", t); }catch(e){}
    setTimeout(sizeCanvas, 60);
  }
  document.querySelectorAll("#mtabs button").forEach(b=>{ b.onclick = ()=>setMTab(b.dataset.mtab); });
  let startTab = "controls";
  try{ startTab = localStorage.getItem("bendr.mtab") || "controls"; }catch(e){}
  setMTab(startTab);
  window.addEventListener("orientationchange", ()=>setTimeout(sizeCanvas, 250));

  /* touch devices: lighter default so phones hold framerate */
  if(isTouch){
    setProcRes(360);
    const rs = document.getElementById("selRes");
    if(rs) rs.value = "360";
  }

  buildPanel();
  renderChain();
  loadCollapse();
  refreshStageLeds();
  setInterval(refreshStageLeds, 400);
  document.getElementById("btnChainReset").onclick = ()=>{
    chainOrder = ["sig","col","glitch","flow"];
    stageEnabled = {sig:true, col:true, glitch:true, flow:true};
    renderChain();
  };
  renderRoutes();
  loadPreset(1);   /* RAINBOW RITE so it looks alive immediately */
  sizeCanvas();
  requestAnimationFrame(frame);
  toast("BENDR ready — drop a video anywhere, or press H for help");
}
