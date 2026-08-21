/* ---------------- physical sync model (CPU-side PLL simulation) ----------------
   Real sync corruption isn't random rectangles: it's a phase-locked loop losing
   grip. We evolve smooth correlated processes per scanline and hand the GPU a
   displacement/gain/noise profile each frame. */
const SNC = 25;
/* per-channel PLL state: each channel is its own deck, so each drifts on its own */
function newSyncState(){
  return {ou:new Float32Array(SNC), ouf:new Float32Array(SNC), ev:[],
          trackC:0.65, trackV:0, hunt:0, huntPh:Math.random()*6.28,
          clogC:0.5+ (Math.random()-0.5)*0.5, clogV:0, creaseJ:0};
}
const syncState = {};
const dispData = new Float32Array(SROWS*SCHAN*4);
function gaussR(){ return (Math.random()+Math.random()+Math.random()-1.5)*1.633; }

function updateSyncChannel(ch, ci, dt, t){
  if(!syncState[ch]) syncState[ch] = newSyncState();
  const S = syncState[ch];
  const g = id=>getCur(id, ch);
  const jit=g("jitter"), tear=g("tear"), tsz=g("tearSize"), wob=g("hWobble"), wfq=g("wobbleFreq"),
        wow=g("tapeWow"), wowR=g("wowRate"), flut=g("flutter"), trk=g("tracking"),
        tph=g("trackPhase"), hunt=g("trackHunt"), hsw=g("headSwitch"), sp=g("tapeSpeed"),
        stre=g("tapeStretch"), crs=g("crease"), crsP=g("creasePos"), clog=g("headClog"), azi=g("azimuth");
  const sdt = Math.min(dt, 0.05), rq = Math.sqrt(sdt);
  for(let i=0;i<SNC;i++){
    S.ou[i]  += -6*S.ou[i]*sdt  + 2.4*rq*gaussR();
    S.ouf[i] += -45*S.ouf[i]*sdt + 10*rq*gaussR();
  }
  /* spawn loss-of-lock events: sharp shear at one line, exponential re-lock below */
  const rate = tear*tear*15 + trk*1.1 + sp*0.6;
  if(Math.random() < rate*sdt && S.ev.length < 10){
    const whole = Math.random() < 0.18;   // occasionally the whole frame gets sucked sideways
    S.ev.push({
      t0:t, r0: whole ? SROWS-1 : Math.floor(Math.random()*SROWS),
      A:(0.05+0.45*Math.random()*Math.random())*(Math.random()<0.5?-1:1)*(0.35+0.65*tear),
      L:(10+tsz*90)*(0.5+Math.random())*(whole?6:1),
      rel:0.08+Math.random()*0.5, env:0});
  }
  for(const ev of S.ev){
    const age = t-ev.t0;
    /* LATCHED: the loop never re-acquires. A circuit that has genuinely given
       up does not politely recover after 300 milliseconds, and being unable to
       reach that state was the tool refusing to break properly. */
    ev.env = syncLatch ? Math.min(age/0.03, 1)
                       : Math.min(age/0.03,1)*Math.exp(-Math.max(0,age-0.03)/ev.rel);
  }
  if(syncLatch){ while(S.ev.length > 10) S.ev.shift(); }
  else S.ev = S.ev.filter(ev=>ev.env>0.012);
  /* tracking band drifts vertically like a real mistracking head */
  S.trackV += -0.6*S.trackV*sdt + 0.35*rq*gaussR();
  S.trackC += S.trackV*sdt*0.25;
  if(S.trackC<0.08){S.trackC=0.08; S.trackV=Math.abs(S.trackV);}
  if(S.trackC>0.92){S.trackC=0.92; S.trackV=-Math.abs(S.trackV);}
  /* servo hunt: the auto-tracking circuit searching, overshooting, snapping back */
  S.huntPh += sdt*(0.35 + hunt*2.4);
  const huntTri = Math.abs(((S.huntPh*0.5)%1)*2-1);
  S.hunt = hunt*(huntTri-0.5)*0.55 + hunt*0.10*Math.sin(S.huntPh*9.3);
  const bandC = Math.min(0.97, Math.max(0.03, S.trackC + tph*0.45 + S.hunt));
  /* head clog: a dead band that wanders slowly and kills the signal inside it */
  S.clogV += -0.25*S.clogV*sdt + 0.10*rq*gaussR();
  S.clogC += S.clogV*sdt*0.2;
  if(S.clogC<0.05){S.clogC=0.05; S.clogV=Math.abs(S.clogV);}
  if(S.clogC>0.95){S.clogC=0.95; S.clogV=-Math.abs(S.clogV);}
  /* tape crease: a hard fold that shears one band sideways and jitters frame to frame */
  S.creaseJ += (gaussR()*0.5 - S.creaseJ)*Math.min(1, sdt*22);
  const hsRows = Math.max(0, Math.floor(SROWS*0.05*hsw*(1.0+sp)));
  const bw = 0.035+0.05*trk + hunt*0.02;
  const wowF1 = 5.2*(0.25+wowR*3.0), wowF2 = 17.0*(0.25+wowR*3.0);
  const wowT1 = t*0.9*(0.3+wowR*2.6), wowT2 = t*1.4*(0.3+wowR*2.6);
  const clogW = 0.012 + clog*0.075, creaseW = 0.006 + crs*0.03;
  const off = ci*SROWS*4;
  for(let r=0;r<SROWS;r++){
    const fy = r/SROWS;
    let d = (Math.sin(fy*wowF1+wowT1)+0.6*Math.sin(fy*wowF2-wowT2))*0.006*wow
          + Math.sin(fy*(6.0+wfq*80.0)+t*4.2)*0.013*wob;
    /* scrape flutter: fast, low-amplitude, high spatial frequency */
    if(flut>0.003) d += Math.sin(fy*(120.0+flut*420.0)+t*37.0)*0.004*flut
                      + Math.sin(fy*(311.0)-t*61.0)*0.0022*flut;
    /* tape stretch: the top of the frame reads long, so geometry leans */
    if(stre>0.003){ const k=1.0-fy; d += k*k*0.06*stre; }
    const xc = fy*(SNC-1), ic = Math.min(SNC-2, Math.floor(xc)), fc = xc-ic;
    const sm = fc*fc*(3-2*fc);
    const ouv  = S.ou[ic]*(1-sm)+S.ou[ic+1]*sm;
    const oufv = S.ouf[ic]*(1-sm)+S.ouf[ic+1]*sm;
    d += ouv*0.004*(0.12+jit);            // the picture is never perfectly still
    const g0 = (fy-bandC)/bw;
    const bp = Math.exp(-g0*g0);
    d += bp*trk*oufv*0.02;
    let ng = bp*trk*(0.3+0.4*Math.abs(oufv));
    let hf = bp*trk*0.35 + sp*0.12;
    for(const ev of S.ev){
      if(r<=ev.r0) d += ev.A*ev.env*Math.exp(-(ev.r0-r)/ev.L);
    }
    if(r<hsRows){
      const k = (hsRows-r)/hsRows;
      d += (0.045*k*k + 0.02*k*oufv)*hsw;
      ng += hsw*0.9*k*k;
      hf += hsw*0.5*k;
    }
    /* head clog band: no RF, so no chroma and no detail, just noise */
    if(clog>0.003){
      const gc = (fy-S.clogC)/clogW;
      const cb = Math.exp(-gc*gc);
      ng += cb*clog*1.5;
      hf += cb*clog;
    }
    /* crease */
    if(crs>0.003){
      const gk = (fy-crsP)/creaseW;
      const cb = Math.exp(-gk*gk);
      d += cb*crs*(0.09 + 0.05*S.creaseJ);
      ng += cb*crs*0.8;
      hf += cb*crs*0.7;
    }
    /* azimuth error: alternate head passes lose the high band */
    if(azi>0.003) hf += azi*0.75*(r%2);
    const gn = 1 - Math.min(0.38, Math.abs(d)*2.0) - Math.min(0.5, ng*0.18);
    const o = off + r*4;
    dispData[o]=d; dispData[o+1]=gn; dispData[o+2]=ng; dispData[o+3]=Math.min(1, hf);
  }
}
/* The PLL runs 576 rows per channel with trig, exponentials and a few hundred
   random draws in each. Doing that for four channels when one is on screen
   threw three quarters of the work away: nothing samples a dead channel's rows,
   so they can sit stale until it comes back. */
function updateSyncModel(dt, t, live){
  for(let ci=0; ci<CHANNELS.length && ci<SCHAN; ci++){
    if(live && !live[CHANNELS[ci]]) continue;
    updateSyncChannel(CHANNELS[ci], ci, dt, t);
  }
  gl.bindTexture(gl.TEXTURE_2D, dispTex);
  /* texSubImage2D, not texImage2D: the storage is allocated once at startup and
     never changes shape, so re-specifying it every frame was 36 KB of pointless
     reallocation sixty times a second */
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,SROWS,SCHAN,gl.RGBA,gl.FLOAT,dispData);
}

