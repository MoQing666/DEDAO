/* ============================================================
   DEDAO 数值模型 · 平衡模拟器 (balance_sim.js)
   用于"调偏"验证：真实玩家战力模型（练灵→MP、切高级法术、高级装备+法宝）。
   运行: node balance_sim.js

   ⚠ 2026-09-15 大改（AGENTS.md #63）：本文件原先「忠实复刻」的手抄常量**已全部漂移**，
     实测结论失效：
     · 法术耗蓝手抄 黄15/玄25/地45/天70 → 真值 40/65/115/175（低估约 2.5 倍）
       →「可连续施放次数」翻倍，据此得出的「耗蓝够用、批量下调已驳回」结论整个站不住。
     · 心法 mult 手抄 玄1.40/地1.70/天2.10 → 真值 1.5/1.8/2.3（那次"下调"其实没落地）
     · MP 用 `20+灵×25` → 引擎实为 `20+(灵-1)×20`，前者从未在代码里存在过
     · 秘境敌人用 v3 旧公式（挂钩玩家攻/血）→ 引擎已判定为设计失误并移除
     · 死劫按 14 劫（year 10~140）→ 实为 5 劫（18/36/49/64/81）
   现改为「能直读就直读、不能直读就调 _engine_loader」，与 player_sim.js 同一处方。
   ⚠⚠ 2026-09-15 判定：**本工具的「玩家战力模型」已失准，结论不再可信 —— 请以 `player_sim.js` 为准。**
     除上面五条常量漂移外，更根本的问题是 `PLAYER_TABLE` / `GEAR` / `TREASURE` 这套手写曲线本身：
     它算出的元婴玩家是 **264 攻 / 1665 血**，而 `data.js` 的 `ENEMY_REALM_BASE` 元婴档是
     **502 / 2629**，且其注释明写「该境界正常发育玩家的参考攻/血，见 tools/player_sim.js 实测」——
     即敌人基准是按 `player_sim.js` 校准的。`player_sim.js` 的元婴正常玩家为 727 / 3327。
     本工具比校准基准低了近一倍，于是"打不过"是模型的错，不是数值的错。
     → 秘境 / 死劫 结论一律以 `player_sim.js` 为准；本文件仅保留 [A2]/[C] 两项数据查询参考。
     仍属**设计假设**（非引擎真值，故保留手写并明确标注）：
     PLAYER_TABLE 的成长曲线、GEAR / TREASURE / LING_BY_REALM 的代表性配置。
   ============================================================ */
require('./_engine_loader').load();   // 仅为触发真引擎可用性校验
const ENGL = require('./_engine_loader');
const ENG = ENGL.load().Engine;

/* ---------- 1. 常量：一律直读 data.js，不再手抄 ---------- */
const fs = require('fs');
const path = require('path');
const dataText = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const NAMES = ['ADVENTURE_GRADE', 'JIE_DATA', 'NEED', 'TECHNIQUES', 'DEATH_SCALES',
  'DEATH_REALM_BASE', 'DEATH_IDX_REALM', 'DEATH_EVENTS'];
const D = new Function(dataText + '\n; return {' + NAMES.map(n => n + ':' + n).join(',') + '};')();
const { ADVENTURE_GRADE, JIE_DATA, TECHNIQUES, DEATH_SCALES, DEATH_REALM_BASE, DEATH_IDX_REALM, DEATH_EVENTS } = D;
const JIE_DIFF = JIE_DATA.map(j => j.diff);

/* 法术 dmg / cost：各品级取 dmg 最高的那条，并**用同一条的 cost**（必须成对，不能各取极值） */
const SPELL_PICK = (function () {
  const best = {};
  Object.keys(TECHNIQUES).forEach(function (id) {
    const t = TECHNIQUES[id];
    if (!t || t.cls !== 'shufa' || !(t.dmg > 0)) return;
    const cur = best[t.grade];
    if (!cur || t.dmg > cur.dmg) best[t.grade] = { id: id, name: t.name, dmg: t.dmg, cost: t.cost || 0 };
  });
  return best;
})();
const SPELL_DMG = {}, SPELL_COST = {};
['黄', '玄', '地', '天'].forEach(g => {
  const s = SPELL_PICK[g];
  SPELL_DMG[g] = s ? s.dmg : 0;
  SPELL_COST[g] = s ? s.cost : 0;
});

/* 心法 mult：各品级取实际值（同品级一致，取首条即可） */
const XINFA_MULT = (function () {
  const m = {};
  Object.keys(TECHNIQUES).forEach(function (id) {
    const t = TECHNIQUES[id];
    if (t && t.cls === 'xinfa' && t.mult && m[t.grade] === undefined) m[t.grade] = t.mult;
  });
  return m;
})();

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
    // MP 用引擎真公式：20 + (灵-1)×20（旧版写 20+灵×25，那是份从未落地的提案）
    mp: 20 + Math.max(0, ling - 1) * 20,
    ling, atkPct: t.atkPct
  };
}
// 旧"弱玩家"基线（仅用于对比，体现漏算差距）：无装备、固定黄法、固定低MP
function weakPlayer(year) {
  const b = baseByYear(year);
  return { realm: b.realm, year, spell: '黄', atk: Math.round(b.atk*0.4), hp: b.hp, mp: 95, ling: 4, atkPct: 0 };
}

