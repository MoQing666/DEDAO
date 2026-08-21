const fs = require('fs');
const vm = require('vm');
const store = {};
const ctx = {
  console, localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  document: { addEventListener: () => {}, getElementById: () => null },
  Math, JSON
};
vm.createContext(ctx);
let c = '';
for (const f of ['data.js', 'engine.js']) c += fs.readFileSync('D:/opencode/DEDAO/js/' + f, 'utf8') + '\n';
c += `probe=(function(){
  const E = Engine;
  const stb = E.startLife('渡劫测试');
  E.commitStart(stb, 'liancai');
  stb.qi = 1e9;
  const tb0 = E.breakInfo(stb);
  console.log('LQ breakInfo', JSON.stringify(tb0));
  const tb1 = E.breakthrough(stb);
  console.log('tb1 realm', stb.realm, stb.idx, JSON.stringify(tb1));
  E.refreshStats(stb);
  stb.qi = 1e9;
  const tb2 = E.breakInfo(stb);
  console.log('ZJ breakInfo', JSON.stringify({mode: tb2.mode, trib: tb2.trib, realm: tb2.nxt && tb2.nxt.realm}));
  const tb3 = E.breakthrough(stb);
  console.log('tb3', JSON.stringify(tb3), 'trib now', JSON.stringify(stb.trib));
  const xmS = E.xinmoSpec(stb);
  console.log('xinmo spec', JSON.stringify(xmS));
  E.combatStart(stb, xmS);
  const winM = E.combatAuto(stb);
  console.log('xinmo win?', winM.win, 'trib now', JSON.stringify(stb.trib));
  if (winM.win) { const dmm = E.xinmoDone(stb); console.log('xinmoDone:', dmm, JSON.stringify(stb.trib)); }
  return 1;
})();`;
vm.runInContext(c, ctx);
console.log(ctx.probe === 1 ? 'DEBUG OK' : 'DEBUG FAIL');