/* ---------------- main loop ---------------- */
const osd = document.getElementById("osd");
let lastT = performance.now()/1000, fpsAcc=0, fpsN=0, fpsShow=0;
const stutterHeld = {}, stutterT = {};
for(const ch of CHANNELS){ stutterHeld[ch]=false; stutterT[ch]=0; }
/* STILL freezes a channel's source outright; STROBE holds each frame for a
   while before letting the next through; SHAKE knocks it off position. */
const stillHeld = {}, shakeOff = {}, shakeT = {};
for(const ch of CHANNELS){ stillHeld[ch]=false; shakeOff[ch]={x:0,y:0}; shakeT[ch]=0; }
function sourceFrozen(ch){
  if(stillHeld[ch]) return true;
  const st = getCur("strobe", ch);
  if(st > 0.003){
    const hold = 1 + Math.floor(st*st*22);
    if(frameNo % hold !== 0) return true;
  }
  return false;
}
window.__toggleStill = ch=>{
  ch = ch || activeChan;
  stillHeld[ch] = !stillHeld[ch];
  toast("Channel "+ch+(stillHeld[ch] ? ": frozen" : ": running"));
  return stillHeld[ch];
};
window.__stillOf = ch=>!!stillHeld[ch||activeChan];
let offline = false, liveList = "A";
let liveNow = {A:true, B:false, C:false, D:false};

/* video content analysis — the picture itself as a mod source (reads channel A) */
const anaC = document.createElement("canvas"); anaC.width=32; anaC.height=18;
const anaCtx = anaC.getContext("2d", {willReadFrequently:true});
const anaPrev = new Float32Array(576);
let mdAvg=0.02, motionPeak=0.05, cutV=0;
/* This drew the source into a 32x18 canvas and pulled it back with
   getImageData on every frame, whether or not anything was listening. That is
   a CPU readback of a GPU-resident video frame sixty times a second for three
   numbers that, in most patches, nothing reads. It now runs when something
   actually consumes it: a patched route, a scene-cut trigger, the feedback
   auto-level servo, or the MOD page being open with its meters showing. */
let anaGrid = null, anaWasOn = false;
function contentAnalysisNeeded(){
  for(const r of routes) if(r.src==="motion" || r.src==="bright" || r.src==="cut") return true;
  for(const m of mods) if(m.trig === "cut") return true;
  if(!fbNoServo) for(const ch of CHANNELS) if(getCur("fbAuto",ch) > 0.003) return true;
  if(!anaGrid) anaGrid = document.getElementById("modgrid");
  if(anaGrid && anaGrid.classList.contains("on")) return true;
  return false;
}
function updateContentAnalysis(dt){
  if(!contentAnalysisNeeded()){ anaWasOn = false; return; }
  const first = !anaWasOn;
  anaWasOn = true;
  const S = SRC.A;
  let src = null;
  if(S.mode==="pattern" || S.mode==="text") src = S.patCanvas;
  else if(S.mode==="file" && S.still) src = (S.img && S.img.complete && S.img.naturalWidth>0) ? S.img : null;
  else if(S.video.readyState>=2 && S.video.videoWidth>0) src = S.video;
  if(!src){ modVal.motion *= 1-Math.min(1,dt*4); cutV *= Math.exp(-dt*5); modVal.cut = cutV; return; }
  try{ anaCtx.drawImage(src, 0, 0, 32, 18); }catch(e){ return; }
  const d = anaCtx.getImageData(0,0,32,18).data;
  let sum=0, diff=0;
  for(let i=0,j=0;i<d.length;i+=4,j++){
    const l = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114)/255;
    sum += l; diff += Math.abs(l-anaPrev[j]); anaPrev[j] = l;
  }
  const mean = sum/576, md = diff/576;
  modVal.bright = mean;
  /* the first frame after a gap has nothing to difference against but whatever
     was on screen when it last ran, so it reads as one enormous cut */
  if(first){ modVal.motion = 0; cutV = 0; modVal.cut = 0; return; }
  motionPeak = Math.max(motionPeak*(1-dt*0.05), md, 0.02);
  modVal.motion += (Math.min(1, md/motionPeak) - modVal.motion)*Math.min(1, dt*10);
  if(md > Math.max(0.06, mdAvg*3.5)) cutV = 1;
  mdAvg = mdAvg*0.95 + md*0.05;
  cutV *= Math.exp(-dt*5);
  modVal.cut = cutV;
}

/* This used to run at the top of every frame, writing inline styles and then
   reading clientWidth - a forced synchronous layout, sixty times a second,
   whether or not anything had moved. It now runs when the pane actually
   changes size, and on the two occasions the raster does. */
let sizeDirty = true;
function markSizeDirty(){ sizeDirty = true; }
function sizeCanvasIfNeeded(){ if(sizeDirty){ sizeDirty = false; sizeCanvas(); } }
function sizeCanvas(){
  if(offline) return;
  const wrap = document.getElementById("canvasWrap");
  if(!wrap) return;
  const dpr = Math.min(window.devicePixelRatio||1, isTouch ? 1.5 : 2);
  const cw = Math.max(2, wrap.clientWidth), ch = Math.max(2, wrap.clientHeight);
  /* the picture keeps the processing raster's aspect and is letterboxed inside
     the pane, so it is never stretched to whatever shape the window happens to
     be — and the pop-out, which mirrors this canvas, stays correct too */
  const ar = procW/procH;
  let dw = cw, dh = cw/ar;
  if(dh > ch){ dh = ch; dw = ch*ar; }
  canvas.style.width = dw+"px"; canvas.style.height = dh+"px";
  canvas.style.left = Math.round((cw-dw)/2)+"px";
  canvas.style.top  = Math.round((ch-dh)/2)+"px";
  const mv = document.getElementById("mvlabels");
  if(mv){
    mv.style.width = dw+"px"; mv.style.height = dh+"px";
    mv.style.left = canvas.style.left; mv.style.top = canvas.style.top;
  }
  const w = Math.max(2, Math.floor(dw*dpr)), h = Math.max(2, Math.floor(dh*dpr));
  /* while recording the backing store is pinned to the processing raster */
  if(!recLocked && (canvas.width!==w || canvas.height!==h)){ canvas.width=w; canvas.height=h; }
}
window.addEventListener("resize", sizeCanvas);

