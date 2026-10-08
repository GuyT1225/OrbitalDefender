"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("game.js", "utf8");
function extractFunction(name) {
  const start = source.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "Missing function " + name);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error("Unterminated " + name);
}

test("Tactical incoming impacts resolve once during update, independent of drawing", () => {
  const run = new Function("state", `
    let incomingFx = state.incomingFx;
    const resolveEnemyShot = () => { state.hits++; };
    ${extractFunction("updateIncomingFire")}
    updateIncomingFire(1100);
    updateIncomingFire(1150);
    return incomingFx;
  `);
  const state = {incomingFx:[{start:100,duration:800,resolved:false}],hits:0};
  const remaining = run(state);
  assert.equal(state.hits, 1);
  assert.equal(remaining[0].resolved, true);
  assert.ok(source.includes("updateIncomingFire(now);drawScene(now)"));
  assert.ok(!extractFunction("drawIncomingFire").includes("resolveEnemyShot(f)"));
});

test("Cancelling Arcade invalidates the session and clears gameplay overlays", () => {
  const makeElement = () => ({attrs:{},classList:{removed:[],remove(x){this.removed.push(x)}},setAttribute(k,v){this.attrs[k]=v}});
  const ui = {upgrade:makeElement(),end:makeElement()};
  const run = new Function("ui", `
    let arcadeSessionId = 4, arcadeRunning = true, arcadePhase = "UPGRADE";
    let arcadeWaveTransition = true, arcadePointer = 8;
    const arcadeUi = ui;
    ${extractFunction("cancelArcadeSession")}
    cancelArcadeSession();
    return {arcadeSessionId, arcadeRunning, arcadePhase, arcadeWaveTransition, arcadePointer};
  `);
  const result = run(ui);
  assert.deepEqual(result,{arcadeSessionId:5,arcadeRunning:false,arcadePhase:"MENU",arcadeWaveTransition:false,arcadePointer:null});
  assert.equal(ui.upgrade.attrs["aria-hidden"],"true");
  assert.equal(ui.end.attrs["aria-hidden"],"true");
});

test("Restart, transition and touch guards remain present", () => {
  assert.match(source,/session===arcadeSessionId&&arcadeRunning&&!arcadeRunOver&&arcadePhase==="PLAYING"/);
  assert.match(source,/if\(arcadePhase!=="UPGRADE"\|\|!arcadeRunning\|\|arcadeRunOver\)return/);
  assert.match(source,/ui\.scanBtn\.disabled=false;ui\.fireBtn\.disabled=false/);
  assert.equal((source.match(/lostpointercapture/g)||[]).length,3);
  assert.match(source,/window\.addEventListener\("blur"/);
});