// 秘境敌人：直接调真引擎 enemyGen（v4 固定境界基数 × 深度系数，不再挂钩玩家攻/血）
function advEnemy(p, tier, depth, boss, elite, jie) {
  const st = { jie: jie || 0, advType: tier };
  const tag = boss ? 'boss' : (elite ? 'elite' : 'normal');
  const e = ENG.enemyGen(st, tag, depth, tier);
  return { hp: e.hp, atk: e.atk };
}

/* ---------- 3. 死劫 ---------- */
// ⚠ 旧版按 14 劫（year 10~140）建模，那是 v6 之前的设计；现游戏为 **5 劫**。
//   年份与各劫锚定境界一律取自 data.js 的 DEATH_EVENTS / DEATH_IDX_REALM，不再手抄。
const DEATH_YEAR = (DEATH_EVENTS || []).map(e => e.year);
function deathEnemyDynamic(p, idx, jieDiff) {
  const sc = (DEATH_SCALES && DEATH_SCALES[idx]) ? DEATH_SCALES[idx] : { atkMul: 1, hpMul: 1 };
  const base = (DEATH_REALM_BASE && DEATH_REALM_BASE[DEATH_IDX_REALM[idx]]) ? DEATH_REALM_BASE[DEATH_IDX_REALM[idx]] : { atk: 10, hp: 180 };
  const jd = jieDiff || 1;
  return {
    atk: Math.max(1, Math.round(base.atk * sc.atkMul * jd)),
    hp: Math.max(1, Math.round(base.hp * sc.hpMul * jd))
  };
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
console.log('\n⚠⚠ 本工具的玩家战力模型已失准（见文件头）：秘境/死劫结论请以 player_sim.js 为准。\n');
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

/* --- [A2] 高品法术可持续施放（cost 已改用 data.js 真值，见文件头） --- */
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

/* --- [B] 死劫胜率：动态 + 叠劫难度(JIE_DIFF) ---
   ⚠ 旧版这里有一列「静态」，用的是手抄的 14 劫固定属性表（year 10~140）。
     v6 起游戏只有 5 劫（18/36/49/64/81），且敌人改为「固定境界基数 × DEATH_SCALES × 叠劫」，
     静态表已不存在（DEATH_EVENTS 里只有剧情与 fight 引用，没有 atk/hp），故该列一并去掉。 */
console.log('\n--- [B] 死劫胜率：动态，叠劫难度 jie=0 / 3 / 6 ---');
console.log('死劫 | year | 玩家(atk/hp/MP) | 动态jie0 | 动态jie3(1.5×) | 动态jie6(2.4×)');
DEATH_YEAR.forEach((year, i) => {
  const p = realPlayer(year);
  const dy0 = simulate(p, deathEnemyDynamic(p, i, 1.0), crit);
  const dy3 = simulate(p, deathEnemyDynamic(p, i, 1.5), crit);
  const dy6 = simulate(p, deathEnemyDynamic(p, i, 2.4), crit);
  const pct = x => (x.win*100).toFixed(0).padStart(3)+'%';
  console.log(
    ('死劫'+(i+1)).padEnd(4) + ' | ' + String(year).padEnd(4) + ' | ' +
    (p.realm+' '+p.atk+'/'+p.hp+'/'+p.mp).padEnd(15) + ' | ' +
    pct(dy0) + ' | ' + pct(dy3) + ' | ' + pct(dy6)
  );
});

/* --- [C] 心法 mult 对修炼速度的影响（仅影响速度，不影响战斗） ---
   ⚠ 旧版这里对比「旧 mult 1.20/1.50/1.80/2.30 → 新 1.15/1.40/1.70/2.10」，
     但那次"下调"**从未落地**（`git log -S "mult: 1.40"` 为空，data.js 实测仍是 1.5/1.8/2.3）。
     故本表改为直接展示 data.js 的**当前实际值**，不再对比一个不存在的"新值"。 */
console.log('\n--- [C] 心法 mult → 修炼速度（data.js 当前实际值，仅速度不影响战斗）---');
const CULT_REALM = [0,1,5,6];
function cultGainPer(wu, bigIdx, xinfaMul) {
  return Math.round((60 + wu*10) * (1 + 0.3*CULT_REALM[bigIdx]) * xinfaMul);
}
console.log('心法品级 | 当前mult(data.js) | 炼气每次修为 | 筑基每次修为');
['黄','玄','地','天'].forEach(g => {
  const now = XINFA_MULT[g];
  if (now === undefined) return;
  console.log(
    g.padEnd(6) + ' | ' + String(now).padStart(15) + ' | ' +
    String(cultGainPer(5,0,now)).padStart(8) + ' | ' + String(cultGainPer(5,1,now)).padStart(8)
  );
});

console.log('\n说明: 单场 BOSS 对决下限参考，未含秘境途中治疗/丹药/闪避/法宝特殊机制。');