function runPass(pr, inTex, outFbo, outW, outH, extras, ch){
  gl.bindFramebuffer(gl.FRAMEBUFFER, outFbo);
  gl.viewport(0,0,outW,outH);
  gl.useProgram(pr.prog);
  gl.uniform2f(U(pr,"u_res"), outW, outH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inTex);
  gl.uniform1i(U(pr,"u_tex"), 0);
  if(extras) extras(pr);
  setParamUniforms(pr, ch);
  draw();
}
function sigExtras(pr, now, ch){
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.uniform1i(U(pr,"u_dispT"), 1);
  gl.uniform1f(U(pr,"u_rows"), SROWS);
  gl.uniform1f(U(pr,"u_rollBar"), Math.min(1, Math.pow(Math.abs(getCur("vRoll",ch)),1.2)*5));
  gl.uniform1f(U(pr,"u_time"), now);
  gl.uniform1f(U(pr,"u_frame"), frameNo);
  gl.uniform1f(U(pr,"u_bypass"), bypass);
  gl.uniform1f(U(pr,"u_vrollpos"), vrollpos[ch]);
  gl.uniform1f(U(pr,"u_humpos"), humpos[ch]);
  gl.uniform1f(U(pr,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(pr,"u_chanIdx"), Math.max(0, CHANNELS.indexOf(ch)));
  const tp = transport[ch] || "play";
  gl.uniform1f(U(pr,"u_tpStill"), tp==="still" ? 0.75 : 0);
  gl.uniform1f(U(pr,"u_tpShuttle"), tp==="ff" ? 0.55 : (tp==="rew" ? -0.55 : 0));
}
function colExtras(pr, now, ch){
  gl.uniform1f(U(pr,"u_time"), now);
  gl.uniform1f(U(pr,"u_bypass"), bypass);
  gl.uniform1f(U(pr,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(pr,"u_showKey"), showKeyMatte?1:0);
  gl.uniform1f(U(pr,"u_negMode"), Math.round(getCur("negMode", ch||"A")));
}
const FLOW_IDS = ["mosh","moshVec","melt","swirl","moshBlock","timeGrad","flowStretch","flowRepel","flowNoise","flowHue","flowFade"];
const LAB_IDS = ["sparseJit","ntscArt","ntscFringe","snow","fmAmt","slitscan","bitCrush","bandKey","rowSmear","moire","fieldMod"];
/* The scan processor is the one stage that draws geometry. It gets its own
   target because it accumulates additively into float, and because the number
   of primitives is a parameter rather than a constant. */
let scanRT = null, fieldPrev = null, fieldOut = null;
function runScan(inTex, dstRT, now, ch){
  const lines = Math.max(8, Math.round(getCur("scanLines", ch)));
  const samples = Math.max(8, Math.round(getCur("scanSamples", ch)));
  /* these three are allocated on demand and were never rebuilt when the
     processing resolution changed, so the stage drew into a target of the
     wrong size and the picture landed in a corner */
  if(scanRT && (scanRT.w !== procW || scanRT.h !== procH)){ freeRT(scanRT); scanRT = null; }
  if(!scanRT) scanRT = makeRT(procW, procH, true);
  if(!scanRT) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, scanRT.fbo);
  gl.viewport(0, 0, procW, procH);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);          /* where lines bunch, they add up */
  gl.useProgram(progSCAN.prog);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inTex);
  gl.uniform1i(U(progSCAN,"u_tex"), 0);
  gl.uniform2f(U(progSCAN,"u_res"), procW, procH);
  gl.uniform1f(U(progSCAN,"u_lines"), lines);
  gl.uniform1f(U(progSCAN,"u_samples"), samples);
  gl.uniform1f(U(progSCAN,"u_time"), now);
  gl.uniform1f(U(progSCAN,"u_scanRevH"), scanRevH?1:0);
  gl.uniform1f(U(progSCAN,"u_scanRevV"), scanRevV?1:0);
  setParamUniforms(progSCAN, ch);
  /* two vertices per sample makes the ribbon; one instance per scanline */
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, samples*2, lines);
  gl.disable(gl.BLEND);
  runPass(progCOPY, scanRT.tex, dstRT.fbo, procW, procH, null, ch);
}
/* SIG and COL have no gate, and after measuring them they are not going to get
   one. The idea was that they could be dropped whenever nothing feeding them
   had moved off its default, the way the other six stages are dropped when
   their amount is zero. They cannot: the defaults are not neutral. Chroma bleed
   sits at 0.25, ringing at 0.15, hum at 0.1, jitter at 0.1, dot crawl at 0.1,
   glow at 0.15 — that baseline is what makes a fresh patch look like video
   rather than a texture on a quad. Running each stage against a plain copy of
   the same input and reading both back as floats, SIG moves a pixel by as much
   as 1.22 and COL by 0.12 with everything at default, so a default-value gate
   would quietly delete the house sound. A hand-written table of genuinely
   neutral values could be built instead, but it would fire only for a patch
   where every one of some thirty parameters had been zeroed by hand, and one
   omission in the table would silently drop an effect. Not worth it. */
function stageNeeded(id, ch){
  if(id === "dct") return getCur("dctAmt",ch) > 0.003;
  if(id === "tdisp") return getCur("tdAmt",ch) > 0.003;
  if(id === "scan") return getCur("scanAmt",ch) > 0.003 || getCur("scanCollapse",ch) > 0.003
                        || getCur("scanWobAmt",ch) > 0.003 || Math.abs(getCur("scanCurve",ch)) > 0.003
                        || scanRevH || scanRevV;
  if(id === "lab") return LAB_IDS.some(k=>getCur(k,ch)>0.003) || getCur("pngAmt",ch)>0.003;
  if(id === "glitch") return getCur("pixelSort",ch)>0.003 || getCur("blockShift",ch)>0.003 || getCur("dotify",ch)>0.003 || getCur("driftWarp",ch)>0.003 || getCur("fmWarp",ch)>0.003;
  if(id === "flow") return FLOW_IDS.some(k=>Math.abs(getCur(k,ch))>0.003);
  return true;
}
function runStage(id, inTex, dstRT, now, ch){
  const C = chanRT[ch];
  if(id === "scan")   return runScan(inTex, dstRT, now, ch);
  if(id === "tdisp"){
    if(!C.hist || C.hist.w !== procW || C.hist.h !== procH){
      if(C.hist){ gl.deleteTexture(C.hist.tex); gl.deleteFramebuffer(C.hist.fbo); }
      C.hist = makeHistArray(procW, procH, TD_LAYERS);
      /* prime every layer with the live picture, or the stage fades up out of
         black for the first half second while the ring fills */
      const HP = C.hist;
      gl.bindFramebuffer(gl.FRAMEBUFFER, HP.fbo);
      gl.viewport(0,0,procW,procH);
      gl.useProgram(progCOPY.prog);
      gl.uniform2f(U(progCOPY,"u_res"), procW, procH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inTex);
      gl.uniform1i(U(progCOPY,"u_tex"), 0);
      for(let L=0; L<HP.n; L++){
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, HP.tex, 0, L);
        draw();
      }
    }
    const H = C.hist;
    /* write this frame into the ring, then read the ring back per pixel */
    H.head = (H.head + 1) % H.n;
    gl.bindFramebuffer(gl.FRAMEBUFFER, H.fbo);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, H.tex, 0, H.head);
    gl.viewport(0,0,procW,procH);
    gl.useProgram(progCOPY.prog);
    gl.uniform2f(U(progCOPY,"u_res"), procW, procH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inTex);
    gl.uniform1i(U(progCOPY,"u_tex"), 0);
    draw();
    return runPass(progTDISP, inTex, dstRT.fbo, procW, procH, pr=>{
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, H.tex);
      gl.uniform1i(U(pr,"u_hist"), 1);
      gl.uniform1f(U(pr,"u_layers"), H.n);
      gl.uniform1f(U(pr,"u_head"), H.head);
      gl.uniform1f(U(pr,"u_time"), now);
    }, ch);
  }
  if(id === "dct"){
    /* separable: one axis, then the other, through a scratch buffer */
    const tmp = (dstRT === scratch1) ? scratch2 : scratch1;
    runPass(progDCT, inTex, tmp.fbo, procW, procH, pr=>gl.uniform1f(U(pr,"u_axis"), 0), ch);
    return runPass(progDCT, tmp.tex, dstRT.fbo, procW, procH, pr=>gl.uniform1f(U(pr,"u_axis"), 1), ch);
  }
  if(id === "sig")    return runPass(progSIG, inTex, dstRT.fbo, procW, procH, pr=>sigExtras(pr,now,ch), ch);
  if(id === "col")    return runPass(progCOL, inTex, dstRT.fbo, procW, procH, pr=>colExtras(pr,now,ch), ch);
  if(id === "glitch") return runPass(progGLITCH, inTex, dstRT.fbo, procW, procH, pr=>{ gl.uniform1f(U(pr,"u_time"), now); }, ch);
  if(id === "lab")    return runPass(progLAB, inTex, dstRT.fbo, procW, procH, pr=>{
    gl.uniform1f(U(pr,"u_time"), now); gl.uniform1f(U(pr,"u_frame"), frameNo);
    gl.uniform1f(U(pr,"u_fieldSrc"), fieldSrc);
  }, ch);
  if(id === "flow"){
    /* if the stage has been idle, prime its history with the live picture so it
       doesn't fade up from black (or flash a stale frame) when you turn it on */
    if(frameNo - (C.flowLast || -99) > 1){
      runPass(progCOPY, inTex, C.flowA.fbo, procW, procH, null, ch);
      runPass(progCOPY, inTex, C.flowSrc.fbo, procW, procH, null, ch);
    }
    C.flowLast = frameNo;
    runPass(progFLOW, inTex, dstRT.fbo, procW, procH, pr=>{
      gl.uniform1f(U(pr,"u_time"), now);
      gl.uniform1f(U(pr,"u_flowField"), flowField);
      gl.uniform1f(U(pr,"u_flowEdge"), flowEdge);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, C.flowA.tex);
      gl.uniform1i(U(pr,"u_flowPrev"), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, C.flowSrc.tex);
      gl.uniform1i(U(pr,"u_srcPrev"), 2);
    }, ch);
    /* keep this frame's input for next frame's motion estimate */
    runPass(progCOPY, inTex, C.flowSrc.fbo, procW, procH, null, ch);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, dstRT.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, C.flowB.fbo);
    gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    const t = C.flowA; C.flowA = C.flowB; C.flowB = t;
    return;
  }
}

function srcReady(ch){
  const S = SRC[ch];
  if(S.mode === "pattern" || S.mode === "text" || S.mode === "synth" || S.mode === "feed" || S.mode === "glsl") return true;
  if(S.mode === "file" && S.still) return !!(S.img && S.img.complete && S.img.naturalWidth > 0);
  return S.video.readyState >= 2 && S.video.videoWidth > 0;
}
window.__chanHasSource = srcReady;

