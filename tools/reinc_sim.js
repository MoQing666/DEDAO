/* DEDAO 轮回天赋加满测算 + 高劫最终加成（收敛版）
 * ------------------------------------------------------------------
 * 2026-09-15 改版：**不再手抄公式 / 数据表**，改为经 `_engine_loader` 真加载
 *   `js/data.js` + `js/engine.js`，直接调用 `Engine.settlePoints` / `Engine.earnPoints`。
 *
 * 为什么改（AGENTS.md #59「第四大 bug 类」）：
 *   · 旧版本手抄了 `REINCARNATION`，六维 max 仍写 5（实际已 9）→ sixTotal 算成 360（实为 1080）；
 *   · 旧版本手抄 earnPoints，用 `floor(s.broken/3)` 当渡劫分（s.broken 是突破次数，应为
 *     `s.tribPassed*3`）且漏 `endMul` → 各场景 jie0 整列偏低。
 *   现在公式与数据表都来自引擎，引擎一改这里自动跟随。
 *
 * 口径说明（两种「成就分」）：
 *   A. **文档口径**（`DEDAO_轮回结算重做_方案.md` §7.2/§九）：成就分是策划给定的保守值
 *      （2/4/9/14/48）。本脚本用「预置 meta 成就集」把其余已达成成就标记为『早先已得』，
 *      从而让引擎只把指定那几条算作『本世新增』→ 复现文档数字，且公式仍出自引擎。
 *   B. **真引擎口径**：同进度下由 `Engine.achDefs` 实际判定的完整成就集 → 分数更高。
 *   两栏并列输出，供平衡参考（文档表 = 保守估计）。
 *
 * 运行： node tools/reinc_sim.js
 */
'use strict';
const { load } = require('./_engine_loader');

const G = load();
const ENG = G.Engine;
const REINC = G.REINCARNATION;
const ACH = G.ACHIEVEMENTS;

const SIX = ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'];
/* 开荒「三 · 经历」（INIT_EXP）：固定点数、二值选择；早夭为负值（增加预算） */
const INIT_EXP_SIM = G.INIT_EXP || [];

/* 第 n 级花费 = r.cost × n；满级成本 = r.cost × max(max+1)/2（ui.js 实装口径） */
function talentMaxCost(r) { return r.cost * r.max * (r.max + 1) / 2; }

console.log('========== 1. 轮回天赋(REINCARNATION)各满级成本 ==========');
console.log('（数据表直读 js/data.js，共 ' + REINC.length + ' 条；六维 max = ' +
  REINC.filter(r => SIX.indexOf(r.id) >= 0).map(r => r.max).join('/') + '）');
let sixTotal = 0, allTotal = 0;
REINC.forEach(r => {
  const c = talentMaxCost(r);
  allTotal += c;
  if (SIX.indexOf(r.id) >= 0) sixTotal += c;
  console.log((r.name + '(' + r.id + ')').padEnd(16) + ' cost' + r.cost + '×max' + r.max + ' → 满级 ' + String(c) + ' 点');
});
console.log('---');
console.log('六维核心全满 = ' + sixTotal + ' 点');
console.log('全部天赋拉满 = ' + allTotal + ' 点');
console.log('验证：定心(dao)' + talentMaxCost(REINC.filter(r => r.id === 'dao')[0]) +
  ' + 慧根(wu)' + talentMaxCost(REINC.filter(r => r.id === 'wu')[0]) + ' = ' +
  (talentMaxCost(REINC.filter(r => r.id === 'dao')[0]) + talentMaxCost(REINC.filter(r => r.id === 'wu')[0])) + ' 点');

/* ---------- 场景：同进度、不同"本世新增成就"口径 ---------- */
function blankMeta() { return { lives: 1, earnedTotal: 0, achievements: {}, reinc: {}, destinySeen: {} }; }

function mkState(tag, realm, idx, tribPassed, deathPassed, cleared, endReason) {
  const s = ENG.startLife(tag);           // 走 startLife，保证状态形状与游戏一致
  s.realm = realm; s.idx = idx;
  s.tribPassed = tribPassed; s.deathPassed = deathPassed;
  s.flags = s.flags || {};
  const ac = {}; cleared.forEach(k => { ac[k] = 1; }); s.flags.advClear = ac;
  s.endReason = endReason; s.jie = 0;
  return s;
}

/* 文档口径：只让 keep 里的成就算作"本世新增"，其余已达成的一律预置为早先已得 */
function settleKeep(s, keep) {
  const meta = blankMeta();
  const satisfied = ENG.achDefs(s, meta) || {};
  Object.keys(satisfied).forEach(id => { if (satisfied[id] && keep.indexOf(id) < 0) meta.achievements[id] = 1; });
  return ENG.settlePoints(s, meta);
}
/* 真引擎口径：完整成就判定 */
function settleAll(s) { return ENG.settlePoints(s, blankMeta()); }

