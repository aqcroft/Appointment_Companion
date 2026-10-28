"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const pageUrl="https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/should-i-fix/";
async function ready(page){
  const response=await page.goto(pageUrl+"?pwa_check=2665",{waitUntil:"domcontentloaded",timeout:55000});
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
    assert.equal(await buttons.count(),2,"Prospective and Existing customer choices are present");
    assert.equal(await buttons.nth(0).innerText(),"Prospective customers");
    assert.equal(await buttons.nth(1).innerText(),"Existing customers");
    assert.equal(await page.evaluate(()=>window.AppointmentCompanionFixModes?.version),"v2.66.5",
      "The live PWA must have loaded the new mode-switch module");

    const smallNav=await page.locator("#acFixCustomerMode").boundingBox();
    assert(smallNav&&smallNav.width<390,"Mobile mode selector must have side margins");
    assert.equal(await page.locator('button[data-fix-mode="current"]').getAttribute("aria-pressed"),"true");
    const frame=page.locator("#fixFrame");
    const before=await frame.getAttribute("src");
    assert(before.includes("/ShouldIFix/Oct2026.html"),"Previous standard calculator must remain selected");
    await page.locator('button[data-fix-mode="existing"]').click();
    await page.waitForFunction(()=>document.querySelector("#acRenewalFrame")?.src.includes("renewal-builder-v1.html"));
    const renewalFrame=page.locator("#acRenewalFrame");
    const after=await renewalFrame.getAttribute("src");
    assert(after.includes("existing=1"),"Existing option loads real renewal mode");
    assert(!after.includes("demo=1"),"Do not use synthetic demo tariff rates");
    assert.equal(await page.locator('button[data-fix-mode="existing"]').getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator("#usageNote").evaluate(el=>getComputedStyle(el).display),"none");
    const frameContext=page.frameLocator("#acRenewalFrame");
    await frameContext.locator("#renewalEndingPicks button").first().waitFor({state:"visible",timeout:85000});
    assert(await frameContext.locator("#renewalEndingPicks button").count()>=3,"Old tariff quick options");
    const renewalNames=await frameContext.locator("#renewalSuitePicks button b").allTextContents();
    assert.equal(renewalNames.length,2,"Exactly two email-offer shortcuts");
    assert(renewalNames.some(n=>/\b99$/.test(n))&&renewalNames.some(n=>/\b100$/.test(n)),
      "Quick tariff shortcuts must be 99 and 100, not 98");
    assert.equal(await frameContext.locator("#sifEditorShareCard").count(),0,
      "Prospective-only Share card must NEVER be injected into existing customer view");
    assert.equal(await frameContext.locator("#sifProfileToggle").count(),0,
      "Prospective-only photo widget must not be injected into renewal mode");
    assert.equal(await frameContext.locator("section.card.share").isVisible(),false,
      "Source calculator's generic Share panel is hidden in renewal mode");
    assert.equal(await frameContext.locator("#builderCopyLink").isVisible(),true,
      "Existing customer's own verified link controls remain visible");
    await page.setViewportSize({width:1500,height:900});
    const desktopNav=await page.locator("#acFixCustomerMode").boundingBox();
    assert(desktopNav&&desktopNav.width>=710&&desktopNav.width<=733,"Desktop nav must match calculator width");
    assert(Math.abs(desktopNav.x+(desktopNav.width/2)-750)<5,"Desktop nav must be horizontally centred");
    await page.screenshot({path:"test-artifacts/main-pwa-sif-existing-v2.66.5-desktop.png",fullPage:true});
    await frameContext.locator("#renewalBudgetMonthly").fill("155");
    const enteredBudget=await frameContext.locator("#renewalBudgetMonthly").inputValue();
    const childData=await frameContext.locator("#renewalLiveStatus").innerText();
    console.log("Historical iframe loaded:",childData);
    await page.locator('button[data-fix-mode="current"]').click();
    await page.waitForFunction(()=>document.querySelector("#fixFrame")?.style.display!=="none");
    assert.equal(await page.locator('button[data-fix-mode="current"]').getAttribute("aria-pressed"),"true");
    await page.frameLocator("#fixFrame").locator("#sifEditorShareCard").waitFor({state:"attached",timeout:20000});
    assert.equal(await page.frameLocator("#fixFrame").locator("#sifEditorShareCard").count(),1,
      "Prospective-only sharing must still appear when switched back");

    assert.equal(await renewalFrame.getAttribute("src"),after,"Renewal iframe URL must remain unchanged");
    await page.locator('button[data-fix-mode="existing"]').click();
    assert.equal(await frameContext.locator("#renewalBudgetMonthly").inputValue(),enteredBudget,
      "Manually entered budget must survive switching away from the existing-customer mode");
    assert.equal(await page.frameLocator("#fixFrame").locator("#comparisonSwitch").isVisible(),false,
      "Embedded prospective tool must not expose the old second customer-mode switch");
    await page.locator('button[data-fix-mode="current"]').click();
    await page.screenshot({path:"test-artifacts/main-pwa-sif-modes-v2.66.5.png",fullPage:true});
    const customer=await browser.newPage({viewport:{width:390,height:844}});
    await customer.goto(pageUrl+"?public=1",{waitUntil:"domcontentloaded",timeout:60000});
    await customer.waitForTimeout(3000);
    assert.equal(await customer.locator("#acFixCustomerMode").count(),0,"Never expose partner switcher in shared customer view");
    await customer.close();
    assert(!errors.length,"PWA browser JS errors: "+errors.join("; "));
    console.log("PASS: v2.66.5 centred prospective/existing controls on desktop/mobile, no legacy renewals injection, normal prospective sharing and public isolation.");
  }catch(e){
    await page.screenshot({path:"test-artifacts/main-pwa-sif-failure-v2.66.5.png",fullPage:true}).catch(()=>{});
    console.error("Browser integration failed:",e.stack||e);
    console.error("Page errors:",errors);
    process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
