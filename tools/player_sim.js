/* ============================================================
   DEDAO · 玩家全量测试模拟器 (player_sim.js)
   加载真实 data.js 数据表 + 复刻 engine.js 核心公式，
   建模「正常玩家(轮回阁~600点)」与「死忠玩家(六维满9/全天赋1296)」，
   全量叠加：聚灵阵 / 五行阵 / 丹 / 器 / 秘境产出 / 游历机缘 / 练体练神 / 宗门 / 灵根 / 命格，
   输出各境界最终战力、修炼速度、秘境BOSS与死劫通关率。
   运行: node tools/player_sim.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

/* ---------- 1. 加载真实 data.js 数据表 ---------- */
const dataPath = path.join(__dirname, '..', 'js', 'data.js');
const dataText = fs.readFileSync(dataPath, 'utf8');
const NAMES = ['STAGES','BIG_REALMS','BIG_IDX','ELIXIRS','ARTIFACTS','LINGGEN_POOL','TALENTS',
  'SECTS','EQUIPS','JULING_ARRAY','WUXING_ARRAY','WUXING_ORDER','TECHNIQUES',
  'DESTINIES','REINCARNATION','GRADE_STONE','DEATH_SCALES','DEATH_REALM_BASE','DEATH_IDX_REALM',
  'DEATH_EVENTS','ENEMY_REALM_BASE','JIE_DATA'];
const loadFn = new Function(dataText + '\n; return {' + NAMES.map(n => n + ':' + n).join(',') + '};');
const D = loadFn();
const { BIG_REALMS, BIG_IDX, EQUIPS, ARTIFACTS, SECTS, JULING_ARRAY, WUXING_ARRAY, WUXING_ORDER,
        TECHNIQUES, REINCARNATION, DEATH_SCALES, DEATH_REALM_BASE, DEATH_IDX_REALM,
        DEATH_EVENTS, ENEMY_REALM_BASE, JIE_DATA } = D;
const GRADE_ORDER = D.GRADE_ORDER || ['黄','玄','地','天','仙'];

/* 法术 dmg / cost：由 data.js 的 TECHNIQUES 推导，不再手抄。
   ⚠ 旧手抄值 `cost: 黄15 / 玄25 / 地45 / 天70` 已漂移约 2.5 倍（真值 40/65/115/175）。
     dmg 旧值恰好等于各品级上限，所以一直"看起来对"；cost 却把「可持续施放次数」
     高估了 2 倍多 —— 而"耗蓝是否够用"正是这张表要回答的问题，等于结论整个失效。
   取法：各品级取 **dmg 最高的那条法术**，并**用同一条的 cost**。
   （dmg 与 cost 必须成对取自同一条，不能各取极值 —— 否则等于凭空造出一条不存在的法术。） */
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
['黄','玄','地','天'].forEach(function (g) {
  const s = SPELL_PICK[g];
  SPELL_DMG[g] = s ? s.dmg : 0;
  SPELL_COST[g] = s ? s.cost : 0;
});

/* 可选：确定性随机（设 SIM_SEED 环境变量即启用），让输出快照可复现。
   例：SIM_SEED=42 node tools/player_sim.js

   ⚠ 随机流必须**按档案复位**（2026-09-15 加）：
     原先是全局单流 —— A 档案的战斗抽签会消耗随机数，进而改变 B 档案抽到的命格。
     后果：改动任何一个战斗公式，所有档案的命格/属性都会跟着变，快照差异**无法归因**
     （实测：只改法术 cost，「单发法术伤害」却从 3123 变成 3191 ——
       变的其实是抽到的命格，不是公式，极容易误判）。
     现改为每个档案用 FNV-1a(SEED + 档案标签) 独立复位，档案之间互不污染。 */
let _rngState = 0, _rngSeeded = false, _rngBase = 0;
if (process.env.SIM_SEED) {
  _rngSeeded = true;
  _rngBase = (parseInt(process.env.SIM_SEED, 10) || 1) >>> 0;
  _rngState = _rngBase;
  Math.random = function () { _rngState = (_rngState * 1664525 + 1013904223) >>> 0; return _rngState / 4294967296; };
}
function resetRng(tag) {
  if (!_rngSeeded) return;
  let h = 2166136261;
  const s = String(tag);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  _rngState = ((h ^ _rngBase) >>> 0) || 1;
}

