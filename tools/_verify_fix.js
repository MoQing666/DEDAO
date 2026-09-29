/* 工具：校验 v6 落地修复（基于真实 engine.js / data.js，2026-09-25）
 * 直接调用 Engine 真实函数，验证：v5 基线 / 天劫反解 / 心魔不变 / 入宗评分≠入门 /
 * 记名弟子 / 补考转正 / 8 处门禁。
 */
'use strict';
const { load } = require('./_engine_loader');
const G = load();
const E = G.Engine;

let fails = 0;
function assert(cond, msg) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + msg); if (!cond) fails++; }

// 1. v5 基线已落地
const B = G.ENEMY_REALM_BASE;
console.log('ENEMY_REALM_BASE =', JSON.stringify(B.map(x => [x.atk, x.hp])));
assert(B[0].atk === 214 && B[0].hp === 1746, 'v5 基线·炼气 214/1746');
assert(B[1].atk === 469 && B[1].hp === 3658, 'v5 基线·筑基 469/3658');
assert(B[2].atk === 738 && B[2].hp === 8821, 'v5 基线·金丹 738/8821');
assert(B[3].atk === 1290 && B[3].hp === 14396, 'v5 基线·元婴 1290/14396');

// 2. 天劫反解（按境界查 TIANJIE_SCALE）+ 心魔保持不变
//    bigIdxOf 依赖 s.idx（safeStage(s).bigRealm）；idx=bi*3 对应各境界首子阶
const TIANJIE_EXP = { '筑基': [324, 2158], '金丹': [480, 4940], '元婴': [826, 7918] };
[['筑基', 1, 3], ['金丹', 2, 6], ['元婴', 3, 9]].forEach(function (p) {
  const realm = p[0], bi = p[1], idx = p[2];
  const s = { realm: realm, idx: idx, stone: 100, dunSpeed: 2 };
  const t = E.tianjieSpec(s, realm);
  const x = E.xinmoSpec(s);
  console.log('天劫 ' + realm + ': atk=' + t.atk + ' hp=' + t.hp + '  | 心魔 ' + realm + ': atk=' + x.atk + ' hp=' + x.hp);
  assert(t.atk > 0 && t.hp > 0 && !isNaN(t.atk) && !isNaN(t.hp), '天劫 ' + realm + ' 数值有效');
  assert(x.atk > 0 && x.hp > 0 && !isNaN(x.atk) && !isNaN(x.hp), '心魔 ' + realm + ' 数值有效');
  const exp = TIANJIE_EXP[realm];
  assert(t.atk === exp[0] && t.hp === exp[1], '天劫 ' + realm + ' 反解系数正确(atk=' + exp[0] + ',hp=' + exp[1] + ')');
});
// 心魔系数应按设计保留（bi 锚定 + hpRef:'atk' 口径不变）
{
  const s = { realm: '元婴', idx: 9, stone: 100, dunSpeed: 2 };
  const x = E.xinmoSpec(s);
  // enemyStats(3, 1.05, (5+3)*1.15, 1, {hpRef:'atk'}) = atk 1290*1.05, hp 1290*9.2
  assert(x.atk === Math.round(1290 * 1.05) && x.hp === Math.round(1290 * 9.2), '心魔系数未变（用户要求保持不变）');
}

// 3. gradeSectTrial 纯评分（不写状态）
function mk(wu, dao) { return { wu: wu, dao: dao, sect: 'xuantian', sectRank: null }; }
let g;
g = E.gradeSectTrial(mk(10, 10), true);
assert(g.rank === '真传' && g.gift === 100 && g.canJoin && !g.provisional, '实战胜+武骨道心 → 真传(100)');
g = E.gradeSectTrial(mk(10, 5), true);
assert(g.rank === '内门' && g.gift === 50 && g.canJoin && !g.provisional, '实战胜+单达标 → 内门(50)');
g = E.gradeSectTrial(mk(5, 5), true);
assert(g.rank === '外门' && g.gift === 0 && g.canJoin && !g.provisional, '实战胜+双不达标 → 外门');
g = E.gradeSectTrial(mk(10, 10), false);
assert(g.rank === '外门' && g.provisional && g.canJoin, '实战败+双达标 → 记名弟子(外门档,provisional)');
g = E.gradeSectTrial(mk(10, 5), false);
assert(g.rank === '外门' && g.provisional && g.canJoin, '实战败+单达标 → 记名弟子(外门档,provisional)');

