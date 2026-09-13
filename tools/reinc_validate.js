/* DEDAO 轮回结算重做 —— 断言式校验脚本（直读 data.js 真实配置）
 * 运行：node tools/reinc_validate.js
 */
const fs = require('fs');
const path = require('path');

const DATA = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  → ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
}

/* ---------- 1. 直读 REINCARNATION 计算真实加满成本（max 已改 9） ---------- */
console.log('\n=== 测试1：六维 max=9 加满成本（直读 data.js）===');
const m = DATA.match(/const REINCARNATION = (\[[\s\S]*?\n\];)/);
if (!m) { console.log('  ❌ 未找到 REINCARNATION'); process.exit(1); }
const REINC = eval('(' + m[1].replace(/;\s*$/, '') + ')');
const costOf = r => r.cost * r.max * (r.max + 1) / 2; // 第 n 级 = cost×n
const sixIds = ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'];
let sixTotal = 0, allTotal = 0;
REINC.forEach(r => {
  const c = costOf(r);
  allTotal += c;
  if (sixIds.indexOf(r.id) >= 0) sixTotal += c;
  console.log('  ' + r.id.padEnd(14) + ' cost=' + r.cost + ' max=' + r.max + ' 满级=' + c);
});
check('六维核心全满 = 1080', sixTotal === 1080, sixTotal);
check('全部天赋全满 = 1406', allTotal === 1406, allTotal);
check('道心(dao)+悟性(wu) = 540（单维各270）', (costOf(REINC.find(x=>x.id==='dao')) + costOf(REINC.find(x=>x.id==='wu'))) === 540);

/* ---------- 2. 复刻最终 earnPoints 公式 ---------- */
console.log('\n=== 测试2：最终结算公式（五类求和 + jie×0.2 + round(base×jie×0.05)，删 jie×2）===');
const TIER_PTS = { huang: 2, xuan: 4, di: 7, tian: 11, xian: 15 };
const ORDER = ['huang', 'xuan', 'di', 'tian', 'xian'];
function advPoints(realm, advCleared) {
  const cleared = ORDER.filter(k => advCleared.indexOf(k) >= 0);
  let pts = 0; cleared.forEach(k => pts += TIER_PTS[k]);
  const n = cleared.length;
  if (n >= 4) pts += 8; else if (n >= 3) pts += 4; else if (n >= 2) pts += 2;
  const tier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
  const cap = (tier[realm] || 2) * 2;
  return Math.min(pts, cap);
}
function earn(s) {
  const tier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
  const realm = tier[s.realm] || 2;
  const trib = Math.min(10, Math.floor((s.broken || 0) / 3));
  const death = (s.deathPassed || 0) * 2;
  const adv = advPoints(s.realm, s.adv || []);
  const ach = s.achPts || 0;
  const base = realm + trib + death + adv + ach;
  const jie = s.jie || 0;
  const K = 0.05;
  return Math.round(base * (1 + jie * 0.2)) + Math.round(base * jie * K);
}

/* 典型可达场景（含秘境探索 + 新成就，max 努力） */
const SCEN = [
  { tag: '炼气初陨', realm: '炼气', broken: 0, deathPassed: 0, adv: ['huang'],            achPts: 2,  jie: 0 },
  { tag: '筑基陨',   realm: '筑基', broken: 0, deathPassed: 1, adv: ['huang','xuan'],     achPts: 4,  jie: 0 },
  { tag: '金丹陨',   realm: '金丹', broken: 2, deathPassed: 2, adv: ['huang','xuan','di'], achPts: 9,  jie: 0 },
  { tag: '元婴陨',   realm: '元婴', broken: 2, deathPassed: 4, adv: ['huang','xuan','di','tian'], achPts: 14, jie: 0 },
  { tag: '飞升',     realm: '仙',   broken: 3, deathPassed: 4, adv: ['huang','xuan','di','tian','xian'], achPts: 48, jie: 0 }
];

console.log('\n=== 测试3：逐场景单局收益（K=0.05，删 jie×2）===');
console.log('场景'.padEnd(10) + '| jie0'.padStart(5) + ' | jie3'.padStart(5) + ' | jie6'.padStart(5) + ' | jie9'.padStart(5));
let worst = 0, worstTag = '';
SCEN.forEach(s => {
  const e0 = earn(s), e3 = earn({ ...s, jie: 3 }), e6 = earn({ ...s, jie: 6 }), e9 = earn({ ...s, jie: 9 });
  console.log(s.tag.padEnd(8) + ' | ' + String(e0).padStart(5) + ' | ' + String(e3).padStart(5) + ' | ' + String(e6).padStart(5) + ' | ' + String(e9).padStart(5));
  check(s.tag + ' 单调递增(jie0≤3≤6≤9)', e0 <= e3 && e3 <= e6 && e6 <= e9);
  check(s.tag + ' 全部 > 0', e0 > 0 && e9 > 0);
  const r = e9 / e0;
  if (r > worst) { worst = r; worstTag = s.tag; }
});

console.log('\n=== 测试4：高劫膨胀收敛性（K=0.05，删 jie×2）===');
check('最坏倍数 ≤ 4x（原 flat jie×5 为 13x）', worst <= 4, worstTag + ' ' + worst.toFixed(2) + 'x');

console.log('\n=== 测试5：死劫计数贡献生效 ===');
const base = { realm: '元婴', broken: 2, deathPassed: 0, adv: ['huang','xuan','di','tian'], achPts: 14, jie: 0 };
const withDeath = earn({ ...base, deathPassed: 3 });
check('多通过3次死劫 → +6 点（元婴 jie0）', withDeath - earn(base) === 6, '+' + (withDeath - earn(base)));

console.log('\n=== 测试6：秘境探索分计入且受封顶 ===');
const a1 = advPoints('炼气', ['huang']);               // 2, cap4 → 2
const a2 = advPoints('筑基', ['huang','xuan']);         // 6, cap8 → 6
const a3 = advPoints('炼气', ['huang','xuan','di','tian']); // 24, cap4 → 4 (低境界封顶)
check('炼气首通黄 = 2（封顶4）', a1 === 2, a1);
check('筑基通关黄+玄 = 8（2+4+广度2，封顶8）', a2 === 8, a2);
check('炼气越级刷4秘境被封顶到 4', a3 === 4, a3);

console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
process.exit(fail ? 1 : 0);
