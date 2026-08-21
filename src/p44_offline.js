/* ---------------- offline MP4 render (WebCodecs) ---------------- */
let renderCancel = false;
document.getElementById("btnRenderCancel").onclick = ()=>{ renderCancel = true; };
document.getElementById("btnRender").onclick = ()=>{ offlineRender().catch(e=>{
  console.error(e); toast("Render failed: "+e.message, true);
  offline=false; document.getElementById("renderOv").style.display="none";
}); };
async function offlineRender(){
  if(SRC.A.mode!=="file" || !SRC.A.video.duration){ toast("Load a video file into channel A first", true); return; }
  if(!("VideoEncoder" in window)){ toast("This browser has no WebCodecs — use Chrome", true); return; }
  /* the render used to be hard-wired to 30, which is a poor fit for material
     that changes on every frame; the capture rate is a control now */
  const fps = captureFps(), W = procW, H = procH;
  const candidates = [["avc1.640028","avc"],["avc1.42003e","avc"],["vp09.00.10.08","vp9"]];
  let codec=null, mcodec=null;
  for(const [c,m] of candidates){
    try{
      const s = await VideoEncoder.isConfigSupported({codec:c, width:W, height:H, bitrate:bitrateFor(W,H,fps), framerate:fps});
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
  video.pause(); videoB.pause();
  const oldW = canvas.width, oldH = canvas.height;
  canvas.width = W; canvas.height = H;
  /* This used to hold the whole file in one growing ArrayBuffer and then copy
     it again into a Blob. At 14 Mbit/s that is about 105 MB a minute, twice
     over, so a ten-minute render peaked around two gigabytes and took the tab
     with it. Write to disk directly where the browser allows it, and otherwise
     keep the chunks as a list, which a Blob can take without a second copy. */
  let fileHandle = null, fileStream = null;
  const suggested = "bendr-"+stamp()+".mp4";
  if(window.showSaveFilePicker){
    try{
      fileHandle = await window.showSaveFilePicker({suggestedName: suggested,
        types:[{description:"MP4 video", accept:{"video/mp4":[".mp4"]}}]});
      fileStream = await fileHandle.createWritable();
    }catch(e){ if(e && e.name === "AbortError"){ offline=false; ov.style.display="none"; canvas.width=oldW; canvas.height=oldH; return; } }
  }

  let enc = null;
  let aenc = null;
  let audioBuffer = null;
  let channelData = null;
  const parts = [];

  try {
    /* Audio extraction & decoding:
       Priority 1: Dedicated audio file from the AUDIO tab (audioFileEl)
       Priority 2: Channel A video file soundtrack (SRC.A.video) */
    let localActx = null;
    const audioSrcUrl = (audioFileEl && (audioFileEl.src || audioFileEl.dataset?.url))
      ? (audioFileEl.src || audioFileEl.dataset.url)
      : ((SRC.A.mode === "file" && (SRC.A.video.src || SRC.A.objUrl)) ? (SRC.A.video.src || SRC.A.objUrl) : null);

    if(audioSrcUrl){
      try{
        const res = await fetch(audioSrcUrl);
        if(res.ok){
          const contentLength = res.headers.get('content-length');
          if(contentLength && parseInt(contentLength, 10) > 100 * 1024 * 1024){
            throw new Error("Audio source file is too large (" + (parseInt(contentLength, 10)/1048576).toFixed(1) + " MB). Fallback to video-only to prevent crash.");
          }
          const ab = await res.arrayBuffer();
          const actx = (typeof audioCtx !== "undefined" && audioCtx)
            ? audioCtx
            : (localActx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100));
          audioBuffer = await new Promise((resolve, reject)=>{
            actx.decodeAudioData(ab, resolve, reject);
          });
        }
      }catch(e){
        console.warn("Offline audio decode failed, falling back to video only:", e);
        audioBuffer = null;
      }finally{
        if(localActx && localActx.close){
          try{ await localActx.close(); }catch(e){}
        }
      }
    }

    /* Resample/downmix if non-standard sample rate or channels > 2 */
    if(audioBuffer && audioBuffer.length > 0){
      const standardRates = [32000, 44100, 48000];
      if(!standardRates.includes(audioBuffer.sampleRate) || audioBuffer.numberOfChannels > 2){
        try{
          const targetChannels = Math.min(2, audioBuffer.numberOfChannels);
          const targetRate = 44100;
          const targetLength = Math.max(1, Math.round(audioBuffer.duration * targetRate));
          const resampleCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
            targetChannels,
            targetLength,
            targetRate
          );
          const source = resampleCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(resampleCtx.destination);
          source.start();
          audioBuffer = await resampleCtx.startRendering();
        }catch(e){
          console.warn("Audio resampling failed, keeping original:", e);
        }
      }
    }

    let hasAudio = false;
    if("AudioEncoder" in window && audioBuffer && audioBuffer.numberOfChannels > 0 && audioBuffer.length > 0){
      try{
        const aconf = {
          codec: "mp4a.40.2",
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
          bitrate: audioBuffer.numberOfChannels === 1 ? 96000 : 192000,
        };
        const asup = await AudioEncoder.isConfigSupported(aconf);
        if(asup && asup.supported){
          aenc = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: e => { console.error("Audio encoder error:", e); toast("Audio encoder error: "+e.message, true); renderCancel = true; },
          });
          aenc.configure(aconf);
          hasAudio = true;
        }
      }catch(e){
        console.warn("AudioEncoder initialization/configuration failed. Falling back to video only:", e);
        hasAudio = false;
        if(aenc){
          try{ if(aenc.state !== "closed") aenc.close(); }catch(_){}
          aenc = null;
        }
      }
    }

    const target = fileStream
      ? new Mp4Muxer.FileSystemWritableFileStreamTarget(fileStream, {chunked: true})
      : new Mp4Muxer.StreamTarget({
          onData: (data, position) => { parts.push({position, data: data.slice()}); },
          chunked: true,
        });
    const muxer = new Mp4Muxer.Muxer({
      target,
      video: {codec: mcodec, width: W, height: H},
      audio: hasAudio ? {
        codec: 'aac',
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
      } : undefined,
      /* seeking metadata has to go at the front, which needs a rewrite the
         stream target cannot do, so it goes at the end when we are streaming */
      fastStart: fileStream ? false : "in-memory",
    });
    enc = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => { console.error(e); toast("Encoder error: "+e.message, true); renderCancel = true; },
    });
    enc.configure({codec, width:W, height:H, bitrate:bitrateFor(W,H,fps), framerate:fps});

    const duration = (video && !isNaN(video.duration) && video.duration > 0) ? video.duration : 1;
    const total = Math.max(1, Math.floor(duration * fps));

    /* Progressive audio encoding: encode audio chunks incrementally alongside video frames
       so audio and video are properly interleaved in the output MP4 stream, avoiding memory spikes */
    const CHUNK_SIZE = 1024;
    let audioOffset = 0;
    let totalAudioFrames = 0;
    let numChannels = 0;
    let sr = 0;
    let srcLen = 0;

    if(hasAudio){
      const totalDurSec = total / fps;
      totalAudioFrames = Math.round(totalDurSec * audioBuffer.sampleRate);
      numChannels = audioBuffer.numberOfChannels;
      sr = audioBuffer.sampleRate;
      srcLen = audioBuffer.length;
      channelData = [];
      for(let ch = 0; ch < numChannels; ch++){
        channelData.push(audioBuffer.getChannelData(ch));
      }
    }

    const encodeAudioUpTo = (targetFrames) => {
      while(audioOffset < targetFrames && !renderCancel){
        const framesInChunk = Math.min(CHUNK_SIZE, targetFrames - audioOffset);
        const planar = new Float32Array(framesInChunk * numChannels);
        for(let ch = 0; ch < numChannels; ch++){
          const src = channelData[ch];
          const dstOffset = ch * framesInChunk;
          for(let f = 0; f < framesInChunk; f++){
            const idx = audioOffset + f;
            planar[dstOffset + f] = idx < srcLen ? src[idx] : 0.0;
          }
        }
        const timestampUs = Math.round((audioOffset * 1e6) / sr);
        const ad = new AudioData({
          format: "f32-planar",
          sampleRate: sr,
          numberOfFrames: framesInChunk,
          numberOfChannels: numChannels,
          timestamp: timestampUs,
          data: planar,
        });
        aenc.encode(ad);
        ad.close();
        audioOffset += framesInChunk;
      }
    };

    const seekTo = (v,t)=>new Promise(res=>{
      const h = ()=>{ v.removeEventListener("seeked", h); res(); };
      v.addEventListener("seeked", h);
      v.currentTime = Math.min(t, v.duration-0.001);
    });
    const t0 = 1000;   // virtual clock offset so time-based effects behave
    for(let i=0; i<total && !renderCancel; i++){
      const t = i/fps;
      await seekTo(video, t);
      for(const ch of ["B","C","D"]){ const v = SRC[ch].video; if(srcReady(ch) && v.duration) await seekTo(v, t % v.duration); }
      renderFrame(t0+t, 1/fps);
      const vf = new VideoFrame(canvas, {timestamp: Math.round(i*1e6/fps), duration: Math.round(1e6/fps)});
      enc.encode(vf, {keyFrame: i%(fps*2)===0});
      vf.close();

      /* Progressively encode audio matching the current video frame progress to ensure interleaving */
      if(hasAudio){
        const targetFrames = Math.min(totalAudioFrames, Math.round(((i + 1) / total) * totalAudioFrames));
        encodeAudioUpTo(targetFrames);
      }

      while((enc.encodeQueueSize > 6 || (aenc && aenc.encodeQueueSize > 30)) && !renderCancel){
        await new Promise(r=>setTimeout(r,5));
      }
      if(i%3===0){
        ovTxt.textContent = "RENDERING "+Math.round(i/total*100)+"%  ("+i+"/"+total+" frames, "+codec.split(".")[0].toUpperCase()+")";
        ovBar.style.width = (i/total*100)+"%";
        await new Promise(r=>setTimeout(r,0));
      }
    }

    if(!renderCancel){
      ovTxt.textContent = "FINALIZING…";
      if(hasAudio){
        encodeAudioUpTo(totalAudioFrames);
        await aenc.flush();
      }
      await enc.flush();
      muxer.finalize();
      if(fileStream){
        await fileStream.close();
        toast("Rendered "+total+" frames "+(hasAudio?"with audio":"(video only)")+" \u2192 "+fileHandle.name);
      } else {
        parts.sort((a,b)=>a.position-b.position);
        const blob = new Blob(parts.map(x=>x.data), {type:"video/mp4"});
        const url = URL.createObjectURL(blob);
        dl(url, suggested);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
        toast("Rendered "+total+" frames "+(hasAudio?"with audio":"(video only)")+" \u2192 MP4, "+(blob.size/1048576).toFixed(1)+" MB");
      }
    } else {
      if(fileStream){ try{ await fileStream.abort(); }catch(e){} }
      toast("Render cancelled", true);
    }
  } catch(e) {
    console.error("Offline render failed:", e);
    if(fileStream){ try{ await fileStream.abort(); }catch(_){} }
    toast("Render failed: " + e.message, true);
  } finally {
    try{ if(enc && enc.state !== "closed") enc.close(); }catch(_){}
    try{ if(aenc && aenc.state !== "closed") aenc.close(); }catch(_){}
    parts.length = 0;
    audioBuffer = null;
    channelData = null;
    canvas.width = oldW; canvas.height = oldH;
    ov.style.display = "none";
    offline = false; lastT = performance.now()/1000;
    if(wasPlaying) video.play();
    for(const ch of ["B","C","D"]) if(SRC[ch].mode==="file") SRC[ch].video.play();
  }
}

