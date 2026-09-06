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
    t.eq(map.normalCols, 7, '普通列数应为 7');
    t.eq(map.stepCost, 5, '每步体力消耗应为 5');
    t.ok(!!map.byId[map.startId], '起点不存在于 byId');
    t.ok(!!map.byId['boss'], 'Boss 节点缺失');
    // 起点可达 Boss
    const dist = bfsReach(map, map.startId, 'boss');
    t.gte(dist, 1, '起点到 Boss 不可达');
    t.lte(dist, 7, '最短路径超过 7 步（与体力预算不符）');
    // 除第 0 列外每个节点都有入边
    let orphan = 0, badType = 0;
    Object.keys(map.byId).forEach(function (id) {
      const n = map.byId[id];
      if (ELIXIRS && ELIXIRS[n.type] && false) { /* noop */ }
      if (['combat', 'elite', 'treasure', 'herb', 'iron', 'shop', 'event', 'rest', 'final'].indexOf(n.type) < 0) badType++;
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

  S.case('行动点→秘境体力换算（2行动=40，3行动=75）', (t) => {
    const s2 = started();
    const r2 = E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    t.ok(r2.ok, '2行动进入失败: ' + (r2.msg || ''));
    t.eq(s2.adv.stamina, 40, '2行动体力应为 40');
    t.eq(s2.adv.staminaMax, 40, '2行动体力上限应为 40');

    const s3 = started();
    const r3 = E.startAdventure(s3, 'huang', { ap: 3, items: [] });
    t.ok(r3.ok, '3行动进入失败: ' + (r3.msg || ''));
    t.eq(s3.adv.stamina, 75, '3行动体力应为 75');
    t.eq(s3.adv.staminaMax, 75, '3行动体力上限应为 75');
  });

  S.case('进入秘境时血蓝补满一次，随后跨节点延续（不回满）', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.eq(s.hp, s.hpMax, '进入时应满血');
    t.eq(s.mp, s.mpMax, '进入时应满灵');
    s.hp = Math.max(1, Math.round(s.hpMax * 0.3));
    s.mp = 0;
    const choices = E.advNextChoices(s);
    t.ok(choices.length > 0, '首层应至少有一个可选节点');
    const mv = E.advMove(s, choices[0].id);
    t.ok(mv.ok, 'advMove 失败: ' + (mv.msg || ''));
    t.eq(s.nodeId, choices[0].id, 'nodeId 未更新');
    t.eq(s.adv.stamina, 35, '走一步后应扣 5 体力（40→35）');
    t.ok(mapVisited(s, choices[0].id), '节点未标记 visited');
  });

  function mapVisited(s, id) { return !!(s.adv.map.byId[id] && s.adv.map.byId[id].visited); }

  S.case('秘境战斗不回满血蓝（opts.adventure）', (t) => {
    const s = started();
    E.refreshStats(s);
    s.hp = 1; s.mp = 0;
    const spec = { name: '靶子', atk: 10, hp: 50, loot: {}, bi: 0, dunSpeed: 1, portrait: 'foe' };
    E.combatStart(s, spec, { adventure: true });
    t.eq(s.hp, 1, '秘境战斗不应回满血');
    // 对照：普通战斗应回满
    const s2 = started(); E.refreshStats(s2); s2.hp = 5;
    E.combatStart(s2, spec);
    t.eq(s2.hp, s2.hpMax, '普通战斗应回满血');
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
};