/* upload a channel's source frame into its texture */
function uploadSource(ch, dt){
  const S = SRC[ch];
  if(sourceFrozen(ch)) return;   /* leave the texture holding its last frame */
  if(S.mode === "synth" || S.mode === "feed" || S.mode === "glsl"){ S.aspect = procW/procH; S.has = 1; S.patClock += dt*S.speed*(S.tpRate===undefined?1:S.tpRate); return; }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, srcTex[ch]);
  if(S.mode === "pattern" || S.mode === "text"){
    S.patClock += dt*S.speed*(S.tpRate===undefined?1:S.tpRate);
    if(S.mode === "text") drawTextSource(S, S.patClock); else drawPattern(S, S.patClock);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, S.patCanvas);
    S.aspect = S.patCanvas.width/S.patCanvas.height; S.has = 1;
  } else if(S.mode === "file" && S.still){
    /* a photograph only has to travel to the GPU once. A GIF keeps moving
       inside the img element, so that one is pulled every frame. */
    if(S.img && S.img.complete && S.img.naturalWidth > 0 && (S.stillDirty || S.stillAnim)){
      try{
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, S.img);
        S.aspect = S.img.naturalWidth/S.img.naturalHeight; S.has = 1; S.stillDirty = false;
      }catch(err){}
    }
  } else if(S.video.readyState >= 2 && S.video.videoWidth > 0){
    try{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, S.video);
      S.aspect = S.video.videoWidth/S.video.videoHeight; S.has = 1;
    }catch(err){}
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}

/* run one channel's entire chain, leaving the result in chanRT[ch].out */
/* the pattern synth is computed straight into a render target, so it costs one
   full-screen pass and needs no canvas upload */
function renderGen(ch, now){
  const C = chanRT[ch], M = genMode[ch];
  gl.bindFramebuffer(gl.FRAMEBUFFER, C.gen.fbo);
  gl.viewport(0,0,procW,procH);
  gl.useProgram(progGEN.prog);
  gl.uniform2f(U(progGEN,"u_res"), procW, procH);
  gl.uniform1f(U(progGEN,"u_time"), now);
  gl.uniform1f(U(progGEN,"u_shape"), M.shape);
  gl.uniform1f(U(progGEN,"u_wave"), M.wave);
  gl.uniform1f(U(progGEN,"u_colmode"), M.col);
  setParamUniforms(progGEN, ch);
  draw();
  return C.gen.tex;
}
/* A pasted fragment shader, drawn into the same target the pattern synth uses.
   iChannel1 is always the shader's own previous frame, which is the one input
   it cannot get any other way and the one that makes a shader a feedback
   system rather than a function of time. */
function renderGlsl(ch, now, dt){
  const C = chanRT[ch], S = SRC[ch];
  const pr = glslProgOf(ch);
  if(!pr) return C.gen.tex;              /* it failed to compile: hold the last picture */
  if(!C.glslPrev) C.glslPrev = makeRT(procW, procH);
  gl.bindFramebuffer(gl.FRAMEBUFFER, C.gen.fbo);
  gl.viewport(0,0,procW,procH);
  gl.useProgram(pr.prog);
  const u = n=>{ if(!(n in pr.loc)) pr.loc[n] = gl.getUniformLocation(pr.prog, n); return pr.loc[n]; };
  gl.uniform3f(u("iResolution"), procW, procH, 1.0);
  gl.uniform1f(u("iTime"), S.patClock);
  gl.uniform1f(u("iTimeDelta"), dt || 1/60);
  gl.uniform1f(u("iFrameRate"), dt > 0 ? 1/dt : 60);
  gl.uniform1f(u("iSampleRate"), 44100);
  gl.uniform1i(u("iFrame"), S.glslFrame|0);
  /* no pointer input on a video instrument, so iMouse is parked at the centre
     rather than at zero, where a lot of published shaders degenerate */
  gl.uniform4f(u("iMouse"), procW*0.5, procH*0.5, 0, 0);
  const d = glslDate();
  gl.uniform4f(u("iDate"), d[0], d[1], d[2], d[3]);
  const feeds = [S.glslF0 || "none", "self", S.glslF2 || "none", "none"];
  for(let i=0;i<4;i++){
    const f = feeds[i];
    const t = (f === "none") ? blackTex
            : (f === "self") ? (C.glslPrev ? C.glslPrev.tex : blackTex)
            : (f === "BUS1" || f === "BUS2" || f === "PGM") ? feedTex(f)
            : (srcReady(f) && chanRT[f] && chanRT[f].out) ? chanRT[f].out.tex : blackTex;
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(u("iChannel"+i), i);
  }
  gl.uniform3fv(u("iChannelResolution[0]"), new Float32Array([
    procW,procH,1, procW,procH,1, procW,procH,1, procW,procH,1]));
  gl.uniform1fv(u("iChannelTime[0]"), new Float32Array([S.patClock,S.patClock,S.patClock,S.patClock]));
  draw();
  S.glslFrame = (S.glslFrame|0) + 1;
  /* keep this frame for iChannel1 next time */
  if(C.glslPrev) runPass(progCOPY, C.gen.tex, C.glslPrev.fbo, procW, procH, null, ch);
  return C.gen.tex;
}
let glslDateCache = [0,0,0,0], glslDateAt = -1e9;
function glslDate(){
  /* recomputed once a second: a Date object per frame per channel is not free
     and nothing published needs sub-second date resolution */
  const t = performance.now();
  if(t - glslDateAt > 1000){
    glslDateAt = t;
    const d = new Date();
    glslDateCache = [d.getFullYear(), d.getMonth(), d.getDate(),
                     d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds() + d.getMilliseconds()/1000];
  }
  return glslDateCache;
}
function renderChannel(ch, now, dt){
  ensureChanRT(ch);
  const C = chanRT[ch], S = SRC[ch];
  const chanSrcTex = (S.mode === "synth") ? (sourceFrozen(ch) ? C.gen.tex : renderGen(ch, now))
                   : (S.mode === "glsl")  ? (sourceFrozen(ch) ? C.gen.tex : renderGlsl(ch, now, dt))
                   : (S.mode === "feed") ? feedTex(S.feed || "PGM")
                   : srcTex[ch];

  /* time base: bent frame store */
  const delayN = Math.max(1, Math.min(RING_N-1, Math.round(getCur("delayF",ch))));
  const useTime = getCur("echo",ch)>0.003 || getCur("stutter",ch)>0.003 || stutterHeld[ch];
  if(useTime) ensureRing(C);
  if(getCur("stutter",ch)>0.003){
    if(!stutterHeld[ch] && Math.random() < Math.pow(getCur("stutter",ch),2)*dt*10){
      stutterHeld[ch] = true; stutterT[ch] = 0.08 + Math.random()*0.6*getCur("stutter",ch);
    }
  }
  if(stutterHeld[ch]){ stutterT[ch] -= dt; if(stutterT[ch]<=0) stutterHeld[ch]=false; }
  const hasDelay = (C.ring && C.ringFilled >= delayN) ? 1 : 0;
  const readIdx = C.ring ? ((C.ringW - delayN + RING_N*2) % RING_N) : 0;

  /* pass 1: source framing + feedback + echo */
  gl.bindFramebuffer(gl.FRAMEBUFFER, C.fbNext.fbo);
  gl.viewport(0,0,procW,procH);
  gl.useProgram(progFB.prog);
  gl.uniform2f(U(progFB,"u_res"), procW, procH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, chanSrcTex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (rescanMode?C.crt:C.out).tex);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, hasDelay?C.ring[readIdx].tex:chanSrcTex);
  gl.uniform1i(U(progFB,"u_src"), 0);
  gl.uniform1i(U(progFB,"u_prev"), 1);
  gl.uniform1i(U(progFB,"u_delayT"), 2);
  gl.uniform1f(U(progFB,"u_srcAspect"), S.aspect);
  gl.uniform1f(U(progFB,"u_hasSrc"), S.has);
  gl.uniform1f(U(progFB,"u_hasDelay"), hasDelay);
  gl.uniform1f(U(progFB,"u_time"), now);
  gl.uniform1f(U(progFB,"u_fbMode"), fbTrailMode?1:0);
  gl.uniform1f(U(progFB,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(progFB,"u_edgeMode"), edgeMode);
  gl.uniform1f(U(progFB,"u_fbWrap"), fbWrap);
  gl.uniform1f(U(progFB,"u_fbMirror"), fbMirror);
  gl.uniform1f(U(progFB,"u_fbBlend"), fbBlend);
  gl.uniform1f(U(progFB,"u_fbNL"), fbNL);
  gl.uniform1f(U(progFB,"u_fbInvert"), fbInvert?1:0);
  gl.uniform1f(U(progFB,"u_fbFlip"), fbFlip);
  gl.uniform1f(U(progFB,"u_autoGain"), autoGain[ch]);
  gl.uniform1f(U(progFB,"u_flipMode"), Math.round(getCur("flipMode",ch)));
  gl.uniform1f(U(progFB,"u_mirrorMode"), Math.round(getCur("mirrorMode",ch)));
  gl.uniform1f(U(progFB,"u_multiN"), Math.round(getCur("multiN",ch)));
  gl.uniform1f(U(progFB,"u_shakeX"), shakeOff[ch].x);
  gl.uniform1f(U(progFB,"u_shakeY"), shakeOff[ch].y);
  setParamUniforms(progFB, ch);
  draw();

  /* frame ring capture (frozen while stuttering) */
  if(useTime && C.ring && !stutterHeld[ch]){
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, C.fbNext.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, C.ring[C.ringW].fbo);
    gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    C.ringW = (C.ringW+1)%RING_N; C.ringFilled = Math.min(C.ringFilled+1, RING_N);
  }

  /* FX chain in the order set on the rail */
  const active = chainOrder.filter(id=>stageEnabled[id] && stageNeeded(id, ch));
  let srcT = C.fbNext.tex;
  const scratch = [scratch1, scratch2];
  let si = 0;
  for(let k=0; k<active.length; k++){
    const last = (k === active.length-1);
    const dst = last ? C.out : scratch[si];
    runStage(active[k], srcT, dst, now, ch);
    srcT = dst.tex;
    si ^= 1;
  }
  if(active.length === 0) runPass(progCOPY, srcT, C.out.fbo, procW, procH, null, ch);

  /* Next frame's feedback source is this frame's output, and it is already
     sitting in C.out — pass 1 reads it before anything writes it again, so
     there is nothing to copy. There used to be a swap here, an identical swap
     undoing it, and a full-raster blit of C.out into a separate fbPrev. At
     2160p that blit alone moved 66 MB per channel per frame. */
}

