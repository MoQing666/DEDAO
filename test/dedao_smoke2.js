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
for (const f of ['data.js', 'engine.js', 'ui.js']) c += fs.readFileSync('D:/opencode/DEDAO/js/' + f, 'utf8') + '\n';
c += `probe=(function(){
  const out = [];
  const E = Engine;
  let s = E.startLife('测试者');
  s.year = 1;
  E.commitStart(s, 'dayili');
  out.push('1. 开局 realm=' + s.realm + ' idx=' + s.idx);

  // 装备系统
  E.applyOps(s, { equip: 'ling_toujin' });
  out.push('2. 装备上身 head=' + s.equip.head + ' inv=' + JSON.stringify(s.inventory));
  E.applyOps(s, { equip: 'wenyao_guan' });
  out.push('3. 重复获取入库存 inv=' + JSON.stringify(s.inventory));
  E.wearEquip(s, 'wenyao_guan');
  out.push('4. 换装 head=' + s.equip.head + ' inv=' + JSON.stringify(s.inventory));
  const g = E.sellEquip(s, 'ling_toujin');
  out.push('5. 出售 head=' + s.equip.head + ' inv=' + JSON.stringify(s.inventory) + ' stone=' + s.stone + ' gain=' + g);
  const es = E.equipStats(s);
  out.push('6. 装备属性 hpMax+' + es.hpMax + ' atk+' + es.atk);

  // 功法
  E.applyOps(s, { tech: 'yuhuo' });
  E.applyOps(s, { tech: 'xiaoyao' });
  out.push('7. 法术=' + (E.getBestShufa(s) ? E.getBestShufa(s).name : '无') + ' 遁术=' + JSON.stringify(E.getDunshu(s)));

  // 战斗 v2
  s.hp = s.hpMax = 500;
  let spec = { name: '青纹狼', atk: 30, hp: 120, loot: { stone: 50, herb: 2 } };
  E.combatStart(s, spec);
  let r = E.combatAct(s, 'spell');
  out.push('8. 法术伤害后敌血=' + s.battle.hp + ' 结束=' + r.done);
  if (!r.done) { r = E.combatAct(s, 'atk'); out.push('9. 攻击后敌血=' + s.battle.hp + ' 结束=' + r.done + ' win=' + r.win + ' gains=' + JSON.stringify(s.battle.gains)); }
  if (s.battle && !s.battle.done) { r = E.combatAct(s, 'flee'); out.push('10. 逃跑 fled=' + r.fled); }
  out.push('11. 战后 stone=' + s.stone + ' herb=' + s.herb);

  // 冒险
  const st = E.startAdventure(s);
  out.push('12. 冒险开始 ok=' + st.ok + ' depth=' + s.adv.depth + ' ap=' + s.actionsLeft);
  let guard = 0;
  while (s.adv && s.adv.status === 'running' && guard < 20) {
    guard++;
    const layer = E.advGenLayer(s);
    if (layer.final) {
      const res = E.advResolve(s, { type: 'final' });
      E.combatStart(s, res.spec);
      let rr = E.combatAct(s, 'spell');
      let i = 0;
      while (!rr.done && i < 12) { rr = E.combatAct(s, 'atk'); i++; }
      out.push('13. boss 战 win=' + rr.win + ' 敌血=' + (s.battle ? s.battle.hp : '-'));
      if (rr.win) { const ex = E.advClearReward(s); out.push('14. 通关奖励 ' + ex.length + ' 条'); E.advEnd(s, 'done'); }
      else E.advEnd(s, 'lost');
      out.push('15. 冒险结束 lostMsg=' + (s.adv.lostMsg || '无') + ' gains=' + s.adv.gains.length + '条 stone=' + s.stone);
      break;
    }
    const node = layer.choices[Math.floor(Math.random() * layer.choices.length)];
    if (node.type === 'combat' || node.type === 'elite') {
      const res = E.advResolve(s, node);
      E.combatStart(s, res.spec);
      let rr = E.combatAct(s, 'guard');
      let i = 0;
      while (!rr.done && i < 15) { rr = E.combatAct(s, 'atk'); i++; }
      if (rr.lost) { E.advEnd(s, 'lost'); out.push('16. 中层战败 lostMsg=' + s.adv.lostMsg); break; }
    } else if (node.type === 'shop') {
      const res = E.advResolve(s, node);
      out.push('17. 坊市商品 ' + res.stock.length + ' 件 首件=' + res.stock[0].name + ' 价格' + res.stock[0].price);
      const rr = E.buyStock(s, res.stock[0]);
      out.push('18. 购买 ' + (rr.ok ? '成功 ' + rr.lines.join('|') : '失败' + rr.msg));
    } else {
      E.advResolve(s, node);
    }
    const isFinal = E.advAdvance(s);
    if (isFinal) out.push('19. 到达最终层 depth=' + s.adv.depth);
  }
  out.push('20. 冒险结束 status=' + s.adv.status + ' gains=' + JSON.stringify(s.adv.gains));

  // 俸禄
  s.sect = 'qingyunjian';
  const y = E.endYear(s);
  out.push('21. endYear=' + y + ' year=' + s.year);

  // 出售材料
  const g2 = E.sellMaterial(s, 'herb', 5);
  out.push('22. 卖灵草5株 stone+' + g2 + ' herb=' + s.herb);

  return out.join('\\n');
})();`;
vm.runInContext(c, ctx, { filename: 'b.js' });
console.log(ctx.probe);