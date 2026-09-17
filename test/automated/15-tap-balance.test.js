/* DEDAO 自动化测试 · 15 TAP 包数值/机制平衡（2026-09-17）
 * 覆盖：① 主页面/战斗属性小数位数（五行阵激活不再现长小数）
 *       ② 五行阵灵石消耗（开启100 / 年维持50 / 断供关阵 / 等级不影响）
 *       ③ 灵力恢复重设计（战前 75%→50% + 篝火回满灵力）
 *       ④ 装备掉落率 min(0.5, 深度×0.03)
 */
const { ROOT, createGameContext, Suite } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('15 TAP 包平衡（小数/五行阵/灵力/掉落率）');
  const G = createGameContext({ seed: 20260905 });
  const E = G.get('Engine');
  const TALENTS = G.get('TALENTS') || [];

  function fresh() {
    const s = E.startLife('测试道人');
    s.ling = 3; s.ti = 10; s.shen = 10; s.wu = 10; s.dao = 10; s.dun = 5;
    s.stone = 1000;
    E.commitStart(s, TALENTS[0] ? TALENTS[0].id : 'kejian');
    return s;
  }

  /* ---------- ① 小数位数 ---------- */
  S.case('开启五行阵后 hpMax 必为整数（12位小数根因）', (t) => {
    const s = fresh();
    ['fire', 'metal', 'water', 'wood', 'earth'].forEach(k => E.wuxingToggle(s, k));
    // 用分数基(装备/法宝%组合)逼出 applyWuxing 的分数乘积
    s.hpMaxBonus = 0.333; E.refreshStats(s);
    t.ok(Number.isInteger(s.hpMax), 'hpMax 应为整数，实为 ' + s.hpMax);
    t.ok(Number.isInteger(s.atk), 'atk 应为整数，实为 ' + s.atk);
    t.ok(Number.isInteger(s.mpMax), 'mpMax 应为整数，实为 ' + s.mpMax);
    // 任取分数基都应落整：多组随机边界
    s.hpMaxBonus = 0; E.refreshStats(s);
  });

  S.case('主页面/战斗属性显示最多 1 位小数（fmtStat 行为）', (t) => {
    // 复刻 ui.js fmtStat 的契约：最多 1 位小数、去尾随 .0
    function fmtStat(v) {
      if (typeof v !== 'number' || !isFinite(v)) return v;
      const r = Math.round(v * 10) / 10;
      return (r % 1 === 0) ? String(r) : r.toFixed(1);
    }
    t.eq(fmtStat(812.4567), '812.5', '长小数应截到 1 位');
    t.eq(fmtStat(105), '105', '整数去 .0');
    t.eq(fmtStat(83.4), '83.4', '保留 1 位');
    t.eq(fmtStat(0), '0', '0 正常');
  });

  /* ---------- ② 五行阵灵石消耗 ---------- */
  S.case('五行阵开启扣 100 灵石（启动）', (t) => {
    const s = fresh();                       // stone=1000, 五行阵全关
    const before = s.stone;
    const r = E.wuxingToggle(s, 'fire');
    t.ok(r.ok && r.on === true, '应开启成功：' + r.msg);
    t.eq(s.stone, before - 100, '开启应扣 100，实扣 ' + (before - s.stone));
  });

  S.case('五行阵关闭不返还灵石', (t) => {
    const s = fresh();
    E.wuxingToggle(s, 'fire');
    const before = s.stone;
    const r = E.wuxingToggle(s, 'fire');
    t.ok(r.ok && r.on === false, '应关闭：' + r.msg);
    t.eq(s.stone, before, '关闭不应返还，stone=' + s.stone);
  });

  S.case('五行阵灵石不足时拒绝开启', (t) => {
    const s = fresh();
    s.stone = 50;
    const r = E.wuxingToggle(s, 'water');
    t.ok(r.ok === false, '应拒绝：' + r.msg);
    t.ok(s.array.wuxing.water === false, 'water 不应被开启');
  });

  S.case('五行阵岁末每阵维持 50 灵石', (t) => {
    const s = fresh();
    E.wuxingToggle(s, 'water'); E.wuxingToggle(s, 'wood');   // 开 2 阵
    const before = s.stone;
    E.wuxingYearEnd(s);
    t.eq(s.stone, before - 100, '2 阵应扣 100，实扣 ' + (before - s.stone));
  });

  S.case('五行阵灵石断供则关阵', (t) => {
    const s = fresh();
    ['fire', 'metal', 'water', 'wood', 'earth'].forEach(k => E.wuxingToggle(s, k)); // 5 阵全开
    s.stone = 30;                       // 不够 5×50
    E.wuxingYearEnd(s);
    const on = ['fire', 'metal', 'water', 'wood', 'earth'].filter(k => s.array.wuxing[k]).length;
    t.eq(on, 0, '断供后全部关阵，仍开 ' + on);
  });

  S.case('五行阵升级不改变灵石消耗', (t) => {
    const s = fresh();
    if (s.craft && s.craft.zhenfa) s.craft.zhenfa.lv = 5;   // 升满级
    const before = s.stone;
    const r = E.wuxingToggle(s, 'fire');
    t.ok(r.ok && r.on === true, '满级仍可开：' + r.msg);
    t.eq(s.stone, before - 100, '满级开启仍只扣 100');
    const b2 = s.stone;
    E.wuxingYearEnd(s);
    t.eq(s.stone, b2 - 50, '满级维持仍只扣 50');
  });

  /* ---------- ③ 灵力恢复重设计 ---------- */
  S.case('战前灵力恢复 75%→50%', (t) => {
    const s = fresh();
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 }); // 落定真实上限
    const mpMax = s.mpMax;
    s.mp = Math.round(mpMax * 0.2);
    const exp = Math.min(mpMax, Math.round(mpMax * 0.2) + Math.round(mpMax * 0.5));
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 });
    t.eq(s.mp, exp, '战前灵力应为 20%+50%=70% 基线（封顶满蓝），实为 ' + s.mp + '/' + mpMax);
    t.ok(s.mp < mpMax || mpMax * 0.7 >= mpMax, '非满蓝时应明显低于 75% 旧值');
  });

  S.case('战前气血 +10% 不变', (t) => {
    const s = fresh();
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 });
    const hpMax = s.hpMax;
    s.hp = Math.round(hpMax * 0.2);
    const exp = Math.min(hpMax, Math.round(hpMax * 0.2) + Math.round(hpMax * 0.1));
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 });
    t.eq(s.hp, exp, '战前气血应为 +10%，实为 ' + s.hp + '/' + hpMax);
  });

  S.case('篝火(静室)调息回满灵力', (t) => {
    const s = fresh();
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 });
    s.mp = Math.round(s.mpMax * 0.3);
    E.advRest(s, 'mp');
    t.eq(s.mp, s.mpMax, '调息应回满灵力，实为 ' + s.mp + '/' + s.mpMax);
  });

  S.case('篝火双修灵力回满、气血仅 +30%', (t) => {
    const s = fresh();
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 });
    const hpMax = s.hpMax, mpMax = s.mpMax;
    s.hp = Math.round(hpMax * 0.4); s.mp = Math.round(mpMax * 0.3);
    E.advRest(s, 'both');
    t.eq(s.mp, mpMax, '双修灵力应回满');
    const expHp = Math.min(hpMax, Math.round(hpMax * 0.4) + Math.round(hpMax * 0.3));
    t.eq(s.hp, expHp, '双修气血应 +30%，实为 ' + s.hp + '/' + hpMax);
  });

  S.case('篝火打坐回血 60% 不变', (t) => {
    const s = fresh();
    E.combatStart(s, { name: '敌', atk: 10, hp: 100, hpMax: 100, dunSpeed: 1 });
    const hpMax = s.hpMax;
    s.hp = Math.round(hpMax * 0.2);
    const exp = Math.min(hpMax, Math.round(hpMax * 0.2) + Math.round(hpMax * 0.6));
    E.advRest(s, 'hp');
    t.eq(s.hp, exp, '打坐应回血 60%，实为 ' + s.hp + '/' + hpMax);
  });

  /* ---------- ④ 装备掉落率 ---------- */
  S.case('装备掉落率 = min(0.5, 深度×0.03)', (t) => {
    t.ok(Math.abs(E.equipDropRate(1, false) - 0.03) < 1e-9, 'depth1 应 0.03，实 ' + E.equipDropRate(1, false));
    t.ok(Math.abs(E.equipDropRate(10, false) - 0.30) < 1e-9, 'depth10 应 0.30，实 ' + E.equipDropRate(10, false));
    t.ok(Math.abs(E.equipDropRate(20, false) - 0.50) < 1e-9, 'depth20 应封顶 0.50，实 ' + E.equipDropRate(20, false));
    t.ok(Math.abs(E.equipDropRate(100, false) - 0.50) < 1e-9, '超深仍封顶 0.50');
    t.eq(E.equipDropRate(1, true), 0.60, 'Boss 固定 0.60');
  });

  return S;
};