/* The mixer used to send its whole parameter block twice on every pass:
   setParamUniforms filled all 33 slots from bus 1, and the loop straight after
   overwrote every one of them with the right bus's value. On bus 2 and master
   the first set was simply the wrong bus, corrected a microsecond later. Either
   way it was ninety-nine uniform calls and thirty-three strings built per frame
   to end up where one pass would have. The shader has one set of uniform names,
   MIXP's, and each bus pushes its own parameters into them, so there is a
   single location list and it never moves: resolve it once and keep it. */
let mixLocList = null;
function mixLocs(){
  if(!mixLocList) mixLocList = MIXP.map(id=>U(progMIX, "u_"+id));
  return mixLocList;
}

function renderFrame(now, dt){
  if(ctxLost) return;
  frameNo++;
  sizeCanvasIfNeeded();
  updateAudio(dt);
  driveTransport(dt);
  updateContentAnalysis(dt);
  updateGlide(dt);
  updatePerf(dt);
  updateMod(dt, now);
  pushModHistory();
  applyParams(dt);
  /* feedback auto-level servo — keeps the loop off the black/white attractors */
  for(const ch of CHANNELS){
    const amt = fbNoServo ? 0 : getCur("fbAuto", ch);
    if(amt > 0.003){
      const target = 0.42;
      const err = target - (modVal.bright || 0.4);
      autoGain[ch] = Math.max(0.6, Math.min(1.4, autoGain[ch] + err*dt*1.2*amt));
    } else if(fbNoServo){
      /* servo defeated: nothing pulls the gain back to unity, so the loop is
         free to run away to white or collapse to black and stay there */
    } else autoGain[ch] += (1-autoGain[ch])*Math.min(1, dt*3);
  }

  for(const ch of CHANNELS){
    const sk = getCur("shake", ch);
    if(sk > 0.003){
      shakeT[ch] -= dt;
      if(shakeT[ch] <= 0){
        shakeT[ch] = 0.02 + (1-getCur("shakeRate",ch))*0.35;
        shakeOff[ch].x = (Math.random()*2-1)*sk*0.09;
        shakeOff[ch].y = (Math.random()*2-1)*sk*0.09;
      }
    } else { shakeOff[ch].x = 0; shakeOff[ch].y = 0; }
    const vr = getCur("vRoll",ch);
    vrollpos[ch] = (vrollpos[ch] + Math.sign(vr)*Math.pow(Math.abs(vr),2.2)*dt*3.0) % 1;
    humpos[ch] = (humpos[ch] + dt*(0.05 + getCur("humBar",ch)*0.1)) % 1;
  }

  /* a channel only costs anything when its fader can actually let it through */
  const b1 = busSrc.b1, b2 = busSrc.b2;
  const masterLive = mCur.busMix > 0.0005 || multiView;
  const live = {A:false, B:false, C:false, D:false};
  live[b1[0]] = true;
  if(srcReady(b1[1]) && (mCur.abMix > 0.0005 || multiView)) live[b1[1]] = true;
  if(masterLive){
    if(srcReady(b2[0])) live[b2[0]] = true;
    if(srcReady(b2[1]) && (mCur.cdMix > 0.0005 || multiView)) live[b2[1]] = true;
  }
  /* a re-entry source only works if the channel it is reading is still rendering */
  for(let pass=0; pass<3; pass++){
    for(const ch of CHANNELS){
      if(!live[ch]) continue;
      const S = SRC[ch];
      if(S.mode !== "feed") continue;
      const f = S.feed || "PGM";
      if(f === "BUS1" || f === "BUS2" || f === "PGM") continue;
      if(f !== ch && !live[f] && srcReady(f)) live[f] = true;
    }
  }
  liveList = CHANNELS.filter(c=>live[c]).join("+");
  liveNow = live;      /* the thumbnails need to know who is not being rendered */
  /* the sync model only has to run for the channels about to be drawn, so it
     waits until the live set is known */
  updateSyncModel(dt, now, live);
  for(const ch of CHANNELS){
    if(!live[ch]) continue;
    uploadSource(ch, dt);
    renderChannel(ch, now, dt);
  }

  /* mixer tree: BUS 1 and BUS 2 each take any two channels, then MASTER
     crossfades the two buses. So A can meet C, or D can meet B. */
  /* the melt stage reads the previous frame of this same mixer stage, so the
     two buffers ping-pong rather than one being copied into the other */
  /* the melt needs the stage's own last frame, so it decides whether the
     history buffer gets allocated at all. Amount and hold both have to be up
     whichever mode it is in, because the blend is their product. */
  function edgeLive(ids){ return mCur[ids[MIXP_EDGE]] > 0.002 && mCur[ids[MIXP_EDGE+2]] > 0.002; }
  function mixPass(dstRT, texA, texB, hasB, ids, mode, inv, blend, key, prevTex, melt){
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstRT.fbo);
    gl.viewport(0,0,procW,procH);
    gl.useProgram(progMIX.prog);
    gl.uniform2f(U(progMIX,"u_res"), procW, procH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform1i(U(progMIX,"u_texA"), 0);
    gl.uniform1i(U(progMIX,"u_texB"), 1);
    gl.uniform1f(U(progMIX,"u_hasB"), hasB?1:0);
    gl.uniform1f(U(progMIX,"u_mixMode"), mode);
    gl.uniform1f(U(progMIX,"u_wipeInv"), inv?1:0);
    gl.uniform1f(U(progMIX,"u_mixBlend"), blend||0);
    gl.uniform1f(U(progMIX,"u_mixKey"), key||0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, prevTex || blackTex);
    gl.uniform1i(U(progMIX,"u_prev"), 2);
    gl.uniform1f(U(progMIX,"u_hasPrev"), prevTex?1:0);
    gl.uniform1f(U(progMIX,"u_time"), now);
    gl.uniform1f(U(progMIX,"u_meltMode"), melt||0);
    const locs = mixLocs();
    for(let i=0;i<locs.length;i++) gl.uniform1f(locs[i], mCur[ids[i]]);
    draw();
  }
  let p1 = null, p2t = null, pM = null;
  /* A transition section switched out at the eye has to lose its mode choices
     as well as its numbers: the transition, the blend, the key and the melt
     are selects rather than parameters, so holding the parameters at neutral
     would leave a wipe wiping and a key keying with nothing to show for it. */
  const byp1 = !!secBypass["mixer"], byp2 = !!secBypass["mixer2"], bypM = !!secBypass["mixerM"];
  const mMode1 = byp1 ? 0 : mixMode,  mBl1 = byp1 ? 0 : mixBlend,  mKy1 = byp1 ? 0 : mixKey,  mMl1 = byp1 ? 0 : meltMode;
  const mMode2 = byp2 ? 0 : mixMode2, mBl2 = byp2 ? 0 : mixBlend2, mKy2 = byp2 ? 0 : mixKey2, mMl2 = byp2 ? 0 : meltMode2;
  const mModeM = bypM ? 0 : mixModeM, mBlM = bypM ? 0 : mixBlendM, mKyM = bypM ? 0 : mixKeyM, mMlM = bypM ? 0 : meltModeM;
  if(masterLive){
    ensureShared("busOut1"); ensureShared("busOut2");
    if(edgeLive(MIXBUS.b1)){ ensureShared("busHist1"); const t = busOut1; busOut1 = busHist1; busHist1 = t; p1 = busHist1.tex; }
    if(edgeLive(MIXBUS.b2)){ ensureShared("busHist2"); const t = busOut2; busOut2 = busHist2; busHist2 = t; p2t = busHist2.tex; }
    if(edgeLive(MIXBUS.bM)){ ensureShared("mixHist"); const t = mixOut; mixOut = mixHist; mixHist = t; pM = mixHist.tex; }
    mixPass(busOut1, chanOutTex(b1[0]), chanOutTex(b1[1]), live[b1[1]], MIXBUS.b1, mMode1, wipeInv, mBl1, mKy1, p1, mMl1);
    mixPass(busOut2, chanOutTex(b2[0]), chanOutTex(b2[1]), live[b2[1]], MIXBUS.b2, mMode2, wipeInv2, mBl2, mKy2, p2t, mMl2);
    mixPass(mixOut, busOut1.tex, busOut2.tex, true, MIXBUS.bM, mModeM, wipeInvM, mBlM, mKyM, pM, mMlM);
  } else {
    /* nothing on bus 2, so bus 1 goes straight to master and costs one pass, as before */
    if(edgeLive(MIXBUS.b1)){ ensureShared("mixHist"); const t = mixOut; mixOut = mixHist; mixHist = t; p1 = mixHist.tex; }
    mixPass(mixOut, chanOutTex(b1[0]), chanOutTex(b1[1]), live[b1[1]], MIXBUS.b1, mMode1, wipeInv, mBl1, mKy1, p1, mMl1);
  }

  if(multiView){
    for(const ch of CHANNELS) ensureChanRT(ch);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.useProgram(progMULTI.prog);
    gl.uniform2f(U(progMULTI,"u_res"), canvas.width, canvas.height);
    const bind = (unit, name, tex)=>{
      gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U(progMULTI,name), unit);
    };
    bind(0,"u_a",chanOutTex("A")); bind(1,"u_b",chanOutTex("B"));
    bind(2,"u_c",chanOutTex("C")); bind(3,"u_d",chanOutTex("D"));
    bind(4,"u_b1",busOut1 ? busOut1.tex : mixOut.tex); bind(5,"u_pgm",mixOut.tex);
    const cellOf = {A:0,B:1,C:3,D:4};
    gl.uniform1f(U(progMULTI,"u_active"), cellOf[activeChan]);
    for(const ch of CHANNELS) gl.uniform1f(U(progMULTI,"u_live"+ch), live[ch]?1:0);
    draw();
    frameEnd(now, dt);
    return;
  }

  /* the field stage sits between the mixer and the display, because interlace
     is a property of the signal leaving the desk, not of any one channel */
  let outTex = mixOut.tex;   /* not dispTex: that name is the sync model's texture */
  if(mCur.ilAmt > 0.003){
    if(fieldPrev && (fieldPrev.w !== procW || fieldPrev.h !== procH)){ freeRT(fieldPrev); fieldPrev = null; }
    if(fieldOut && (fieldOut.w !== procW || fieldOut.h !== procH)){ freeRT(fieldOut); fieldOut = null; }
    if(!fieldPrev) fieldPrev = makeRT(procW, procH);
    if(!fieldOut) fieldOut = makeRT(procW, procH);
    if(fieldPrev && fieldOut){
      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldOut.fbo);
      gl.viewport(0,0,procW,procH);
      gl.useProgram(progFIELD.prog);
      gl.uniform2f(U(progFIELD,"u_res"), procW, procH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mixOut.tex);
      gl.uniform1i(U(progFIELD,"u_tex"), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fieldPrev.tex);
      gl.uniform1i(U(progFIELD,"u_prevField"), 1);
      gl.uniform1f(U(progFIELD,"u_ilMode"), ilMode);
      gl.uniform1f(U(progFIELD,"u_ilOrder"), ilOrder?1:0);
      gl.uniform1f(U(progFIELD,"u_parity"), frameNo % 2);
      gl.uniform1f(U(progFIELD,"u_time"), now);
      setParamUniforms(progFIELD, "A");
      draw();
      outTex = fieldOut.tex;
      /* keep this frame as the other field for next time */
      runPass(progCOPY, mixOut.tex, fieldPrev.fbo, procW, procH, null, "A");
    }
  }
  if(mCur.osdShow > 0.003) updateOSD(now, dt);
  /* CRT -> screen */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.useProgram(progCRT.prog);
  gl.uniform2f(U(progCRT,"u_res"), canvas.width, canvas.height);
  gl.uniform2f(U(progCRT,"u_procRes"), procW, procH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, outTex);
  gl.uniform1i(U(progCRT,"u_tex"), 0);
  gl.uniform1f(U(progCRT,"u_time"), now);
  gl.uniform1f(U(progCRT,"u_outModel"), outModel);
  gl.uniform1f(U(progCRT,"u_probe"), probeMode);
  gl.uniform1f(U(progCRT,"u_rows"), SROWS);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.uniform1i(U(progCRT,"u_probeT"), 3);
  /* the persistence pair only exists once phosphor is actually turned up */
  const wantPersist = mCur.phosphor > 0.003;
  if(wantPersist){ ensureShared("persistA"); ensureShared("persistB"); }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, persistA ? persistA.tex : blackTex);
  gl.uniform1i(U(progCRT,"u_persist"), 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, osdTex);
  gl.uniform1i(U(progCRT,"u_osd"), 2);
  gl.uniform1f(U(progCRT,"u_hasPersist"), wantPersist?1:0);
  setParamUniforms(progCRT, "A");
  draw();

  /* the codec round trip taps the finished picture off the canvas. CLEAN feeds
     the encoder before the moshed image is laid over the top, so the damage
     never compounds; RECYCLED feeds it after, so every pass is built on the
     last one's wreckage. */
  if(!moshRecycle) moshPush();
  moshDraw();
  if(moshRecycle) moshPush();

  /* phosphor persistence store */
  if(wantPersist){
    /* a real accumulator: keep whichever is brighter, this frame or the decayed
       trail, per channel. It used to be a full CRT pass writing the current
       frame into the store, which made a one-frame echo rather than a decay. */
    gl.bindFramebuffer(gl.FRAMEBUFFER, persistB.fbo);
    gl.viewport(0,0,procW,procH);
    gl.useProgram(progPHOS.prog);
    gl.uniform2f(U(progPHOS,"u_res"), procW, procH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mixOut.tex);
    gl.uniform1i(U(progPHOS,"u_cur"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, persistA.tex);
    gl.uniform1i(U(progPHOS,"u_prev"), 1);
    setParamUniforms(progPHOS, "A");
    draw();
    const t = persistA; persistA = persistB; persistB = t;
  }

  /* full rescan: give each channel a CRT-processed copy to eat next frame */
  if(rescanMode){
    /* This relied on progCRT still being bound from the display pass, which
       the phosphor accumulator and the codec overlay both break — so with
       RESCAN and phosphor on it drew the phosphor shader into every channel's
       rescan buffer and fed that into the loop. Bind the program. */
    gl.useProgram(progCRT.prog);
    for(const ch of CHANNELS){
      if(!liveNow[ch] || !chanRT[ch].allocated) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, chanRT[ch].crt.fbo);
      gl.viewport(0,0,procW,procH);
      gl.uniform2f(U(progCRT,"u_res"), procW, procH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, chanRT[ch].out.tex);
      draw();
    }
  }

  frameEnd(now, dt);
}
/* ---------------- the deck's on-screen display ----------------
   Every consumer machine burnt its own state into the picture: a transport
   symbol, a counter that ran whether or not anything was recorded, and on the
   camcorders a date stamp that half the world forgot to set. It is drawn on a
   2D canvas rather than in the shader because it is type, and type wants a
   font. The canvas only redraws when what it says changes. */
