/* DEDAO 检测池 —— 装备池 / 法宝池 全量体检
 * 运行： node tools/pool-audit.js
 *        node tools/pool-audit.js --md        （额外输出 markdown 报告到 test/reports/）
 *
 * 检测内容：
 *   A. 装备池 EQUIPS：字段完整性 / 品质覆盖矩阵 / 子类 tier 连续性 / 数值梯度 / 重名
 *   B. 炼器可达性：每条配方的 slot+sub 在其品阶 tier 区间内是否都有模板（rollForge 不得返回 null）
 *   C. 掉落可达性：每个秘境阶位的 tier 区间内，每个槽位是否都有候选（randomEquip 不得返回 null）
 *   D. 法宝池 ARTIFACTS：字段完整性 / effect 生效键 / 孤儿（无任何发放途径）/ 重名
 *   E. 交叉引用：商店 / 剧情 / 掉落 中引用的 id 是否悬空
 *   F. 剧情装备实装：loot.equip / effect.equip 引用的装备是否真实存在（蚕丝甲 bug 的守卫）
 */
const fs = require('fs');
const path = require('path');
const { ROOT, createGameContext } = require('../test/automated/_harness');

const SRC = ['js/data.js', 'js/engine.js', 'js/ui.js']
  .map(f => ({ f, code: fs.readFileSync(path.join(ROOT, f), 'utf8') }));
const ALL_SRC = SRC.map(x => x.code).join('\n');
const DATA_JS = SRC[0].code;

const errors = [];
const warns = [];
const notes = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const note = (m) => notes.push(m);

/* ---------- 加载真实数据 ---------- */
const g = createGameContext({ files: ['js/data.js', 'js/engine.js'] });
const EQUIPS = g.get('EQUIPS') || {};
const ARTIFACTS = g.get('ARTIFACTS') || {};
const FORMULAS = g.get('FORMULAS') || [];
const EQUIP_SLOTS = g.get('EQUIP_SLOTS') || {};
const EQUIP_TIERS = g.get('EQUIP_TIERS') || {};
const SECT_GOODS = g.get('SECT_GOODS') || [];
const ART_SHOP_ITEMS = g.get('ART_SHOP_ITEMS') || [];
const GRADE_TIER_RANGE = { '黄': [1, 2], '玄': [2, 3], '地': [3, 4], '天': [4, 5] };
const REALM_TIER_RANGE = [[1, 2], [2, 3], [3, 4], [4, 5]];  // 炼气/筑基/金丹/元婴

const TIER_NAME = (t) => (EQUIP_TIERS[t] && EQUIP_TIERS[t].name) || ('tier' + t);
const SLOT_NAME = (s) => (EQUIP_SLOTS[s] && EQUIP_SLOTS[s].name) || s;