const SCEN = [
  { tag: '炼气初陨', realm: '炼气', idx: 0,  trib: 0, death: 0, cleared: ['huang'],                                  end: '寿元耗尽', keep: ['chu_tan', 'shou_zhong'] },
  { tag: '筑基陨',   realm: '筑基', idx: 3,  trib: 0, death: 1, cleared: ['huang', 'xuan'],                        end: '寿元耗尽', keep: ['shou_zhuji', 'chu_tan', 'shou_zhong'] },
  { tag: '金丹陨',   realm: '金丹', idx: 6,  trib: 1, death: 2, cleared: ['huang', 'xuan', 'di'],                   end: '寿元耗尽', keep: ['shou_zhuji', 'shou_jiejin', 'dongtian'] },
  { tag: '元婴陨',   realm: '元婴', idx: 9,  trib: 2, death: 4, cleared: ['huang', 'xuan', 'di', 'tian'],            end: '寿元耗尽', keep: ['shou_zhuji', 'shou_jiejin', 'shou_yuanying', 'moya'] },
  { tag: '飞升',     realm: '仙',   idx: 15, trib: 3, death: 4, cleared: ['huang', 'xuan', 'di', 'tian', 'xian'],   end: '飞升',     keep: ['shou_zhuji', 'shou_jiejin', 'shou_yuanying', 'feisheng', 'sanjie', 'chu_tan', 'feizhai', 'daheishan', 'dongtian', 'quanjing', 'chu_dao', 'churu', 'san_xiu'] },
];

function jieSweep(s) {
  const out = [];
  [0, 3, 6, 9].forEach(j => { const t = Object.assign({}, s, { jie: j, flags: s.flags }); ENG.earnPoints(t, blankMeta()); out.push(t.earnedPoints || 0); });
  return out;
}
/* 文档口径按"预置 meta"结算，无法直接复用于 jie 扫描 → 逐 jie 重建 */
function jieSweepKeep(row) {
  return [0, 3, 6, 9].map(j => {
    const s = mkState(row.tag, row.realm, row.idx, row.trib, row.death, row.cleared, row.end);
    s.jie = j;
    return settleKeep(s, row.keep).total;
  });
}

console.log('\n========== 2. 各场景单局收益 · A 文档口径（成就分 = 2/4/9/14/48 的保守值） ==========');
console.log('场景'.padEnd(10) + '| jie0'.padStart(5) + ' | jie3'.padStart(5) + ' | jie6'.padStart(5) + ' | jie9'.padStart(5) + ' | 成就分 | 明细(realm/trib/death/explore/ach)');
const rowA = {};
SCEN.forEach(row => {
  const v = jieSweepKeep(row);
  const s0 = mkState(row.tag, row.realm, row.idx, row.trib, row.death, row.cleared, row.end);
  const b = settleKeep(s0, row.keep).breakdown;
  rowA[row.tag] = v[0];
  console.log(row.tag.padEnd(8) + ' | ' + v.map(x => String(x).padStart(5)).join(' | ') + ' | ' +
    String(b.ach).padStart(5) + '  | ' + b.realm + '/' + b.trib + '/' + b.death + '/' + b.explore + '/' + b.ach);
});

console.log('\n========== 3. 各场景单局收益 · B 真引擎口径（完整成就判定，会更高） ==========');
console.log('场景'.padEnd(10) + '| jie0'.padStart(5) + ' | jie3'.padStart(5) + ' | jie6'.padStart(5) + ' | jie9'.padStart(5) + ' | 成就分 | 明细(realm/trib/death/explore/ach)');
const rowB = {};
SCEN.forEach(row => {
  const s0 = mkState(row.tag, row.realm, row.idx, row.trib, row.death, row.cleared, row.end);
  const r0 = settleAll(s0);
  const v = jieSweep(mkState(row.tag, row.realm, row.idx, row.trib, row.death, row.cleared, row.end));
  rowB[row.tag] = v[0];
  console.log(row.tag.padEnd(8) + ' | ' + v.map(x => String(x).padStart(5)).join(' | ') + ' | ' +
    String(r0.breakdown.ach).padStart(5) + '  | ' + r0.breakdown.realm + '/' + r0.breakdown.trib + '/' + r0.breakdown.death + '/' + r0.breakdown.explore + '/' + r0.breakdown.ach);
});
console.log('（A/B 差异仅来自"本世新增成就"口径：A 是文档表用的保守成就集，B 是引擎实际会发的全部成就）');

console.log('\n========== 4. 加满所需局数（A 口径 / B 口径对照） ==========');
console.log('--- 目标A 六维全满(' + sixTotal + '点) | 目标B 全部天赋全满(' + allTotal + '点) ---');
console.log('场景'.padEnd(10) + '|A: jie0_六维|A: jie9_六维|A: jie0_全天赋|A: jie9_全天赋|B: jie0_六维|B: jie0_全天赋');
SCEN.forEach(row => {
  const a0 = rowA[row.tag], a9 = jieSweepKeep(row)[3], b0 = rowB[row.tag];
  console.log(row.tag.padEnd(8) + ' | ' +
    String(Math.ceil(sixTotal / a0)).padStart(10) + ' | ' + String(Math.ceil(sixTotal / a9)).padStart(10) + ' | ' +
    String(Math.ceil(allTotal / a0)).padStart(11) + ' | ' + String(Math.ceil(allTotal / a9)).padStart(11) + ' | ' +
    String(Math.ceil(sixTotal / b0)).padStart(10) + ' | ' + String(Math.ceil(allTotal / b0)).padStart(11));
});

console.log('\n========== 5. 高劫膨胀收敛性（K=0.05 比例加成；原 flat jie×2 已删） ==========');
let worst = 0, worstTag = '';
SCEN.forEach(row => {
  const v = jieSweepKeep(row);
  const r = v[3] / v[0];
  if (r > worst) { worst = r; worstTag = row.tag; }
  console.log(row.tag.padEnd(8) + ' jie9/jie0 = ' + r.toFixed(2) + 'x');
});
console.log('最坏倍数 = ' + worstTag + ' ' + worst.toFixed(2) + 'x（设计目标 ≤ 4x）');