const OSD_W = 960, OSD_H = 540;
const osdCanvas = document.createElement("canvas");
osdCanvas.width = OSD_W; osdCanvas.height = OSD_H;
const osdCtx = osdCanvas.getContext("2d");
const osdTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, osdTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const OSD_MODES = ["REC", "PLAY", "PAUSE", "STOP", "FF", "REW"];
let osdLast = "", osdBlink = 0;
function osdCount(t){
  const h = Math.floor(t/3600), m = Math.floor(t/60)%60, sec = Math.floor(t)%60;
  const p2 = n=>(n<10?"0":"")+n;
  return p2(h)+":"+p2(m)+":"+p2(sec);
}
let osdPrevNow = -1;
function updateOSD(now, dt){
  /* wall time, not the render delta: a tape counter that slows down because the
     machine is busy is a counter nobody can trust */
  const rdt = (osdPrevNow >= 0) ? Math.max(0, Math.min(1, now - osdPrevNow)) : 0;
  osdPrevNow = now;
  /* the counter only runs on the transports that would move the tape */
  if(osdMode === 0 || osdMode === 1) osdCounter += rdt;
  else if(osdMode === 4) osdCounter += rdt*7;
  else if(osdMode === 5) osdCounter = Math.max(0, osdCounter - rdt*7);
  osdBlink = Math.floor(now*1.4) % 2;
  const mode = OSD_MODES[osdMode] || "PLAY";
  const d = new Date();
  const p2 = n=>(n<10?"0":"")+n;
  const datestr = osdDate === 0 ? ""
    : osdDate === 1 ? (p2(d.getDate())+"." + p2(d.getMonth()+1) + "." + d.getFullYear())
    : (p2(d.getDate())+"." + p2(d.getMonth()+1) + "." + d.getFullYear() + "  " + p2(d.getHours())+":"+p2(d.getMinutes()));
  const key = mode+"|"+osdCount(osdCounter)+"|"+datestr+"|"+mCur.osdSize.toFixed(2)+"|"+osdBlink;
  if(key === osdLast) return;
  osdLast = key;
  const g = osdCtx;
  g.clearRect(0,0,OSD_W,OSD_H);
  const sc = mCur.osdSize;
  const fs = Math.round(30*sc);
  g.font = "700 "+fs+"px ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  g.textBaseline = "top";
  const ink = "#f3e14a";
  const pad = Math.round(34*sc);
  g.shadowColor = "rgba(0,0,0,0.85)";
  g.shadowBlur = 0; g.shadowOffsetX = Math.round(2*sc); g.shadowOffsetY = Math.round(2*sc);
  g.fillStyle = ink;
  /* transport symbol, drawn rather than typed so it reads as a machine glyph */
  let x = pad;
  const y = pad, sz = fs*0.72;
  const tri = (ox, flip)=>{
    g.beginPath();
    if(flip){ g.moveTo(ox+sz,y+fs*0.16); g.lineTo(ox+sz,y+fs*0.16+sz); g.lineTo(ox,y+fs*0.16+sz*0.5); }
    else { g.moveTo(ox,y+fs*0.16); g.lineTo(ox,y+fs*0.16+sz); g.lineTo(ox+sz,y+fs*0.16+sz*0.5); }
    g.closePath(); g.fill();
  };
  if(osdMode === 0){
    if(osdBlink){
      g.beginPath(); g.arc(x+sz*0.5, y+fs*0.16+sz*0.5, sz*0.5, 0, 6.2832); g.fill();
    }
    x += sz*1.5;
  } else if(osdMode === 1){ tri(x,false); x += sz*1.5; }
  else if(osdMode === 2){
    g.fillRect(x, y+fs*0.16, sz*0.3, sz);
    g.fillRect(x+sz*0.55, y+fs*0.16, sz*0.3, sz);
    x += sz*1.5;
  } else if(osdMode === 3){ g.fillRect(x, y+fs*0.16, sz, sz); x += sz*1.5; }
  else if(osdMode === 4){ tri(x,false); tri(x+sz*0.75,false); x += sz*2.2; }
  else { tri(x,true); tri(x+sz*0.75,true); x += sz*2.2; }
  const label = (osdMode === 0 && !osdBlink) ? "" : mode;
  g.fillText(label, x, y);
  g.fillText(osdCount(osdCounter), OSD_W - pad - g.measureText("00:00:00").width, y);
  if(datestr){
    g.fillText(datestr, OSD_W - pad - g.measureText(datestr).width, OSD_H - pad - fs);
  }
  g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  gl.bindTexture(gl.TEXTURE_2D, osdTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,osdCanvas);
}