/* ================= A. 装备池 ================= */
console.log('\n══════ A. 装备池（EQUIPS） ══════');
const gearSlots = Object.keys(EQUIPS);
let equipTotal = 0;
const nameSeen = {};
gearSlots.forEach(slot => {
  const bucket = EQUIPS[slot];
  const ids = Object.keys(bucket);
  equipTotal += ids.length;
  console.log(`\n【${SLOT_NAME(slot)} / ${slot}】${ids.length} 件`);

  // 品质分布
  const byTier = {};
  ids.forEach(id => { byTier[bucket[id].tier] = (byTier[bucket[id].tier] || 0) + 1; });
  console.log('  品质分布: ' + Object.keys(byTier).sort().map(t => `tier${t}(${TIER_NAME(t)})×${byTier[t]}`).join('  '));

  ids.forEach(id => {
    const it = bucket[id];
    const tag = `${slot}.${id}`;
    // 字段完整性（treasure 槽豁免 main/sub：它用扁平 atk/hpMax 字段）
    const isTreasure = slot === 'treasure';
    if (!it.name) err(`${tag} 缺 name`);
    if (!it.tier) err(`${tag} 缺 tier`);
    if (!it.desc) warn(`${tag} 缺 desc（玩家看不到说明）`);
    if (!isTreasure) {
      if (!it.sub) err(`${tag} 缺 sub（炼器配方按 sub 定位，缺失则炼不出来）`);
      if (!it.main) err(`${tag} 缺 main（主属性）`);
    }
    if (it.price == null) warn(`${tag} 缺 price（无法出售/估价）`);
    // 重名
    if (it.name) {
      nameSeen[it.name] = nameSeen[it.name] || [];
      nameSeen[it.name].push(tag);
    }
  });

  // 子类 tier 连续性
  const subs = {};
  ids.forEach(id => {
    const it = bucket[id];
    if (!it.sub) return;
    (subs[it.sub] = subs[it.sub] || []).push(it.tier);
  });
  if (!isTreasureSlot(slot)) {
    Object.keys(subs).forEach(sub => {
      const have = [...new Set(subs[sub])].sort();
      const missing = [1, 2, 3, 4, 5].filter(t => have.indexOf(t) < 0);
      if (missing.length) {
        const lv = missing.length === 5 ? err : warn;
        lv(`${slot}/${sub} 缺 tier ${missing.join(',')}（现有 ${have.join(',')}）`);
      }
    });
  }

  // 数值梯度：同子类按 tier 递增（主属性和）
  Object.keys(subs).forEach(sub => {
    const list = ids.map(id => Object.assign({ _id: id }, bucket[id]))
      .filter(it => it.sub === sub && it.main)
      .sort((a, b) => a.tier - b.tier);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (b.tier <= a.tier) continue;
      const sum = (o) => Object.keys(o.main).reduce((s, k) => s + (Number(o.main[k]) || 0), 0);
      if (sum(b) < sum(a)) {
        warn(`${slot}/${sub} 数值倒挂: tier${a.tier}(${a._id},和${sum(a)}) → tier${b.tier}(${b._id},和${sum(b)})`);
      }
    }
  });
});
function isTreasureSlot(slot) { return slot === 'treasure'; }

// 全局重名
Object.keys(nameSeen).forEach(n => {
  if (nameSeen[n].length > 1) err(`装备重名「${n}」: ${nameSeen[n].join(' / ')}`);
});
console.log(`\n装备合计 ${equipTotal} 件（${gearSlots.length} 个槽位）`);
note(`装备池 ${equipTotal} 件 / ${gearSlots.length} 槽位`);

/* ================= B. 炼器可达性 ================= */
console.log('\n══════ B. 炼器配方可达性（rollForge 不得返回 null） ══════');
let forgeBad = 0;
FORMULAS.forEach(f => {
  if (f.type !== '装备' || !f.slot || !f.sub) return;
  const range = GRADE_TIER_RANGE[f.grade] || [1, 5];
  const bucket = EQUIPS[f.slot] || {};
  for (let t = range[0]; t <= range[1]; t++) {
    const hit = Object.keys(bucket).some(id => bucket[id].sub === f.sub && bucket[id].tier === t);
    if (!hit) {
      err(`配方 ${f.id}（${f.slot}/${f.sub} ${f.grade}级）在 tier${t} 无模板 → 炼器可能产出 null`);
      forgeBad++;
    }
  }
});
console.log(`  配方 ${FORMULAS.filter(f => f.type === '装备').length} 条，不可达 ${forgeBad} 处`);
note(`炼器配方 ${FORMULAS.filter(f => f.type === '装备').length} 条，不可达 ${forgeBad} 处`);