console.log('✓ 已加载真实数据表：EQUIPS=' + Object.keys(EQUIPS.weapon).length + '武器/' +
  Object.keys(EQUIPS.head).length + '头/' + Object.keys(EQUIPS.body).length + '身/' +
  Object.keys(EQUIPS.accessory).length + '饰/' + Object.keys(EQUIPS.treasure).length + '宝物; ARTIFACTS=' +
  Object.keys(ARTIFACTS).length + '; 轮回天赋=' + REINCARNATION.length + '项');
console.log('✓ 法术常量取自 TECHNIQUES（各品级 dmg 最高者）：' +
  ['黄','玄','地','天'].map(g => g + '=' + (SPELL_PICK[g] ? SPELL_PICK[g].name + ' dmg' + SPELL_PICK[g].dmg + '/cost' + SPELL_PICK[g].cost : '—')).join(' · '));

/* ---------- 2. 真加载引擎，不再手抄公式 ----------
 * 2026-09-15 改版（AGENTS.md #60「第四大 bug 类」的收尾）：
 *   本文件原先自带 equipStats / artifactStats / calcAtk / calcHpMax / calcMpMax / cultGain /
 *   getCritRate / getDodgeRate / getDefense* / talentApply / effAttr / applyWuxing / techMult /
 *   getXinfa* / getDestiny* / linggenTrait / refresh 一整套**引擎公式副本** —— 抄得再像也会漂。
 *   已实锤的一处：镜像的 cultGain 漏掉引擎的 sectPassed() 门禁，而本文件从不设 s.sectRank，
 *   于是它一直在给「还没通过入宗考验」的角色发宗门加成（血 / 攻 / 修炼三项）。
 *   现在公式全部改调 Engine.*（经 tools/_engine_loader 真加载 js/data.js + js/engine.js）。
 *
 * 仍属「模拟模型」而非引擎副本的两块（本次不改）：
 *   · combatSim —— 蒙特卡洛对战模型。减伤流程虽与引擎同序（护盾→百分比→绝对→除算），
 *     但它是抽样模拟，不对应某个引擎函数。
 *   · advEnemy / genEnemyStats / deathEnemyDynamic —— 复刻引擎的 enemyStats / deathEnemyGen，
 *     但这俩**没有从 Engine 导出**（声明在 IIFE 内部，loader 取不到）。
 *     要消掉得先给引擎加导出 —— 那会动 js/，要走 bump + 同步 dist，另开一轮。
 * 数据表仍直读 js/data.js（第 1 节）—— 那是「直读」，不是「镜像」。
 */
const ENG = require('./_engine_loader').load().Engine;

const getCritRate = ENG.getCritRate;
const getDodgeRate = ENG.getDodgeRate;
const getDefense = ENG.getDefense;
const getDefensePct = ENG.getDefensePct;
const getDefenseDiv = ENG.getDefenseDiv;
const getXinfaGuard = ENG.getXinfaGuard;
const getXinfaReduceDmg = ENG.getXinfaReduceDmg;
const getXinfaSpellMul = ENG.getXinfaSpellMul;
const getDestinyBonus = ENG.getDestinyBonus;

/* ⚠ 别直接用 ENG.bigIdxOf：它定义在 data.js，签名是 bigIdxOf(s) —— 只吃「状态对象」
   （内部走 safeStage(s.idx).bigRealm）。传境界名字符串进去会走 fallback 恒返回 0，
   四个境界会被算成同一个大境（攻击/气血整列雷同）。
   本文件要按「境界名」取大境序号 → 用 data.js 的 BIG_IDX(realm)，并兼容传状态。 */
const bigIdxOf = function (s) { return D.BIG_IDX(typeof s === 'string' ? s : s.realm); };

/* 引擎的 cultGain 返回 { gain, note }，且会顺带消耗一颗聚气丹；这里只要点数 */
function cultGain(s) { return ENG.cultGain(s).gain; }

/* 刷新：直接用引擎的 refreshStats —— 它内部会依次算
   recalcLinggenBonus（灵根/五行阵的暴击·闪避·渡劫·防御）→ artifactStats → hpMax → atk → mpMax → 金缕衣。
   calcAtk / calcHpMax 未单独导出，但 refreshStats 会把结果写回 s.atk / s.hpMax / s.mpMax。 */
function refresh(s) {
  ENG.refreshStats(s);
  if (s.hp === undefined || s.hp > s.hpMax) s.hp = s.hpMax;
  if (s.mp === undefined || s.mp > s.mpMax) s.mp = s.mpMax;
}

