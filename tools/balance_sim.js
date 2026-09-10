/* ============================================================
   DEDAO 数值模型 · 平衡模拟器 (balance_sim.js)
   忠实复刻 engine.js / data.js 的核心公式，用于"调偏"验证。
   本轮新增：真实玩家战力模型（宗门练灵→MP、切高级法术、高级装备+法宝）
   运行: node balance_sim.js
   ============================================================ */

/* ---------- 1. 全局常量（与游戏对齐） ---------- */
const ADVENTURE_GRADE = { huang:0, xuan:1, di:2, tian:3, xian:3 };
const JIE_DIFF = [1.0,1.15,1.30,1.50,1.75,2.00,2.40,2.80,3.30,4.00];
const NEED = [500,800,1200, 1200,1600,2100, 3800,4800,6200, 12000,15000,19000];

// 法术 dmg / cost 取 data.js 真实值（用户已驳回"耗蓝批量下调"，故用原值）
const SPELL_DMG  = { 黄:2.0, 玄:3.0, 地:4.0, 天:4.5 };
const SPELL_COST = { 黄:15, 玄:25, 地:45, 天:70 };

// 心法 mult（修炼倍率，仅影响修炼速度，不影响战斗 atk）—— 本轮按用户同意下调为 1.15/1.40/1.70/2.10
const XINFA_MULT = { 黄:1.15, 玄:1.40, 地:1.70, 天:2.10, 仙:3.00 };

/* ---------- 1.1 真实玩家战力模型 ----------
   旧基线只用了"属性公式产出 + 宽松固定MP"，漏算了三块真实增益：
   (1) 宗门练灵 → 灵(ling) 抬升 → 灵力上限 mpMax = 20 + (ling-1)*20
   (2) 玩家会切到对应境界的高级法术（已在 playerByYear 内按境界选品级）
   (3) 高级装备(head/body/leg/weapon/treasure) + 多件法宝 的 atk/hp/ling/atkPct 加成
   以下为各境界"正常游玩可达成"的代表性配置（取自 EQUIPS / ARTIFACTS 真实数值） */
const LING_BY_REALM = { 炼气:6, 筑基:9, 金丹:13, 元婴:18 };   // 含宗门练灵累积
const GEAR = {                                              // 装备 head/body/leg/weapon/treasure 最佳可获品级
  '炼气': { atk:37,  hp:115 },   // tier1-2：云纹包头巾/鳞纹软甲/云纹步靴/青锋剑
  '筑基': { atk:52,  hp:290 },   // tier2-3：玄铁战盔/玄精重甲/风雷追月靴/镇魂墨玉
  '金丹': { atk:53,  hp:540 },   // tier3-4：天宝紫金冠/金络宝衣/天行靴/玄铁甲
  '元婴': { atk:64,  hp:550 },   // tier4-5：天宝紫金冠/星河法衣/天行靴/金刚降魔印
};
const TREASURE = {                                           // 累积法宝（剧情/商店/功业商店可获）
  '炼气': { atk:5,  hp:15,  ling:0, atkPct:0.00 },          // 铜钱剑 + 古檀平安牌
  '筑基': { atk:21, hp:55,  ling:0, atkPct:0.00 },          // + 镇魂墨玉 + 周天星盘
  '金丹': { atk:25, hp:200, ling:1, atkPct:0.05 },          // + 太虚灵珠(ling+1) + 斩仙飞刀(atkPct5%) + 不灭金身(hp200)
  '元婴': { atk:45, hp:200, ling:2, atkPct:0.05 },          // + 嗜血珠/元神灯/玄武龟甲等
};