/* ================= C. 掉落可达性 ================= */
console.log('\n══════ C. 秘境掉落可达性（randomEquip 不得返回 null） ══════');
const DROP_SLOTS = ['weapon', 'head', 'body', 'accessory'];
let dropBad = 0;
REALM_TIER_RANGE.forEach((range, bi) => {
  const realm = ['炼气', '筑基', '金丹', '元婴'][bi];
  const holes = [];
  for (let t = range[0]; t <= range[1]; t++) {
    DROP_SLOTS.forEach(slot => {
      const bucket = EQUIPS[slot] || {};
      const hit = Object.keys(bucket).some(id => bucket[id].tier === t);
      if (!hit) holes.push(`${slot}@tier${t}`);
    });
  }
  if (holes.length) {
    err(`${realm} 秘境掉落空洞: ${holes.join(', ')}`);
    dropBad += holes.length;
  } else {
    console.log(`  ✓ ${realm}（tier ${range[0]}~${range[1]}）四个槽位均有候选`);
  }
});
note(`掉落空洞 ${dropBad} 处`);

/* ================= D. 法宝池 ================= */
console.log('\n══════ D. 法宝池（ARTIFACTS） ══════');
const artIds = Object.keys(ARTIFACTS);
const artByName = {};
// 法宝「生效键」白名单（与 engine.artEffectText 对齐）
const EFFECT_KEYS = ['wu', 'ti', 'dun', 'shen', 'dao', 'ling', 'atk', 'hpMax', 'def', 'critPct', 'dodgePct', 'defPct',
  'atkPct', 'cult', 'stealPct', 'tiHpBonus', 'duantiEff', 'duantiShenEff', 'atkSpd', 'duantiMax', 'craftEff',
  'farmEff', 'mineEff', 'stoneYearPct', 'cultTwice', 'doubleCult', 'doubleDmg', 'modeBonus', 'craftKind',
  'daoAtkPct', 'lowHpAtk', 'defToAtk', 'scale'];
const byGrade = {};
artIds.forEach(id => {
  const a = ARTIFACTS[id];
  byGrade[a.grade] = (byGrade[a.grade] || 0) + 1;
  if (!a.name) err(`法宝 ${id} 缺 name`);
  if (!a.grade) err(`法宝 ${id} 缺 grade`);
  if (!a.desc) warn(`法宝 ${id} 缺 desc`);
  const e = a.effect;
  if (!e || typeof e !== 'object') err(`法宝 ${id} 缺 effect（装了没任何用）`);
  else if (!EFFECT_KEYS.some(k => e[k] !== undefined && e[k] !== null)) err(`法宝 ${id} 的 effect 无任何生效键`);
  if (a.name) { artByName[a.name] = artByName[a.name] || []; artByName[a.name].push(id); }
  // 孤儿：全代码中不存在任何「带引号」的字面引用 → 玩家永远拿不到
  //   ⚠️ 注意：对象定义处是不带引号的键（如 `dashen_bian: { ... }`），不会被计入，
  //      因此 refs 计的是**除定义外**的字面引用次数，0 次即孤儿。
  const refs = (ALL_SRC.match(new RegExp(`['"]${id}['"]`, 'g')) || []).length;
  if (refs === 0) err(`法宝 ${id}（${a.name}）是孤儿：全代码无任何字面引用，无发放途径`);
});
Object.keys(artByName).forEach(n => {
  if (artByName[n].length > 1) err(`法宝重名「${n}」: ${artByName[n].join(' / ')}`);
});
console.log(`  法宝 ${artIds.length} 件，品阶分布: ` +
  Object.keys(byGrade).map(k => `${k}×${byGrade[k]}`).join('  '));
note(`法宝池 ${artIds.length} 件`);

// EQUIPS.treasure 也应能被拿到（它走法宝囊体系）
const treasureIds = Object.keys(EQUIPS.treasure || {});
treasureIds.forEach(id => {
  const refs = (ALL_SRC.match(new RegExp(`['"]${id}['"]`, 'g')) || []).length;
  if (refs === 0) warn(`宝物 EQUIPS.treasure.${id}（${EQUIPS.treasure[id].name}）无字面引用，可能拿不到`);
});