/* ---------- 2.5 命格抽取（2命格/3命格/3仙命机制，与游戏进入页一致） ---------- */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// 硬核玩家 3 劫后觉醒三仙命(3金)的概率
const XIANMING_CHANCE = 0.30;
function rollDestinies(kind, jie) {
  const allKeys = Object.keys(D.DESTINIES);
  const gradeOf = k => D.DESTINIES[k].grade;
  // 硬核 + 3劫后：概率觉醒 3 仙命（3 个金命格）
  if (kind === 'hardcore' && jie >= 3 && Math.random() < XIANMING_CHANCE) {
    return shuffle(allKeys.filter(k => gradeOf(k) === '金')).slice(0, 3);
  }
  const n = kind === 'hardcore' ? 3 : 2;            // 普通2命格 / 硬核3命格
  const allowGold = jie >= 3;                        // 3劫+ 才允许出仙命(金)
  const weights = allowGold ? { '白': 40, '绿': 30, '蓝': 20, '紫': 8, '金': 2 }
                            : { '白': 50, '绿': 30, '蓝': 15, '紫': 5 };
  const keys = shuffle(allKeys.filter(k => allowGold || gradeOf(k) !== '金'));
  const used = {}; const out = [];
  while (out.length < n && out.length < keys.length) {
    let total = 0; keys.forEach(k => { if (!used[k]) total += (weights[gradeOf(k)] || 10); });
    if (total <= 0) break;
    let r = Math.random() * total, picked = null;
    for (const k of keys) { if (used[k]) continue; r -= (weights[gradeOf(k)] || 10); if (r <= 0) { picked = k; break; } }
    if (!picked) break;
    used[picked] = true; out.push(picked);
  }
  return out;
}

/* ---------- 3. 轮回阁投资（与 applyReinc 一致） ---------- */
function reincCost(id, level) {
  const r = REINCARNATION.filter(x => x.id === id)[0]; if (!r) return 0;
  return r.cost * (level * (level + 1) / 2);
}
function totalReincCost(inv) { let c = 0; for (const id in inv) c += reincCost(id, inv[id]); return c; }
function applyReinc(s, inv) {
  // 舍生 / 大千命格 已于 2026-09-14 删除；殷实/见面礼/延寿 已移入开荒「三 · 经历」(INIT_EXP)
  //   故 s.reinc 只剩修炼 / 百艺 / 灵田 / 命格栏几项
  s.reinc = { cult: 0, alchemy: 0, forge: 0, herbGrow: 0, extraField: 0, destinySlot: 0 };
  REINCARNATION.forEach(r => {
    const n = inv[r.id] || 0; if (!n) return;
    for (let i = 0; i < n; i++) {
      if (r.id === 'wu') s.wu++; else if (r.id === 'ti') s.ti++;
      else if (r.id === 'dun') s.dun++; else if (r.id === 'shen') s.shen++;
      else if (r.id === 'dao') s.dao++; else if (r.id === 'ling') s.ling++;
      else if (r.id === 'cult') s.reinc.cult += 1;
      else if (r.id === 'alchemy') s.reinc.alchemy += 1;
      else if (r.id === 'forge') s.reinc.forge += 1;
      else if (r.id === 'herbGrow') s.reinc.herbGrow += 1;
      else if (r.id === 'extraField') s.reinc.extraField += 1;
      else if (r.id === 'destinySlot') s.reinc.destinySlot += 1;
      else if (r.id === 'lvling_bottle') s.reinc.lvling_bottle += 1;
    }
  });
}
// 正常玩家：六维停在5（死忠才叠到9），其余天赋拉满到~600点预算（旧版上限）
const NORMAL_INV = { wu: 5, ti: 5, dun: 5, shen: 5, dao: 5, ling: 5, alchemy: 3, forge: 3, extraField: 3, destinySlot: 1, cult: 5, lvling_bottle: 3 };
// 死忠玩家：全部天赋拉满（1296 点，六维满9）—— 点数由 totalReincCost(HARDCORE_INV) 现算，见下方 label
const HARDCORE_INV = {}; REINCARNATION.forEach(r => HARDCORE_INV[r.id] = r.max);

/* ---------- 4. 装备/法宝/练体练神 选择器 ---------- */
function pickEquip(slot, maxTier, n) {
  const items = [];
  for (const id in EQUIPS[slot]) {
    const it = EQUIPS[slot][id];
    if (it.tier > maxTier) continue;
    const mn = it.main || {};
    const score = it.tier * 1000 + (mn.atk || 0) + (mn.atk2 || 0) + (mn.def || 0) + (it.atk || 0) + (it.hpMax || 0);
    items.push({ id, score });
  }
  items.sort((a, b) => b.score - a.score);
  return items.slice(0, n).map(x => x.id);
}
function pickArtifact(s, list) { return list.filter(id => ARTIFACTS[id]); }

