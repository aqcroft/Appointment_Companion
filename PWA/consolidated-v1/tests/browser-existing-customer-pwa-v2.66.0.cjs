"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const pageUrl="https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/should-i-fix/";
async function ready(page){
  const response=await page.goto(pageUrl+"?pwa_check=2660",{waitUntil:"domcontentloaded",timeout:55000});
  assert(response?.ok(),"Specialist page must load");
  await page.locator("#acFixCustomerMode").waitFor({state:"visible",timeout:55000});
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CI_BROWSER_PATH||undefined});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await ready(page);
    const buttons=page.locator("#acFixCustomerMode button");
    assert.equal(await buttons.count(),2,"Current and Existing customer choices are present");
    assert.equal(await page.locator('button[data-fix-mode="current"]').getAttribute("aria-pressed"),"true");
    const frame=page.locator("#fixFrame");
    const before=await frame.getAttribute("src");
    assert(before.includes("/ShouldIFix/Oct2026.html"),"Previous standard calculator must remain selected");
    await page.locator('button[data-fix-mode="existing"]').click();
    await page.waitForFunction(()=>document.querySelector("#fixFrame")?.src.includes("renewal-builder-v1.html"));
    const after=await frame.getAttribute("src");
    assert(after.includes("renew=1"),"Existing option loads real renewal mode");
    assert(!after.includes("demo=1"),"Do not use synthetic demo tariff rates");
    assert.equal(await page.locator('button[data-fix-mode="existing"]').getAttribute("aria-pressed"),"true");
    const frameContext=page.frameLocator("#fixFrame");
    await frameContext.locator("#renewalEndingPicks button").first().waitFor({state:"visible",timeout:85000});
    assert(await frameContext.locator("#renewalEndingPicks button").count()>=3,"Old tariff quick options");
    assert(await frameContext.locator("#renewalSuitePicks button").count()>=3,"Offered tariff quick options");
    const childData=await frameContext.locator("#renewalLiveStatus").innerText();
    console.log("Historical iframe loaded:",childData);
    await page.locator('button[data-fix-mode="current"]').click();
    await page.waitForFunction(()=>document.querySelector("#fixFrame")?.src.includes("/ShouldIFix/Oct2026.html"));
    assert.equal(await page.locator('button[data-fix-mode="current"]').getAttribute("aria-pressed"),"true");
    await page.screenshot({path:"test-artifacts/main-pwa-sif-modes-v2.66.0.png",fullPage:true});
    const customer=await browser.newPage({viewport:{width:390,height:844}});
    await customer.goto(pageUrl+"?public=1",{waitUntil:"domcontentloaded",timeout:60000});
    await customer.waitForTimeout(3000);
    assert.equal(await customer.locator("#acFixCustomerMode").count(),0,"Never expose partner switcher in shared customer view");
    await customer.close();
    assert(!errors.length,"PWA browser JS errors: "+errors.join("; "));
    console.log("PASS: PWA v2.66.0 loads both calculators, switches back safely and hides modes in public customer views.");
  }catch(e){
    await page.screenshot({path:"test-artifacts/main-pwa-sif-failure-v2.66.0.png",fullPage:true}).catch(()=>{});
    console.error("Browser integration failed:",e.stack||e);
    console.error("Page errors:",errors);
    process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
