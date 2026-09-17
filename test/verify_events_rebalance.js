/* 验证脚本：确认 12 个金丹/元婴 EVENTS 已加 enemyBoss（10层精英）且 enemyGen 数值正确，
 * 以及 3 个止恶事件已标 zhie:true。运行：node test/verify_events_rebalance.js
 */
const { createGameContext } = require('./automated/_harness');
const { get } = createGameContext({ files: ['js/data.js', 'js/engine.js'] });
const DATA = get('DATA') || {};
const EVENTS = get('EVENTS');
const MAINLINE = get('MAINLINE') || [];
const XIANYUAN = get('XIANYUAN') || [];
const E = get('Engine');

const all = [];
for (const t of Object.keys(EVENTS)) for (const ev of EVENTS[t]) all.push(ev);
for (const ev of MAINLINE) all.push(ev);
for (const ev of XIANYUAN) all.push(ev);
const byId = {};
for (const ev of all) byId[ev.id] = ev;

function findFight(ev, name) {
  let found = null;
  function walk(cs) {
    if (!cs || !cs.length) return;
    for (const c of cs) {
      if (c && c.fight && (!name || c.fight.name === name)) found = c;
      if (c && c.choices) walk(c.choices);
      if (c && c.next && c.next.choices) walk(c.next.choices);
    }
  }
  walk(ev.choices);
  return found;
}

// 12 金丹/元婴事件：id -> adv
const UPG = {
  gushi_yifu: 'di', tianji_dao: 'di', shimen: 'di', han_feng_tan: 'di', shanhe_tafeng: 'di', ml_5_2: 'di',
  huo_mai_dong: 'tian', shanggu_yaoyuan: 'tian', xukong_lie: 'tian', xingluo_gu: 'tian', leichi: 'tian', huangshen_tan: 'tian'
};
// tianji_dao 有两处（天机傀儡/石门机关），han_feng_tan 冰蛟, shanhe_tafeng 风灵兽
const TARGETS = [
  ['gushi_yifu', '守府阵灵', 'di'],
  ['tianji_dao', '天机傀儡', 'di'],
  ['tianji_dao', '石门机关', 'di'],
  ['han_feng_tan', '冰蛟', 'di'],
  ['shanhe_tafeng', '风灵兽', 'di'],
  ['ml_5_2', '魔修先锋', 'di'],
  ['huo_mai_dong', '火脉元灵', 'tian'],
  ['shanggu_yaoyuan', '守园老龟', 'tian'],
  ['xukong_lie', '虚空兽潮', 'tian'],
  ['xingluo_gu', '吞星巨蟒', 'tian'],
  ['leichi', '雷池元灵', 'tian'],
  ['huangshen_tan', '荒神残念', 'tian'],
];

let ok = true;
console.log('=== 金丹/元婴 EVENTS 守敌验证（10层精英）===');
for (const [id, fname, adv] of TARGETS) {
  const ev = byId[id];
  if (!ev) { console.log('✗ 找不到事件 ' + id); ok = false; continue; }
  const fc = findFight(ev, fname);
  if (!fc) { console.log('✗ ' + id + ' 找不到战斗 ' + fname); ok = false; continue; }
  if (!fc.fight.enemyBoss) { console.log('✗ ' + id + '/' + fname + ' 未加 enemyBoss'); ok = false; continue; }
  const eb = fc.fight.enemyBoss;
  if (eb.adv !== adv || eb.tag !== 'elite' || eb.depth !== 10) { console.log('✗ ' + id + '/' + fname + ' enemyBoss 参数错: ' + JSON.stringify(eb)); ok = false; continue; }
  // 用 enemyGen 生成，确认数值
  const g = E.enemyGen({ jie: 0 }, eb.tag, eb.depth, eb.adv);
  const bench = adv === 'di' ? { atk: 418, hp: 1980 } : { atk: 429, hp: 2245 };
  const inBand = g.atk >= bench.atk * 0.95 && g.hp >= bench.hp * 0.95;
  console.log(`  ${adv === 'di' ? '金丹' : '元婴'} ${fname}: enemyGen atk=${g.atk} hp=${g.hp} (基准 ${bench.atk}/${bench.hp}) ${inBand ? '✓' : '✗'}`);
  if (!inBand) ok = false;
  if (fc.fight.atk != null || fc.fight.hp != null) { console.log('  ⚠ ' + id + '/' + fname + ' 仍残留写死 atk/hp，应删除'); ok = false; }
}

const ZHIE = ['shijin_yijian', 'chou_xiang', 'moyou_shanyao'];
console.log('\n=== 止恶事件 zhie 标记验证 ===');
for (const id of ZHIE) {
  const ev = byId[id];
  if (!ev) { console.log('✗ 找不到 ' + id); ok = false; continue; }
  const fc = findFight(ev, null); // 取第一个战斗
  // 找带 zhie 的战斗选项
  let zhieFound = false;
  function walk(cs) { if (!cs) return; for (const c of cs) { if (c && c.zhie) zhieFound = true; if (c && c.choices) walk(c.choices); if (c && c.next && c.next.choices) walk(c.next.choices); } }
  walk(ev.choices);
  console.log(`  ${id}: zhie=${zhieFound ? '✓' : '✗'}`);
  if (!zhieFound) ok = false;
}

console.log('\n结果: ' + (ok ? '全部通过 ✓' : '存在失败 ✗'));
process.exit(ok ? 0 : 1);