/* ---------- 5. 构建玩家状态 ---------- */
function buildProfile(kind, realm, rngTag) {
  // 档案独立随机流：本档案抽什么命格，不受其它档案战斗抽签影响。
  // ⚠ 蒙特卡洛段必须传 rngTag（带样本序号）：否则 400 个样本共用同一个流，
  //    会抽出 400 份**完全相同**的命格 —— 3 仙命占比直接塌成 0% 或 100%。
  resetRng(rngTag || (kind + '/' + realm));
  const bi = bigIdxOf(realm);
  const s = {
    // ⚠ idx 必须是**阶位索引**（炼气前期 0 / 筑基前期 3 / 金丹前期 6 / 元婴前期 9），不能拿大境序号 bi 顶替。
    //   旧镜像的 bigIdxOf 读 s.realm，所以这个错一直没暴露；引擎的 bigIdxOf(s) 读的是 s.idx
    //   （data.js: safeStage(s).bigRealm），写错会让 calcHpMax / calcAtk / cultGain 全按低境界算。
    realm, idx: bi * 3, year: 0, wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0,
    hp: undefined, mp: undefined, stone: 0, lifeMax: 150, elixirs: {}, arts: [],
    equip: { weapon: null, head: null, body: null, accessory: null, treasure: [] }, techs: [], techEquip: {},
    linggen: null, sect: null, talents: [], destinies: [], array: { juling: { level: 0 }, wuxing: {} },
    craft: { zhenfa: { lv: 1 } }, flags: {}, reinc: {}, hpMaxBonus: 0, killCount: 0
  };
  const inv = kind === 'hardcore' ? HARDCORE_INV : NORMAL_INV;
  applyReinc(s, inv);
  s.jie = kind === 'hardcore' ? 3 : 0;   // 硬核玩家定位 3 劫，驱动 3命格 / 3仙命 机制

  // 练体/练神、装备/法宝/阵法 均随当前境界线性累积（真实进程）：已抵达 (bi+1) 个大境
  const R = bi + 1;
  const tiCap = kind === 'hardcore' ? 7.5 : 5;
  s.ti += tiCap * R; s.dun += tiCap * R; s.shen += tiCap * R;
  if (kind === 'hardcore') { s.shen += 10 * R; s.ling += 10 * R; }   // 练神峰/聚灵潭 全满
  else { s.shen += 5 * R; s.ling += 5 * R; }                        // 练神峰 取半

  // 灵根：死忠天灵根(+5wu/+2ling/+3dao 包)，正常单灵根金
  if (kind === 'hardcore') { s.linggen = { id: 'tian', qiMul: 1.15, affinity: ['金', '木', '水', '火', '土', '雷', '风', '冰'], affinityBonus: 15 }; s.wu += 5; s.ling += 2; s.dao += 3; }
  else { s.linggen = { id: 'jin', qiMul: 1.10, affinity: ['金'], affinityBonus: 15 }; }

  // 宗门
  s.sect = kind === 'hardcore' ? 'qingyunjian' : 'xuantian';
  // ⚠ 必须给 sectRank：引擎的宗门加成（hpMax / atkMul / cultMul）由 sectPassed(s) 把关，
  //   要求 sectRank 非空且非「杂役」。旧镜像没有这道门（无条件发宗门加成），
  //   迁到真引擎后若仍不设 sectRank，三项宗门加成会被静默吞掉 → 整表偏低。
  //   这里按境界映射一个「已通过入宗考验」的正式品阶（与 SECT_RANKS 的境界门槛一致）。
  s.sectRank = ({ '炼气': '外门', '筑基': '内门', '金丹': '真传', '元婴': '核心' })[realm] || '外门';

  // 命格（TALENTS）：死忠 kejian(攻×1.2)+daoti(修×1.1)+cult(修+10%)；正常仅 cult
  s.talents = kind === 'hardcore' ? ['kejian', 'daoti', 'cult'] : ['cult'];

  // 心法（techMult 影响修炼速度，getXinfaHpMax 影响血量上限）
  // ⚠ 必须同时写进 s.techs：引擎 ensureTechEquip() 会校验「已装备的心法是否在持有列表里」，
  //   不在就清空 s.techEquip.xinfa（engine.js:243）。只写 techEquip 而不写 techs，
  //   心法会被静默卸掉 → getXinfaHpMax 归 0、techMult 退回 1，血量与修炼速度双双偏低。
  //   真实存档里「已学会」与「已装备」是两件事，此处补上持有关系即可。
  const XINFA = kind === 'hardcore' ? 'kaitian' : 'xt_xinfa2';
  s.techs = [XINFA];
  s.techEquip.xinfa = XINFA;

  // 装备品级随境界：炼气tier2 / 筑基3 / 金丹4 / 元婴5
  const mt = bi + 2;
  s.equip.weapon = pickEquip('weapon', mt, 1)[0];
  s.equip.head = pickEquip('head', mt, 1)[0];
  s.equip.body = pickEquip('body', mt, 1)[0];
  s.equip.accessory = pickEquip('accessory', mt, 1)[0];
  s.equip.treasure = pickEquip('treasure', mt, kind === 'hardcore' ? Math.min(4, R) : 1);

  // 法宝数量随境界累积
  const fullArt = kind === 'hardcore'
    ? ['tianlinggen', 'cuishen_tai', 'jiuzhuan_jindanlu', 'juling_art', 'jubao', 'youhun_pijian']
    : ['juling_art', 'jubao', 'juling_yaodai'];
  const nArt = kind === 'hardcore' ? Math.min(fullArt.length, R) : 1;
  // 法宝现统一装备于宝物槽（与宝物共用 s.equip.treasure），s.arts 库存不生效
  s.equip.treasure = s.equip.treasure.concat(pickArtifact(s, fullArt.slice(0, nArt)));

  // 聚灵阵 + 五行阵 随境界提升
  if (kind === 'hardcore') { s.array.juling.level = Math.min(3, R); s.array.wuxing = { fire: true, metal: true, water: true, wood: true, earth: true }; s.craft.zhenfa.lv = Math.min(5, R); }
  else { s.array.juling.level = Math.min(3, Math.max(1, bi)); s.array.wuxing = { wood: true, earth: true, fire: true }; s.craft.zhenfa.lv = Math.min(3, R); }

  // 游历机缘 / 道侣 / 灵宠
  s.flags.daoLu = true;
  if (kind === 'hardcore') s.flags.petGrown = true;
  s.elixirs.juling = kind === 'hardcore' ? 99 : 5; // 聚气丹（修炼+20%/次）

  // 命格（2命格/3命格/3仙命）：随机抽取并落地， bonuses 经 effAttr 进入 refresh
  s.destinies = rollDestinies(kind, s.jie);

  refresh(s);
  s.spent = totalReincCost(inv);
  return s;
}