/* A GPU reset, a driver update or a laptop waking from sleep takes the WebGL
   context away. Without this the render loop keeps running against a dead
   context, every call silently does nothing, and the picture is black forever
   with no way back but a reload and no clue that anything happened. */
let ctxLost = false;
canvas.addEventListener("webglcontextlost", e=>{
  e.preventDefault();
  ctxLost = true;
  toast("Graphics context lost \u2014 your patch is safe. Reload the page to carry on.", true);
}, false);
canvas.addEventListener("webglcontextrestored", ()=>{
  ctxLost = false;
  toast("Graphics context restored \u2014 reload if the picture does not come back", true);
}, false);
/* Live thumbnails on the channel buttons. A readback stalls the pipeline, so
   this happens twice a second at 48x27 - about five kilobytes a second in
   total - rather than every frame. */
/* The scopes read the finished picture back at a low resolution and draw it as
   a waveform and a vectorscope. Both are what an engineer would put on a bench
   next to this, and both are the most honest thing you can show: they say what
   the signal is doing rather than what it looks like. */
const SCOPE_W = 128, SCOPE_H = 72;
/* 75% colour bars, carried through the same colour-difference axes the plot
   uses, so the boxes land where a correctly-encoded bar signal would */
const SCOPE_TARGETS = (function(){
  const bars = [[1,0,0,"R"],[0,1,0,"G"],[0,0,1,"B"],[1,1,0,"YL"],[0,1,1,"CY"],[1,0,1,"MG"]];
  return bars.map(function(b){
    const r=b[0]*0.75, g=b[1]*0.75, bl=b[2]*0.75;
    const y = 0.299*r + 0.587*g + 0.114*bl;
    return {u:(bl-y)*0.565, v:(r-y)*0.713, n:b[3]};
  });
})();
const scopePix = new Uint8Array(SCOPE_W*SCOPE_H*4);
let scopeRT = null, scopeAt = 0;
function updateScopes(now){
  if(dockTab !== "scope") return;
  if(now - scopeAt < 0.1) return;
  scopeAt = now;
  const wc = document.getElementById("scopeWave"), vc = document.getElementById("scopeVec");
  if(!wc || !vc) return;
  if(!scopeRT) scopeRT = makeRT(SCOPE_W, SCOPE_H);
  if(!scopeRT) return;
  runPass(progCOPY, mixOut.tex, scopeRT.fbo, SCOPE_W, SCOPE_H, null, "A");
  gl.bindFramebuffer(gl.FRAMEBUFFER, scopeRT.fbo);
  gl.readPixels(0,0,SCOPE_W,SCOPE_H, gl.RGBA, gl.UNSIGNED_BYTE, scopePix);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  /* waveform: luminance against horizontal position, every line overlaid */
  const g = wc.getContext("2d");
  g.fillStyle = "#07070a"; g.fillRect(0,0,wc.width,wc.height);
  g.strokeStyle = "#1c1c24"; g.lineWidth = 1;
  for(let i=0;i<=4;i++){
    const y = Math.round(wc.height - i/4*wc.height) + 0.5;
    g.beginPath(); g.moveTo(0,y); g.lineTo(wc.width,y); g.stroke();
  }
  const img = g.getImageData(0,0,wc.width,wc.height);
  const d = img.data;
  for(let y=0;y<SCOPE_H;y++){
    for(let x=0;x<SCOPE_W;x++){
      const o = (y*SCOPE_W+x)*4;
      const lum = (scopePix[o]*0.299 + scopePix[o+1]*0.587 + scopePix[o+2]*0.114)/255;
      const px = Math.floor(x/SCOPE_W*wc.width);
      const py = Math.floor((1-lum)*(wc.height-1));
      const q = (py*wc.width+px)*4;
      d[q] = Math.min(255, d[q]+40); d[q+1] = Math.min(255, d[q+1]+90); d[q+2] = Math.min(255, d[q+2]+80); d[q+3] = 255;
    }
  }
  g.putImageData(img,0,0);
  /* vectorscope: the two colour-difference axes against each other */
  const v = vc.getContext("2d");
  v.fillStyle = "#07070a"; v.fillRect(0,0,vc.width,vc.height);
  const cx = vc.width/2, cy = vc.height/2, R = Math.min(cx,cy)-4;
  v.strokeStyle = "#1c1c24";
  for(const r of [0.33,0.66,1]){ v.beginPath(); v.arc(cx,cy,R*r,0,6.2832); v.stroke(); }
  v.beginPath(); v.moveTo(cx-R,cy); v.lineTo(cx+R,cy); v.moveTo(cx,cy-R); v.lineTo(cx,cy+R); v.stroke();
  /* the six 75% colour-bar targets, which is what makes this readable as an
     instrument rather than a scatter plot: a hue rotation turns the cloud away
     from the boxes, and an over-saturated pass pushes past them */
  v.strokeStyle = "#3a3a48"; v.fillStyle = "#6b6b7a";
  v.font = "8px monospace"; v.textAlign = "center";
  for(const t of SCOPE_TARGETS){
    const px = cx + t.u*R*1.4, py = cy - t.v*R*1.4;
    v.strokeRect(px-3.5, py-3.5, 7, 7);
    v.fillText(t.n, px, py-6);
  }
  const vi = v.getImageData(0,0,vc.width,vc.height), vd = vi.data;
  for(let i=0;i<SCOPE_W*SCOPE_H;i++){
    const o = i*4;
    const r = scopePix[o]/255, gg = scopePix[o+1]/255, b = scopePix[o+2]/255;
    const y = 0.299*r + 0.587*gg + 0.114*b;
    const u = (b - y)*0.565, w2 = (r - y)*0.713;
    const px = Math.round(cx + u*R*1.4), py = Math.round(cy - w2*R*1.4);
    if(px<0||py<0||px>=vc.width||py>=vc.height) continue;
    const q = (py*vc.width+px)*4;
    vd[q] = Math.min(255, vd[q]+Math.round(r*90));
    vd[q+1] = Math.min(255, vd[q+1]+Math.round(gg*90));
    vd[q+2] = Math.min(255, vd[q+2]+Math.round(b*90));
    vd[q+3] = 255;
  }
  v.putImageData(vi,0,0);
}
let THUMB_W = 48, THUMB_H = 27;
/* the thumbnails follow the raster's shape too, or a portrait patch turns up
   in the channel bar squashed flat */