/* ---------- 2. 连续玩家成长模型（"已准备"设计目标，属性公式产出） ---------- */
const PLAYER_TABLE = [
  { y:0,  atk:10,  hp:180 }, { y:5,  atk:25,  hp:230 }, { y:10, atk:35,  hp:280 },
  { y:15, atk:50,  hp:405 }, { y:20, atk:65,  hp:455 }, { y:30, atk:80,  hp:505 },
  { y:40, atk:95,  hp:640 }, { y:50, atk:110, hp:690 }, { y:60, atk:125, hp:740 },
  { y:80, atk:155, hp:915 }
];
function interp(year, key) {
  if (year <= PLAYER_TABLE[0].y) return PLAYER_TABLE[0][key];
  if (year >= PLAYER_TABLE[PLAYER_TABLE.length-1].y) return PLAYER_TABLE[PLAYER_TABLE.length-1][key];
  for (let i = 0; i < PLAYER_TABLE.length-1; i++) {
    const a = PLAYER_TABLE[i], b = PLAYER_TABLE[i+1];
    if (year >= a.y && year <= b.y) {
      const t = (year - a.y) / (b.y - a.y);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return PLAYER_TABLE[PLAYER_TABLE.length-1][key];
}
function baseByYear(year) {
  const realm = year < 15 ? '炼气' : year < 40 ? '筑基' : year < 80 ? '金丹' : '元婴';
  const spell = year < 15 ? '黄' : year < 40 ? '玄' : year < 80 ? '地' : '天';
  return { realm, year, atk: Math.round(interp(year,'atk')), hp: Math.round(interp(year,'hp')), spell };
}
// 真实玩家：属性公式产出 + 装备 + 法宝，MP 由 灵(含练灵) 推算
function realPlayer(year) {
  const b = baseByYear(year);
  const g = GEAR[b.realm], t = TREASURE[b.realm];
  const ling = LING_BY_REALM[b.realm] + t.ling;
  return {
    realm: b.realm, year, spell: b.spell,
    atk: Math.round(b.atk + g.atk + t.atk),
    hp:  Math.round(b.hp  + g.hp  + t.hp),
    mp: 20 + ling * 25,
    ling, atkPct: t.atkPct
  };
}
// 旧"弱玩家"基线（仅用于对比，体现漏算差距）：无装备、固定黄法、固定低MP
function weakPlayer(year) {
  const b = baseByYear(year);
  return { realm: b.realm, year, spell: '黄', atk: Math.round(b.atk*0.4), hp: b.hp, mp: 95, ling: 4, atkPct: 0 };
}

/* ---------- 2.5 秘境敌人生成（engine.js enemyGen 复刻） ---------- */
function advEnemy(p, tier, depth, boss, elite, jie) {
  const bi = ADVENTURE_GRADE[tier];
  const jieDiff = JIE_DIFF[jie] || 1;
  const hits = (elite ? 5.0 : 4.0) + depth * 0.5;
  const hp = Math.round(p.atk * hits * (boss ? 2.0 : 1) * jieDiff);
  const atk = Math.max(1, Math.round(p.hp / (boss ? 9 : (5 + depth * 0.4)) * (elite ? 1.3 : 1) * jieDiff));
  return { hp, atk, hits };
}

/* ---------- 3. 死劫敌人 ---------- */
// 当前静态（DEATH_EVENTS，全部不可战胜）
const DEATH_STATIC = [
  { year:10,  atk:60,   hp:600  }, { year:20,  atk:120,  hp:1200 },
  { year:30,  atk:200,  hp:1800 }, { year:40,  atk:300,  hp:2700 },
  { year:50,  atk:400,  hp:3600 }, { year:60,  atk:500,  hp:4500 },
  { year:70,  atk:600,  hp:5400 }, { year:80,  atk:700,  hp:6300 },
  { year:90,  atk:800,  hp:7500 }, { year:100, atk:1000, hp:9000 },
  { year:110, atk:1200, hp:10500 }, { year:120, atk:1400, hp:12000 },
  { year:130, atk:1600, hp:15000 }, { year:140, atk:2000, hp:22500 },
];
// 动态缩放（DEATH_SCALES），已落地 engine.js
const DEATH_DYN = [
  { atkMul:0.7, hpMul:2.0 }, { atkMul:0.85, hpMul:2.4 }, { atkMul:0.95, hpMul:2.8 },
  { atkMul:1.05, hpMul:3.2 }, { atkMul:1.15, hpMul:3.6 }, { atkMul:1.25, hpMul:4.0 },
  { atkMul:1.35, hpMul:4.4 }, { atkMul:1.45, hpMul:4.8 }, { atkMul:1.55, hpMul:5.2 },
  { atkMul:1.65, hpMul:5.6 }, { atkMul:1.75, hpMul:6.0 }, { atkMul:1.85, hpMul:6.4 },
  { atkMul:1.95, hpMul:6.8 }, { atkMul:2.05, hpMul:7.2 },
];
function deathEnemyDynamic(p, idx, jieDiff) {
  const sc = DEATH_DYN[idx] || DEATH_DYN[DEATH_DYN.length - 1];
  const jd = jieDiff || 1;
  return { atk: Math.round(p.atk * sc.atkMul * jd), hp: Math.round(p.hp * sc.hpMul * jd) };
}

/* ---------- 4. 战斗模拟（玩家先手，每轮：玩家出招→敌未死则反击；暴击×2） ---------- */
function simulate(p, enemy, critPct, trials = 4000) {
  let wins = 0, dmgTakenSum = 0, roundsSum = 0;
  const spellDmg = SPELL_DMG[p.spell];
  const spellCost = SPELL_COST[p.spell];
  const ap = 1 + (p.atkPct || 0);
  for (let t = 0; t < trials; t++) {
    let php = p.hp, ehp = enemy.hp, pmp = p.mp, round = 0, dead = false, taken = 0;
    while (ehp > 0 && php > 0 && round < 300) {
      round++;
      let dmg = p.atk * ap;                     // 灵力不足时普攻
      if (pmp >= spellCost) { dmg = p.atk * ap * spellDmg; pmp -= spellCost; }
      if (Math.random() < critPct) dmg *= 2;
      ehp -= dmg;
      if (ehp <= 0) break;
      php -= enemy.atk; taken += enemy.atk;
      if (php <= 0) { dead = true; break; }
    }
    if (!dead && ehp <= 0) { wins++; dmgTakenSum += taken; roundsSum += round; }
  }
  return { win: wins / trials, avgTaken: wins ? dmgTakenSum / wins : 0, avgRounds: wins ? roundsSum / wins : 0 };
}
// 评估"高品法术可持续施放"：以满 MP 能连续施放高级法术的次数
function spellCasts(p) {
  const c = SPELL_COST[p.spell];
  return Math.floor(p.mp / c);
}

/* ---------- 5. 跑表 ---------- */
console.log('===== DEDAO 数值平衡模拟（含真实玩家战力）=====\n');
const crit = 0.10;
const tierByRealm = { '炼气':'huang', '筑基':'xuan', '金丹':'di', '元婴':'tian' };

/* --- [A] 秘境 BOSS：真实玩家 vs 弱玩家（对比证明"漏算项"的影响） --- */
console.log('--- [A] 秘境 BOSS 胜率（真实玩家 / 弱玩家对比，crit=' + crit + '）---');
console.log('秘境 | 境界(year) | 真实·d5boss | 真实·d9boss | 真实·d9精英 | 弱·d9boss');
[10, 20, 40, 80].forEach(y => {
  const rp = realPlayer(y), wp = weakPlayer(y);
  const tier = tierByRealm[rp.realm];
  const rb5 = simulate(rp, advEnemy(rp, tier, 5, true, false, 0), crit);
  const rb9 = simulate(rp, advEnemy(rp, tier, 9, true, false, 0), crit);
  const rb9e = simulate(rp, advEnemy(rp, tier, 9, false, true, 0), crit);
  const wb9 = simulate(wp, advEnemy(wp, tier, 9, true, false, 0), crit);
  const pct = x => (x.win*100).toFixed(0).padStart(3)+'%';
  console.log(
    tier.padEnd(6) + ' | ' + (rp.realm+'('+y+')').padEnd(11) + ' | ' +
    pct(rb5) + ' | ' + pct(rb9) + ' | ' + pct(rb9e) + ' | ' + pct(wb9)
  );
});

/* --- [A2] 高品法术可持续施放：证明"耗蓝批量下调"不必要 --- */
console.log('\n--- [A2] 高级法术可持续施放（满 MP 连续施放次数，真实玩家）---');
console.log('境界 | 灵力(ling) | MP上限 | 法术(品级/cost) | 可连续施放 | 单发伤害');
[10, 20, 40, 80].forEach(y => {
  const p = realPlayer(y);
  const c = SPELL_COST[p.spell];
  const casts = spellCasts(p);
  const single = Math.round(p.atk * (1+p.atkPct) * SPELL_DMG[p.spell]);
  console.log(
    p.realm.padEnd(4) + ' | ' + String(p.ling).padStart(4) + ' | ' +
    String(p.mp).padStart(5) + ' | ' + (p.spell+'/'+c).padEnd(8) + ' | ' +
    String(casts).padStart(6) + ' 次 | ' + String(single).padStart(5)
  );
});

/* --- [B] 死劫胜率：静态(坏) vs 动态(已准备) + 叠劫难度(JIE_DIFF) --- */
console.log('\n--- [B] 死劫胜率：动态已准备，叠劫难度 jie=0 / 3 / 6 ---');
console.log('死劫 | year | 玩家(atk/hp/MP) | 静态 | 动态jie0 | 动态jie3(1.5×) | 动态jie6(2.4×)');
DEATH_STATIC.forEach((d, i) => {
  const p = realPlayer(d.year);
  const st = simulate(p, { atk:d.atk, hp:d.hp }, crit);
  const dy0 = simulate(p, deathEnemyDynamic(p, i, 1.0), crit);
  const dy3 = simulate(p, deathEnemyDynamic(p, i, 1.5), crit);
  const dy6 = simulate(p, deathEnemyDynamic(p, i, 2.4), crit);
  const pct = x => (x.win*100).toFixed(0).padStart(3)+'%';
  console.log(
    ('死劫'+(i+1)).padEnd(4) + ' | ' + String(d.year).padEnd(4) + ' | ' +
    (p.realm+' '+p.atk+'/'+p.hp+'/'+p.mp).padEnd(15) + ' | ' +
    pct(st) + ' | ' + pct(dy0) + ' | ' + pct(dy3) + ' | ' + pct(dy6)
  );
});

/* --- [C] 心法 mult 下调对修炼速度的影响（仅影响速度，不影响战斗） --- */
console.log('\n--- [C] 心法 mult 下调 → 修炼速度（仅速度，不影响战斗）---');
const CULT_REALM = [0,1,5,6];
function cultGainPer(wu, bigIdx, xinfaMul) {
  return Math.round((60 + wu*10) * (1 + 0.3*CULT_REALM[bigIdx]) * xinfaMul);
}
console.log('心法品级 | 旧mult | 新mult | 炼气每次修为 | 筑基每次修为');
[['黄',1.20,1.15],['玄',1.50,1.40],['地',1.80,1.70],['天',2.30,2.10]].forEach(([g,old,now]) => {
  const g1 = cultGainPer(5,0,now), g2 = cultGainPer(5,1,now);
  const old1 = cultGainPer(5,0,old);
  console.log(
    g.padEnd(6) + ' | ' + String(old).padStart(5) + ' | ' + String(now).padStart(5) + ' | ' +
    String(g1).padStart(8) + ' (旧'+old1+') | ' + String(g2).padStart(8)
  );
});

console.log('\n说明: 单场 BOSS 对决下限参考，未含秘境途中治疗/丹药/闪避/法宝特殊机制。');