/* ---------- 6. 战斗模拟（玩家先手，含暴击/闪避/防御；与 balance_sim 同源） ---------- */
const SPELL_BY_REALM = { '炼气': '黄', '筑基': '玄', '金丹': '地', '元婴': '天' };
function combatSim(p, enemy, trials = 3000) {
  const spell = SPELL_BY_REALM[p.realm], dm = SPELL_DMG[spell], cost = SPELL_COST[spell];
  const crit = Math.min(0.9, getCritRate(p));
  const dodge = Math.min(0.8, getDodgeRate(p));
  const defPct = getDefensePct(p);
  const defAbs = getDefense(p);
  const defDiv = getDefenseDiv(p);
  // 心法常驻减伤（玄天门 guard + 玄武真经 reduceDmg），与 engine.js enemyAtkRoll 同序：护盾 → 百分比 → 绝对 → 除算
  const xinfaShield = Math.min(0.9, getXinfaGuard(p) + getXinfaReduceDmg(p));
  const spellMul = 1 + getXinfaSpellMul(p);
  let wins = 0, takenSum = 0, roundsSum = 0;
  for (let t = 0; t < trials; t++) {
    let php = p.hp, ehp = enemy.hp, pmp = p.mp, round = 0, dead = false, taken = 0;
    while (ehp > 0 && php > 0 && round < 400) {
      round++;
      let dmg = p.atk;
      if (pmp >= cost) { dmg = p.atk * dm * spellMul; pmp -= cost; }
      if (Math.random() < crit) dmg *= 2;
      ehp -= dmg;
      if (ehp <= 0) break;
      if (Math.random() < dodge) continue; // 闪避
      // 防御减伤：护盾(心法) → 百分比 → 绝对 → 除算（与 engine.js enemyAtkRoll 同序同口径）
      let dIn = enemy.atk;
      if (xinfaShield > 0) dIn = Math.round(dIn * (1 - xinfaShield));
      dIn = Math.round(dIn * (1 - defPct));
      dIn = Math.max(1, dIn - defAbs);
      if (defDiv > 0) dIn = Math.max(1, Math.round(dIn / (1 + defDiv)));
      php -= dIn; taken += dIn;
      if (php <= 0) { dead = true; break; }
    }
    if (!dead && ehp <= 0) { wins++; takenSum += taken; roundsSum += round; }
  }
  return { win: wins / trials, avgTaken: wins ? takenSum / wins : 0, avgRounds: wins ? roundsSum / wins : 0, crit, dodge, defPct };
}
// 统一固定基线敌人生成（复刻 engine.js v4 enemyStats：所有敌人共用同一套模型，不再随玩家自身攻/血缩放）
const ADVENTURE_GRADE = { huang: 0, xuan: 1, di: 2, tian: 3, xian: 3 };
function genEnemyStats(tier, atkMul, hpMul, jieDiff, opts) {
  const base = (ENEMY_REALM_BASE && ENEMY_REALM_BASE[tier]) ? ENEMY_REALM_BASE[tier] : { atk: 10, hp: 180 };
  const jd = jieDiff || 1;
  const o = opts || {};
  const aBase = (o.atkRef === 'hp') ? base.hp : base.atk;
  const hBase = (o.hpRef === 'atk') ? base.atk : base.hp;
  return {
    atk: Math.max(1, Math.round(aBase * atkMul * jd)),
    hp: Math.max(1, Math.round(hBase * hpMul * jd))
  };
}
// 秘境敌人（enemyGen 复刻：固定境界基线 × 深度系数 × 精英/Boss 系数 × 叠劫）
// ⚠ 2026-09-15 修正：旧版还在用已被引擎移除的 v3 公式
//     （hits=4+depth×0.5 / atkMul=(elite?1.3:1)÷(boss?9:(5+depth×0.4))，且 atkRef/hpRef 互换）。
//   engine.js enemyGen 现为「固定境界基数 × 深度系数」，注释明确写着
//     旧版「atk←玩家hpMax / hp←玩家atk」被判定为设计失误，已移除。
//   深度 9 Boss 对比：旧式 atk=128/hp=2907，现式 atk=214/hp=1379 —— 差得不是一点半点。
function advEnemy(p, tier, depth, boss, elite, jie) {
  const jieDiff = (JIE_DATA[jie] && JIE_DATA[jie].diff) ? JIE_DATA[jie].diff : 1;
  const bi = ADVENTURE_GRADE[tier] != null ? ADVENTURE_GRADE[tier] : 0;
  // 有效深度封顶 20 层（与引擎一致：更深处只加产出、不加数值压力）
  const ed = Math.min(Math.max(depth || 1, 1), 20);
  const depthFactor = 0.25 + (ed - 1) * 0.04;
  const mul = depthFactor * (elite ? 1.4 : 1) * (boss ? 2.2 : 1);
  return genEnemyStats(bi, mul, mul, jieDiff);
}
// 死劫动态（deathEnemyDynamic 复刻 engine.js v4：固定境界基准 × 递增系数 × 叠劫，不再随玩家自身攻/血缩放）
// 死劫年份直接取自 data.js 的 DEATH_EVENTS（v6 起为 5 劫：18/36/49/64/81），
// 不再硬编码旧的 14 劫 × 10 年（旧表会让 idx≥5 越界，回落到默认木桩 → 通关率假 100%）。
const DEATH_YEAR = (DEATH_EVENTS || []).map(e => e.year);
function deathEnemyDynamic(p, idx, jieDiff) {
  const sc = (DEATH_SCALES && DEATH_SCALES[idx]) ? DEATH_SCALES[idx] : { atkMul: 1, hpMul: 1 };
  const base = (DEATH_REALM_BASE && DEATH_REALM_BASE[DEATH_IDX_REALM[idx]]) ? DEATH_REALM_BASE[DEATH_IDX_REALM[idx]] : { atk: 10, hp: 180 };
  return {
    atk: Math.max(1, Math.round(base.atk * sc.atkMul * jieDiff)),
    hp: Math.max(1, Math.round(base.hp * sc.hpMul * jieDiff))
  };
}
function realmByYear(y) { return y < 15 ? '炼气' : y < 40 ? '筑基' : y < 80 ? '金丹' : '元婴'; }
const pct = x => (x * 100).toFixed(0).padStart(3) + '%';

