// 临时：探索度 100% 门槻可达性模拟（最优策略），运行后删除
const fs = require('fs');
const vm = require('vm');
const data = fs.readFileSync(__dirname + '/../js/data.js', 'utf8');
const engine = fs.readFileSync(__dirname + '/../js/engine.js', 'utf8');

function makeCtx() {
  const sb = {
    Math, console, Date, Object, Array, JSON, String, Number, RegExp,
    parseInt, parseFloat, isNaN, setTimeout: () => {}, clearTimeout: () => {},
    window: null, document: null
  };
  sb.window = sb; sb.global = sb;
  sb.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  vm.createContext(sb);
  vm.runInContext(data, sb);   // 先加载 data（engine 依赖其中的常量）
  vm.runInContext(engine, sb); // 再加载 engine（IIFE 立即执行，此时 data 常量已初始化）
  return sb;
}
const sb = makeCtx();
const E = sb.Engine;

function freshLife() {
  const s = E.startLife('sim');
  s.year = 1; s.adventuredYear = 0;
  s.big = 0; s.talents = []; s.sect = null; s.arts = [];
  s.equip = { head: null, body: null, leg: null, treasure: [] };
  s.linggen = null; s.ling = 2; s.spiritItems = [];
  E.refreshStats(s);
  return s;
}

// 最优策略：每步前进；遇到秘地探查就尽量反复深入（深耗8+10%/浅耗3+5%）榨干体力换探索度；其余节点靠经历累加。
function play(ap) {
  const s = freshLife();
  const r0 = E.startAdventure(s, 'huang', { ap, items: [] });
  if (!r0.ok) return { ok: false, why: r0.msg };
  let guard = 0;
  while (guard++ < 60) {
    if (!E.advCanMove(s)) {
      // 体力耗尽：若还能强搜则忽略（不计探索度），直接尝试前进到 Boss（折寿），但不计入探索度
      break;
    }
    const choices = E.advNextChoices(s);
    if (!choices.length) break;
    const pick = choices[0];
    const r = E.advMove(s, pick.id);
    if (!r.ok) break;
    const node = r.node;
    if (r.final) { /* Boss */ break; }
    const res = E.advResolve(s, node); // 经历节点累加探索度
    if (res.type === 'explore') {
      while (s.adv.stamina >= 8) E.advExplore(s, 'deep');
      if (s.adv.stamina >= 3) E.advExplore(s, 'shallow');
    }
  }
  return {
    ok: true,
    explore: s.adv.explore || 0,
    canBoss: E.advCanFightBoss(s),
    staminaLeft: s.adv.stamina
  };
}

function run(ap, n) {
  let reach = 0, sum = 0, min = 999, max = 0;
  for (let i = 0; i < n; i++) {
    const r = play(ap);
    if (!r.ok) { console.log('  start fail:', r.why); continue; }
    sum += r.explore; if (r.explore < min) min = r.explore; if (r.explore > max) max = r.explore;
    if (r.canBoss) reach++;
  }
  console.log(`AP=${ap}  (n=${n})  可达100%: ${reach}/${n} = ${(reach / n * 100).toFixed(1)}%  | 探索度 avg=${(sum / n).toFixed(1)} min=${min} max=${max}`);
}

run(2, 400);
run(3, 400);
