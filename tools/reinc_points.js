/* DEDAO 轮回点结算计算器 —— 忠实复刻 engine.js earnPoints / settlePoints / endLife 逻辑
   用途：核算"当前结算的轮回点数量"与结算依据，纳入玩家跨周目累积红利(初始 meta.points)。
   注意：进入页 rpGain 仅为显示文本，不进入 meta.points（已核实）。 */

const REALM_TIER = { 炼气: 2, 筑基: 4, 金丹: 7, 元婴: 11, 仙: 25 };
const ACH_PTS = { shou_zhuji:2, shou_jiejin:3, shou_yuanying:4, feisheng:10, daolu:2, shou_zhong:1, binjie_3:3, ai_renzi:2 };
// 注：mo_yuan(镇魔渊,8) 在 ACHIEVEMENTS 中定义但不在 checkAchievements 的 defs 里 → 实际永不可得，这里不计入。

// 复刻 engine.js earnPoints(s, meta)
function earnPoints(state, prevAch) {
  let pts = REALM_TIER[state.realm] || 2;
  pts += Math.min(10, Math.floor(state.broken / 3));
  // checkAchievements 内判定
  const defs = {
    shou_zhuji:   state.broken >= 1 || state.idx >= 3,
    shou_jiejin:  state.idx >= 6,
    shou_yuanying:state.idx >= 9,
    feisheng:     state.idx >= 15 || state.endReason === '飞升',
    daolu:        !!state.daoLu,
    shou_zhong:   state.endReason === '寿元耗尽',
    binjie_3:     state.broken >= 3,
    ai_renzi:     state.age >= 200
  };
  let achPts = 0, newAch = [];
  for (const id of Object.keys(defs)) {
    if (defs[id] && !(prevAch && prevAch[id])) { achPts += (ACH_PTS[id] || 0); newAch.push(id); }
  }
  pts += achPts;
  const jie = state.jie || 0;
  pts = Math.round(pts * (1 + jie * 0.2)) + jie * 2;
  return { earned: pts, newAch, achPts };
}

// 结算明细（UI 展示用，注意 age/spec 行不进 total —— 与 earnPoints 一致：total 仅含 realm+break+ach，再叠 jie）
function settleBreakdown(state, prevAch) {
  const r = earnPoints(state, prevAch);
  const realmPts = REALM_TIER[state.realm] || 2;
  const breakPts = Math.min(10, Math.floor(state.broken / 3));
  const agePts = state.age >= 200 ? 2 : 0;
  const specPts = state.endReason === '飞升' ? 10 : 0;
  // 注意：earnPoints 的 achPts 已含在 r.earned 的 base 中；下列合计=earnPoints 的 base 部分（不含 jie 倍率）
  const baseSum = realmPts + breakPts + r.achPts; // = r.earned 在 jie 倍率前的部分（age/spec 不计入，属 UI 装饰）
  return { realmPts, breakPts, agePts, specPts, achPts: r.achPts, baseSum, total: r.earned, newAch: r.newAch };
}

// 轮回阁天赋：用 N 点轮回点能升到的等级 + 对应每世开荒池大小（开荒池 = INIT_POINTS(10) + bonus）
const REINC_TALENT = [ {lv:1,bonus:4,cost:0},{lv:2,bonus:8,cost:10},{lv:3,bonus:12,cost:20},{lv:4,bonus:16,cost:40},{lv:5,bonus:20,cost:80} ];
function reincTalentFrom(points) {
  let spent = 0, lv = 1;
  for (let i = 1; i < REINC_TALENT.length; i++) {
    if (points >= spent + REINC_TALENT[i].cost) { spent += REINC_TALENT[i].cost; lv = REINC_TALENT[i].lv; }
    else break;
  }
  const bonus = REINC_TALENT.find(t => t.lv === lv).bonus;
  return { spent, lv, bonus, openPool: 10 + bonus, remain: points - spent };
}

