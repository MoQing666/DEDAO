/* 一次性审计脚本：遍历 EVENTS 中所有 fight: 敌人，按事件 gating 境界归类，
 * 并与该境界「秘境精英怪 10 层」基准（宗门任务所用的同一口径）对照。
 * 运行：node test/audit_events_foes.js
 */
const { createGameContext } = require('./automated/_harness');
const { get } = createGameContext({ files: ['js/data.js', 'js/engine.js'] });

const EVENTS = get('EVENTS');
const MAINLINE = get('MAINLINE') || [];
const XIANYUAN = get('XIANYUAN') || [];
const E = get('Engine');
const ENEMY_REALM_BASE = get('ENEMY_REALM_BASE');
const ADVENTURE_GRADE = get('ADVENTURE_GRADE');

// 秘境精英怪 10 层基准（与宗门任务 enemyBoss {adv,tag:'elite',depth:10} 同公式）
function eliteBenchmark(realmIdx) {
  // depthFactor = 0.25 + (10-1)*0.04 = 0.61 ; tierMul elite = 1.4
  const bi = ADVENTURE_GRADE.xuan; // 用玄级作默认，但下面按 realm 取对应 grade
  return null;
}
// 直接用引擎 enemyGen 取各境界精英 10 层
function bench(adv, realmIdx) {
  const g = E.enemyGen({ jie: 0 }, 'elite', 10, adv); // jie 不影响 atk/hp（enemyStats 用 ENEMY_REALM_BASE）
  return g;
}
// 各境界对应的 adv 等级
const REALM_ADV = { 炼气: 'huang', 筑基: 'xuan', 金丹: 'di', 元婴: 'tian' };
const REALM_ORDER = ['炼气', '筑基', '金丹', '元婴'];

// 递归收集 fight 敌人
const rows = [];
function walkChoices(choices, ev) {
  if (!Array.isArray(choices)) return;
  for (const c of choices) {
    if (c && c.fight && c.fight.name) {
      rows.push({
        evId: ev.id, evTitle: ev.title,
        needRealm: ev.needRealm || null,
        min: ev.min, max: ev.max, chapter: !!ev.chapter, idx: ev.idx,
        name: c.fight.name,
        atk: c.fight.atk, hp: c.fight.hp,
        loot: c.fight.loot ? Object.keys(c.fight.loot).join(',') : '',
      });
    }
    if (c && c.choices) walkChoices(c.choices, ev);
    if (c && c.next && c.next.choices) walkChoices(c.next.choices, ev);
  }
}
// 收集所有事件源
const allEvents = [];
for (const tag of Object.keys(EVENTS)) {
  for (const ev of EVENTS[tag]) allEvents.push(ev);
}
for (const ev of MAINLINE) allEvents.push(ev);
for (const ev of XIANYUAN) allEvents.push(ev);

for (const ev of allEvents) {
  if (ev.choices) walkChoices(ev.choices, ev);
}

// 归类：有 needRealm 用 needRealm；无则标 '未限定(全龄/主线)'
function realmOf(row) {
  if (row.needRealm) return row.needRealm;
  if (row.idx != null) {
    // 主线 ml_ 事件 idx 映射：从 STAGES 取 realm
    const STAGES = get('STAGES');
    const st = STAGES[row.idx];
    return st ? st.realm : '主线idx' + row.idx;
  }
  return '未限定';
}

const byRealm = {};
for (const r of rows) {
  const rm = realmOf(r);
  (byRealm[rm] = byRealm[rm] || []).push(r);
}

console.log('=== EVENTS fight: 敌人审计（共 ' + rows.length + ' 处）===\n');
for (const rm of REALM_ORDER.concat(['未限定'])) {
  const list = byRealm[rm];
  if (!list || !list.length) continue;
  const adv = REALM_ADV[rm];
  let benchTxt = '—';
  if (adv) {
    const b = bench(adv, rm);
    benchTxt = `精英10层基准 atk≈${b.atk} / hp≈${b.hp}`;
  }
  const atks = list.map(x => x.atk).filter(x => x != null);
  const hps = list.map(x => x.hp).filter(x => x != null);
  console.log(`【${rm}】 ${list.length} 处 | ${benchTxt} | 实际 atk ${Math.min(...atks)}~${Math.max(...atks)} / hp ${Math.min(...hps)}~${Math.max(...hps)}`);
  for (const x of list) {
    const tag = (x.min === 0 && x.max === 14 && !x.needRealm) ? ' [全龄]' : '';
    console.log(`   - ${x.name}  atk:${x.atk} hp:${x.hp}  (${x.evId}·${x.evTitle}${tag})`);
  }
  console.log('');
}

// 全龄社交事件（无 needRealm、min0/max14）单独列出 —— 这些在高境界会变味
const allAges = rows.filter(x => x.min === 0 && x.max === 14 && !x.needRealm);
console.log(`=== 全龄社交「止恶」类（高境界会显得过弱，但非致命）：${allAges.length} 处 ===`);
for (const x of allAges) console.log(`   - ${x.name}  atk:${x.atk} hp:${x.hp}  (${x.evId})`);
