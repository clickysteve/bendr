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
  const parts = [];
  const target = fileStream
    ? new Mp4Muxer.FileSystemWritableFileStreamTarget(fileStream, {chunked: true})
    : new Mp4Muxer.StreamTarget({
        onData: (data, position) => { parts.push({position, data: data.slice()}); },
        chunked: true,
      });
  const muxer = new Mp4Muxer.Muxer({
    target,
    video: {codec: mcodec, width: W, height: H},
    /* seeking metadata has to go at the front, which needs a rewrite the
       stream target cannot do, so it goes at the end when we are streaming */
    fastStart: fileStream ? false : "in-memory",
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
    for(const ch of ["B","C","D"]){ const v = SRC[ch].video; if(srcReady(ch) && v.duration) await seekTo(v, t % v.duration); }
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
  try{
    if(!renderCancel){
      ovTxt.textContent = "FINALIZING…";
      await enc.flush();
      muxer.finalize();
      if(fileStream){
        await fileStream.close();
        toast("Rendered "+total+" frames \u2192 "+fileHandle.name+" (video only \u2014 REC captures audio)");
      } else {
        parts.sort((a,b)=>a.position-b.position);
        const blob = new Blob(parts.map(x=>x.data), {type:"video/mp4"});
        dl(URL.createObjectURL(blob), suggested);
        toast("Rendered "+total+" frames \u2192 MP4, "+(blob.size/1048576).toFixed(1)+" MB (video only \u2014 REC captures audio)");
      }
    } else {
      if(fileStream){ try{ await fileStream.abort(); }catch(e){} }
      toast("Render cancelled", true);
    }
  } finally {
    /* the encoder used to be closed only on the cancel path, so every
       completed render left one behind */
    try{ if(enc.state !== "closed") enc.close(); }catch(e){}
    parts.length = 0;
  }
  canvas.width = oldW; canvas.height = oldH;
  ov.style.display = "none";
  offline = false; lastT = performance.now()/1000;
  if(wasPlaying) video.play();
  for(const ch of ["B","C","D"]) if(SRC[ch].mode==="file") SRC[ch].video.play();
}

/* ---------------- init ---------------- */
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
    window.addEventListener("mouseup", ()=>{ dragging=false; document.body.style.cursor=""; });
    window.addEventListener("touchend", ()=>{ dragging=false; });
  }
  document.querySelectorAll("#dockTabs button").forEach(b=>{ b.onclick = ()=>setDock(b.dataset.dock); });
  {
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
  { const hb = document.getElementById("btnHelpTop"); if(hb) hb.onclick = ()=>help.classList.toggle("show"); }
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
    chainOrder = ["sig","col","glitch","lab","flow"];
    stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true};
    renderChain();
  };
  renderRoutes();
  wireMenus();
  wireDataTips();
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
  loadPreset(1);   /* RAINBOW RITE so it looks alive immediately */
  histStack.length = 0;
  const resumed = restoreAutosave();
  sizeCanvas();
  requestAnimationFrame(frame);
  if(!resumed) toast("BENDR ready — drop a video anywhere, press / to search the panel, H for help");
}
