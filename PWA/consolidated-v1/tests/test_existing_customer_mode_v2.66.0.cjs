"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const root="PWA/consolidated-v1/";
const read=path=>fs.readFileSync(root+path,"utf8");
const mode=read("should-i-fix/mode-toggle-v2.66.0.js");
const shell=read("should-i-fix/index.html");
const main=read("index.html");
const sw=read("sw.js");
const manifest=JSON.parse(read("manifest.webmanifest"));
const status=read("unified-status-v2.59.0.js");
const news=read("docs/CHANGELOG.md");

assert.match(mode,/Appointment Companion v2\.66\.0/);
assert(mode.includes("Existing customer"));
assert(shell.includes("mode-toggle-v2.66.0.js"));
assert(shell.includes("if (!publicView) html = html.replace"));
assert(shell.includes("https://aqcroft.github.io/ShouldIFix/Oct2026.html"),"Original calculator must remain intact");
assert(shell.includes("fix-share-gate-v1.js"),"Existing share gate must remain in place");
assert(shell.includes("public-partner-branding-v1.js"),"Existing customer branding must remain");
assert(main.includes("Appointment Companion v2.66.0"));
assert(sw.includes("v2-66-0-existing-renewal"));
assert(sw.includes("./should-i-fix/mode-toggle-v2.66.0.js"));
assert.equal(manifest.name,"Appointment Companion v2.66.0");
assert(status.includes("version: 'v2.66.0'"));
assert(news.startsWith("## v2.66.0"));

function fakePage(query){
 const buttons=[{dataset:{fixMode:"current"},pressed:null,setAttribute(k,v){if(k==="aria-pressed")this.pressed=v;}},
 {dataset:{fixMode:"existing"},pressed:null,setAttribute(k,v){if(k==="aria-pressed")this.pressed=v;}}];
 const clicks={};
 const ui={id:"",innerHTML:"",setAttribute(){},
 querySelectorAll(){return buttons;},addEventListener(name,fn){clicks[name]=fn;}};
 const title={textContent:"📈 Should I Fix?"};
 const bar={querySelector(){return title;},insertAdjacentElement(){fakePage.inserted=true;}};
 const frame={src:"https://aqcroft.github.io/ShouldIFix/Oct2026.html?v=legacy&r=11&e=3079&g=12092&pid=SECRET-DO-NOT-FORWARD",title:"calculator"};
 let created=0,historyHref="";
 const document={
  title:"Should I Fix? v2.66.0",
  documentElement:{classList:{contains:()=>false}},
  getElementById(id){return id==="fixFrame"?frame:null;},
  querySelector(s){return s===".bar"?bar:null;},
  createElement(tag){created++;if(tag==="style")return{textContent:"",id:""};if(tag==="nav")return ui;throw Error("Unexpected DOM element "+tag);},
  head:{appendChild(){}}
 };
 const globals={window:null,location:{href:"https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/should-i-fix/"+query},
 history:{state:null,replaceState(s,t,href){historyHref=href;}},document,URL,
 addEventListener(){}};
 globals.window=globals;
 vm.createContext(globals);vm.runInContext(mode,globals);
 return{globals,frame,buttons,ui,created,title,get historyHref(){return historyHref;}};
}
const start=fakePage("?mode=existing");
assert(start.globals.AppointmentCompanionFixModes,"Partner selector must exist");
assert.equal(start.buttons[1].pressed,"true");
assert(start.frame.src.startsWith("https://aqcroft.github.io/ShouldIFix/renewal-builder-v1.html?"));
const selected=new URL(start.frame.src);
assert.equal(selected.searchParams.get("r"),"11");
assert.equal(selected.searchParams.get("e"),"3079");
assert.equal(selected.searchParams.get("g"),"12092");
assert.equal(selected.searchParams.get("renew"),"1");
assert(!selected.searchParams.has("pid"),"No partner identity forwarded to renewal frame");
assert(!selected.searchParams.has("demo"),"Real historic rates, never demo mode");
start.globals.AppointmentCompanionFixModes.setMode("current",true);
assert(start.frame.src.includes("Oct2026.html"),"Old calculator restored without changing its URL");
assert.equal(start.buttons[0].pressed,"true");
assert(!new URL(start.historyHref).searchParams.has("mode"));
start.globals.AppointmentCompanionFixModes.setMode("existing",true);
assert.equal(new URL(start.historyHref).searchParams.get("mode"),"existing");
const publicPage=fakePage("?public=1");
assert.equal(publicPage.globals.AppointmentCompanionFixModes,undefined,"No mode switch on customer share routes");
assert.equal(publicPage.created,0);
assert(publicPage.frame.src.includes("Oct2026.html"));
console.log("PASS: Current and historical Should I Fix modes, appointment kWh transfer, public isolation, PWA version/changelog/cache.");
