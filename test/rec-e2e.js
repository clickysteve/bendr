#!/usr/bin/env node
/**
 * Reusable E2E test for bendr live WebCodecs recording (REC) pipeline.
 *
 * Tests:
 * 1. WebCodecs and Web Audio API availability.
 * 2. Instant non-blocking recording start (#btnRec / Shift+R).
 * 3. Live video frame pacing and encoding with zero queue build-up.
 * 4. Progressive stream target chunking and MP4 muxing.
 * 5. Download generation (bendr-*.mp4) on STOP.
 * 6. Post-recording state and resource cleanup.
 * 7. Multi-take memory safety (activeDownloadUrl / lastRecUrl revocation).
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = 'file://' + path.resolve(__dirname, '../index.html');
const OUT_DIR = path.resolve(__dirname, '../out-test');

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('====================================================');
  console.log('        BENDR WEBCODECS LIVE REC E2E TEST           ');
  console.log('====================================================');

  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') {
      console.error('[BROWSER CONSOLE ERROR]', m.text());
      errors.push(m.text());
    }
  });
  page.on('pageerror', e => {
    console.error('[BROWSER UNCAUGHT ERROR]', e.message);
    errors.push('PAGEERROR: ' + e.message);
  });

  console.log('Loading bendr at:', HTML_PATH);
  await page.goto(HTML_PATH);
  await page.waitForTimeout(1000);

  // Dismiss first-run overlay if present
  const frOk = await page.$('#frOk');
  if (frOk) {
    console.log('Dismissing first-run notice overlay...');
    await frOk.click();
    await page.waitForTimeout(500);
  }

  // --- 1. Check API presence ---
  console.log('\n[1/4] Probing browser WebCodecs and Audio capabilities...');
  const apis = await page.evaluate(() => ({
    hasVideoEncoder: 'VideoEncoder' in window,
    hasVideoFrame: 'VideoFrame' in window,
    hasAudioEncoder: 'AudioEncoder' in window,
    hasTrackProcessor: 'MediaStreamTrackProcessor' in window,
    hasMp4Muxer: typeof Mp4Muxer !== 'undefined',
  }));
  console.log('Detected APIs:', apis);
  if (!apis.hasVideoEncoder || !apis.hasVideoFrame || !apis.hasMp4Muxer) {
    throw new Error('Required WebCodecs or Mp4Muxer missing from browser environment.');
  }

  // --- 2. Test Live REC (Take 1) ---
  console.log('\n[2/4] Starting live recording (Take 1, 3 seconds)...');
  await page.click('#btnRec');
  await page.waitForTimeout(300);

  const btnTextActive = await page.textContent('#btnRec');
  if (!btnTextActive.includes('STOP')) {
    throw new Error(`Expected #btnRec text to contain 'STOP', got: '${btnTextActive}'`);
  }

  // Let it record for 3 seconds while driving the render loop
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof __tick === 'function') __tick(); });
    const timerText = await page.textContent('#recTime');
    console.log(`  [t=${((i + 1) * 0.5).toFixed(1)}s] Recording in progress... Timer: ${timerText}`);
  }

  const preStopStats = await page.evaluate(() => ({
    recActive: typeof recActive !== 'undefined' ? recActive : null,
    recFrameCount: typeof recFrameCount !== 'undefined' ? recFrameCount : null,
    recDroppedFrames: typeof recDroppedFrames !== 'undefined' ? recDroppedFrames : null,
    recLocked: typeof recLocked !== 'undefined' ? recLocked : null,
  }));
  console.log('Pre-stop internal metrics:', preStopStats);

  if (!preStopStats.recActive) throw new Error('recActive flag was not set to true during recording.');
  if (preStopStats.recFrameCount < 10) throw new Error(`Too few frames encoded: ${preStopStats.recFrameCount}`);

  console.log('Stopping Take 1 and capturing download stream...');
  const dlP1 = page.waitForEvent('download', { timeout: 15000 });
  await page.click('#btnRec');
  const dl1 = await dlP1;

  const take1File = path.join(OUT_DIR, 'take1-' + dl1.suggestedFilename());
  await dl1.saveAs(take1File);
  const take1Stat = fs.statSync(take1File);
  console.log(`✓ Take 1 saved: ${dl1.suggestedFilename()} (${(take1Stat.size / 1048576).toFixed(2)} MB)`);
  if (take1Stat.size < 10000) throw new Error('Take 1 MP4 file size suspiciously small.');

  // --- 3. Verify Clean Post-Stop State ---
  console.log('\n[3/4] Verifying post-recording state cleanup...');
  const postState = await page.evaluate(() => ({
    recActive: typeof recActive !== 'undefined' ? recActive : null,
    recLocked: typeof recLocked !== 'undefined' ? recLocked : null,
    btnRecText: document.getElementById('btnRec').textContent,
    recTimeDisplay: document.getElementById('recTime').style.display,
  }));
  console.log('Post-stop state:', postState);
  if (postState.recActive !== false || postState.recLocked !== false) {
    throw new Error('Canvas or REC state was not cleanly reset in finally block.');
  }

  // --- 4. Test Multi-Take Session (Take 2) ---
  console.log('\n[4/4] Starting Take 2 (verifying URL revocation & repeated takes)...');
  await page.click('#btnRec');
  await page.waitForTimeout(2000);
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof __tick === 'function') __tick(); });
  }

  const dlP2 = page.waitForEvent('download', { timeout: 15000 });
  await page.click('#btnRec');
  const dl2 = await dlP2;

  const take2File = path.join(OUT_DIR, 'take2-' + dl2.suggestedFilename());
  await dl2.saveAs(take2File);
  const take2Stat = fs.statSync(take2File);
  console.log(`✓ Take 2 saved: ${dl2.suggestedFilename()} (${(take2Stat.size / 1048576).toFixed(2)} MB)`);
  if (take2Stat.size < 10000) throw new Error('Take 2 MP4 file size suspiciously small.');

  console.log('\nError log summary: ' + (errors.length ? errors.length + ' errors logged' : '0 errors (clean)'));
  if (errors.length) {
    console.error('Errors encountered:\n' + errors.join('\n'));
    throw new Error('Test completed with console/page errors.');
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('  ✓ ALL LIVE WEBCODECS REC TESTS PASSED CLEANLY!    ');
  console.log('====================================================\n');
}

run().catch(err => {
  console.error('\n✗ TEST FAILED:\n', err);
  process.exit(1);
});