/* ---------------- init ---------------- */
/* Shown once, and it earns its interruption: this thing can produce full-frame
   flashing at any rate you ask it for, and it is meant to be projected in a
   room with other people in it. */
function firstRunNotice(){
  let seen = false;
  try{ seen = localStorage.getItem("bendr.seen") === "1"; }catch(e){}
  if(seen) return;
  const wrap = document.createElement("div");
  wrap.id = "firstrun";
  wrap.innerHTML =
    "<div class='frbox'>" +
    "<h3>BEFORE YOU START</h3>" +
    "<p><b>This tool can produce rapid full-frame flashing.</b> STROBE, INV FLICKER and the feedback " +
    "presets can all be driven to rates that are unsafe for people with photosensitive epilepsy, and " +
    "there is no rate ceiling because a ceiling would make some of it useless. If you are projecting " +
    "to a room, treat that as your responsibility: check the material before you show it, and warn " +
    "people at the door.</p>" +
    "<p>Four things worth knowing:</p>" +
    "<p>Drop a video anywhere on the picture to load it. Press <b>/</b> to search the panel. Hold " +
    "<b>Q W E R T Y</b> for the bend pads. Press <b>H</b> for the manual, which explains not just what " +
    "each control does but why it behaves the way it does.</p>" +
    "<p>Your patch saves itself as you work, so a reload picks up where you left off.</p>" +
    "<button id='frOk'>UNDERSTOOD</button>" +
    "</div>";
  document.body.appendChild(wrap);
  document.getElementById("frOk").onclick = ()=>{
    wrap.remove();
    try{ localStorage.setItem("bendr.seen", "1"); }catch(e){}
  };
}

