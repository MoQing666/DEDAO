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
  E.commitStart(stb, 'dujie');
  stb.qi = 1e9;
  E.breakthrough(stb);
  while (stb.idx < 5 && stb.idx < 14) { stb.qi = 1e9; if (!E.breakthrough(stb).ok) break; }
  E.refreshStats(stb);
  console.log('stats idx', stb.idx, 'realm', stb.realm, 'hp', stb.hp, 'atk', stb.atk, 'mo', stb.mo, 'ti', stb.ti, 'wu', stb.wu);
  const tjS = E.tianjieSpec(stb, '金丹');
  console.log('tianjie', JSON.stringify(tjS));
  for (let i = 0; i < 30; i++) {
    stb.hp = stb.hpMax; stb.mo = stb.moMax;
    E.combatStart(stb, tjS);
    const r = E.combatAuto(stb);
    if (r.win) { console.log('win at try', i); break; }
  }
  console.log('after hp', stb.hp);
  return 1;
})();`;
vm.runInContext(c, ctx);
console.log('OK', ctx.probe);