// ============ 场景：玩家在各境界"本世终结"时结算 ============
const SCEN = [
  { tag:'炼气(初陨)', realm:'炼气', idx:0,  broken:0, age:80,  endReason:'寿元耗尽', jie:0 },
  { tag:'筑基(陨)',   realm:'筑基', idx:3,  broken:1, age:120, endReason:'寿元耗尽', jie:0 },
  { tag:'金丹(陨)',   realm:'金丹', idx:6,  broken:3, age:160, endReason:'寿元耗尽', jie:0 },
  { tag:'元婴(陨)',   realm:'元婴', idx:9,  broken:5, age:200, endReason:'寿元耗尽', jie:0 },
  { tag:'飞升',       realm:'仙',   idx:15, broken:9, age:250, endReason:'飞升',     jie:0 },
];

console.log('========== 结算依据（engine.js earnPoints 复刻）==========');
console.log('本世轮回点 = round( (境界档 + min(10,⌊渡劫/3⌋) + 新成就pts) × (1 + jie×0.2) ) + jie×2');
console.log('境界档: 炼气2 / 筑基4 / 金丹7 / 元婴11 / 仙25');
console.log('新成就: 破境筑基+2 金丹大道+3 元婴出窍+4 羽化登仙+10 道侣+2 寿终+1 三劫+3 双甲子+2');
console.log('注: 结算UI的"长寿+2/特殊壮举+10(飞升)"行仅为展示, 不计入 total(earnPoints 未加)。\n');

console.log('========== A. 本世结算（首世, 无历史成就, jie=0）==========');
console.log('场景'.padEnd(12)+'| 境界档 | 渡劫/3 | 新成就 | 本世合计');
SCEN.forEach(s => {
  const b = settleBreakdown(s, {});
  console.log(
    s.tag.padEnd(10)+' | '+
    String(b.realmPts).padStart(4)+'   | '+
    String(b.breakPts).padStart(4)+'   | '+
    String(b.achPts).padStart(4)+'   | '+
    String(b.total).padStart(4)
  );
});

console.log('\n========== B. 含劫数倍率（jie=0 / 3 / 9, 首世无历史成就）==========');
console.log('场景'.padEnd(12)+'| jie0 | jie3 | jie9 (倍率 1.0x/1.6x/2.8x + 平加 jie×2)');
SCEN.forEach(s => {
  const e0 = earnPoints({...s, jie:0}, {}).earned;
  const e3 = earnPoints({...s, jie:3}, {}).earned;
  const e9 = earnPoints({...s, jie:9}, {}).earned;
  console.log(s.tag.padEnd(10)+' | '+String(e0).padStart(3)+'  | '+String(e3).padStart(3)+'  | '+String(e9).padStart(3));
});

console.log('\n========== C. 玩家初始累积红利 = 100 轮回点（你说的"初始100点"）==========');
const START = 100;
console.log('起始 meta.points = '+START+'（跨周目累积红利）');
console.log('场景'.padEnd(12)+'| 本世赚 | 结算后累计(100+本世)');
SCEN.forEach(s => {
  const e = earnPoints(s, {}).earned;
  console.log(s.tag.padEnd(10)+' | '+String(e).padStart(4)+'  | '+String(START+e).padStart(4));
});

console.log('\n========== D. 100点红利 → 属性累积红利（轮回阁天赋 → 每世开荒池）==========');
const rt = reincTalentFrom(START);
console.log('投入 '+START+' 轮回点 → 轮回阁天赋 Lv'+rt.lv+'（耗 '+rt.spent+'，余 '+rt.remain+'）');
console.log('每世开荒池 = INIT_POINTS(10) + 天赋bonus('+rt.bonus+') = '+rt.openPool+' 点可分配六维');
console.log('对比: 零红利玩家开荒池 = 10 点；红利玩家多 +'+ (rt.openPool-10) +' 点/每世（即"轮回属性累积红利"的落点）');
console.log('\n注: 若"初始100点"指的是【每世开荒池=100】而非 meta.points 余额，则需改 data.js INIT_POINTS(10) 与 REINC_TALENT 上限(现最高 bonus 20→池30)，属设计调整，可另行处理。');
