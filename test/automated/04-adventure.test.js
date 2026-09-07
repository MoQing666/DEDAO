/* DEDAO 自动化测试 —— 04 秘境重构（横版地图 / 体力 / 携带丹药 / Boss机制）
 * 覆盖：地图 DAG 合法性、行动点→秘境体力换算、路径推进与扣体力、秘境模式不回满、
 *       携带丹药进入与服用、Boss 机制与二选一掉落。
 */
const { ROOT, Suite, createGameContext } = require('./_harness');

function bfsReach(map, fromId, toId) {
  const seen = {}; const q = [fromId]; seen[fromId] = 0;
  while (q.length) {
    const cur = q.shift();
    if (cur === toId) return seen[cur];
    const node = map.byId[cur];
    (node.next || []).forEach(function (nx) { if (!seen[nx]) { seen[nx] = seen[cur] + 1; q.push(nx); } });
  }
  return -1;
}

module.exports = async function build() {
  const S = new Suite('04 秘境重构（横版地图/体力/丹药/Boss）');
  const G = createGameContext({ seed: 20260905 });
  const E = G.get('Engine');
  const genAdvMap = G.get('genAdvMap');
  const ADVENTURE_CONFIG = G.get('ADVENTURE_CONFIG');
  const ELIXIRS = G.get('ELIXIRS');

  function started() {
    const s = E.startLife('秘境测试');
    E.commitStart(s, 'wuxing'); // 任意天赋，确保初始化
    s.actionsLeft = 6;
    return s;
  }

  S.case('genAdvMap 生成合法 DAG（起点可达Boss、无孤儿节点）', (t) => {
    t.ok(typeof genAdvMap === 'function', 'genAdvMap 未导出');
    const map = genAdvMap('huang');
    t.eq(map.normalCols, 9, '普通列数应为 9（长度增加）');
    t.eq(map.stepCost, 5, '每步体力消耗应为 5');
    t.ok(!!map.byId[map.startId], '起点不存在于 byId');
    t.ok(!!map.byId['boss'], 'Boss 节点缺失');
    // 起点可达 Boss
    const dist = bfsReach(map, map.startId, 'boss');
    t.gte(dist, 1, '起点到 Boss 不可达');
    t.lte(dist, 9, '最短路径超过 9 步（与体力预算不符）');
    // 除第 0 列外每个节点都有入边
    let orphan = 0, badType = 0;
    Object.keys(map.byId).forEach(function (id) {
      const n = map.byId[id];
      if (ELIXIRS && ELIXIRS[n.type] && false) { /* noop */ }
      if (['combat', 'elite', 'treasure', 'herb', 'iron', 'shop', 'event', 'rest', 'explore', 'final'].indexOf(n.type) < 0) badType++;
      if (n.col === 0) return;
      let hasIn = false;
      Object.keys(map.byId).forEach(function (oid) {
        if (map.byId[oid].next && map.byId[oid].next.indexOf(id) >= 0) hasIn = true;
      });
      if (!hasIn) orphan++;
    });
    t.eq(orphan, 0, '存在孤儿节点（无入边）');
    t.eq(badType, 0, '存在非法节点类型');
    // 序列化往返无循环引用
    try { JSON.stringify(map); } catch (e) { t.fail('地图无法序列化: ' + e.message); }
  });

  S.case('行动点→秘境体力换算（2行动=70，3行动=95）', (t) => {
    const s2 = started();
    const r2 = E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    t.ok(r2.ok, '2行动进入失败: ' + (r2.msg || ''));
    t.eq(s2.adv.stamina, 70, '2行动体力应为 70（9列地图需45，余量用于探索攒探索度）');
    t.eq(s2.adv.staminaMax, 70, '2行动体力上限应为 70');

    const s3 = started();
    const r3 = E.startAdventure(s3, 'huang', { ap: 3, items: [] });
    t.ok(r3.ok, '3行动进入失败: ' + (r3.msg || ''));
    t.eq(s3.adv.stamina, 95, '3行动体力应为 95');
    t.eq(s3.adv.staminaMax, 95, '3行动体力上限应为 95');
  });

  S.case('进入秘境不回满血蓝（沿用入场状态），跨节点扣体力', (t) => {
    const s = started();
    E.refreshStats(s);
    s.hp = Math.round(s.hpMax * 0.5);
    s.mp = Math.round(s.mpMax * 0.4);
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.eq(s.hp, Math.round(s.hpMax * 0.5), '进入后不应回满血（沿用入场状态）');
    t.eq(s.adv.stamina, 70, '2行动体力应为 70');
    t.eq(s.adv.staminaMax, 70, '2行动体力上限应为 70');
    const choices = E.advNextChoices(s);
    t.ok(choices.length > 0, '首层应至少有一个可选节点');
    const mv = E.advMove(s, choices[0].id);
    t.ok(mv.ok, 'advMove 失败: ' + (mv.msg || ''));
    t.eq(s.adv.nodeId, choices[0].id, 'nodeId 未更新');
    t.eq(s.adv.stamina, 65, '走一步后应扣 5 体力（70→65）');
    t.eq(s.hp, Math.round(s.hpMax * 0.5), '跨节点不回血');
    t.ok(mapVisited(s, choices[0].id), '节点未标记 visited');
  });

  function mapVisited(s, id) { return !!(s.adv.map.byId[id] && s.adv.map.byId[id].visited); }

  S.case('战斗前仅恢复 10% 最大气血/灵力（不回满）', (t) => {
    const s = started();
    E.refreshStats(s);
    s.hp = 1; s.mp = 0;
    const spec = { name: '靶子', atk: 10, hp: 50, loot: {}, bi: 0, dunSpeed: 1, portrait: 'foe' };
    E.combatStart(s, spec, { adventure: true });
    t.gt(s.hp, 1, '战斗前应恢复少量气血（+10% 最大）');
    t.lt(s.hp, s.hpMax, '战斗前不应回满血');
    t.gt(s.mp, 0, '战斗前应恢复少量灵力（+10% 最大）');
    t.lt(s.mp, s.mpMax, '战斗前不应回满灵');
    // 秘境与普通战斗行为一致：均只恢复 10%，绝不回满
    const s2 = started(); E.refreshStats(s2); s2.hp = 5;
    E.combatStart(s2, spec);
    t.lt(s2.hp, s2.hpMax, '普通战斗同样不应回满血');
    t.gt(s2.hp, 5, '普通战斗前也应恢复 10%');
  });

  S.case('携带丹药进入并从库存扣除；服用回血、退出归还未用', (t) => {
    const s = started();
    s.elixirs = s.elixirs || {};
    s.elixirs.huichun = 3; // 回春丹（usableInAdv）
    s.elixirs.juling = 5;  // 非秘境丹药，不应被携带
    const r = E.startAdventure(s, 'huang', { ap: 2, items: [{ id: 'huichun', count: 2 }] });
    t.ok(r.ok, '进入失败: ' + (r.msg || ''));
    t.eq(s.elixirs.huichun, 1, '携带后库存应扣减（3→1）');
    t.ok(s.elixirs.juling === 5, '非秘境丹药不应被扣');
    const carried = s.adv.items.find(function (x) { return x.id === 'huichun'; });
    t.ok(carried && carried.count === 2, '携带列表应有回春丹×2');
    // 受伤后服用
    s.hp = Math.round(s.hpMax * 0.4);
    const hpBefore = s.hp;
    const ur = E.useAdvElixir(s, 'huichun');
    t.ok(ur.ok, '服药失败: ' + (ur.msg || ''));
    t.gt(s.hp, hpBefore, '服用回春丹后气血应提升');
    const carried2 = s.adv.items.find(function (x) { return x.id === 'huichun'; });
    t.ok(carried2 && carried2.count === 1, '服用后携带数量应 -1');
    // 退出归还未用（剩余 1 颗）
    const invBefore = s.elixirs.huichun;
    E.advEnd(s, 'done');
    t.eq(s.elixirs.huichun, invBefore + 1, '退出时应归还未用丹药');
    t.eq(s.adv.items.length, 0, '退出后携带列表应清空');
  });

  S.case('秘境节点类型解析：rest 正确返回', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    const res = E.advResolve(s, { type: 'rest', col: 2 });
    t.eq(res.type, 'rest', 'rest 节点应返回 type=rest');
    const res2 = E.advResolve(s, { type: 'combat', col: 1 });
    t.eq(res2.type, 'battle', 'combat 节点应返回 type=battle');
  });

  S.case('Boss 机制与通关二选一掉落', (t) => {
    // 五大秘境 Boss 均配置了机制
    const grades = ['huang', 'xuan', 'di', 'tian', 'xian'];
    const mechs = ['thorns', 'enrage', 'summon', 'lifesteal', 'multicast'];
    let allOk = true;
    grades.forEach(function (g) {
      const m = ADVENTURE_CONFIG[g].boss.mechanic;
      if (mechs.indexOf(m) < 0) allOk = false;
    });
    t.ok(allOk, '存在未配置机制的 Boss');
    // 二选一
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    const bonus = E.advBossBonus(s);
    t.eq(bonus.length, 2, '通关应提供 2 个奖励选项');
    t.ok(typeof bonus[0].apply === 'function' && typeof bonus[1].apply === 'function', '奖励选项应可应用');
  });

  S.case('体力耗尽后无法继续前进（强制撤退判定）', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    s.adv.stamina = 3; // 不足一步
    let guard = 0;
    while (E.advCanMove(s) && guard < 50) {
      const c = E.advNextChoices(s);
      if (!c.length) break;
      E.advMove(s, c[0].id);
      guard++;
    }
    t.ok(!E.advCanMove(s), '体力耗尽后 advCanMove 应为 false');
  });

  S.case('法术灵力不足时无法施展（实装真实法力消耗）', (t) => {
    const TECHNIQUES = G.get('TECHNIQUES');
    t.ok(TECHNIQUES && typeof TECHNIQUES === 'object', 'TECHNIQUES 未导出');
    let spellId = null;
    for (const id in TECHNIQUES) {
      const tech = TECHNIQUES[id];
      if (tech.cls === 'shufa' && (tech.cost || 0) > 0) { spellId = id; break; }
    }
    t.ok(spellId, '未找到可测试的法术（需 cls=shufa 且 cost>0）');
    const spell = TECHNIQUES[spellId];
    const s = started();
    E.refreshStats(s);
    const spec = { name: '靶子', atk: 10, hp: 50, loot: {}, bi: 0, dunSpeed: 1, portrait: 'foe' };
    E.combatStart(s, spec, { adventure: true });
    s.mp = 0; // 战斗前恢复 10% 后再次清零，确保灵力不足
    const mpBefore = s.mp;
    const r = E.combatAct(s, 'spell', spellId);
    t.ok(r.lines.some(function (l) { return l.indexOf('灵力不足') >= 0; }), '应提示灵力不足');
    t.eq(s.mp, mpBefore, '灵力不足时不应扣蓝');
    t.eq(s.battle.hp, 50, '灵力不足时不应造成伤害（Boss 满血）');
    // 灵力充足时可正常施展并扣蓝
    s.mp = spell.cost + 5;
    const mpOk = s.mp;
    const r2 = E.combatAct(s, 'spell', spellId);
    t.eq(s.mp, mpOk - (spell.cost || 0), '灵力充足时应扣除法术消耗的灵力');
    t.ok(s.battle.hp < 50, '灵力充足时应对 Boss 造成伤害');
  });

  S.case('战败扣减寿元（秘境/游历 -1 年，Boss -10 年）', (t) => {
    const s = started();
    E.refreshStats(s);
    const life0 = s.lifeMax;
    const msgAdv = E.loseLife(s, 1, 'adv');
    t.eq(s.lifeMax, life0 - 1, '秘境/游历战败应 -1 年寿元');
    t.ok(msgAdv.indexOf('1') >= 0, '文案应体现 -1 年');
    const msgBoss = E.loseLife(s, 10, 'boss');
    t.eq(s.lifeMax, life0 - 11, '被秘境之主击败应再 -10 年寿元');
    t.ok(msgBoss.indexOf('10') >= 0, 'Boss 文案应体现 -10 年');
    // 逃跑/主动撤退不应调用 loseLife（由 UI 分支保证），此处验证下限保护
    const s2 = started(); s2.lifeMax = 1;
    E.loseLife(s2, 10, 'adv');
    t.eq(s2.lifeMax, 1, '寿元下限应保护为 1');
  });

  S.case('秘地探查消耗体力并获得造化（探索机制）', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 3, items: [] });
    s.adv.stamina = 30;
    const before = s.adv.stamina;
    const r = E.advExplore(s, 'deep');
    t.ok(r.ok, '深入探查应成功: ' + (r.msg || ''));
    t.eq(s.adv.stamina, before - 8, '深入探查应消耗 8 体力');
    t.ok(r.lines.length > 0, '应返回获得的造化（灵石/材料/功法/灵物）');
    // 体力不足时拒绝
    s.adv.stamina = 2;
    const r2 = E.advExplore(s, 'deep');
    t.ok(!r2.ok, '体力不足应拒绝深入探查');
    // 粗略搜刮消耗 3
    s.adv.stamina = 20;
    const b3 = s.adv.stamina;
    const r3 = E.advExplore(s, 'shallow');
    t.ok(r3.ok, '粗略搜刮应成功: ' + (r3.msg || ''));
    t.eq(s.adv.stamina, b3 - 3, '粗略搜刮应消耗 3 体力');
  });

  S.case('探索度：按节点类型累加，满 100% 方可直面 Boss', (t) => {
    const GAIN = E.ADV_EXPLORE_GAIN;
    t.ok(GAIN, 'ADV_EXPLORE_GAIN 未导出');
    t.eq(GAIN.combat, 10, '普通战斗应 +10%');
    t.eq(GAIN.elite, 20, '精英敌人应 +20%');
    t.eq(GAIN.treasure, 5, '宝箱应 +5%');
    t.eq(GAIN.herb, 5, '灵草应 +5%');
    t.eq(GAIN.iron, 5, '灵铁应 +5%');
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.eq(s.adv.explore, 0, '初始探索度应为 0');
    t.eq(s.adv.exploreMax, 100, '探索度上限应为 100');
    t.ok(!E.advCanFightBoss(s), '探索度不足时不应允许直面 Boss');
    E.advResolve(s, { type: 'combat', col: 1 });
    t.eq(s.adv.explore, 10, '普通战斗后探索度应为 10');
    E.advResolve(s, { type: 'elite', col: 2 });
    t.eq(s.adv.explore, 30, '精英战斗后探索度应为 30（+20）');
    E.advResolve(s, { type: 'treasure', col: 3 });
    t.eq(s.adv.explore, 35, '宝箱后探索度应为 35（+5）');
    t.ok(!E.advCanFightBoss(s), '35% 时仍不应允许直面 Boss');
    E.addExplore(s, 100);
    t.eq(s.adv.explore, 100, '探索度应封顶 100');
    t.ok(E.advCanFightBoss(s), '探索度满 100% 应可直面 Boss');
    // Boss 节点本身不计入探索度
    const s2 = started();
    E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    E.advResolve(s2, { type: 'final', col: 9 });
    t.eq(s2.adv.explore, 0, 'Boss 节点不应计入探索度');
  });

  S.case('体力不足可以寿元强行探查 / 强行前行（1 年 1 步）', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    const life0 = s.lifeMax;
    const fr = E.advForceExplore(s);
    t.ok(fr.ok, '强行探查应成功: ' + (fr.msg || ''));
    t.eq(s.adv.explore, 10, '强行探查应 +10% 探索度');
    t.eq(s.lifeMax, life0 - 1, '强行探查应 -1 年寿元');
    // 体力不足以支付一步时，普通前进失败、可折寿强行前行
    const choices = E.advNextChoices(s);
    t.ok(choices.length > 0, '应有可前往的节点');
    s.adv.stamina = 1;
    const mv = E.advMove(s, choices[0].id);
    t.ok(!mv.ok, '体力不足时普通前进应失败');
    const fm = E.advForceMove(s, choices[0].id);
    t.ok(fm.ok, '强行前行应成功: ' + (fm.msg || ''));
    t.eq(s.adv.nodeId, choices[0].id, '强行前行后应到达目标节点');
    t.eq(s.lifeMax, life0 - 2, '强行前行应再 -1 年寿元');
    // 体力充足时不应允许无谓折寿
    s.adv.stamina = 50;
    const fm2 = E.advForceMove(s, 'c1_0');
    t.ok(!fm2.ok, '体力充足时不应允许折寿强行前行');
  });

  return S;
};
