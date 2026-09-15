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
  const out = [];
  const E = Engine;
  let wins = 0, losses = 0, flights = 0, totalGain = 0, spellUsed = 0, roundsSum = 0;
  for (let i = 0; i < 50; i++) {
    const s = E.startLife('自动' + i);
    E.commitStart(s, 'dayili');
    E.applyOps(s, { tech: 'yuhuo' });
    E.applyOps(s, { tech: 'xiaoyao' });
    const stone0 = s.stone;
    const spec = E.enemyGen(s, 'combat', 1 + (i % 5));
    E.combatStart(s, spec);
    const r = E.combatAuto(s);
    if (r.win) { wins++; totalGain += s.stone - stone0; }
    else if (r.lost) losses++;
    else if (r.fled) flights++;
    roundsSum += r.rounds;
    if (r.done !== true) out.push('未结�? #' + i);
    if (i === 0) out.push('样例: ' + (r.win ? '�? : r.lost ? '�? : '�?) + ' 回合=' + r.rounds + ' 余HP=' + s.hp + '/' + s.hpMax + ' 行数=' + r.lines.length);
  }
  out.push('50场AI代打: �?' + wins + ' / �?' + losses + ' / �?' + flights + ' 平均回合 ' + (roundsSum / 50).toFixed(1) + ' 胜者灵石总入+' + totalGain);
  return out.join('\\n');
})();`;
vm.runInContext(c, ctx, { filename: 'b.js' });
console.log(ctx.probe);