/* the state a new session opens in */
function openingPatch(){
  initPatch();
  routes = [];
  for(const ch of CHANNELS){ SRC[ch].mode = "pattern"; SRC[ch].pattern = "testcard"; SRC[ch].name = "pattern"; }
  setBase("scanlines", 0.22); setBase("curvature", 0.18); setBase("vignette", 0.28);
  refreshUI(); renderRoutes(); refreshToggles(); syncChanInputUI();
  if(typeof selPreset !== "undefined") selPreset.value = "";
}
window.__pcur = (id,ch)=>getCur(id,ch);
window.__dbg = ()=>({chan:activeChan,
  ...Object.fromEntries(CHANNELS.map(ch=>[ch,
    {mode:SRC[ch].mode, rs:SRC[ch].video.readyState, has:SRC[ch].has, spd:SRC[ch].speed, rate:SRC[ch].video.playbackRate}]))});

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
  document.querySelectorAll("#mtabs button").forEach(b=>{
    b.onclick = ()=>{
      setMTab(b.dataset.mtab);
      if(b.dataset.mtab === "bends") setDock("perform");
      if(b.dataset.mtab === "matrix" && dockTab === "perform") setDock("matrix");
    };
  });
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

  /* one version string, written into both places it is shown */
  for(const id of ["ver","helpVer"]){
    const el = document.getElementById(id);
    if(el) el.textContent = BENDR_VERSION;
  }

  buildPanel();
  buildMixStrip();
  buildModPage();
  buildPerformDock();
  setInterval(drawModPage, 50);
  setDock("matrix");
  {
    const bar = document.getElementById("dragbar"), low = document.getElementById("lower");
    let dragging = false;
    const move = e=>{
      if(!dragging) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const h = Math.max(110, Math.min(window.innerHeight-220, window.innerHeight - y));
      low.style.height = h + "px";
      sizeCanvas();
    };
    bar.addEventListener("mousedown", ()=>{ dragging = true; document.body.style.cursor="ns-resize"; });
    bar.addEventListener("touchstart", ()=>{ dragging = true; }, {passive:true});
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, {passive:true});
    const stop = ()=>{
      if(!dragging) return;
      dragging=false; document.body.style.cursor="";
      /* the height you chose used to be forgotten the moment you reloaded */
      try{ localStorage.setItem("bendr.dockh", parseInt(low.style.height,10)||0); }catch(e){}
    };
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    /* double-clicking the bar folds the dock away entirely, so the picture can
       have the height when you are not patching */
    bar.addEventListener("dblclick", ()=>toggleDock());
    let stashed = 0;
    window.__toggleDock = toggleDock;
    function toggleDock(force){
      const open = force !== undefined ? force : document.body.classList.contains("nodock");
      if(open){
        document.body.classList.remove("nodock");
        low.style.height = (stashed || 250) + "px";
      } else {
        stashed = parseInt(low.style.height,10) || low.getBoundingClientRect().height || 250;
        document.body.classList.add("nodock");
      }
      try{ localStorage.setItem("bendr.dockopen", open ? "1" : "0"); }catch(e){}
      markSizeDirty();
      /* the caret rotates in CSS with every other fold control now, so the
         markup stays put and only the body class changes */
    }
    { let h = 0, wasOpen = true;
      try{ h = parseInt(localStorage.getItem("bendr.dockh"),10)||0;
           wasOpen = (localStorage.getItem("bendr.dockopen") || "1") === "1"; }catch(e){}
      if(h > 110) low.style.height = h + "px";
      if(!wasOpen) toggleDock(false);
    }
    { const db = document.getElementById("dockFold");
      if(db) db.onclick = ()=>toggleDock(); }
  }
  /* [data-dock] only: the fold button lives in this strip too and was having
     its own handler overwritten by this loop */
  document.querySelectorAll("#dockTabs button[data-dock]").forEach(b=>{ b.onclick = ()=>setDock(b.dataset.dock); });
  {
    /* Three controls in this menu were wired to nothing at all. FLUSH BUFFERS
       had no handler (the 0 key worked, the button did not), MIDI LEARN had no
       handler and nothing anywhere ever turned MIDI on, and the AUDIO REACT
       selector had no onchange — it was a mirror of the one on the AUDIO tab
       and changing it did nothing. */
    { const fb = document.getElementById("btnFlush");
      if(fb) fb.onclick = ()=>{ flushBuffers(); toast("Buffers flushed \u2014 feedback, flow, persistence and the frame ring"); }; }
    { const mb = document.getElementById("btnMidi");
      if(mb) mb.onclick = ()=>toggleMidiLearn(); }
    { const ab = document.getElementById("selAudio");
      if(ab) ab.onchange = ()=>{
        setAudioMode(ab.value);
        const other = document.getElementById("selAudioSrc");
        if(other) other.value = ab.value;
      }; }
    const rt = document.getElementById("selRate");
    if(rt) rt.onchange = ()=>{
      engineRate = parseInt(rt.value) || 0;
      rateAcc = 0;
      toast(engineRate ? "Engine running at "+engineRate+" fps" : "Engine free-running at the display rate");
    };
    const cf = document.getElementById("selCapFps");
    if(cf) cf.onchange = ()=>toast("Capture rate "+cf.value+" fps");
    const rs = document.getElementById("selRes");
    rs.onchange = ()=>{
      /* setProcRes refuses anything wider than the machine's maximum texture,
         and used to be congratulated for it anyway */
      if(!setProcRes(parseInt(rs.value))){ rs.value = String(procH); return; }
      sizeCanvas();
      toast("Processing at "+procW+" \u00d7 "+procH);
    };
  }
  /* the pane's own size changes drive the canvas fit, instead of measuring it
     every frame in case it moved */
  {
    const wrap = document.getElementById("canvasWrap");
    if(wrap && window.ResizeObserver) new ResizeObserver(markSizeDirty).observe(wrap);
    window.addEventListener("resize", markSizeDirty);
    window.addEventListener("orientationchange", markSizeDirty);
  }
  /* Two tooltip systems were running side by side - the custom panel and the
     browser's own title attribute - on controls sitting twenty pixels apart,
     with different delays and different appearance. Convert whatever is left. */
  {
    let n = 0;
    for(const el of document.querySelectorAll("[title]")){
      const t = el.getAttribute("title");
      if(!t) continue;
      el.removeAttribute("title");
      attachTip(el, "", t);
      n++;
    }
    /* and anything built later goes through the same door */
    window.__adoptTitles = ()=>{
      for(const el of document.querySelectorAll("[title]")){
        const t = el.getAttribute("title");
        if(!t) continue;
        el.removeAttribute("title");
        attachTip(el, "", t);
      }
    };
  }
  /* the pills, the route rows and the mod cards are rebuilt as you work, so
     sweep up anything they bring with them */
  setInterval(()=>window.__adoptTitles(), 2000);
  buildProbeUI();
  initHelpUI();
  { const hb = document.getElementById("btnHelpTop"); if(hb) hb.onclick = ()=>window.__openHelp(); }
  { const hb = document.getElementById("btnHelp"); if(hb) hb.onclick = ()=>window.__openHelp(); }
  setActiveChan("A");
  syncChanInputUI();
  renderChain();
  loadCollapse();
  loadSectionOrder();
  refreshStageLeds();
  setInterval(refreshStageLeds, 400);
  /* the section LEDs used to pulse identically whether a section was doing
     anything or sitting at defaults, which is worse than having none */
  setInterval(()=>{
    for(const sec of SECTIONS){
      const d = secEls[sec.id]; if(!d || !d.classList) continue;
      let live = false;
      for(const p of PLIST){
        if(p.sec !== sec.id) continue;
        if(Math.abs(getBase(p.id) - p.def) > 1e-6){ live = true; break; }
      }
      d.classList.toggle("active", live);
    }
  }, 700);
  document.getElementById("btnChainReset").onclick = ()=>{
    chainOrder = CHAIN_STAGES.slice();
    stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true, scan:true, dct:true, tdisp:true};
    renderChain();
  };
  renderRoutes();
  wireMenus();
  wireDataTips();
  /* ---- VIEW: show or hide any region of the interface ----
     Six parts, one mechanism, and the choice is remembered. Hiding the whole
     interface and leaving the picture is one press, and reversible from the
     same place, which is what makes it safe to use mid-set. */
  {
    const VIEWS = ["panel","chain","transport","mix","bend","dock"];
    const hidden = {};
    try{ Object.assign(hidden, JSON.parse(localStorage.getItem("bendr.view") || "{}")); }catch(e){}
    function applyView(){
      for(const v of VIEWS) document.body.classList.toggle("hide-"+v, !!hidden[v]);
      for(const b of document.querySelectorAll("#mnuView [data-view]"))
        b.classList.toggle("on", !hidden[b.dataset.view]);
      try{ localStorage.setItem("bendr.view", JSON.stringify(hidden)); }catch(e){}
      markSizeDirty();
    }
    for(const b of document.querySelectorAll("#mnuView [data-view]")){
      b.onclick = ()=>{ hidden[b.dataset.view] = !hidden[b.dataset.view]; applyView(); };
    }
    { const a = document.getElementById("viewAll");
      if(a) a.onclick = ()=>{ for(const v of VIEWS) hidden[v] = false; applyView(); toast("Everything showing"); }; }
    { const so = document.getElementById("viewSolo");
      if(so) so.onclick = ()=>{
        const anyShown = VIEWS.some(v=>!hidden[v]);
        for(const v of VIEWS) hidden[v] = anyShown;
        applyView();
        toast(anyShown ? "Picture only \u2014 VIEW brings it back" : "Everything showing");
      }; }
    applyView();
  }
  {
    const mb = document.getElementById("mixCollapse");
    /* on a phone the expanded strip eats the screen and leaves the parameter
       panel as a four-line peephole, so it starts folded below the breakpoint */
    const narrow = window.matchMedia && window.matchMedia("(max-width:900px)").matches;
    let open = !narrow;
    try{ const v = localStorage.getItem("bendr.mixstrip"); if(v !== null) open = v === "1"; }catch(e){}
    const apply = ()=>{ document.body.classList.toggle("nomix", !open); markSizeDirty(); };
    mb.onclick = ()=>{ open = !open; apply(); try{ localStorage.setItem("bendr.mixstrip", open?"1":"0"); }catch(e){} };
    apply();
  }
  {
    const bb = document.getElementById("bendCollapse");
    let bopen = true;
    try{ const v = localStorage.getItem("bendr.bendstrip"); if(v !== null) bopen = v === "1"; }catch(e){}
    const bapply = ()=>{ document.body.classList.toggle("nobend", !bopen); markSizeDirty(); };
    if(bb) bb.onclick = ()=>{ bopen = !bopen; bapply(); try{ localStorage.setItem("bendr.bendstrip", bopen?"1":"0"); }catch(e){} };
    bapply();
  }
  /* A new session opens on a bare test card: no routes, no effects, nothing
     modulating. Somewhere to start from rather than something to undo. The
     presets are one keypress away when you want them. */
  openingPatch();
  histStack.length = 0;
  const resumed = restoreAutosave();
  sizeCanvas();
  requestAnimationFrame(frame);
  if(!resumed) toast("BENDR ready — drop a video anywhere, press / to search the panel, H for help");
  firstRunNotice();
}