/* ---------- 7. 跑表 ---------- */
const realms = ['炼气', '筑基', '金丹', '元婴'];
console.log('\n================= 玩家全量数值测试 =================\n');

// 7.1 各境界最终战力
['normal', 'hardcore'].forEach(kind => {
  const label = kind === 'normal'
    ? '正常玩家(轮回阁~' + totalReincCost(NORMAL_INV) + '点)'
    : '死忠玩家(六维满9/全天赋' + totalReincCost(HARDCORE_INV) + '点)';
  console.log('──── ' + label + ' ────');
  console.log('境界 | 轮回阁花费 | 攻(atk) | 血(hp) | 灵力(mp) | 修炼/次 | 暴击% | 闪避% | 防御');
  realms.forEach(r => {
    const s = buildProfile(kind, r);
    const cg = cultGain(s);
    console.log(
      r.padEnd(4) + ' | ' + String(s.spent).padStart(6) + ' | ' +
      // ⚠ 血量只在**显示层**取整：引擎 calcHpMax 末尾不取整（return Math.max(1, m)），
      //   五行阵百分比会算出 1219.9000000000001 这类小数。战斗模拟仍用引擎原值，不覆盖 s.hpMax。
      String(s.atk).padStart(6) + ' | ' + String(Math.round(s.hpMax)).padStart(6) + ' | ' + String(s.mpMax).padStart(6) + ' | ' +
      String(cg).padStart(6) + ' | ' + (getCritRate(s) * 100).toFixed(0).padStart(5) + ' | ' +
      (getDodgeRate(s) * 100).toFixed(0).padStart(5) + ' | ' +
      String(getDefense(s)).padStart(4));
  });
  console.log('');
});