function setThumbSize(){
  const ar = (typeof procAR === "number" && procAR > 0) ? procAR : 16/9;
  const long = 48;
  const w = ar >= 1 ? long : Math.max(12, Math.round(long*ar));
  const h = ar >= 1 ? Math.max(12, Math.round(long/ar)) : long;
  if(w === THUMB_W && h === THUMB_H) return;
  THUMB_W = w; THUMB_H = h;
  ATLAS_W = THUMB_W*2; ATLAS_H = THUMB_H*2;
  thumbPix = new Uint8Array(ATLAS_W*ATLAS_H*4);
  thumbImg = null;
  if(thumbRT){ freeRT(thumbRT); thumbRT = null; }
  if(typeof chanThumbs !== "undefined"){
    for(const ch of CHANNELS){
      const g = chanThumbs[ch];
      if(g && g.canvas){ g.canvas.width = THUMB_W; g.canvas.height = THUMB_H; }
    }
  }
}
/* The four thumbnails used to be drawn and read back one at a time, so each
   readPixels stalled on the draw immediately before it and the pipeline emptied
   four times. They are packed into one 96x54 atlas now and read once. */
let ATLAS_W = THUMB_W*2, ATLAS_H = THUMB_H*2;
const THUMB_SLOT = {A:[0,1], B:[1,1], C:[0,0], D:[1,0]};
let thumbPix = new Uint8Array(ATLAS_W*ATLAS_H*4);
let thumbAt = 0, thumbRT = null, thumbImg = null;
function updateThumbs(now){
  if(now - thumbAt < 0.5) return;
  thumbAt = now;
  if(typeof chanThumbs === "undefined") return;
  if(!thumbRT) thumbRT = makeRT(ATLAS_W, ATLAS_H);
  if(!thumbRT) return;
  /* A channel that is not in the mix is not rendered, so its thumbnail used to
     sit on whatever it last produced — change a source on an idle channel and
     nothing happened until you faded it up. One idle channel per tick gets its
     source pulled and shown, which is two passes twice a second and tells you
     what is actually loaded before you commit to it. */
  /* every idle channel, not one per tick: a round robin over three of them is
     two seconds between updates each, which reads as frozen rather than live */
  const idleTex = {};
  for(const ch of CHANNELS){
    if(liveNow[ch] || !srcReady(ch)) continue;
    /* Deliberately without ensureChanRT: allocating a channel's eight
       full-raster targets so a 48x27 thumbnail can be made costs 265 MB per
       channel at 2160p, which is exactly what the lazy allocation exists to
       avoid. The source texture goes straight to the thumbnail instead.
       A synth or a shader needs somewhere to draw, so those keep their one
       target and no more. */
    uploadSource(ch, 0);
    const S = SRC[ch];
    if(S.mode === "synth" || S.mode === "glsl"){
      ensureChanRT(ch);
      idleTex[ch] = (S.mode === "synth") ? renderGen(ch, now) : renderGlsl(ch, now, 1/60);
    } else if(S.mode === "feed"){
      idleTex[ch] = feedTex(S.feed || "PGM");
    } else {
      idleTex[ch] = srcTex[ch];
    }
  }
  /* every thumbnail is scaled down on the GPU into its own quarter of the atlas
     first — reading a full raster back would be absurd — and only then does one
     readPixels bring the lot across */
  const drawn = {};
  gl.bindFramebuffer(gl.FRAMEBUFFER, thumbRT.fbo);
  gl.useProgram(progTILE.prog);
  gl.uniform2f(U(progTILE,"u_res"), THUMB_W, THUMB_H);
  gl.uniform1i(U(progTILE,"u_tex"), 0);
  gl.activeTexture(gl.TEXTURE0);
  let any = false;
  for(const ch of CHANNELS){
    const g = chanThumbs[ch];
    if(!g) continue;
    const c = chanRT[ch];
    const tex = idleTex[ch] || ((c.allocated && c.out) ? c.out.tex : null);
    if(!tex){ g.clearRect(0,0,THUMB_W,THUMB_H); continue; }
    const sl = THUMB_SLOT[ch], ox = sl[0]*THUMB_W, oy = sl[1]*THUMB_H;
    gl.viewport(ox, oy, THUMB_W, THUMB_H);
    gl.uniform2f(U(progTILE,"u_ofs"), ox, oy);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    draw();
    drawn[ch] = true; any = true;
  }
  if(any){
    gl.readPixels(0,0,ATLAS_W,ATLAS_H, gl.RGBA, gl.UNSIGNED_BYTE, thumbPix);
    for(const ch of CHANNELS){
      if(!drawn[ch]) continue;
      const g = chanThumbs[ch];
      if(!thumbImg) thumbImg = g.createImageData(THUMB_W, THUMB_H);
      const d = thumbImg.data;
      const sl = THUMB_SLOT[ch], ox = sl[0]*THUMB_W, oy = sl[1]*THUMB_H;
      /* readPixels is bottom-up, so the tile's top row is its last one */
      for(let y=0;y<THUMB_H;y++){
        const src = ((oy + THUMB_H-1-y)*ATLAS_W + ox)*4, dst = y*THUMB_W*4;
        for(let i=0;i<THUMB_W*4;i++) d[dst+i] = thumbPix[src+i];
      }
      g.putImageData(thumbImg, 0, 0);
    }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function frameEnd(now, dt){
  serviceGrabs();
  updateThumbs(now);
  updateScopes(now);
  if(offline) return;
  const S = cur();
  if(S.mode==="file" && S.video.duration && !seeking){
    seek.value = S.video.currentTime/S.video.duration;
    tcode.textContent = fmtT(S.video.currentTime)+" / "+fmtT(S.video.duration);
  } else if(S.mode!=="file"){
    tcode.textContent = "--:-- / --:--";
  }
  fpsAcc += 1/Math.max(dt,1e-4); fpsN++;
  if(fpsN>=30){ fpsShow = Math.round(fpsAcc/fpsN); fpsAcc=0; fpsN=0;
    osd.textContent = procH+"p \u00b7 "+fpsShow+" fps"+(" \u00b7 "+liveList)+(multiView?" \u00b7 MULTI":"")+(recorder?" \u00b7 REC":"")+(perfRec.mode!=="off"?" \u00b7 "+perfRec.mode.toUpperCase():"")+(audioMode!=="off"?" \u00b7 AUD":"")+(rescanMode?" \u00b7 RESCAN":"");
    updateTempoUI();
  }
}

let lastTickMs = 0;
/* The processing clock, which is not the display's clock.
   A feedback loop iterates once per rendered frame, so on a 120 Hz display it
   evolves twice as fast as on a 60 Hz one and the same patch is a different
   patch. The same is true of the strobe hold, the field parity, the flow store
   and the phosphor accumulator: everything that carries state from one frame
   to the next. Real video rigs run at the field rate whatever monitor is
   plugged into them, so this does too — and it makes what you see match what
   the offline render produces. FREE keeps the old behaviour, which is still
   the right answer if you want the loop to run as fast as the machine can. */
let engineRate = 0;          /* 0 = free-run, otherwise frames per second */
let rateAcc = 0;
function doTick(){
  if(offline) return;
  const nowMs = performance.now();
  if(nowMs - lastTickMs < 6) return;
  lastTickMs = nowMs;
  const now = nowMs/1000;
  let dt = now-lastT; lastT = now;
  dt = Math.min(dt, 0.1);
  if(engineRate > 0){
    const step = 1/engineRate;
    rateAcc += dt;
    if(rateAcc < step) return;          /* the picture on screen still stands */
    /* never try to catch up more than a couple of frames: after a stall the
       right thing is to carry on, not to run the loop forty times in a row */
    if(rateAcc > step*3) rateAcc = step;
    dt = step;
    rateAcc -= step;
  }
  renderFrame(now, dt);
  if(outTrack && outTrack.requestFrame){ try{ outTrack.requestFrame(); }catch(e){} }
}
window.__tick = doTick;
function frame(){
  requestAnimationFrame(frame);
  doTick();
}