/* ================= E. 交叉引用悬空 ================= */
console.log('\n══════ E. 交叉引用悬空检测 ══════');
function existsAnywhere(id) {
  if (ARTIFACTS[id]) return true;
  for (const s in EQUIPS) if (EQUIPS[s][id]) return true;
  return false;
}
const dangling = [];
SECT_GOODS.forEach(gd => {
  const ref = gd.ref || gd.id;
  if ((gd.kind === 'art' || gd.kind === 'equip') && ref && !existsAnywhere(ref)) dangling.push(`SECT_GOODS.${ref}`);
});
ART_SHOP_ITEMS.forEach(it => { if (it.id && !existsAnywhere(it.id)) dangling.push(`ART_SHOP.${it.id}`); });
if (dangling.length) err(`商店引用了不存在的法宝/装备: ${dangling.join(', ')}`);
console.log(`  宗门商品 ${SECT_GOODS.length} 件 / 商贩池 ${ART_SHOP_ITEMS.length} 件，悬空 ${dangling.length} 个`);
note(`商店悬空引用 ${dangling.length} 个`);

/* ================= F. 剧情装备实装 ================= */
console.log('\n══════ F. 剧情 / 掉落装备实装检测 ══════');
const equipRefs = new Set();
for (const m of DATA_JS.matchAll(/equip:\s*['"]([a-z_]+)['"]/g)) equipRefs.add(m[1]);
const SLOT_KEYS = new Set(['head', 'body', 'leg', 'treasure']);
const badEquip = [...equipRefs].filter(id => !SLOT_KEYS.has(id) && !existsAnywhere(id));
badEquip.forEach(id => err(`剧情/掉落引用了不存在的装备 id: ${id}（文案承诺发放，实际拿不到）`));
console.log(`  剧情/掉落装备引用 ${equipRefs.size} 个，悬空 ${badEquip.length} 个`);

// 反向：所有 art: 'xxx' 引用是否存在
const artRefs = new Set();
for (const m of DATA_JS.matchAll(/\bart:\s*['"]([a-z_0-9]+)['"]/g)) artRefs.add(m[1]);
const badArt = [...artRefs].filter(id => !existsAnywhere(id));
badArt.forEach(id => err(`剧情引用了不存在的法宝 id: ${id}`));
console.log(`  剧情法宝引用 ${artRefs.size} 个，悬空 ${badArt.length} 个`);
note(`剧情装备引用 ${equipRefs.size} / 法宝引用 ${artRefs.size}，悬空 ${badEquip.length + badArt.length}`);

/* ================= 汇总 ================= */
console.log('\n══════ 检测池汇总 ══════');
console.log(`  装备 ${equipTotal} 件 / 法宝 ${artIds.length} 件`);
console.log(`  错误 ${errors.length} 条，警告 ${warns.length} 条`);
if (errors.length) {
  console.log('\n  ❌ 错误明细:');
  errors.forEach(e => console.log('     · ' + e));
}
if (warns.length) {
  console.log('\n  ⚠️  警告明细:');
  warns.forEach(w => console.log('     · ' + w));
}
notes.forEach(n => console.log('  [note] ' + n));

if (process.argv.indexOf('--md') >= 0) {
  const dir = path.join(ROOT, 'test', 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const md = [
    `# 检测池报告 ${stamp}`,
    '',
    `- 装备 ${equipTotal} 件 / 法宝 ${artIds.length} 件`,
    `- 错误 **${errors.length}** 条，警告 **${warns.length}** 条`,
    '',
    '## 装备池分布',
    '',
    ...gearSlots.map(s => `- ${SLOT_NAME(s)}（${s}）：${Object.keys(EQUIPS[s]).length} 件`),
    '',
    '## 错误',
    '',
    ...(errors.length ? errors.map(e => '- ' + e) : ['（无）']),
    '',
    '## 警告',
    '',
    ...(warns.length ? warns.map(w => '- ' + w) : ['（无）']),
    '',
  ].join('\n');
  const out = path.join(dir, `pool-audit-${stamp}.md`);
  fs.writeFileSync(out, md, 'utf8');
  console.log('\n  markdown 报告: ' + out);
}

process.exit(errors.length ? 1 : 0);
