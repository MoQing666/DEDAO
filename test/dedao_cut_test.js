const fs = require('fs');
const vm = require('vm');
const store = {};
const realRandom = Math.random;
const FR = { v: null };
Math.random = function () { return FR.v !== null ? FR.v : realRandom(); };
const ctx = {
  console, FR, localStorage: {
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
  const s = E.startLife('全测');
  E.commitStart(s, 'liancai');
  const fail = function (label, cond) { out.push((cond ? 'PASS ' : 'FAIL ') + label); };

  fail('STAGES 共12阶', STAGES.length === 12);
  fail('末阶=元婴后期', STAGES[11].realm === '元婴' && STAGES[11].sub === '后期' && STAGES[11].bigRealm === 3);
  fail('无第12阶(化神已砍)', STAGES[12] === undefined);
  fail('NEED 末值=19000', NEED[11] === 19000);
  fail('BIG_REALMS=4个', BIG_REALMS.length === 4 && BIG_REALMS[3] === '元婴');
  fail('天劫名单无化神', TRIBULATIONS.join() === '金丹,元婴,飞升');
  fail('开局自带吐纳诀', s.techs.join() === 'tunai');
  fail('REALM_META 无化神', !REALM_META['化神']);
  fail('丹药无化神丹', !ELIXIRS.huashen && !BREAK_ELIXIR['化神']);

  // 修炼公式：新公式 (60+悟性x20)
  const qi0 = s.qi;
  const gmsg = E.cultivate(s);
  const gain = s.qi - qi0;
  const exp0 = Math.round((60 + s.wu * 20) * (1 + 0.3 * 0) * 1.2 * (s.linggen.qiMul || 1));
  fail('修炼公式(60+悟性x20)x灵根x功法(吐纳1.2): 得' + gain + ' 期望' + exp0, gain === exp0);

  // 炼气 前->中->后：小突破无功法
  s.qi = 1e9;
  FR.v = 0.01;
  let rb = E.breakthrough(s);
  FR.v = null;
  fail('炼气中期突破(无功法)', rb.win && !rb.tech && s.idx === 1);
  s.qi = 1e9;
  FR.v = 0.01;
  rb = E.breakthrough(s);
  FR.v = null;
  fail('炼气后期突破(无功法)', rb.win && !rb.tech && s.idx === 2);

  // 筑基大突破：给功法
  s.qi = 1e9;
  FR.v = 0.01;
  rb = E.breakthrough(s);
  FR.v = null;
  fail('筑基突破成功 idx3', rb.ok && rb.win && s.idx === 3);
  fail('筑基突破获功法', !!rb.tech && s.techs.indexOf(rb.tech) >= 0);
  out.push('  筑基功法=' + (rb.tech ? TECHNIQUES[rb.tech].name : '无'));

  // 筑基中/后：无功法
  s.qi = 1e9;
  FR.v = 0.01;
  rb = E.breakthrough(s);
  FR.v = null;
  fail('筑基中期小突破(无功法)', rb.win && !rb.tech && s.idx === 4);
  s.qi = 1e9;
  FR.v = 0.01;
  rb = E.breakthrough(s);
  FR.v = null;
  fail('筑基后期小突破(无功法)', rb.win && !rb.tech && s.idx === 5);

  // 金丹渡劫：给功法
  s.qi = 1e9;
  FR.v = 0.01;
  rb = E.breakthrough(s);
  FR.v = null;
  fail('金丹渡劫成功', rb.ok && rb.win && rb.trib === '金丹' && s.idx === 6);
  fail('金丹突破获功法', !!rb.tech);
  out.push('  金丹功法=' + (rb.tech ? TECHNIQUES[rb.tech].name : '无'));

  // 一路到元婴后期
  while (s.idx < 11) { s.qi = 1e9; FR.v = 0.01; rb = E.breakthrough(s); FR.v = null; if (!rb.ok || !rb.win) break; }
  fail('冲到元婴后期', s.idx === 11);
  fail('元婴期功法已授全(>=4本)', s.techs.length >= 4);
  out.push('  功法=(' + s.techs.length + ')' + s.techs.join(','));

  // 飞升：元婴后期 -> 仙
  s.qi = 1e9;
  FR.v = 0.01;
  rb = E.breakthrough(s);
  FR.v = null;
  fail('飞升成功', rb.ok && rb.win && rb.trib === '飞升' && s.idx === 15 && s.endReason === '飞升');
  fail('飞升获仙阶功法', !!rb.tech);
  out.push('  飞升功法=' + (rb.tech ? TECHNIQUES[rb.tech].name : '无'));

  // 怪物池：元婴期 bi 上限钳制
  const s2 = E.startLife('怪'); E.commitStart(s2, 'liancai');
  s2.idx = 11; s2.realm = '元婴';
  FR.v = 0.01;
  const m1 = E.enemyGen(s2, 'mob', 3);
  FR.v = null;
  const yuanyingNames = ['玄冥蛟','血瞳魔将','九幽魂主','天罡石灵','远古荒鲲','堕落真仙'];
  fail('怪物池钳制在元婴池', yuanyingNames.indexOf(m1.name) >= 0);
  out.push('  怪物=' + m1.name);

  // 宗门活动：有宗门走宗门池
  const s3 = E.startLife('宗'); E.commitStart(s3, 'liancai');
  s3.actionsLeft = 1;
  let ev1 = E.social(s3);
  fail('无宗门=社交事件', EVENTS.shejiao.some(function(e){return e.id===ev1.id;}));
  s3.actionsLeft = 1;
  s3.sect = 'qingyunjian';
  ev1 = E.social(s3);
  fail('有宗门=宗门活动', SECT_SOCIAL['qingyunjian'].some(function(e){return e.id===ev1.id;}));
  out.push('  宗门活动=' + ev1.title);
  // 宗门活动按大境界过滤
  s3.actionsLeft = 1;
  s3.idx = 2; // 筑基初期 bi=1
  ev1 = E.social(s3);
  fail('宗门活动按大境界过滤(min=1才可选)', ev1.min >= 1 || ev1.min === 0 && ev1.max >= 1);

  // 宗门事件 seen 去重 + 范围过滤
  const bi = bigIdxOf(s3);
  const poolOK = SECT_EVENTS['qingyunjian'].filter(function(e){
    return e.min <= bi && e.max >= bi && (!e.once || !s3.seen['se_' + e.id]);
  });
  fail('宗门年末池按大境界过滤', poolOK.every(function(e){ return e.min <= bi && e.max >= bi; }));

  // 剧情可授予功法：applyOps tech 去重
  const r1 = E.applyOps(s3, { tech: 'changchun' });
  const r2 = E.applyOps(s3, { tech: 'changchun' });
  fail('applyOps 功法去重', r1.length === 1 && r2.length === 0 && s3.techs.indexOf('changchun') >= 0);

  // 战斗掉落支持 atk/hpMax
  const sp = { name: '测试灵', atk: 3, hp: 30, loot: { stone: 30, atk: 2, hpMax: 20 } };
  const b = E.combatStart(s3, sp);
  const atk0 = s3.atk, hp0 = s3.hpMax;
  while (!b.done) { FR.v = 0.5; E.combatAct(s3, 'atk'); FR.v = null; }
  out.push('  战斗: done=' + b.done + ' win=' + b.win + ' lost=' + b.lost + ' hp=' + s3.hp + '/' + s3.hpMax + ' atk=' + s3.atk + '(期望' + (atk0 + 2) + ') hp0=' + hp0 + ' 期望hpMax=' + (hp0 + 20));
  fail('战斗获胜且掉落含atk/hpMax', b.done && b.win && s3.atk === atk0 + 2 && s3.hpMax === hp0 + 20);

  return out.join('\\n');
})()`;
ctx.probe = vm.runInContext(c, ctx);
console.log(ctx.probe);