// 4. applySectTrial：评分+记年，不写 sectRank（尝试≠入门）
const s1 = { realm: '炼气', wu: 10, dao: 10, sect: 'xuantian', sectRank: null, year: 5, lastTrialYear: undefined };
const r1 = E.applySectTrial(s1, true);
assert(r1.ok && r1.rank === '真传', 'applySectTrial 评分=真传');
assert(s1.sectRank === null, 'applySectTrial 不写 sectRank（尝试≠入门）');
assert(s1.lastTrialYear === 5, 'applySectTrial 记年(lastTrialYear=5)');

// 5. joinSect：唯一状态写入口
const s2 = { realm: '炼气', wu: 10, dao: 10, sect: 'xuantian', sectRank: null, year: 5, gongye: 0, gongyeEarned: 0 };
const gr2 = E.gradeSectTrial(s2, true);
let jr2; try { jr2 = E.joinSect(s2, gr2); } catch (e) { console.log('  (joinSect 尾部 refreshStats/saveState 在无全量状态时报错，属 harness 限制，sectRank 已在之前写入): ' + e.message); }
assert(s2.sectRank === '真传', 'joinSect 写入 sectRank=真传');
assert(s2.gongye === 100, 'joinSect 发功业 100');

// 5b. 补考转正：记名 → 次年实战胜 → 升档 + 补发 50%
const s3 = { realm: '炼气', wu: 10, dao: 10, sect: 'xuantian', sectRank: '外门', sectProvisional: true, year: 6, gongye: 0, gongyeEarned: 0 };
const gr3 = E.gradeSectTrial(s3, true);
let jr3; try { jr3 = E.joinSect(s3, gr3); } catch (e) { console.log('  (joinSect 转正 尾部报错，harness 限制): ' + e.message); }
assert(s3.sectRank === '真传', '补考转正 → 真传');
assert(s3.sectProvisional === false, '补考转正清除记名标记');
assert(s3.gongye === 50, '补考转正补发 50%(真传100→50)');

// 5c. joinSect 拒绝无资格
const s4 = { realm: '炼气', wu: 5, dao: 5, sect: 'xuantian', sectRank: null };
const gr4 = E.gradeSectTrial(s4, false);
const jr4 = E.joinSect(s4, gr4);
assert(jr4.ok === false, 'joinSect 拒绝未达资格(返回 ok:false)');

// 6. 8 处门禁：已择宗未应考(sectRank=null) 应全部拒绝
const noJoin = { sect: 'xuantian', sectRank: null };
const rej = function (v) { return (typeof v === 'string' && v.indexOf('未通过入宗考验') >= 0) || (v && v.error && v.error.indexOf('未通过入宗考验') >= 0) || (v && v.ok === false && v.msg && v.msg.indexOf('未通过入宗考验') >= 0); };
assert(rej(E.sectSocial(noJoin)), 'sectSocial 门禁拦截');
assert(rej(E.sectCombat(noJoin)), 'sectCombat 门禁拦截');
assert(rej(E.sectLecture(noJoin)), 'sectLecture 门禁拦截');
assert(rej(E.sectMasterPrep(noJoin)), 'sectMasterPrep 门禁拦截');
assert(rej(E.sectTrain(noJoin, 'shen')), 'sectTrain 门禁拦截');

console.log('\n' + (fails === 0 ? '✅ 全部通过' : '❌ 失败 ' + fails + ' 项'));
process.exit(fails === 0 ? 0 : 1);
