const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
  const ctx = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));
  await page.goto('file://'+path.resolve('signal-rot.html'));
  await page.waitForTimeout(1500);
  await page.screenshot({path:'v5_01_boot.png'});

  // load A and B
  await page.setInputFiles('#fileIn', path.resolve('organic.webm'));
  await page.waitForTimeout(1200);
  await page.setInputFiles('input[type=file][accept="video/*"]:not(#fileIn)', path.resolve('testclip.webm'));
  await page.waitForTimeout(1500);

  // A/B mix via slider (abMix is first param row in MIXER section)
  await page.$$eval('.prow input[type=range]', els => { els[0].value = 0.6; els[0].dispatchEvent(new Event('input')); });
  await page.waitForTimeout(800);
  await page.screenshot({path:'v5_02_abmix.png'});

  // keyer: keyFx on, low threshold
  await page.evaluate(() => {
    const set=(label,v)=>{ document.querySelectorAll('.prow').forEach(r=>{ const l=r.querySelector('label'); if(l&&l.textContent===label){ const s=r.querySelector('input[type=range]'); s.value=v; s.dispatchEvent(new Event('input')); } }); };
    set('A>B MIX', 0);
    set('KEY>FX', 1); set('THRESHOLD', 0.45); set('SOFTNESS', 0.1);
  });
  await page.keyboard.press('9'); // SYNC DEATH for visible fx
  await page.evaluate(() => {
    const set=(label,v)=>{ document.querySelectorAll('.prow').forEach(r=>{ const l=r.querySelector('label'); if(l&&l.textContent===label){ const s=r.querySelector('input[type=range]'); s.value=v; s.dispatchEvent(new Event('input')); } }); };
    set('KEY>FX', 1); set('THRESHOLD', 0.45);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({path:'v5_03_keyed_fx.png'});

  // temporal: echo + stutter
  await page.evaluate(() => {
    const set=(label,v)=>{ document.querySelectorAll('.prow').forEach(r=>{ const l=r.querySelector('label'); if(l&&l.textContent===label){ const s=r.querySelector('input[type=range]'); s.value=v; s.dispatchEvent(new Event('input')); } }); };
    set('ECHO', 0.55); set('STUTTER', 0.4); set('KEY>FX', 0);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({path:'v5_04_temporal.png'});

  // rescan toggle + undo + tap tempo
  await page.evaluate(() => {
    document.querySelectorAll('.trow button').forEach(b=>{ if(b.textContent.startsWith('RESCAN')) b.click(); });
  });
  await page.waitForTimeout(800);
  await page.keyboard.press('z');
  for(let i=0;i<4;i++){ await page.click('button:has-text("TAP")'); await page.waitForTimeout(500); }
  const bpmTxt = await page.textContent('#bpmVal');
  console.log('BPM after taps:', bpmTxt);

  // offline render (short clip): should produce a download
  await page.setInputFiles('#fileIn', path.resolve('testclip.webm'));
  await page.waitForTimeout(1200);
  const dlP = page.waitForEvent('download', {timeout: 240000}).catch(()=>null);
  await page.click('#btnRender');
  const dl = await dlP;
  if(dl){ await dl.saveAs('render_test.mp4'); console.log('RENDER OK:', dl.suggestedFilename()); }
  else console.log('RENDER: no download');
  await page.waitForTimeout(500);
  await page.screenshot({path:'v5_05_after_render.png'});
  console.log('ERRORS:', errors.length?errors.join('\n---\n'):'none');
  await browser.close();
})();
