/* 工具：校验四项遗留项修复（基于真实 engine.js / data.js，2026-09-25）
 * 覆盖：P1 hpPct 死配置接入 / P2 事件心魔 xinyin_zhaoyu / P2 试炼回满时机 / 入宗 6 路径评分
 * 用真引擎（_engine_loader），不手抄镜像。
 */
'use strict';
const { load } = require('./_engine_loader');
const G = load();
const E = G.Engine;

let fails = 0;
function assert(cond, msg) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + msg); if (!cond) fails++; }

// —— P1：AFFIX_POOLS.hpPct 接入 body 槽位（死配置修复）——
console.log('\n== P1：hpPct 接入 ==');
const bodyPool = G.AFFIX_BY_SLOT.body;
console.log('AFFIX_BY_SLOT.body =', JSON.stringify(bodyPool));
assert(Array.isArray(bodyPool) && bodyPool.indexOf('hpPct') >= 0, 'hpPct 已接入 AFFIX_BY_SLOT.body');
// 真引擎蒙特卡洛：body tier5 滚动 4000 次，确认 hpPct 真实产出
let hpPctCount = 0; const N = 4000;
for (let i = 0; i < N; i++) {
  const aff = E.rollAffixes('body', 5);
  if (aff.some(function (a) { return a.key === 'hpPct'; })) hpPctCount++;
}
console.log('body tier5 滚动 ' + N + ' 次，含 hpPct 的实例数 = ' + hpPctCount);
assert(hpPctCount > 0, 'hpPct 在 body tier5 真引擎产出（非永不产出）');
assert(hpPctCount < N, 'hpPct 非 100% 槽位（仍受随机词条数约束，符合概率预期）');

// —— P2：事件心魔 xinyin_zhaoyu 修掉 atk:0 硬编码 ——
console.log('\n== P2：xinyin_zhaoyu 心魔化身 ==');
const ev = (G.EVENTS.jiyuan || []).filter(function (e) { return e.id === 'xinyin_zhaoyu'; })[0];
assert(!!ev, '事件 xinyin_zhaoyu 存在');
const fight = ev && ev.choices ? ev.choices.filter(function (c) { return c.fight; })[0] : null;
assert(!!fight, 'xinyin_zhaoyu 含战斗分支');
console.log('心魔化身 fight =', JSON.stringify(fight && fight.fight));
assert(fight && fight.fight.atk > 0, '心魔化身 atk>0（已修掉 atk:0 硬编码）');
assert(fight && fight.fight.atk === 500, '心魔化身 atk=500（元婴档幻象，写死非缩放）');
assert(fight && fight.fight.hp === 5000, '心魔化身 hp=5000（真实可战，非 300 形同虚设）');
assert(fight && fight.fight.loot && fight.fight.loot.art === 'mingxin_jing', '心魔化身掉落不变（明心经）');

// —— P2：试炼回满时机（进战不回满，入门后才回满）——
console.log('\n== P2：试炼回满时机 ==');
function baseState(over) {
  const s = {
    realm: '炼气', idx: 0, jie: 0, sect: 'xuantian', sectRank: null,
    year: 5, lastTrialYear: undefined, wu: 10, dao: 10, stone: 100,
    gongye: 0, gongyeEarned: 0,
    hp: 1, hpMax: 1000, mp: 1, mpMax: 500,
    equip: { weapon: null, head: null, body: null, accessory: null, treasure: [] },
    treasure: [], dunSpeed: 2
  };
  return Object.assign(s, over || {});
}
// startTrial('sect') 进战不再回满：以 hp=1 进战，应仍为 1
{
  const s = baseState({ hp: 1, hpMax: 1000 });
  try { E.startTrial(s, 'sect', { title: '入宗试炼' }); } catch (e) { console.log('  (startTrial 尾部 saveState 报错属 harness 限制，hp 已在入口后确定): ' + e.message); }
  console.log('startTrial 后 s.hp =', s.hp, ' / hpMax =', s.hpMax);
  assert(s.hp === 1, 'startTrial(sect) 进战不回满（尝试≠入门，hp 保持 1）');
}
// joinSect 入门后才回满：以 hp=1 入门，应补满
{
  const s = baseState({ hp: 1, hpMax: 1000, wu: 10, dao: 10 });
  const g = E.gradeSectTrial(s, true);
  let jr; try { jr = E.joinSect(s, g); } catch (e) { console.log('  (joinSect 尾部 refreshStats/saveState 报错属 harness 限制，回满已在之前执行): ' + e.message); }
  console.log('joinSect 后 s.hp =', s.hp, ' / hpMax =', s.hpMax, ' / sectRank =', s.sectRank);
  assert(s.hp > 1, 'joinSect 入门后回满血蓝（hp 由 1 补满）');
  assert(s.sectRank === '真传', 'joinSect 写入 sectRank=真传');
}

// —— 入宗 6 路径评分（与走查清单一一对应）——
console.log('\n== 入宗 6 路径评分 ==');
function mk2(wu, dao) { return baseState({ wu: wu, dao: dao, sectRank: null }); }
// 路径1 胜+双达标 → 真传
let g1 = E.gradeSectTrial(mk2(10, 10), true);
assert(g1.rank === '真传' && g1.gift === 100 && g1.canJoin && !g1.provisional, '路径1 胜+双达标 → 真传(100)');
// 路径2 胜+单达标 → 内门
let g2 = E.gradeSectTrial(mk2(10, 5), true);
assert(g2.rank === '内门' && g2.gift === 50 && g2.canJoin && !g2.provisional, '路径2 胜+单达标 → 内门(50)');
// 路径3 胜+双不达标 → 外门
let g3 = E.gradeSectTrial(mk2(5, 5), true);
assert(g3.rank === '外门' && g3.gift === 0 && g3.canJoin && !g3.provisional, '路径3 胜+双不达标 → 外门');
// 路径4/5 败+达标 → 记名弟子(provisional)
let g4 = E.gradeSectTrial(mk2(10, 10), false);
assert(g4.rank === '外门' && g4.provisional && g4.canJoin && g4.gift === 0, '路径4/5 败+达标 → 记名弟子(外门档,provisional)');
// 路径6 败+双不达标 → 无资格（canJoin=false，无入门按钮）
let g6 = E.gradeSectTrial(mk2(5, 5), false);
assert(g6.rank === null && g6.canJoin === false, '路径6 败+双不达标 → 无资格（无入门按钮）');

console.log('\n' + (fails === 0 ? '✅ 全部通过' : '❌ 失败 ' + fails + ' 项'));
process.exit(fails === 0 ? 0 : 1);