// 7.2 秘境 BOSS 通关率（depth9 boss，各境界，jie0 vs jie3）
console.log('──── 秘境 depth9 BOSS 通关率（玩家先手/暴击/闪避/防御全开）────');
console.log('玩家 | 境界 | jie0 d9BOSS | jie3 d9BOSS(1.5×) | jie0 d9精英 | 单发法术伤害');
['normal', 'hardcore'].forEach(kind => {
  realms.forEach(r => {
    const s = buildProfile(kind, r);
    const spell = SPELL_BY_REALM[r];
    const single = Math.round(s.atk * SPELL_DMG[spell]);
    const b0 = combatSim(s, advEnemy(s, r === '炼气' ? 'huang' : r === '筑基' ? 'xuan' : r === '金丹' ? 'di' : 'tian', 9, true, false, 0));
    const b3 = combatSim(s, advEnemy(s, r === '炼气' ? 'huang' : r === '筑基' ? 'xuan' : r === '金丹' ? 'di' : 'tian', 9, true, false, 3));
    const e0 = combatSim(s, advEnemy(s, r === '炼气' ? 'huang' : r === '筑基' ? 'xuan' : r === '金丹' ? 'di' : 'tian', 9, false, true, 0));
    console.log((kind === 'hardcore' ? '死忠' : '正常').padEnd(4) + ' | ' + r.padEnd(4) + ' | ' + pct(b0.win) + ' | ' + pct(b3.win) + ' | ' + pct(e0.win) + ' | ' + String(single).padStart(6));
  });
});

// 7.3 死劫动态通关率（按死劫年份对应境界，jie0/3/6）
console.log('\n──── 死劫动态通关率（按触发年份对应境界，叠劫 jie0/3/6）────');
console.log('死劫 | 年份 | 境界 | 死忠jie0 | 死忠jie3(1.5×) | 死忠jie6(2.4×) | 死忠jie9(4.0×) | 正常jie0 | 正常jie6(2.4×)');
DEATH_YEAR.forEach((yr, i) => {
  const r = realmByYear(yr);
  const hc = buildProfile('hardcore', r), nm = buildProfile('normal', r);
  const h0 = combatSim(hc, deathEnemyDynamic(hc, i, 1.0));
  const h3 = combatSim(hc, deathEnemyDynamic(hc, i, 1.5));
  const h6 = combatSim(hc, deathEnemyDynamic(hc, i, 2.4));
  const h9 = combatSim(hc, deathEnemyDynamic(hc, i, 4.0));
  const n0 = combatSim(nm, deathEnemyDynamic(nm, i, 1.0));
  const n6 = combatSim(nm, deathEnemyDynamic(nm, i, 2.4));
  console.log(('死劫' + (i + 1)).padEnd(4) + ' | ' + String(yr).padStart(4) + ' | ' + r.padEnd(4) + ' | ' +
    pct(h0.win) + ' | ' + pct(h3.win) + ' | ' + pct(h6.win) + ' | ' + pct(h9.win) + ' | ' + pct(n0.win) + ' | ' + pct(n6.win));
});

