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
check('全部天赋全满 = 1296', allTotal === 1296, allTotal);
check('道心(dao)+悟性(wu) = 540（单维各270）', (costOf(REINC.find(x=>x.id==='dao')) + costOf(REINC.find(x=>x.id==='wu'))) === 540);

/* ---------- 2. 复刻最终 earnPoints 公式（逐项对齐 js/engine.js:4727 earnPoints） ----------
 * ⚠ 2026-09-15 修正三处与引擎的分叉 —— 此前本脚本算出的 jie0 列**整列都是错的**：
 *   ① 渡劫分曾用 `floor(s.broken/3)`。`s.broken` 是「突破次数」（每次小阶提升都 +1），
 *      引擎用的是 `s.tribPassed*3`（渡劫次数：金丹劫 / 元婴劫 / 飞升劫，至多 3 次）。
 *      引擎里已有同源前车之鉴（成就 `sanjie` 曾误用 s.broken，见 engine.js:4801 注释）。
 *   ② 缺结局乘子 `endMul`：飞升 / 仙 1.2、打破轮回 1.5，其余 1.0（engine.js:4740）。
 *   ③ 秘境分漏了 `exploreKills*0.05`（engine.js:4696）。
 *   修正后 jie0 = 6 / 18 / 37 / 61 / 164（旧值 6/18/34/55/129 系错误镜像的产物）。 */
console.log('\n=== 测试2：最终结算公式（五类求和 × endMul × (1+jie×0.2) + round(base×jie×0.05)）===');
const TIER = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
const TIER_PTS = { huang: 2, xuan: 4, di: 7, tian: 11, xian: 15 };
const ORDER = ['huang', 'xuan', 'di', 'tian', 'xian'];
function advPoints(realm, advCleared, exploreKills) {
  const cleared = ORDER.filter(k => advCleared.indexOf(k) >= 0);
  let pts = 0; cleared.forEach(k => pts += TIER_PTS[k]);
  const n = cleared.length;
  if (n >= 4) pts += 8; else if (n >= 3) pts += 4; else if (n >= 2) pts += 2;
  const cap = (TIER[realm] || 2) * 2;
  pts = Math.min(pts, cap);
  pts += Math.round((exploreKills || 0) * 0.05);
  return pts;
}
function endMul(s) {
  if (s.endReason === '打破轮回' || s.hiddenWin) return 1.5;
  if (s.endReason === '飞升' || s.idx >= 15 || s.realm === '仙') return 1.2;
  return 1.0;
}
function earn(s) {
  const realmPts = TIER[s.realm] || 2;
  const tribPts = Math.min(10, (s.tribPassed || 0) * 3);   // ⚠ tribPassed，不是 broken
  const deathPts = (s.deathPassed || 0) * 2;
  const advPts = advPoints(s.realm, s.adv || [], s.exploreKills);
  const achPts = s.achPts || 0;
  const base = realmPts + tribPts + deathPts + advPts + achPts;
  const jie = s.jie || 0;
  const K = 0.05;
  return Math.round(base * endMul(s) * (1 + jie * 0.2)) + Math.round(base * jie * K);
}

/* 典型可达场景（含秘境探索 + 新成就，max 努力）
   tribPassed 口径：金丹陨已过金丹劫=1 / 元婴陨=2 / 飞升=3；筑基及以下尚未面对天劫=0 */
const SCEN = [
  { tag: '炼气初陨', realm: '炼气', tribPassed: 0, deathPassed: 0, adv: ['huang'],                            achPts: 2,  jie: 0 },
  { tag: '筑基陨',   realm: '筑基', tribPassed: 0, deathPassed: 1, adv: ['huang','xuan'],                     achPts: 4,  jie: 0 },
  { tag: '金丹陨',   realm: '金丹', tribPassed: 1, deathPassed: 2, adv: ['huang','xuan','di'],                achPts: 9,  jie: 0 },
  { tag: '元婴陨',   realm: '元婴', tribPassed: 2, deathPassed: 4, adv: ['huang','xuan','di','tian'],         achPts: 14, jie: 0 },
  { tag: '飞升',     realm: '仙',   tribPassed: 3, deathPassed: 4, adv: ['huang','xuan','di','tian','xian'], achPts: 48, jie: 0, endReason: '飞升' }
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
const base = { realm: '元婴', tribPassed: 2, deathPassed: 0, adv: ['huang','xuan','di','tian'], achPts: 14, jie: 0 };
const withDeath = earn({ ...base, deathPassed: 3 });
check('多通过3次死劫 → +6 点（元婴 jie0）', withDeath - earn(base) === 6, '+' + (withDeath - earn(base)));

console.log('\n=== 测试6：秘境探索分计入且受封顶 ===');
const a1 = advPoints('炼气', ['huang']);               // 2, cap4 → 2
const a2 = advPoints('筑基', ['huang','xuan']);         // 6+广度2=8, cap8 → 8
const a3 = advPoints('炼气', ['huang','xuan','di','tian']); // 24+广度8, cap4 → 4 (低境界封顶)
check('炼气首通黄 = 2（封顶4）', a1 === 2, a1);
check('筑基通关黄+玄 = 8（2+4+广度2，封顶8）', a2 === 8, a2);
check('炼气越级刷4秘境被封顶到 4', a3 === 4, a3);

/* ---------- 7. 与方案文档对账：DEDAO_轮回结算重做_方案.md 的两张数字表 ---------- */
console.log('\n=== 测试7：方案文档数字与实算对账（定向，防再次分叉）===');
const DOC = path.join(__dirname, '..', 'DEDAO_轮回结算重做_方案.md');
if (!fs.existsSync(DOC)) {
  console.log('  ⏭  非仓库根（dist 副本无此文档），跳过');
} else {
  const docTxt = fs.readFileSync(DOC, 'utf8');
  // §9 表每行形如： | 飞升 | 25 | 1（3渡劫） | 8（4死劫） | 47（五秘境+广度8，封顶50） | 48 | 129 |
  const rowRe = new RegExp('^\\|\\s*(' + SCEN.map(s => s.tag).join('|') + ')\\s*\\|.*\\|\\s*(\\d+)\\s*\\|\\s*$', 'm');
  const docJie0 = {};
  docTxt.split('\n').forEach(function (ln) {
    const mm = ln.match(rowRe);
    if (mm) docJie0[mm[1]] = Number(mm[2]);
  });
  SCEN.forEach(function (s) {
    const want = earn(s);
    check('§九 平衡表「' + s.tag + '」jie0 = ' + want,
      docJie0[s.tag] === want,
      '文档写 ' + (docJie0[s.tag] === undefined ? '(缺行)' : docJie0[s.tag]) + '，实算 ' + want);
  });
  // 成本口径
  const flat = docTxt.replace(/\s/g, '');
  check('§7.1「六维核心全满 = 1080」', /六维核心全满=[^小]*1080/.test(flat));
  check('§7.1「全部天赋拉满 = 1296」', flat.indexOf('全部天赋拉满=1296') >= 0);
  // §九 结论行必须与新口径一致（旧值 6/18/34/55/129 不得再作为"与表一致"出现）
  check('§九 结论行已更新为 6 / 18 / 37 / 61 / 164',
    /6\s*\/\s*18\s*\/\s*37\s*\/\s*61\s*\/\s*164/.test(docTxt));
  check('§7.2 飞升 jie9 = 522', /^\|\s*飞升\s*\|\s*164\s*\|\s*284\s*\|\s*403\s*\|\s*522\s*\|/m.test(docTxt));
}

console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
process.exit(fail ? 1 : 0);
