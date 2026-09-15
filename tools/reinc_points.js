/* DEDAO 轮回点结算计算器 —— 结算依据明细 + 跨周目红利落点
 * 用途：核算"当前结算的轮回点数量"与结算依据，纳入玩家跨周目累积红利(初始 meta.points)。
 * 注意：进入页 rpGain 仅为显示文本，不进入 meta.points（已核实）。
 *
 * 2026-09-15 改版：**不再手抄公式 / 数据表**，改为经 `_engine_loader` 真加载
 *   `js/data.js` + `js/engine.js`，直接调用 `Engine.settlePoints`（内部即 earnPoints）。
 *
 * 为什么改（AGENTS.md #59「第四大 bug 类」）：旧版本手抄的 earnPoints 用的是**已被推翻的公式** ——
 *   · 渡劫分写 `Math.floor(state.broken / 3)`（s.broken 是突破次数，应为 `s.tribPassed * 3`）；
 *   · 结尾又加了一次 `jie * 2` 平加 —— 该平加**早已删除**，现为比例形式 `round(base×jie×0.05)`；
 *   · 且漏了 `deathPts` / `advPts` / `endMul`。
 *   → 旧版输出的"本世合计"整列不可用。现在公式全部出自引擎。
 *
 * 运行： node tools/reinc_points.js
 */
'use strict';
const { load } = require('./_engine_loader');

const G = load();
const ENG = G.Engine;
const REINC_TALENT = G.REINC_TALENT || [];
const INIT_POINTS = G.INIT_POINTS;

function blankMeta() { return { lives: 1, earnedTotal: 0, achievements: {}, reinc: {}, destinySeen: {} }; }

/* ---------- 场景：玩家在各境界"本世终结"时结算 ---------- */
const SCEN = [
  { tag: '炼气(初陨)', realm: '炼气', idx: 0,  trib: 0, death: 0, cleared: [],                          end: '寿元耗尽' },
  { tag: '筑基(陨)',   realm: '筑基', idx: 3,  trib: 0, death: 1, cleared: ['huang'],                   end: '寿元耗尽' },
  { tag: '金丹(陨)',   realm: '金丹', idx: 6,  trib: 1, death: 2, cleared: ['huang', 'xuan'],           end: '寿元耗尽' },
  { tag: '元婴(陨)',   realm: '元婴', idx: 9,  trib: 2, death: 4, cleared: ['huang', 'xuan', 'di'],     end: '寿元耗尽' },
  { tag: '飞升',       realm: '仙',   idx: 15, trib: 3, death: 4, cleared: ['huang', 'xuan', 'di', 'tian', 'xian'], end: '飞升' },
];

function mkState(row) {
  const s = ENG.startLife(row.tag);
  s.realm = row.realm; s.idx = row.idx;
  s.tribPassed = row.trib; s.deathPassed = row.death;
  s.flags = s.flags || {};
  const ac = {}; row.cleared.forEach(k => { ac[k] = 1; }); s.flags.advClear = ac;
  s.endReason = row.end; s.jie = 0;
  return s;
}

console.log('========== 结算依据（直调 Engine.settlePoints / earnPoints）==========');
console.log('本世轮回点 = round( base × endMul × (1 + jie×0.2) ) + round( base × jie × K )，K=0.05');
console.log('  base   = 境界档 + 渡劫分 + 死劫分 + 秘境探索分 + 本世新增成就分');
console.log('  境界档 = 炼气2 / 筑基4 / 金丹7 / 元婴11 / 仙25');
console.log('  渡劫分 = min(10, 渡劫次数×3)   ← s.tribPassed，不是 s.broken');
console.log('  死劫分 = 当世通过死劫数 × 2');
console.log('  endMul = 飞升/仙 1.2、打破轮回 1.5，其余 1.0\n');

console.log('========== A. 本世结算明细（jie=0；成就按引擎实际判定）==========');
console.log('场景'.padEnd(12) + '| 境界档 | 渡劫 | 死劫 | 秘境 | 成就 | endMul | 本世合计');
SCEN.forEach(row => {
  const r = ENG.settlePoints(mkState(row), blankMeta());
  const b = r.breakdown;
  const mul = (row.end === '飞升' || row.realm === '仙') ? 1.2 : 1.0;
  console.log(
    row.tag.padEnd(10) + ' | ' +
    String(b.realm).padStart(5) + '  | ' + String(b.trib).padStart(3) + '  | ' +
    String(b.death).padStart(3) + '  | ' + String(b.explore).padStart(3) + '  | ' +
    String(b.ach).padStart(3) + '  | ' + String(mul).padStart(5) + '  | ' + String(r.total).padStart(5)
  );
});

console.log('\n========== B. 含劫数倍率（jie=0 / 3 / 6 / 9）==========');
console.log('场景'.padEnd(12) + '| jie0 | jie3 | jie6 | jie9');
SCEN.forEach(row => {
  const v = [0, 3, 6, 9].map(j => {
    const s = mkState(row); s.jie = j;
    ENG.earnPoints(s, blankMeta());
    return s.earnedPoints || 0;
  });
  console.log(row.tag.padEnd(10) + ' | ' + v.map(x => String(x).padStart(4)).join(' | '));
});

console.log('\n========== C. 玩家初始累积红利示例 ==========');
const START = 100;
console.log('起始 meta.points = ' + START + '（跨周目累积红利）');
console.log('场景'.padEnd(12) + '| 本世赚 | 结算后累计(' + START + '+本世)');
SCEN.forEach(row => {
  const e = ENG.settlePoints(mkState(row), blankMeta()).total;
  console.log(row.tag.padEnd(10) + ' | ' + String(e).padStart(5) + '  | ' + String(START + e).padStart(6));
});

console.log('\n========== D. ' + START + '点红利 → 每世开荒池（REINC_TALENT 直读 data.js）==========');
console.log('REINC_TALENT: ' + REINC_TALENT.map(t => 'Lv' + t.lv + '(bonus' + t.bonus + ',cost' + t.cost + ')').join(' '));
function openPoolFrom(points) {
  let spent = 0, lv = 1;
  for (let i = 1; i < REINC_TALENT.length; i++) {
    if (points >= spent + REINC_TALENT[i].cost) { spent += REINC_TALENT[i].cost; lv = REINC_TALENT[i].lv; }
    else break;
  }
  const bonus = (REINC_TALENT.filter(t => t.lv === lv)[0] || { bonus: 0 }).bonus;
  return { spent, lv, bonus, openPool: INIT_POINTS + bonus, remain: points - spent };
}
const rt = openPoolFrom(START);
console.log('投入 ' + START + ' 轮回点 → 轮回阁天赋 Lv' + rt.lv + '（耗 ' + rt.spent + '，余 ' + rt.remain + '）');
console.log('每世开荒池 = INIT_POINTS(' + INIT_POINTS + ') + 天赋bonus(' + rt.bonus + ') = ' + rt.openPool + ' 点可分配六维');
console.log('对比：零红利玩家开荒池 = ' + INIT_POINTS + ' 点；红利玩家多 +' + (rt.openPool - INIT_POINTS) + ' 点/每世。');
console.log('\n注: 若"初始100点"指的是【每世开荒池=100】而非 meta.points 余额，则需改 data.js INIT_POINTS 与 REINC_TALENT 上限，属设计调整，可另行处理。');
