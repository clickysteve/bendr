const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1500,height:940}});
  const errs = []; page.on('pageerror', e=>errs.push(e.message));
  await page.goto('file://'+path.resolve('index.html'));
  await page.waitForTimeout(1200);
  console.log('desktop badge:', await page.textContent('#ver'));
  const ctx = await browser.newContext({...devices['iPhone 13'], hasTouch:true, isMobile:true});
  const p2 = await ctx.newPage();
  await p2.goto('file://'+path.resolve('index.html'));
  await p2.waitForTimeout(1200);
  console.log('mobile badge visible:', await p2.evaluate(`(()=>{const e=document.getElementById('ver');const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none' && r.width>0;})()`));
  console.log('ERRORS:', errs.length?errs.join('\n'):'none');
  await browser.close();
})();
