/* ---------------- GL engine ---------------- */
const canvas = document.getElementById("glcanvas");
/* preserveDrawingBuffer made the compositor keep a copy of the default
   framebuffer every single frame, and the only thing that wanted it was reading
   the canvas back for a still. Stills are captured inside the frame callback
   instead, which is where the buffer is valid anyway. */
const gl = canvas.getContext("webgl2", {preserveDrawingBuffer:false, antialias:false, alpha:false});
if(!gl){ document.body.innerHTML = "<p style='padding:40px;font-family:monospace'>WebGL2 not available in this browser.</p>"; throw new Error("no webgl2"); }

/* Asking for COMPILE_STATUS immediately after each compileShader forces the
   driver to finish that shader before starting the next one. Kick all of them
   off first and only ask afterwards, so the driver can pipeline the lot.
   Same for linking. */
const pendingShaders = [], pendingProgs = [];
function makeShader(type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  pendingShaders.push({s, src});
  return s;
}
function checkPrograms(){
  for(const {s} of pendingShaders){
    if(gl.getShaderParameter(s, gl.COMPILE_STATUS)) continue;
    const log = gl.getShaderInfoLog(s);
    console.error("SHADER ERROR:\n"+log);
    if(typeof toast === "function") toast("Shader error — see console", true);
    throw new Error(log);
  }
  pendingShaders.length = 0;
  for(const pr of pendingProgs){
    if(gl.getProgramParameter(pr, gl.LINK_STATUS)) continue;
    const log = gl.getProgramInfoLog(pr);
    console.error("LINK ERROR:\n"+log);
    if(typeof toast === "function") toast("Shader link error — see console", true);
    throw new Error(log);
  }
  pendingProgs.length = 0;
}
function makeProg(fsSrc){
  const p = gl.createProgram();
  gl.attachShader(p, makeShader(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, makeShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  pendingProgs.push(p);
  return {prog:p, loc:{}};
}
function U(pr, name){
  if(!(name in pr.loc)) pr.loc[name] = gl.getUniformLocation(pr.prog, name);
  return pr.loc[name];
}
const progFB = makeProg(FS_FB), progSIG = makeProg(FS_SIG), progCOL = makeProg(FS_COL), progCRT = makeProg(FS_CRT);
const progGLITCH = makeProg(FS_GLITCH), progFLOW = makeProg(FS_FLOW), progCOPY = makeProg(FS_COPY);
const progMIX = makeProg(FS_MIX);
const progTILE = makeProg(FS_TILE);
const progMULTI = makeProg(FS_MULTI);
const progGEN = makeProg(FS_GEN);
const progLAB = makeProg(FS_LAB);
/* the scan processor brings its own vertex shader, because it draws geometry
   rather than a full-screen triangle */
function makeProg2(vsSrc, fsSrc){
  const p = gl.createProgram();
  gl.attachShader(p, makeShader(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, makeShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  pendingProgs.push(p);
  return {prog:p, loc:{}};
}
const progSCAN = makeProg2(VS_SCAN, FS_SCAN);
const progPHOS = makeProg(FS_PHOS);
const progFIELD = makeProg(FS_FIELD);
const progDCT = makeProg(FS_DCT);
const progTDISP = makeProg(FS_TDISP);
/* A ring of whole frames the shader can address per pixel. One texture array
   per channel, allocated only when something asks for it, because at 4K each
   layer is 33 MB. */
const TD_LAYERS = 12;
function makeHistArray(w,h,n){
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, w, h, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return {tex, fbo: gl.createFramebuffer(), w, h, n, head:0};
}
/* Additive accumulation is what produces the bright ridge where lines bunch,
   and it wants more headroom than eight bits. Float if the machine has it. */
const floatRT = gl.getExtension("EXT_color_buffer_float") ? true : false;
if(!gl.getExtension("EXT_float_blend")) { /* additive float blending may be slow; still correct */ }
/* now that every one of them is in flight, ask how they got on */
checkPrograms();

let rtFailed = false;
function makeRT(w,h,float16){
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if(float16 && floatRT) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
  else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  /* At 4K this asks for well over a gigabyte of texture. When a driver refuses,
     it does so silently and every pass after it draws into nothing, so the
     picture goes black with no explanation. Say something instead. */
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE){
    if(!rtFailed){
      rtFailed = true;
      if(typeof toast === "function")
        toast("Out of graphics memory at "+w+"\u00d7"+h+" \u2014 drop the processing resolution", true);
    }
    gl.deleteTexture(tex); gl.deleteFramebuffer(fbo);
    return null;
  }
  return {tex, fbo, w, h};
}
let procW=1280, procH=720;
let RING_N = 30;

/* Each channel owns its feedback history, flow history and frame ring;
   scratch buffers are shared because channels render one after the other. */
function newChanRT(){
  return {fbNext:null, crt:null, flowA:null, flowB:null, flowSrc:null, gen:null, out:null,
          ring:null, ringW:0, ringFilled:0};
}
const chanRT = {};
for(const ch of CHANNELS){ chanRT[ch] = newChanRT(); genMode[ch] = {shape:0, wave:0, col:1}; }
let scratch1, scratch2, mixOut, busOut1, busOut2, persistA, persistB;
/* one frame of history per mixer stage, so the melt stage can read what the
   same stage produced last time. Ping-ponged rather than copied. */
let busHist1, busHist2, mixHist;
let fieldSrc = 0;   // field-modulation source
const autoGain = {};
for(const ch of CHANNELS) autoGain[ch] = 1;

function freeRT(rt){ if(rt){ gl.deleteTexture(rt.tex); gl.deleteFramebuffer(rt.fbo); } }
/* allocate a shared buffer the first time something actually needs it */
function ensureShared(name){
  switch(name){
    case "busOut1":  if(!busOut1)  busOut1  = makeRT(procW,procH); return busOut1;
    case "busOut2":  if(!busOut2)  busOut2  = makeRT(procW,procH); return busOut2;
    case "persistA": if(!persistA) persistA = makeRT(procW,procH); return persistA;
    case "persistB": if(!persistB) persistB = makeRT(procW,procH); return persistB;
    case "busHist1": if(!busHist1) busHist1 = makeRT(procW,procH); return busHist1;
    case "busHist2": if(!busHist2) busHist2 = makeRT(procW,procH); return busHist2;
    case "mixHist":  if(!mixHist)  mixHist  = makeRT(procW,procH); return mixHist;
  }
  return null;
}
function clearRing(c){
  if(c.ring) for(const rt of c.ring) freeRT(rt);
  c.ring=null; c.ringW=0; c.ringFilled=0;
}
function ensureRing(c){
  if(!c.ring){ c.ring=[]; for(let i=0;i<RING_N;i++) c.ring.push(makeRT(procW,procH)); c.ringW=0; c.ringFilled=0; }
}
/* fbPrev is gone: the feedback source is the channel's own out target, read
   before it is written again, so there was never anything to copy into a
   second buffer. One less full-raster target per channel. */
const CH_RTS = ["fbNext","crt","flowA","flowB","flowSrc","gen","out"];
/* A channel's eight render targets are only allocated once that channel is
   actually used. At 720p that hardly matters; at 2160p each one is 33 MB, so
   allocating all four channels up front would cost a gigabyte for nothing. */
function allocChan(ch){
  const c = chanRT[ch];
  for(const k of CH_RTS) freeRT(c[k]);
  clearRing(c);
  /* the shader stage's own previous frame is allocated on demand rather than
     with the rest, because most channels never carry a shader and at 4K it is
     another 33 MB each. It has to be dropped here so a resolution change does
     not leave a target of the wrong size behind. */
  freeRT(c.glslPrev); c.glslPrev = null;
  for(const k of CH_RTS) c[k] = makeRT(procW, procH);
  c.allocated = true;
}
function ensureChanRT(ch){
  if(!chanRT[ch].allocated) allocChan(ch);
}
function clearRT(rt){
  if(!rt) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
/* Empty every buffer that feeds itself: the feedback store, the flow stage's
   frame store, the phosphor persistence and the frame ring. A bad frame in any
   of those circulates indefinitely, so this is the way out without touching a
   single parameter. */
function flushBuffers(){
  for(const ch of CHANNELS){
    const c = chanRT[ch];
    if(!c.allocated) continue;
    for(const k of CH_RTS) clearRT(c[k]);
    if(c.glslPrev) clearRT(c.glslPrev);
    if(c.ring){ for(const r of c.ring) clearRT(r); c.ringW = 0; c.ringFilled = 0; }
    c.flowLast = -99;
  }
  clearRT(scratch1); clearRT(scratch2); clearRT(mixOut);
  if(busOut1) clearRT(busOut1); if(busOut2) clearRT(busOut2);
  if(persistA) clearRT(persistA); if(persistB) clearRT(persistB);
  if(busHist1) clearRT(busHist1); if(busHist2) clearRT(busHist2); if(mixHist) clearRT(mixHist);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function allocRTs(){
  for(const ch of CHANNELS){
    const c = chanRT[ch];
    if(c.allocated) allocChan(ch);
    else { for(const k of CH_RTS) freeRT(c[k]); freeRT(c.glslPrev); c.glslPrev = null; clearRing(c); }
  }
  freeRT(scratch1); freeRT(scratch2); freeRT(mixOut); freeRT(busOut1); freeRT(busOut2);
  freeRT(persistA); freeRT(persistB);
  freeRT(busHist1); freeRT(busHist2); freeRT(mixHist);
  rtFailed = false;
  scratch1 = makeRT(procW,procH); scratch2 = makeRT(procW,procH); mixOut = makeRT(procW,procH);
  /* the other six are only wanted when the feature that reads them is on. At
     720p that hardly matters; at 2160p they are 190 MB of nothing. */
  busOut1 = busOut2 = persistA = persistB = busHist1 = busHist2 = mixHist = null;
  /* if the driver refused, step the raster down and try again rather than
     leaving a set of half-allocated buffers and a black picture */
  if(rtFailed && procH > 360){
    const ladder = [360, 540, 720, 1080, 1440, 2160];
    const next = ladder[Math.max(0, ladder.indexOf(procH) - 1)] || 360;
    if(next < procH){
      procH = next; procW = Math.round(next*16/9/2)*2;
      RING_N = next >= 2160 ? 6 : next >= 1440 ? 12 : next >= 1080 ? 20 : 30;
      const rs = document.getElementById("selRes"); if(rs) rs.value = String(next);
      allocRTs();
    }
  }
}
const MAX_TEX = gl.getParameter(gl.MAX_TEXTURE_SIZE);
function setProcRes(h){
  const w = Math.round(h*16/9/2)*2;
  if(w > MAX_TEX){
    if(typeof toast === "function") toast("This machine tops out at "+MAX_TEX+" pixels wide", true);
    return false;
  }
  procH = h; procW = w;
  /* the frame store is the one thing that scales badly: thirty 4K frames is
     four gigabytes, so the ring gets shorter as the raster gets bigger */
  RING_N = h >= 2160 ? 6 : h >= 1440 ? 12 : h >= 1080 ? 20 : 30;
  allocRTs();
  return true;
}
setProcRes(1080);

function makeSrcTex(){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,2,2,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(16));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
const srcTex = {};
for(const ch of CHANNELS) srcTex[ch] = makeSrcTex();
/* stand-in for a channel that has not been allocated yet */
const blackTex = makeSrcTex();
function chanOutTex(ch){ const c = chanRT[ch]; return (c.allocated && c.out) ? c.out.tex : blackTex; }
/* re-entry: a channel can take another channel, a bus, or the programme as its
   source. Whatever it reads is last frame's, exactly like patching a mixer's
   output back into a spare input with a cable. */
const FEED_SRCS = [
  {id:"A", name:"CH A OUT"}, {id:"B", name:"CH B OUT"},
  {id:"C", name:"CH C OUT"}, {id:"D", name:"CH D OUT"},
  {id:"BUS1", name:"BUS 1 OUT"}, {id:"BUS2", name:"BUS 2 OUT"},
  {id:"PGM", name:"PROGRAMME OUT"},
];
function feedTex(id){
  if(id === "BUS1") return busOut1 ? busOut1.tex : blackTex;
  if(id === "BUS2") return busOut2 ? busOut2.tex : blackTex;
  if(id === "PGM")  return mixOut  ? mixOut.tex  : blackTex;
  return chanOutTex(id);
}

/* per-scanline sync model texture (written by CPU each frame) */
const SROWS = 576;
const SCHAN = 4;                 // one row of the sync texture per channel
const dispTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, dispTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,SROWS,SCHAN,0,gl.RGBA,gl.FLOAT,null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

/* Every pass used to walk all 349 parameters, build the string "u_"+id and
   probe a 349-key object, to find the eight to forty-five uniforms that program
   actually declares. That is about 110us of pure JavaScript per call and this
   runs up to 28 times a frame. Resolve the list once, the first time a program
   is used, and iterate that instead. */
function paramTable(pr){
  if(pr.ptab) return pr.ptab;
  const t = [];
  for(const p of PLIST){
    const loc = U(pr, "u_"+p.id);
    if(loc) t.push({loc, id:p.id, master:p.master});
  }
  pr.ptab = t;
  return t;
}
function setParamUniforms(pr, ch){
  const cc = chanCur[ch||"A"];
  const t = pr.ptab || paramTable(pr);
  for(let i=0;i<t.length;i++){
    const e = t[i];
    gl.uniform1f(e.loc, e.master ? mCur[e.id] : cc[e.id]);
  }
}
function draw(){ gl.drawArrays(gl.TRIANGLES, 0, 3); }

/* animated signal state */
const vrollpos={}, humpos={};
for(const ch of CHANNELS){ vrollpos[ch]=0; humpos[ch]=0; }
let frameNo=0, bypass=0;
