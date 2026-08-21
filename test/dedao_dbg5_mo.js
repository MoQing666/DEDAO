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
  E.breakthrough(stb);
  while (stb.idx < 5 && stb.idx < 14) { stb.qi = 1e9; if (!E.breakthrough(stb).ok) break; }
  E.refreshStats(stb);
  stb.hp = stb.hpMax; stb.mo = stb.moMax;
  const tjS = E.tianjieSpec(stb, '金丹');
  E.combatStart(stb, tjS);
  const r = E.combatAuto(stb);
  console.log('RESULT win', r.win, 'lost', r.lost, 'rounds', r.rounds);
  r.lines.forEach(function (l) { console.log(l); });
  return 1;
})();`;
vm.runInContext(c, ctx);
console.log('OK', ctx.probe);