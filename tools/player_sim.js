/* ============================================================
   DEDAO · 玩家全量测试模拟器 (player_sim.js)
   加载真实 data.js 数据表 + 复刻 engine.js 核心公式，
   建模「正常玩家(轮回阁~600点)」与「死忠玩家(六维满9/全天赋1406)」，
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

/* 可选：确定性随机（设 SIM_SEED 环境变量即启用），让输出快照可复现。
   例：SIM_SEED=42 node tools/player_sim.js */
if (process.env.SIM_SEED) {
  let _s = (parseInt(process.env.SIM_SEED, 10) || 1) >>> 0;
  Math.random = function () { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; };
}

console.log('✓ 已加载真实数据表：EQUIPS=' + Object.keys(EQUIPS.weapon).length + '武器/' +
  Object.keys(EQUIPS.head).length + '头/' + Object.keys(EQUIPS.body).length + '身/' +
  Object.keys(EQUIPS.accessory).length + '饰/' + Object.keys(EQUIPS.treasure).length + '宝物; ARTIFACTS=' +
  Object.keys(ARTIFACTS).length + '; 轮回天赋=' + REINCARNATION.length + '项');

/* ---------- 2. 复刻 engine.js 核心计算（与游戏实码一致） ---------- */
function bigIdxOf(s) { return D.BIG_IDX(typeof s === 'string' ? s : s.realm); }
function getDestinyAttrBonus(s, attr) {
  let b = 0; (s.destinies || []).forEach(d => { const x = D.DESTINIES[d]; if (x && x.attr && x.attr[attr] != null) b += x.attr[attr]; }); return b;
}
function getDestinyAttrMult(s, attr) {
  let m = 1; (s.destinies || []).forEach(d => { const x = D.DESTINIES[d]; if (x && x.type === 'combat' && x.effect && x.effect[attr + 'Mul']) m *= (1 + x.effect[attr + 'Mul']); }); return m;
}
function getDestinyBonus(s, type) {
  // 与 engine.js 一致：不再限定 type==='combat'（tribBonus 挂在属性类金命上）
  let b = 0; (s.destinies || []).forEach(d => { const x = D.DESTINIES[d]; if (x && x.effect && typeof x.effect[type] === 'number') b += x.effect[type]; }); return b;
}
/* 旧命格 TALENTS.apply 汇总（与 engine.js talentApply 一致） */
function talentApply(s, key) {
  let v = 0;
  (s.talents || []).forEach(tid => {
    const t = D.TALENTS.filter(x => x.id === tid)[0];
    if (t && t.apply && t.apply[key]) v += t.apply[key];
  });
  return v;
}
/* 命格「功法类型加成」（万剑归宗 techTypeBonus{xinfa}） */
function getTechTypeBonus(s, cls) {
  let v = 0;
  (s.destinies || []).forEach(d => {
    const x = D.DESTINIES[d];
    const b = x && x.effect && x.effect.techTypeBonus;
    if (b && b[cls]) v += b[cls];
  });
  return v;
}
// 装备槽已由 head/body/leg 演进为 weapon/head/body/accessory；
// 属性由扁平字段改为 main{...} 容器 + 实例词条 aff[]（忠实复刻 engine.js 的 equipStats）。
const EQUIP_SLOTS = ['weapon', 'head', 'body', 'accessory'];
function equipInstOf(v) {
  if (!v) return null;
  if (typeof v === 'string') return { id: v, aff: [] };
  if (typeof v === 'object' && v.id) return { id: v.id, aff: Array.isArray(v.aff) ? v.aff : [] };
  return null;
}
function equipStats(s) {
  const st = { hpMax: 0, atk: 0, def: 0, critPct: 0, atkSpd: 0, recover: 0, mpPct: 0, hpPct: 0, wu: 0, ti: 0, cult: 0 };
  EQUIP_SLOTS.forEach(slot => {
    const inst = equipInstOf(s.equip && s.equip[slot]); if (!inst) return;
    const it = EQUIPS[slot] && EQUIPS[slot][inst.id]; if (!it) return;
    if (it.main) {
      st.atk += (it.main.atk || 0) + (it.main.atk2 || 0);   // 锤的 atk2 视作额外攻击
      st.def += it.main.def || 0;
      st.critPct += it.main.critPct || 0;
      st.atkSpd += it.main.atkSpd || 0;
      st.recover += it.main.recover || 0;
      st.mpPct += it.main.mpPct || 0;
      st.hpPct += it.main.hpPct || 0;
    }
    st.hpMax += it.hpMax || 0; st.atk += it.atk || 0; st.wu += it.wu || 0; st.ti += it.ti || 0; st.cult += it.cult || 0;
    inst.aff.forEach(a => {
      if (a.key === 'atk') st.atk += a.val;
      else if (a.key === 'def') st.def += a.val;
      else if (a.key === 'critPct') st.critPct += a.val;
      else if (a.key === 'atkSpd') st.atkSpd += a.val;
      else if (a.key === 'recover') st.recover += a.val;
      else if (a.key === 'mpPct') st.mpPct += a.val;
      else if (a.key === 'hpPct') st.hpPct += a.val;
    });
  });
  if (Array.isArray(s.equip.treasure)) s.equip.treasure.forEach(id => {
    const it = EQUIPS.treasure && EQUIPS.treasure[id]; if (!it) return;
    st.hpMax += it.hpMax || 0; st.atk += it.atk || 0; st.wu += it.wu || 0; st.ti += it.ti || 0; st.cult += it.cult || 0;
  });
  return st;
}
function artifactStats(s) {
  const A = ARTIFACTS;
  const st = { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0, atk: 0, hpMax: 0, def: 0, critPct: 0, dodgePct: 0, defPct: 0, atkPct: 0, atkSpd: 0, cult: 0, stealPct: 0, defToAtk: 0, tiHpBonus: 0, duantiEff: 0, duantiShenEff: 0, duantiMax: 0, craftEff: 0, farmEff: 0, mineEff: 0, stoneYearPct: 0, cultTwice: false, modeBonus: { normal: 0, focus: 0, seclusion: 0 }, craftKind: {} };
  // 法宝现统一装备于宝物槽 s.equip.treasure（s.arts 库存不生效），忠实复刻 engine.js
  ((s.equip && s.equip.treasure) || []).forEach(id => {
    const a = A[id]; if (!a || !a.effect) return; const e = a.effect;
    ['wu', 'ti', 'dun', 'shen', 'dao', 'ling', 'atk', 'hpMax', 'def', 'critPct', 'dodgePct', 'defPct', 'atkPct', 'cult', 'stealPct', 'defToAtk', 'tiHpBonus', 'duantiEff', 'duantiShenEff', 'duantiMax', 'craftEff', 'farmEff', 'mineEff', 'stoneYearPct', 'atkSpd'].forEach(k => { if (e[k]) st[k] += e[k]; });
    if (e.modeBonus) { st.modeBonus.normal += e.modeBonus.normal || 0; st.modeBonus.focus += e.modeBonus.focus || 0; st.modeBonus.seclusion += e.modeBonus.seclusion || 0; }
    if (e.craftKind) { for (const k in e.craftKind) st.craftKind[k] = (st.craftKind[k] || 0) + e.craftKind[k]; }
    if (e.cultTwice) st.cultTwice = true;
    if (e.scale) { const sv = (e.scale.res === 'stone') ? (s.stone || 0) : 0; const per = e.scale.per || 100; const pp = e.scale.perPoint || 0.01; const cap = (e.scale.cap == null) ? 1 : e.scale.cap; const n = Math.min(Math.floor(sv / per) * pp, cap); if (e.scale.stat === 'atk') st.atkPct += n; else if (e.scale.stat === 'defPct') st.defPct += n; }
    if (a.stack && a.stack.stat) { st[a.stack.stat] += Math.min((s.killCount || 0) * (a.stack.per || 1), a.stack.cap || 0); }
    if (e.lowHpAtk) { const ratio = 1 - (s.hp || 0) / (s.hpMax || 1); st.atkPct += Math.min(ratio * e.lowHpAtk, e.lowCap || 0.40); }
    if (e.daoAtkPct) { st.atkPct += Math.min((s.dao || 0) * e.daoAtkPct, e.daoCap || 0.30); }
    // 棘鳞甲 defToAtk 移至 calcAtk 结算（依赖统一口径防御，需待 artDef 就绪）
  });
  return st;
}
function linggenTrait(s) { if (!s.linggen) return null; if (s.linggen.trait) return s.linggen.trait.effect || null; if (s.linggen.body) return s.linggen.body; return null; }
function applyWuxing(s, attr, base) {
  if (!s.array || !s.array.wuxing) return base;
  const lv = (s.craft && s.craft.zhenfa && s.craft.zhenfa.lv) || 1;
  let mul = 1;
  WUXING_ORDER.forEach(key => {
    if (!s.array.wuxing[key]) return;
    const def = WUXING_ARRAY[key];
    if (def.attr !== attr) return;
    mul += def.pctByLv[Math.min(lv, 5)];
  });
  return base * mul;
}
function effAttr(s, k) { return (s[k] || 0) + getDestinyAttrBonus(s, k) + ((s.artAttr && s.artAttr[k]) || 0); }
/* 当前「装备心法」本体 + 其附加效果（与 engine.js 同口径：只认已装备的那一本） */
function xinfaCur(s) { return (s.techEquip && s.techEquip.xinfa && TECHNIQUES[s.techEquip.xinfa]) || null; }
function getXinfaAtkMul(s) { const t = xinfaCur(s); return (t && t.atkMul) || 0; }
function getXinfaSpellMul(s) { const t = xinfaCur(s); return (t && t.spellMul) || 0; }
function getXinfaGuard(s) { const t = xinfaCur(s); return (t && t.guard) || 0; }
function getXinfaHpMax(s) { const t = xinfaCur(s); return (t && t.hpMax) || 0; }
function getXinfaReduceDmg(s) { const t = xinfaCur(s); return (t && t.reduceDmg) || 0; }
function techMult(s) {
  const bonus = 1 + getTechTypeBonus(s, 'xinfa');
  const x = s.techEquip && s.techEquip.xinfa && TECHNIQUES[s.techEquip.xinfa];
  if (x && x.mult) return x.mult * bonus;
  if (!s.techs.length) return 1;
  let m = 1; s.techs.forEach(t => { const y = TECHNIQUES[t]; if (y && y.mult > m) m = y.mult; }); return m > 1 ? m * bonus : m;
}
function calcHpMax(s) {
  const tiCoeff = 50 * (1 + (artifactStats(s).tiHpBonus || 0)) * (talentApply(s, 'tiMul') || 1);
  let m = 80 + effAttr(s, 'ti') * tiCoeff + bigIdxOf(s) * 80;
  const eff = linggenTrait(s); if (eff && eff.hpMax) m += eff.hpMax;
  if (s.sect && SECTS[s.sect] && SECTS[s.sect].effect.hpMax) m += SECTS[s.sect].effect.hpMax;
  m += s.hpMaxBonus || 0;
  m += equipStats(s).hpMax;
  m += artifactStats(s).hpMax;
  m += getXinfaHpMax(s);   // 玄天门系心法固定气血（护山心经+50/天罡心法+100/玄武真经+150）
  m = Math.round(m * (1 + (equipStats(s).hpPct || 0) / 100));   // 装备「气血上限 %」
  m = applyWuxing(s, 'hpMax', m);
  return Math.round(m);
}
function calcAtk(s) {
  let a = 10 + bigIdxOf(s) * 15;
  a += effAttr(s, 'shen') * 5;
  a += effAttr(s, 'ling') * 5;
  if (s.talents.indexOf('kejian') >= 0) a *= 1.2;
  const eff = linggenTrait(s); if (eff && eff.atk) a += eff.atk;
  if (s.sect && SECTS[s.sect] && SECTS[s.sect].effect.atkMul) a *= (1 + SECTS[s.sect].effect.atkMul);
  let tAM = 0; s.talents.forEach(tid => { const t = D.TALENTS.filter(x => x.id === tid)[0]; if (t && t.apply && t.apply.atkMul) tAM += t.apply.atkMul; }); if (tAM > 0) a *= (1 + tAM);
  a *= getDestinyAttrMult(s, 'atk');
  a *= (1 + getXinfaAtkMul(s));   // 宗门心法攻击加成（青云剑诀+5% … 太虚剑典+20%）
  s.talents.forEach(tid => { const t = D.TALENTS.filter(x => x.id === tid)[0]; if (t && t.apply && t.apply.allMul) a *= (1 + t.apply.allMul); });
  a += s.extraAtk || 0;
  a += equipStats(s).atk;
  const art = artifactStats(s); a += art.atk;
  if (art.defToAtk) a += Math.round(getDefense(s) * art.defToAtk);   // 棘鳞甲：防御值×N 转攻击（统一口径）
  a = Math.round(a * (1 + art.atkPct));
  a = applyWuxing(s, 'atk', a);
  return Math.round(a);
}
function calcMpMax(s) {
  let m = 20 + Math.max(0, effAttr(s, 'ling') - 1) * 20;
  const eff = linggenTrait(s); if (eff && eff.mpMax) m += eff.mpMax;
  m = Math.round(m * (1 + (equipStats(s).mpPct || 0) / 100));   // 装备「灵力上限 %」
  m = applyWuxing(s, 'mpMax', m);
  return Math.round(m);
}
function cultGain(s) {
  const CULT_REALM = [0, 1, 5, 6];
  let g = (60 + s.wu * 10) * (1 + 0.3 * CULT_REALM[bigIdxOf(s)]);
  if (s.wu >= 10) g *= 1.1;
  g *= techMult(s);
  if (s.linggen) g *= (s.linggen.qiMul || 1);
  if (s.talents.indexOf('daoti') >= 0) g *= 1.1;
  if (s.array && s.array.juling && s.array.juling.level > 0) { const jl = JULING_ARRAY[s.array.juling.level]; if (jl) g *= (1 + jl.pct); }
  if (s.flags && s.flags.daoLu) g *= 1.1;
  if (s.flags && s.flags.petGrown) g *= 1.15; else if (s.flags && s.flags.pet) g *= 1.05;
  g *= 1 + ((s.reinc && s.reinc.cult) || 0) * 0.10;
  // 舍生（s.reinc.shesheng）已于 2026-09-14 删除，模拟器同步下线该乘区
  let tCM = 0; s.talents.forEach(tid => { const t = D.TALENTS.filter(x => x.id === tid)[0]; if (t && t.apply && t.apply.cultMul) tCM += t.apply.cultMul; }); if (tCM > 0) g *= (1 + tCM);
  s.talents.forEach(tid => { const t = D.TALENTS.filter(x => x.id === tid)[0]; if (t && t.apply && t.apply.allMul) g *= (1 + t.apply.allMul); });
  g *= 1 + equipStats(s).cult;
  if (s.sect && SECTS[s.sect] && SECTS[s.sect].effect.cultMul) g *= (1 + SECTS[s.sect].effect.cultMul);
  g *= 1 + artifactStats(s).cult;
  if ((s.elixirs && s.elixirs.juling || 0) > 0) { s.elixirs.juling--; if (s.elixirs.juling <= 0) delete s.elixirs.juling; g *= 1.2; }
  return Math.round(g);
}
function getCritRate(s) { return effAttr(s, 'shen') * 0.01 * (talentApply(s, 'shenMul') || 1) + effAttr(s, 'dao') * 0.02 + getDestinyBonus(s, 'critRate') + (s.critPct || 0) + artifactStats(s).critPct + (equipStats(s).critPct || 0) / 100; }
function getDodgeRate(s) { return effAttr(s, 'dun') * 0.02 * (talentApply(s, 'dunMul') || 1) + getDestinyBonus(s, 'dodgeRate') + (s.dodgePct || 0) + artifactStats(s).dodgePct; }
/* 防御：唯一权威口径（与 engine.js getDefense/getDefensePct/getDefenseDiv 逐字一致） */
function getDefense(s) {
  const base = Math.round(Math.round(effAttr(s, 'ti') * 0.5) * getDestinyAttrMult(s, 'def'));
  return base + (equipStats(s).def || 0) + (s.flatDef || 0) + (s.artDef || 0);
}
function getDefensePct(s) { return Math.min(0.9, (s.earthPct || 0) + (s.artDefPct || 0)); }
function getDefenseDiv(s) { return s.jinylvDef || 0; }
function refresh(s) {
  const a = artifactStats(s);
  s.artAttr = { wu: a.wu, ti: a.ti, dun: a.dun, shen: a.shen, dao: a.dao, ling: a.ling };
  const eff = linggenTrait(s);
  let critPct = (eff && eff.critPct) ? eff.critPct / 100 : 0;
  let dodgePct = (eff && eff.dodgePct) ? eff.dodgePct / 100 : 0;
  let tribPct = (eff && eff.tribPct) ? eff.tribPct / 100 : 0;
  let flatDef = (eff && eff.def) ? eff.def : 0;
  let earthPct = 0;
  if (s.array && s.array.wuxing) { const lv = (s.craft && s.craft.zhenfa && s.craft.zhenfa.lv) || 1; WUXING_ORDER.forEach(key => { if (!s.array.wuxing[key]) return; const def = WUXING_ARRAY[key]; if (def.attr === 'critPct') critPct += def.pctByLv[Math.min(lv, 5)]; if (def.attr === 'dodgePct') dodgePct += def.pctByLv[Math.min(lv, 5)]; if (def.attr === 'tribPct') tribPct += def.pctByLv[Math.min(lv, 5)]; if (def.attr === 'def') earthPct += def.pctByLv[Math.min(lv, 5)]; }); }
  s.critPct = critPct; s.dodgePct = dodgePct; s.tribPct = tribPct; s.flatDef = flatDef; s.earthPct = earthPct;
  s.artDef = a.def; s.artDefPct = a.defPct; s.cultMax = a.cultTwice ? 2 : 1;
  s.hpMax = calcHpMax(s); s.atk = calcAtk(s);
  if (s.hp === undefined || s.hp > s.hpMax) s.hp = s.hpMax;
  s.mpMax = calcMpMax(s);
  if (s.mp === undefined || s.mp > s.mpMax) s.mp = s.mpMax;
  if (s.equip && Array.isArray(s.equip.treasure) && s.equip.treasure.indexOf('jinylv') >= 0) s.jinylvDef = Math.min(3.0, Math.floor((s.stone || 0) / 100) * 0.01); else s.jinylvDef = 0;
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
// 死忠玩家：全部天赋拉满（1406点，六维满9）
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
function buildProfile(kind, realm) {
  const bi = bigIdxOf(realm);
  const s = {
    realm, idx: bigIdxOf(realm), year: 0, wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0,
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

  // 命格（TALENTS）：死忠 kejian(攻×1.2)+daoti(修×1.1)+cult(修+10%)；正常仅 cult
  s.talents = kind === 'hardcore' ? ['kejian', 'daoti', 'cult'] : ['cult'];

  // 心法（techMult 仅影响修炼速度）
  s.techEquip.xinfa = kind === 'hardcore' ? 'kaitian' : 'xt_xinfa2';

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
const SPELL_DMG = { 黄: 2.0, 玄: 3.0, 地: 4.0, 天: 4.5 };
const SPELL_COST = { 黄: 15, 玄: 25, 地: 45, 天: 70 };
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
// 秘境敌人（enemyGen 复刻：固定境界基线 × depth 递增 × 叠劫）
function advEnemy(p, tier, depth, boss, elite, jie) {
  const jieDiff = (JIE_DATA[jie] && JIE_DATA[jie].diff) ? JIE_DATA[jie].diff : 1;
  const realmTier = (tier === 'tian' || tier === 'xian') ? 3 : (tier === 'di' ? 2 : (tier === 'xuan' ? 1 : 0));
  const hits = (elite ? 5.0 : 4.0) + depth * 0.5;
  const hpMul = hits * (boss ? 2.0 : 1);                                   // 旧: s.atk * hits * (boss?2:1)
  const atkMul = (elite ? 1.3 : 1) / (boss ? 9 : (5 + depth * 0.4));       // 旧: s.hpMax / denom * elite
  const st = genEnemyStats(realmTier, atkMul, hpMul, jieDiff, { atkRef: 'hp', hpRef: 'atk' });
  return { hp: st.hp, atk: st.atk, hits };
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
  const label = kind === 'normal' ? '正常玩家(轮回阁~600点)' : '死忠玩家(六维满9/全天赋1406)';
  console.log('──── ' + label + ' ────');
  console.log('境界 | 轮回阁花费 | 攻(atk) | 血(hp) | 灵力(mp) | 修炼/次 | 暴击% | 闪避% | 防御');
  realms.forEach(r => {
    const s = buildProfile(kind, r);
    const cg = cultGain(s);
    console.log(
      r.padEnd(4) + ' | ' + String(s.spent).padStart(6) + ' | ' +
      String(s.atk).padStart(6) + ' | ' + String(s.hpMax).padStart(6) + ' | ' + String(s.mpMax).padStart(6) + ' | ' +
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
    const s = buildProfile(kind, r);
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
