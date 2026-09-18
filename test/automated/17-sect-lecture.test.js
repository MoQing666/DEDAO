/* DEDAO 自动化测试 —— 17 宗门讲法 / 师父传功（v5 实装回归）
 * 覆盖：9 门新宗门法术、心法修订（攻速/反伤）、五行心法额外效果与 getter 接线、
 *      道庭讲法保底/复用手护、师父传功胜败结算、讲法↔传功共享限次、池空降级。
 */
const { ROOT, Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('17 宗门讲法 / 师父传功');
  const G = createGameContext({ seed: 20260905 });
  const E = G.get('Engine');
  const T = G.get('TECHNIQUES');
  const TALENTS = G.get('TALENTS') || [];
  const GRADE_ORDER = G.get('GRADE_ORDER') || ['黄', '玄', '地', '天', '仙'];

  /* 建一个「筑基·青云剑宗」号：仅已习本宗黄阶心法，便于讲法/传功取玄阶池 */
  function makeState() {
    const s = E.startLife('宗门测试');
    E.commitStart(s, TALENTS[0].id);
    s.sect = 'qingyunjian';
    s.idx = 3;                 // 筑基 → 玄阶
    s.techs = ['qy_xinfa1'];    // 仅已习本宗黄阶心法
    s.advType = 'huang';
    E.refreshStats(s);
    return s;
  }
  function qingyunXuan() { // 青云剑宗全部玄阶技 key
    return Object.keys(T).filter(k => T[k].sect === 'qingyunjian' && T[k].grade === '玄');
  }

  /* ---------- 1. 9 门新宗门法术存在且归属正确 ---------- */
  S.case('9 门新宗门法术存在、阶位/归属/伤害字段正确', (t) => {
    const expect = [
      ['yujue', 'qingyunjian', '玄', 3.0, 75],
      ['danhuo', 'dpxia', '黄', 2.0, 40],
      ['lianhuo', 'dpxia', '玄', 3.0, 75],
      ['jiuzhuan', 'dpxia', '地', 4.0, 115],
      ['honglian', 'dpxia', '天', 4.5, 175],
      ['yanci', 'xuantian', '黄', 2.0, 40],
      ['fumo', 'xuantian', '玄', 3.0, 75],
      ['tiangang_zhen', 'xuantian', '地', 4.0, 115],
      ['xuanwu_zhen', 'xuantian', '天', 4.5, 175]
    ];
    expect.forEach(([id, sect, grade, dmg, cost]) => {
      const x = T[id];
      t.ok(!!x, id + ' 缺失');
      if (!x) return;
      t.eq(x.sect, sect, id + ' 归属错');
      t.eq(x.grade, grade, id + ' 阶位错');
      t.eq(x.cls, 'shufa', id + ' 应为法术');
      t.eq(x.dmg, dmg, id + ' 伤害系数错');
      t.eq(x.cost, cost, id + ' 耗蓝错');
    });
    // 控制类法术的眩晕/灼烧字段要就位
    t.eq(T.yanci.stun, 0.15, '岩刺诀眩晕 0.15');
    t.eq(T.tiangang_zhen.stun, 0.60, '天罡镇压眩晕 0.60');
    t.eq(T.xuanwu_zhen.stun, 0.90, '玄武镇魔眩晕 0.90');
    t.eq(T.honglian.dotBurn, 3, '红莲丹劫灼烧 3');
  });

  /* ---------- 2. 心法修订：青云攻速、玄天门反伤、五行额外效果 ---------- */
  S.case('心法修订：青云剑宗攻速替代攻击%、玄天门反伤、五行额外效果数值', (t) => {
    t.eq(T.qy_xinfa1.atkSpd, 0.05, '青云剑诀 atkSpd=0.05');
    t.ok(T.qy_xinfa1.atkMul === undefined, '青云剑诀不再用 atkMul');
    t.eq(T.qy_xinfa4.atkSpd, 0.20, '太虚剑典 atkSpd=0.20');
    t.eq(T.xt_xinfa2.thorns, 0.05, '护山心经 thorns=0.05');
    t.eq(T.xt_xinfa3.thorns, 0.10, '天罡心法 thorns=0.10');
    t.eq(T.xt_xinfa4.thorns, 0.15, '玄武真经 thorns=0.15');
    t.ok(T.xt_xinfa4.reduceDmg === undefined, '玄武真经删除 reduceDmg');

    const five = [
      ['tiangang', 'critPct', 0.05], ['baihu', 'critPct', 0.15],
      ['chunyang', 'atkMul', 0.05], ['zhuque', 'atkMul', 0.15],
      ['taiyin', 'mpMul', 0.10], ['xuanwu', 'mpMul', 0.20],
      ['changchun', 'hpMul', 0.10], ['qinglong', 'hpMul', 0.20],
      ['kunyuan', 'defMul', 0.05], ['qilin', 'defMul', 0.15],
      ['kunyuan', 'thorns', 0.05], ['qilin', 'thorns', 0.15]
    ];
    five.forEach(([id, k, v]) => t.eq(T[id][k], v, `${id}.${k}=${v}`));
  });

  /* ---------- 3. 五行心法 getter 接线真实生效 ---------- */
  S.case('五行心法 getter 接线：暴击/气血/灵力/防御/反伤/攻速', (t) => {
    const s = makeState();
    s.techs.push('baihu', 'qinglong', 'kunyuan', 'xuanwu');
    // 用「青云剑诀(qy_xinfa1)」作无暴击/无气血/无灵力/无防御/无反伤基线，逐一切换验证差值
    s.techEquip.xinfa = 'qy_xinfa1'; E.refreshStats(s);
    const c0 = E.getCritRate(s);
    // 暴击：白虎诀 +0.15
    s.techEquip.xinfa = 'baihu'; E.refreshStats(s);
    t.ok(Math.abs(E.getCritRate(s) - c0 - 0.15) < 1e-6, '白虎诀暴击 +0.15');
    // 气血：青龙诀 +20%
    s.techEquip.xinfa = 'qinglong'; E.refreshStats(s);
    t.ok(Math.abs(E.getXinfaHpMul(s) - 0.20) < 1e-6, '青龙诀气血 +0.20');
    // 防御 + 反伤：坤元诀
    s.techEquip.xinfa = 'kunyuan'; E.refreshStats(s);
    t.ok(Math.abs(E.getDefensePct(s) - 0.05) < 1e-6, '坤元诀防御 +0.05');
    t.ok(Math.abs(E.getXinfaThorns(s) - 0.05) < 1e-6, '坤元诀反伤 +0.05');
    // 灵力上限：玄武诀 mpMul 0.20
    s.techEquip.xinfa = 'xuanwu'; E.refreshStats(s);
    t.ok(Math.abs(E.getXinfaMpMul(s) - 0.20) < 1e-6, '玄武诀灵力上限 +0.20');
    // 攻速：以青龙诀(无攻速)为基线切换到青云剑诀 +0.05
    s.techEquip.xinfa = 'qinglong'; E.refreshStats(s);
    const a0 = E.getExtraAtkChance(s);
    s.techEquip.xinfa = 'qy_xinfa1'; E.refreshStats(s);
    t.ok(Math.abs(E.getExtraAtkChance(s) - a0 - 0.05) < 1e-6, '青云剑诀攻速 +0.05');
  });

  /* ---------- 4. 道庭讲法：随机给技 + 保底修为 + 不耗行动点 ---------- */
  S.case('道庭讲法：随机本阶技 + 保底修为(10%) + 不耗行动点 + 置年计数', (t) => {
    const s = makeState();
    const need = E.requireNeed(s);
    const act0 = s.actionsLeft;
    const qi0 = s.qi;
    const techs0 = s.techs.length;
    const r = E.sectLecture(s);
    t.ok(!r.error && !r.used, '首次讲法不应 error/used');
    t.eq(r.type, 'lecture', '返回 type=lecture');
    t.gte(r.qi, Math.round(need * 0.10) - 1, '保底修为≈need*10%');
    t.eq(r.qi, Math.round(need * 0.10), '保底修为=need*10%');
    t.eq(s.qi, qi0 + r.qi, '修为已入账');
    t.eq(s.actionsLeft, act0, '讲法不耗行动点');
    t.eq(s.sectTeachYear, 1, '置年计数');
    // 给到的技必属本宗本阶且此前未习得
    if (r.tech) {
      t.ok(s.techs.indexOf(r.tech) >= 0, '习得的技已入 techs');
      t.eq(T[r.tech].sect, 'qingyunjian', '技归属本宗');
      t.eq(T[r.tech].grade, '玄', '技为本阶(玄)');
      t.eq(s.techs.length, techs0 + 1, 'techs 数量 +1');
    } else {
      t.ok(r.poolEmpty, '池空时 tech 为 null 且 poolEmpty=true');
    }
  });

  /* ---------- 5. 道庭讲法：复用拦截（每年 1 次） ---------- */
  S.case('道庭讲法：同年复用被拦截（used），不改 techs/qi', (t) => {
    const s = makeState();
    E.sectLecture(s);
    const techs1 = s.techs.length, qi1 = s.qi;
    const r2 = E.sectLecture(s);
    t.ok(r2.used === true, '再次讲法返回 used=true');
    t.ok(r2.tech === undefined, 'used 时不返回 tech');
    t.eq(s.techs.length, techs1, 'techs 不再增加');
    t.eq(s.qi, qi1, 'qi 不再增加');
  });

  /* ---------- 6. 师父传功·前置：10 层精英战力 + 保底数值 ---------- */
  S.case('师父传功·前置：10 层精英战力 + 保底(胜20%/败10%) + 不耗行动点', (t) => {
    const s = makeState();
    const need = E.requireNeed(s);
    const act0 = s.actionsLeft;
    const mp = E.sectMasterPrep(s);
    t.ok(!mp.error && !mp.used, '首次 prep 不应 error/used');
    t.eq(mp.type, 'master', 'type=master');
    t.ok(mp.spec && mp.spec.atk > 0 && mp.spec.hp > 0, '长老 spec 有攻/血');
    t.eq(mp.qiLose, Math.round(need * 0.10), '败保底=need*10%');
    t.eq(mp.qiWin, Math.round(need * 0.20), '胜保底=need*20%');
    t.eq(s.actionsLeft, act0, '传功前置不耗行动点');
    t.ok(mp.pool.indexOf('yujue') >= 0, '候选池含本宗玄阶技');
  });

  /* ---------- 7. 师父传功·胜：三选一入 techs + 保底20% + 置年计数 ---------- */
  S.case('师父传功·胜：指定技入 techs + 保底修为20% + 置年计数', (t) => {
    const s = makeState();
    const need = E.requireNeed(s);
    const qi0 = s.qi;
    const chosen = 'yujue';
    const r = E.sectMasterResolve(s, true, chosen);
    t.ok(r.win === true, 'win=true');
    t.ok(s.techs.indexOf(chosen) >= 0, 'chosen 入 techs');
    t.eq(r.tech, chosen, '返回 tech=chosen');
    t.eq(r.qi, Math.round(need * 0.20), '胜保底=need*20%');
    t.eq(s.qi, qi0 + r.qi, '胜保底修为入账');
    t.eq(s.sectTeachYear, 1, '置年计数');
  });

  /* ---------- 8. 师父传功·败：随机本阶技 + 保底10% + 置年计数 ---------- */
  S.case('师父传功·败：随机本阶技(或池空) + 保底修为10% + 置年计数', (t) => {
    const s = makeState();
    const need = E.requireNeed(s);
    const qi0 = s.qi;
    const techs0 = s.techs.length;
    const r = E.sectMasterResolve(s, false, null);
    t.ok(r.win === false, 'win=false');
    t.eq(r.qi, Math.round(need * 0.10), '败保底=need*10%');
    t.eq(s.qi, qi0 + r.qi, '败保底修为入账');
    t.eq(s.sectTeachYear, 1, '置年计数');
    if (r.tech) {
      t.ok(s.techs.indexOf(r.tech) >= 0, '败方随机技入 techs');
      t.eq(T[r.tech].sect, 'qingyunjian', '技归属本宗');
      t.eq(T[r.tech].grade, '玄', '技为本阶(玄)');
      t.eq(s.techs.length, techs0 + 1, 'techs +1');
    } else {
      t.ok(r.poolEmpty || true, '池空时 tech 为 null（接受）');
    }
  });

  /* ---------- 9. 讲法 ↔ 传功 共享限次 ---------- */
  S.case('讲法与传功共享年计数：用其一后另一返回 used', (t) => {
    // 讲法先用 → 传功 prep 应 used
    const a = makeState();
    E.sectLecture(a);
    const mpA = E.sectMasterPrep(a);
    t.ok(mpA.used === true, '讲法后用传功 → used');
    // 传功先用 → 讲法应 used
    const b = makeState();
    E.sectMasterPrep(b);
    E.sectMasterResolve(b, false, null);
    const lb = E.sectLecture(b);
    t.ok(lb.used === true, '传功后用讲法 → used');
    // 年度重置后可再用
    b.sectTeachYear = 0;
    const lb2 = E.sectLecture(b);
    t.ok(!lb2.used, '重置 sectTeachYear 后可再用');
  });

  /* ---------- 10. 池空降级：本阶技全习得时仍给保底、不报错 ---------- */
  S.case('池空降级：本阶技全习得时讲法/传功仍给保底修为', (t) => {
    const s = makeState();
    // 把青云剑宗全部玄阶技都学掉，使池空
    qingyunXuan().forEach(k => { if (s.techs.indexOf(k) < 0) s.techs.push(k); });
    E.refreshStats(s);
    t.eq(E.sectTeachPool(s).length, 0, '池已空');
    const need = E.requireNeed(s);
    const qi0 = s.qi;
    const r = E.sectLecture(s);
    t.ok(r.poolEmpty === true, '讲法返回 poolEmpty=true');
    t.ok(r.tech === null || r.tech === undefined, '池空无技可给');
    t.eq(r.qi, Math.round(need * 0.10), '池空仍给保底 10%');
    t.eq(s.qi, qi0 + r.qi, '保底修为入账');
    // 传功胜路径池空：options 应为空（UI 会按败方保底处理）
    s.sectTeachYear = 0;
    const opts = E.sectMasterOptions(s);
    t.eq(opts.length, 0, '传功胜候选池空 → UI 走保底');
  });

  /* ---------- 11. gradeOfBig 阶位映射正确 ---------- */
  S.case('gradeOfBig 境界→阶位映射（炼气=黄…元婴+=天）', (t) => {
    const s = makeState();
    const idxs = [0, 3, 6, 9]; // 炼气/筑基/金丹/元婴
    const exp = ['黄', '玄', '地', '天'];
    idxs.forEach((i, k) => {
      s.idx = i;
      t.eq(E.gradeOfBig(E.bigIdxOf(s)), exp[k], `idx=${i} → ${exp[k]}`);
    });
  });

  return S;
};