console.log('\n说明: 战斗为单场BOSS下限压力测试，未含秘境途中治疗/丹药即时服用/法宝激活/连续多敌；防御=统一口径（体魄×0.5×命格 + 装备/法宝/灵根防御），减伤流程为 心法guard/reduceDmg → 土阵%/法宝% → 绝对防御 → 金缕衣除算。');

/* ---------- 8. 命格全样本蒙特卡洛测试（普通2命格 / 硬核3命格 / 硬核3劫后可能3仙命） ---------- */
console.log('\n================= 命格全样本蒙特卡洛测试 =================\n');
const MC_N = 400;          // 每类样本数
const MC_TRIALS = 150;     // 每个样本的战斗模拟次数
const DEATH_TEST_JD = 2.4; // 末劫（第 5 死劫）统一在 jie6 叠劫压力下测，以公平暴露命格/养成价值（不再随玩家自身攻血缩放后，通关率由实际战力决定）
const DEATH_LAST_IDX = Math.max(0, DEATH_YEAR.length - 1); // 末劫下标（v6 起 = 4，即第 5 死劫 · 元婴）
function classifyDest(dests) {
  if (dests.length === 3 && dests.every(d => D.DESTINIES[d].grade === '金')) return '3仙命';
  return dests.length + '命格';
}
['normal', 'hardcore'].forEach(kind => {
  const label = kind === 'normal' ? '普通玩家' : '硬核玩家';
  const r = '元婴';                       // 取终局境界测命格压力
  const jie = kind === 'hardcore' ? 3 : 0;
  const buckets = {};
  for (let i = 0; i < MC_N; i++) {
    const s = buildProfile(kind, r, kind + '/' + r + '/#' + i);   // 带样本序号 → 每个样本一道独立随机流
    const cls = classifyDest(s.destinies);
    if (!buckets[cls]) buckets[cls] = { n: 0, atk: 0, hp: 0, bossWin: 0, deathWin: 0 };
    const b = buckets[cls]; b.n++;
    b.atk += s.atk; b.hp += s.hpMax;
    const boss = advEnemy(s, 'tian', 9, true, false, jie);
    b.bossWin += combatSim(s, boss, MC_TRIALS).win;
    const death = deathEnemyDynamic(s, DEATH_LAST_IDX, DEATH_TEST_JD);   // 末劫（第5死劫 · 元婴，统一 jie6 叠劫压力，公平比命格价值）
    b.deathWin += combatSim(s, death, MC_TRIALS).win;
  }
  console.log('──── ' + label + '（样本 ' + MC_N + '，境界=' + r + '，测验 XIANMING_CHANCE=' + XIANMING_CHANCE + '）────');
  console.log('命格档 | 占比 | 均值攻 | 均值血 | d9BOSS通关 | 末劫通关(@jie6压力)');
  Object.keys(buckets).forEach(cls => {
    const b = buckets[cls];
    console.log(
      cls.padEnd(6) + ' | ' + (b.n / MC_N * 100).toFixed(1).padStart(5) + '%' + ' | ' +
      String(Math.round(b.atk / b.n)).padStart(6) + ' | ' + String(Math.round(b.hp / b.n)).padStart(6) + ' | ' +
      (b.bossWin / b.n * 100).toFixed(1).padStart(5) + '%' + ' | ' + (b.deathWin / b.n * 100).toFixed(1).padStart(5) + '%');
  });
  console.log('');
});
console.log('说明: 蒙特卡洛按命格档分组统计；普通固定2命格、硬核固定3命格、硬核3劫后因 XIANMING_CHANCE 概率觉醒3仙命(3金)。死劫统一在 jie6 叠劫压力(DEATH_TEST_JD=2.4)下测，以公平暴露命格/养成价值（v4 已删除随玩家自身攻血缩放）。');

/* 导出供诊断脚本复用（不影响上方打印） */
module.exports = { buildProfile, combatSim, advEnemy, deathEnemyDynamic, genEnemyStats, rollDestinies, D, getCritRate, getDodgeRate, getDestinyBonus };
