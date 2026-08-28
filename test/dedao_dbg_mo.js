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
  const s = E.startLife('t');
  E.commitStart(s, 'dujie');
  s.techs = ['tunai', 'changchun', 'yuhuo', 'hanshuang'];
  E.ensureTechEquip(s);
  E.toggleShufa(s, 'yuhuo');
  const b = E.combatStart(s, E.enemyGen(s, 'normal', 1));
  console.log('mo', s.mo, 'cost', Engine.TECHNIQUES.yuhuo.cost, 'enemyHp', b.hpMax, 'atk', s.atk, 'yuhuo dmg x', Engine.TECHNIQUES.yuhuo.dmg);
  const r1 = E.combatAct(s, 'spell', 'yuhuo');
  console.log('r1 done', r1.done, 'mo', s.mo, '|', r1.lines.join('|'));
  const r2 = E.combatAct(s, 'spell', 'yuhuo');
  console.log('r2 done', r2.done, 'win', r2.win, 'mo', s.mo, '|', r2.lines.join('|'));
  s.mo = 0;
  const r3 = E.combatAct(s, 'spell', 'yuhuo');
  console.log('r3 |', JSON.stringify(r3.lines));
  const s2 = E.startLife('t2'); E.commitStart(s2, 'dujie');
  console.log('moMax', s2.moMax, 'mo', s2.mo);
  const cu = E.cultivate(s2);
  console.log('cultivate:', cu.slice(0, 30), 'mo now', s2.mo);
  return 1;
})();`;
vm.runInContext(c, ctx);
console.log(ctx.probe === 1 ? 'DEBUG OK' : 'DEBUG FAIL');
