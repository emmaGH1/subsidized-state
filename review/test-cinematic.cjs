// Local-only interaction checks. Does not deploy or change the main site.
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('/opt/ww-shot/node_modules/playwright-core'); }
const { chromium } = playwright;
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:1000}});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.goto('file://'+path.resolve('review/cinematic-direction.html'));
    await page.evaluate(()=>document.fonts.ready);
    await page.click('#play');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#play').textContent(),'pause replay');
    await page.click('#play');
    const paused=await page.locator('#scrub').inputValue();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#scrub').inputValue(),paused);
    await page.locator('#scrub').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
    assert.equal(await page.locator('.receipt').getAttribute('data-empty'),'true');
    await page.locator('#scrub').evaluate(el=>{el.value='650';el.dispatchEvent(new Event('input',{bubbles:true}))});
    assert.match(await page.locator('#replay-label').textContent(),/4 of 6/);
    assert.match(await page.locator('#block').textContent(),/224,313,480/);
    await page.click('#events button:last-child');
    assert.match(await page.locator('#block').textContent(),/224,475,667/);
    assert.equal(await page.locator('#scrub').inputValue(),'1000');
    fs.mkdirSync('review/shots',{recursive:true});
    await page.screenshot({path:'review/shots/cinematic-desktop-1280.png',fullPage:true});
    await page.setViewportSize({width:380,height:844});await page.click('#mobile');
    await page.screenshot({path:'review/shots/cinematic-mobile-380.png',fullPage:true});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,'No horizontal overflow at 380px');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.click('#play');
    assert.equal(await page.locator('#scrub').inputValue(),'0');
    await page.click('#play');
    assert.match(await page.locator('#replay-label').textContent(),/1 of 6/);
    assert.equal(await page.locator('#play').textContent(),'step to next refill');
    assert.deepEqual(errors,[]);
    console.log('PASS: play/pause, scrub, receipt selection, desktop/mobile render, overflow, reduced-motion step, no page errors.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
