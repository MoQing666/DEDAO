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
    t.eq(map.normalCols, 50, '普通列数应为 50（秘境扩为 50 层）');
    t.eq(map.stepCost, 5, '每步体力消耗应为 5');
    t.ok(!!map.byId[map.startId], '起点不存在于 byId');
    t.ok(!!map.byId['boss'], 'Boss 节点缺失');
    // 起点可达 Boss；但一局体力（110/150）绝不足以走完 50 层——
    // 这正是「内容量必须大于体力」的设计：深入多少层是玩家自己的取舍。
    const dist = bfsReach(map, map.startId, 'boss');
    t.gte(dist, 1, '起点到 Boss 不可达');
    t.eq(dist, 51, '最短通关需 51 步（入口 + 50 层；合 255 体力），远超一局 110/150 体力');
    // 【每层固定 3 个节点】——行行三等分，不再忽多忽少
    let badLayer = 0;
    map.cols.forEach(function (col) { if (col.length !== 3) badLayer++; });
    t.eq(badLayer, 0, '存在节点数不是 3 的层（共 ' + badLayer + ' 层）');
    t.eq(map.entry.next.length, 3, '虚拟入口应指向第 1 层全部 3 个节点（首行也是 3 个真选项）');
    // 除入口层外每个节点都有入边
    let orphan = 0, badType = 0;
    Object.keys(map.byId).forEach(function (id) {
      const n = map.byId[id];
      if (['combat', 'elite', 'treasure', 'herb', 'iron', 'shop', 'event', 'rest', 'explore', 'final', 'entry'].indexOf(n.type) < 0) badType++;
      if (n.col <= 0) return; // 入口层（col 0）由虚拟入口供给，无需来自上一层的入边
      let hasIn = false;
      Object.keys(map.byId).forEach(function (oid) {
        if (map.byId[oid].next && map.byId[oid].next.indexOf(id) >= 0) hasIn = true;
      });
      if (!hasIn) orphan++;
    });
    t.eq(orphan, 0, '存在孤儿节点（无入边）');
    t.eq(badType, 0, '存在非法节点类型');
    // 连线只跨相邻一层：不存在跨层长线（否则 svg 上必然穿方块/糊成一团）
    let jump = 0;
    Object.keys(map.byId).forEach(function (id) {
      (map.byId[id].next || []).forEach(function (t) {
        const to = map.byId[t];
        if (to && to.col - map.byId[id].col !== 1) jump++;
      });
    });
    t.eq(jump, 0, '存在跨层连线（' + jump + ' 条），连线必须只走相邻两层之间');
    // 序列化往返无循环引用
    try { JSON.stringify(map); } catch (e) { t.fail('地图无法序列化: ' + e.message); }
  });

  // 守卫：地图应是「清晰可择」——不要求每个节点都有 2 条路，但须满足：
  //   · 同层内连线永不交叉（主边为同索引直线，次边为统一方向）。
  //   · 至少 1/3 的格子只有 1 条向上的直线（给玩家稳定的主路径）。
  //   · 斜边（跨列）占比不超过 40%。
  //   · 每个节点至少有 1 条出边，无死路。
  S.case('杀戮尖塔式地图：无交叉线 + ≥1/3 直线 + 斜线 ≤40%', (t) => {
    let nodes = 0, single = 0, edges = 0, diagonals = 0, checked = 0;
    for (let k = 0; k < 60; k++) {
      const map = genAdvMap('huang');
      Object.keys(map.byId).forEach(function (id) {
        const n = map.byId[id];
        if (n.col < 0 || n.col >= map.normalCols) return; // 不算入口/Boss
        nodes++;
        const out = n.next || [];
        if (out.length < 1) t.fail('节点 ' + id + ' 没有出边（死路）');
        if (out.length === 1) single++;
        out.forEach(function (tid) {
          edges++;
          const to = map.byId[tid];
          if (to && to.idx != null && n.idx !== to.idx) diagonals++;
        });
      });
    }
    t.gte(single, Math.floor(nodes / 3), '直线节点不足 1/3：' + single + '/' + nodes);
    t.lte(diagonals, Math.floor(edges * 0.4), '斜边超过 40%：' + diagonals + '/' + edges);
    // 同层内连线不得互相穿插（主边 + 同方向次边保证单调）
    let cross = 0;
    for (let k = 0; k < 40; k++) {
      const m = genAdvMap('huang');
      const byLayer = {};
      Object.keys(m.byId).forEach(function (id) {
        const n = m.byId[id];
        if (n.col < 0 || n.col >= m.normalCols) return;
        (n.next || []).forEach(function (t) {
          const to = m.byId[t];
          if (!to || to.col < 0) return;
          byLayer[n.col] = byLayer[n.col] || [];
          byLayer[n.col].push([n.idx != null ? n.idx : 1, to.idx != null ? to.idx : 1]);
        });
      });
      Object.keys(byLayer).forEach(function (c) {
        const es = byLayer[c];
        for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
          if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) cross++;
        }
      });
    }
    t.eq(cross, 0, '同层内存在交叉线：' + cross + ' 处（必须 = 0）');
    const m2 = genAdvMap('huang');
    t.eq(m2.cols[0].length, 3, '第 1 层应有 3 个节点（每行 3 个选项）');
    t.eq(m2.startId, 'entry', '起点应为虚拟入口节点');
    t.eq(m2.entry.next.length, 3, '入口应通向第 1 层 3 个节点，首行同样有 3 个真选项');
  });

  S.case('探索度达标 → 秘境之主在任意深度现身，可一步直达决战', (t) => {
    const s = started();
    const r = E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.ok(r.ok, '进入秘境失败: ' + (r.msg || ''));
    // 先深入 3 层（远未到尽头），每一步都须有可行路线
    for (let i = 0; i < 3; i++) {
      const cs = E.advNextChoices(s);
      t.gte(cs.length, 1, '第 ' + (i + 1) + ' 步没有可选路线');
      E.advMove(s, cs[0].id);
    }
    t.ok(s.adv.nodeId !== 'boss', '此时不应已抵达 Boss');
    t.eq(E.advCanFightBoss(s), false, '探索度未满时不应可打 Boss');
    t.eq(E.advNextChoices(s).some(function (c) { return c.id === 'boss'; }), false, '探索度未满时不得出现 Boss 选项');
    // 探索度拉满 → Boss 现身（不需要走到第 50 层）
    s.adv.explore = s.adv.exploreMax;
    t.eq(E.advCanFightBoss(s), true, '探索度满时应可直面 Boss');
    const cs2 = E.advNextChoices(s);
    const bopt = cs2.filter(function (c) { return c.id === 'boss'; })[0];
    t.ok(!!bopt && bopt.revealed === true, '探索度满后 Boss 应作为「现身」选项出现');
    const st0 = s.adv.stamina;
    const mv = E.advMove(s, 'boss');
    t.ok(mv.ok, 'advMove(boss) 失败: ' + (mv.msg || ''));
    t.eq(s.adv.nodeId, 'boss', '应已抵达 Boss');
    t.eq(s.adv.stamina, st0 - 5, '直取决战应扣 1 步体力');
  });

  S.case('行动点→秘境体力换算（2行动=110，3行动=150）', (t) => {
    const s2 = started();
    const r2 = E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    t.ok(r2.ok, '2行动进入失败: ' + (r2.msg || ''));
    t.eq(s2.adv.stamina, 110, '2行动体力应为 110（22 步，远不足以走完 50 层）');
    t.eq(s2.adv.staminaMax, 110, '2行动体力上限应为 110');

    const s3 = started();
    const r3 = E.startAdventure(s3, 'huang', { ap: 3, items: [] });
    t.ok(r3.ok, '3行动进入失败: ' + (r3.msg || ''));
    t.eq(s3.adv.stamina, 150, '3行动体力应为 150（30 步）');
    t.eq(s3.adv.staminaMax, 150, '3行动体力上限应为 150');
  });

  S.case('进入秘境不回满血蓝（沿用入场状态），跨节点扣体力', (t) => {
    const s = started();
    E.refreshStats(s);
    s.hp = Math.round(s.hpMax * 0.5);
    s.mp = Math.round(s.mpMax * 0.4);
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.eq(s.hp, Math.round(s.hpMax * 0.5), '进入后不应回满血（沿用入场状态）');
    t.eq(s.adv.stamina, 110, '2行动体力应为 110');
    t.eq(s.adv.staminaMax, 110, '2行动体力上限应为 110');
    const choices = E.advNextChoices(s);
    t.ok(choices.length > 0, '首层应至少有一个可选节点');
    const mv = E.advMove(s, choices[0].id);
    t.ok(mv.ok, 'advMove 失败: ' + (mv.msg || ''));
    t.eq(s.adv.nodeId, choices[0].id, 'nodeId 未更新');
    t.eq(s.adv.stamina, 105, '走一步后应扣 5 体力（110→105）');
    t.eq(s.hp, Math.round(s.hpMax * 0.5), '跨节点不回血');
    t.ok(mapVisited(s, choices[0].id), '节点未标记 visited');
  });

  function mapVisited(s, id) { return !!(s.adv.map.byId[id] && s.adv.map.byId[id].visited); }

  S.case('战斗前恢复 10% 气血 / +75% 灵力（不回扣、不覆盖回满）', (t) => {
    const s = started();
    E.refreshStats(s);
    s.hp = 1; s.mp = Math.round(s.mpMax * 0.5); // 故意置半满，验证「+75% 加法」而非「设为 75%」
    const spec = { name: '靶子', atk: 10, hp: 50, loot: {}, bi: 0, dunSpeed: 1, portrait: 'foe' };
    E.combatStart(s, spec, { adventure: true });
    t.gt(s.hp, 1, '战斗前应恢复少量气血（+10% 最大）');
    t.lt(s.hp, s.hpMax, '战斗前不应回满血');
    const expectMp = Math.min(s.mpMax, Math.round(s.mpMax * 0.5) + Math.round(s.mpMax * 0.75));
    t.eq(s.mp, expectMp, '战斗前灵力应为 进战前 + 75% 上限（加法封顶）');
    t.gt(s.mp, Math.round(s.mpMax * 0.5), '战斗前灵力应净增');
    t.lte(s.mp, s.mpMax, '战斗前灵力不超过上限');
    // 满蓝进战（模拟年末回满后开打）：应保持满蓝，不被战前恢复压回 75%
    const sFull = started(); E.refreshStats(sFull); sFull.mp = sFull.mpMax;
    E.combatStart(sFull, spec, { adventure: true });
    t.eq(sFull.mp, sFull.mpMax, '满蓝进战：灵力应保持满蓝（不覆盖年末回满）');
    // 秘境与普通战斗行为一致：气血仅恢复 10%、灵力 +75%，绝不回满
    const s2 = started(); E.refreshStats(s2); s2.hp = 5;
    E.combatStart(s2, spec);
    t.lt(s2.hp, s2.hpMax, '普通战斗同样不应回满血');
    t.gt(s2.hp, 5, '普通战斗前也应恢复 10% 气血');
  });

  // 机制变更（2026-09-11）：删除「出发前携带丹药」整备页。
  // 战斗丹药改由秘境内的荒野坊市购买 → 买下即入随身 → 战斗/歇脚可服 → 离场即清（不回库）。
  S.case('秘境丹药改为坊市购买：买下入随身、可服用、离场不回库', (t) => {
    const s = started();
    s.elixirs = s.elixirs || {};
    s.elixirs.huichun = 3; // 储物袋里的旧丹药不应被自动带入
    const r = E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.ok(r.ok, '进入失败: ' + (r.msg || ''));
    t.eq(s.elixirs.huichun, 3, '进入秘境不再扣减储物袋丹药（携带机制已删除）');
    t.eq((s.adv.items || []).length, 0, '入场时随身丹药应为空');
    // 坊市里买到一颗回春丹
    s.stone = 9999;
    const bought = E.buyStock(s, { id: 'advd_huichun', name: '回春丹', price: 55, advItem: { id: 'huichun', n: 1 } });
    t.ok(bought.ok, '购买战斗丹药失败: ' + (bought.msg || ''));
    const carried = s.adv.items.find(function (x) { return x.id === 'huichun'; });
    t.ok(carried && carried.count === 1, '买到的丹药应进入「随身」');
    t.eq(s.elixirs.huichun, 3, '购买不应动储物袋库存');
    // 受伤后服用
    s.hp = Math.round(s.hpMax * 0.4);
    const hpBefore = s.hp;
    const ur = E.useAdvElixir(s, 'huichun');
    t.ok(ur.ok, '服药失败: ' + (ur.msg || ''));
    t.gt(s.hp, hpBefore, '服用回春丹后气血应提升');
    // 再买一颗（未服用），离场后随身清空且不回库（本次秘境资源）
    E.buyStock(s, { id: 'advd_huichun2', name: '回春丹', price: 55, advItem: { id: 'huichun', n: 1 } });
    const invBefore = s.elixirs.huichun;
    E.advEnd(s, 'done');
    t.eq(s.adv.items.length, 0, '离场后随身丹药应清空');
    t.eq(s.elixirs.huichun, invBefore, '未用完的丹药随此行消散，不得回流储物袋');
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

  /* 守卫：灵物已改制成法宝（2026-09-13）。
     历史 bug：Boss 战利品里白送一件灵物，通关「秘藏二选一」再选一件法宝，
     一屏同时蹦出「获得灵物【上品灵晶】」+「获得法宝【寻矿罗盘】」，一次通关白赚两件；
     且灵物存在 s.spiritItems（储物袋之外），玩家根本找不到它。 */
  S.case('灵物已是法宝：Boss 不再自动掉灵物，秘藏二选一只给一件', (t) => {
    const ARTIFACTS = G.get('ARTIFACTS');
    const SPIRIT_FOR_ADV = G.get('SPIRIT_FOR_ADV');
    const ADV_ART_CAP = G.get('ADV_ART_CAP');
    t.eq(ADV_ART_CAP, 3, '每层秘境法宝上限应为 3 件');
    // 五阶位都能映射到一件真实存在的灵物法宝
    ['huang', 'xuan', 'di', 'tian', 'xian'].forEach(function (g) {
      const id = SPIRIT_FOR_ADV[g];
      t.ok(id && ARTIFACTS[id] && ARTIFACTS[id].spirit, '阶位 ' + g + ' 的灵物映射缺失');
    });

    // ① Boss 战利品不得带 spirit（唯一入口是秘藏二选一）
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    let leaked = 0;
    for (let i = 1; i <= 8; i++) {
      const spec = E.enemyGen(s, 'boss', i);
      if (spec.loot && spec.loot.spirit) leaked++;
    }
    t.eq(leaked, 0, 'Boss 战利品仍自动带灵物 —— 会与秘藏二选一重复发放');

    // ② 首次通关：选项一 = 本阶灵物；选它只拿灵物，且不会同时拿到法宝
    const bonus = E.advBossBonus(s);
    t.eq(bonus[0].label, '夺·秘藏灵物', '未持有时选项一应为灵物');
    const arts0 = (s.arts || []).length + (s.equip.treasure || []).length;
    const got = bonus[0].apply();
    t.ok(got.join('').indexOf('上品灵晶') >= 0, '选项一应发放上品灵晶，实际：' + got.join('|'));
    const arts1 = (s.arts || []).length + (s.equip.treasure || []).length;
    t.eq(arts1 - arts0, 1, '二选一只能拿一件（实际增加了 ' + (arts1 - arts0) + ' 件）');
    t.ok(E.ownsArt(s, 'shangpin_lingjing'), '拿到后应记为「已持有」');
    t.eq(E.advArtCount(s, 'huang'), 0, '灵物豁免「每层 3 件」上限，不应占用普通法宝计数');

    // ③ 已持有灵物 → 选项一改为随机法宝（不再重复给灵物）
    const bonus2 = E.advBossBonus(s);
    t.ok(bonus2[0].label !== '夺·秘藏灵物', '已持有灵物时选项一不应再是灵物');
    t.eq(bonus2.length, 2, '仍应有两个选项');
    const labels2 = bonus2.map(function (b) { return b.label; }).join(',');
    t.ok(labels2.indexOf('灵物') < 0, '已持有后不应再出现灵物选项：' + labels2);

    // ④ 每层秘境最多 3 件**普通**法宝（灵物豁免）：灵物 1 件 + 普通 3 件，之后才降级为灵石
    const s2 = started();
    E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    let gotNormal = 0, gotSpirit = 0, guard = 0;
    while (guard++ < 12) {
      const b = E.advBossBonus(s2);
      const idx = b.findIndex(function (x) { return x.label.indexOf('灵石') < 0; });
      if (idx < 0) break;                                  // 全灵石 → 已取尽
      const lbl = b[idx].label;
      const before = (s2.arts || []).length + (s2.equip.treasure || []).length;
      b[idx].apply();
      const delta = (s2.arts || []).length + (s2.equip.treasure || []).length - before;
      if (lbl === '夺·秘藏灵物') gotSpirit += delta; else gotNormal += delta;
    }
    t.eq(gotSpirit, 1, '本阶位灵物应能拿到 1 件，实际 ' + gotSpirit);
    t.eq(gotNormal, ADV_ART_CAP, '普通法宝最多 ' + ADV_ART_CAP + ' 件，实际 ' + gotNormal);
    t.eq(E.advArtCount(s2, 'huang'), ADV_ART_CAP, '计数只统计普通法宝');
    const bFull = E.advBossBonus(s2);
    t.eq(bFull.length, 1, '灵物与普通法宝都取尽后，选项二留空、只余一个灵石兜底，实际：' + bFull.map(function (x) { return x.label; }).join(','));
    t.ok(bFull[0].label.indexOf('灵石') >= 0, '兜底选项应为灵石，实际：' + bFull[0].label);

    // ④b 灵物**豁免**上限（2026-09-13 用户定稿）：
    //     同一阶位即便先连取 3 件普通法宝（不拿灵物），选项一依然必须是灵物，
    //     否则「不选则下一次选项一依然是灵物」这条规则会被 3 件上限吃掉。
    const s3 = started();
    E.startAdventure(s3, 'huang', { ap: 2, items: [] });
    let n3 = 0, guard3 = 0;
    while (n3 < ADV_ART_CAP && guard3++ < 20) {
      const b = E.advBossBonus(s3);
      const idx = b.findIndex(function (x) { return x.label === '取·法宝'; });
      if (idx < 0) break;
      const before = (s3.arts || []).length + (s3.equip.treasure || []).length;
      b[idx].apply();
      if ((s3.arts || []).length + (s3.equip.treasure || []).length > before) n3++;
    }
    t.eq(n3, ADV_ART_CAP, '应能先取满 ' + ADV_ART_CAP + ' 件普通法宝，实际 ' + n3);
    t.eq(E.advArtCount(s3, 'huang'), ADV_ART_CAP, '普通法宝计数应取满');
    t.ok(!E.ownsArt(s3, 'shangpin_lingjing'), '此路径下尚未持有灵物');
    const b3 = E.advBossBonus(s3);
    // 选项二留空（用户定稿）：普通法宝取尽时只显示灵物一张卡，不再拿灵石充数
    t.eq(b3.length, 1, '普通法宝取尽后选项二应留空，实际：' + b3.map(function (x) { return x.label; }).join(','));
    t.eq(b3[0].label, '夺·秘藏灵物', '此时唯一选项应为灵物');
    b3[0].apply();
    const b4 = E.advBossBonus(s3);
    // 灵物也拿到 → 本阶真正取尽，仅保留一个灵石兜底（否则弹窗无按钮可点会卡死）
    t.eq(b4.length, 1, '灵物也拿到后只应剩一个灵石兜底选项，实际：' + b4.map(function (x) { return x.label; }).join(','));
    t.ok(b4[0].label.indexOf('灵石') >= 0, '兜底选项应为灵石，实际：' + b4[0].label);

    // ⑤ 灵物是法宝：必须能被法宝栏识别（treasureItem）
    t.ok(E.treasureItem('shangpin_lingjing'), '灵物应能被法宝栏识别');
  });

  /* 守卫：秘境入口「剩余法宝 N」口径 + 二选一选项数（2026-09-13 用户定稿）
     - 灵物豁免上限：没拿到就永远算 1 件，不受「每阶 3 件」影响；
     - 普通法宝同时受「每阶余额」与「池内未持有数」两重约束；
     - 选项二无可取之物时留空（不再拿灵石充数）。 */
  S.case('秘境「剩余法宝 N」口径与二选一选项数', (t) => {
    const ADV_ART_CAP = G.get('ADV_ART_CAP');
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    const r0 = E.advArtRemain(s, 'huang');
    t.eq(r0.spirit, 1, '未持有灵物时剩余灵物应为 1');
    t.eq(r0.normal, ADV_ART_CAP, '黄级秘境剩余普通法宝应等于上限 ' + ADV_ART_CAP + '，实际 ' + r0.normal);
    t.eq(r0.total, ADV_ART_CAP + 1, '剩余法宝总数 = 灵物 1 + 普通 ' + ADV_ART_CAP);
    t.eq(E.advBossBonus(s).length, 2, '首次通关应为二选一（灵物 + 普通法宝）');

    // 连取 ADV_ART_CAP 件普通法宝（一直不拿灵物）
    const cnt = function () { return (s.arts || []).length + (s.equip.treasure || []).length; };
    let got = 0, guard = 0;
    while (got < ADV_ART_CAP && guard++ < 20) {
      const b = E.advBossBonus(s);
      const idx = b.findIndex(function (x) { return x.label === '取·法宝'; });
      if (idx < 0) break;
      const before = cnt();
      b[idx].apply();
      got += cnt() - before;
    }
    t.eq(got, ADV_ART_CAP, '应能先取满 ' + ADV_ART_CAP + ' 件普通法宝，实际 ' + got);
    const r1 = E.advArtRemain(s, 'huang');
    t.eq(r1.normal, 0, '普通法宝取尽后剩余普通应为 0');
    t.eq(r1.spirit, 1, '灵物豁免上限：此时仍应剩余 1 件灵物');
    t.eq(r1.total, 1, '剩余法宝应为 1');
    const b = E.advBossBonus(s);
    t.eq(b.length, 1, '普通法宝取尽后选项二应留空，实际：' + b.map(function (x) { return x.label; }).join(','));
    t.eq(b[0].label, '夺·秘藏灵物', '唯一选项应为灵物（连选 3 件普通法宝后仍能拿到）');
  });

  S.case('灵物类法宝不进随机法宝池（秘藏专属）', (t) => {
    const ARTIFACTS = G.get('ARTIFACTS');
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    // 黄级秘境 30 轮二选一：选项二（随机法宝）不得开出灵物
    const spiritHits = [];
    for (let i = 0; i < 30; i++) {
      s.arts = []; s.equip.treasure = []; s.flags.advArt = {};
      E.advBossBonus(s).slice(1).forEach(function (ch) {
        if (ch.label === '夺·秘藏灵物') spiritHits.push(ch.desc);
      });
    }
    t.eq(spiritHits.length, 0, '随机法宝池混入了灵物：' + spiritHits.slice(0, 3).join('|'));
    // 商店/游历池也不得引用灵物
    const ART_SHOP = G.get('ART_SHOP_ITEMS') || [];
    const bad = ART_SHOP.filter(function (it) { return ARTIFACTS[it.id] && ARTIFACTS[it.id].spirit; });
    t.eq(bad.length, 0, '游历流动商贩池混入了灵物：' + bad.map(function (x) { return x.id; }).join(','));
    const SECT_GOODS = G.get('SECT_GOODS') || [];
    const bad2 = SECT_GOODS.filter(function (g) { return g.kind === 'art' && ARTIFACTS[g.ref] && ARTIFACTS[g.ref].spirit; });
    t.eq(bad2.length, 0, '宗门功业商店混入了灵物：' + bad2.map(function (x) { return x.ref; }).join(','));
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
    s.mp = 0; // 战斗前恢复 75% 后再次清零，确保灵力不足
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

  // P0 守卫：最后一层的唯一出口是 Boss，而探索度未满时 Boss 处于锁定态 ——
  // 此时若不做兜底，玩家面前一个可点的节点都没有（死局面）。
  S.case('秘境死路兜底：末层 + 探索度未满 → 判定 deadEnd，走「前路已尽」', (t) => {
    const s = started();
    t.ok(E.startAdventure(s, 'huang', { ap: 2, items: [] }).ok, '进入秘境失败');
    const lastCol = s.adv.map.normalCols - 1;
    s.adv.nodeId = s.adv.map.cols[lastCol][0].id;
    s.adv.explore = 0;
    const sit = E.advSituation(s);
    t.eq(sit.canBoss, false, '探索度未满时不得直面 Boss');
    t.ok(sit.bossOnly, '末层出口应只有 Boss 一个');
    t.ok(sit.deadEnd, '末层 + 探索度未满 必须判定为死路（否则地图上一个可点节点都没有）');
    t.eq(sit.choices.length, 1, '末层可选节点应只有 Boss');
    s.adv.explore = 100;
    const sit2 = E.advSituation(s);
    t.eq(sit2.canBoss, true, '探索度满后可直面 Boss');
    t.eq(sit2.deadEnd, false, '探索度满后不应再判为死路');
    // 普通层永远不是死路，但允许某些节点只有 1 条直线主路
    s.adv.nodeId = s.adv.map.cols[3][0].id;
    s.adv.explore = 0;
    const sit3 = E.advSituation(s);
    t.eq(sit3.deadEnd, false, '普通层不应是死路');
    t.gte(sit3.choices.length, 1, '普通层至少应有 1 条路');
    // 入口层固定给出 3 条路
    s.adv.nodeId = 'entry';
    const sit4 = E.advSituation(s);
    t.eq(sit4.choices.length, 3, '入口层应给出 3 条路（每行 3 个选项）');
  });

  S.case('折寿强搜只出具体造化（不计探索度）+ 代价等比递增 1/2/4/8/16（封顶）/ 强行前行 1 年 1 步', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    const life0 = s.lifeMax;
    const exp0 = s.adv.explore;
    t.eq(exp0, 0, '初始探索度应为 0');
    t.eq(s.adv.forceN, 0, '入秘境时强搜次数应为 0');
    t.eq(E.forceExploreCost(s), 1, '首次折寿强搜应 -1 年寿元');
    const fr = E.advForceExplore(s);
    t.ok(fr.ok, '强行探查应成功: ' + (fr.msg || ''));
    t.eq(s.lifeMax, life0 - 1, '强行探查应 -1 年寿元');
    t.eq(fr.cost, 1, '首次强搜代价应为 1 年');
    t.eq(fr.nextCost, 2, '第二次强搜代价应等比翻倍为 2 年');
    t.eq(s.adv.explore, exp0, '折寿强搜只出具体造化，不应增加探索度');
    t.gt((fr.lines || []).length, 2, '折寿强搜应产出具体收获文案');
    // 反复折寿强搜也不得推高探索度；代价随次数等比递增 1→2→4→8→16（第 6 次起封顶 16）
    t.eq(E.forceExploreCost(s), 2, '第二次强搜前预展示应为 2 年');
    const fr2 = E.advForceExplore(s);
    t.eq(fr2.cost, 2, '第二次强搜代价应为 2 年');
    t.eq(E.forceExploreCost(s), 4, '第三次强搜前预展示应为 4 年');
    const fr3 = E.advForceExplore(s);
    t.eq(fr3.cost, 4, '第三次强搜代价应为 4 年');
    t.eq(E.forceExploreCost(s), 8, '第四次强搜前预展示应为 8 年');
    const fr4 = E.advForceExplore(s);
    t.eq(fr4.cost, 8, '第四次强搜代价应为 8 年');
    t.eq(E.forceExploreCost(s), 16, '第五次强搜前预展示应为 16 年');
    const fr5 = E.advForceExplore(s);
    t.eq(fr5.cost, 16, '第五次强搜代价应为 16 年');
    const fr6 = E.advForceExplore(s);
    t.eq(fr6.cost, 16, '第六次起强搜代价封顶 16 年（不再继续翻倍）');
    t.eq(s.adv.explore, exp0, '多次折寿强搜仍不应增加探索度');
    t.eq(s.lifeMax, life0 - (1 + 2 + 4 + 8 + 16 + 16), '六次折寿强搜应共 -47 年寿元（1+2+4+8+16+16）');
    t.eq(s.adv.forceN, 6, '强搜次数应累计为 6');
    // 对照：有余力时的体力探查才增进探索度
    s.adv.stamina = 50;
    const er = E.advExplore(s, 'shallow');
    t.ok(er.ok, '体力探查应成功');
    t.gt(s.adv.explore, exp0, '体力探查应增进探索度');
    // 体力不足以支付一步时，普通前进失败、可折寿强行前行
    const choices = E.advNextChoices(s);
    t.ok(choices.length > 0, '应有可前往的节点');
    s.adv.stamina = 1;
    const mv = E.advMove(s, choices[0].id);
    t.ok(!mv.ok, '体力不足时普通前进应失败');
    const lifeBeforeMove = s.lifeMax;
    const fm = E.advForceMove(s, choices[0].id);
    t.ok(fm.ok, '强行前行应成功: ' + (fm.msg || ''));
    t.eq(s.adv.nodeId, choices[0].id, '强行前行后应到达目标节点');
    t.eq(s.lifeMax, lifeBeforeMove - 1, '强行前行应 -1 年寿元（1 年 1 步）');
    // 体力充足时不应允许无谓折寿
    s.adv.stamina = 50;
    const fm2 = E.advForceMove(s, 'c1_0');
    t.ok(!fm2.ok, '体力充足时不应允许折寿强行前行');
  });

  /* 寿元不足：不再静默钳制，而是「提示 → 玩家确认 → 以命换物 → 死亡结算」。
     这是玩家可主动选择的一种结档方式（以命换物，身死道消，所得尽入轮回）。 */
  S.case('寿元不足：给出风险提示，强搜后寿元耗尽即进入死亡结算', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    s.age = 30; s.lifeMax = 40;   // 余寿 10 年
    s.adv.forceN = 3;             // 下一次代价 = 8 年
    let r = E.forceExploreRisk(s);
    t.eq(r.cost, 8, '第 4 次强搜代价应为 8 年');
    t.eq(r.left, 10, '余寿应为 10 年');
    t.eq(r.lack, 0, '余寿充足时缺口应为 0');
    t.ok(!r.fatal, '余寿 10 年 > 代价 8 年，不应判定为致命');
    s.adv.forceN = 4;             // 下一次代价 = 16 年
    r = E.forceExploreRisk(s);
    t.eq(r.cost, 16, '第 5 次强搜代价应为 16 年');
    t.ok(r.fatal, '余寿 10 年 < 代价 16 年，应判定为致命');
    t.eq(r.lack, 6, '寿元缺口应为 6 年');
    // 执行「以命相搏」：照常出货，但此世终结
    const fr = E.advForceExplore(s);
    t.ok(fr.ok, '以命相搏仍应出货');
    t.eq(fr.cost, 16, '实际扣减应为 16 年');
    t.ok(fr.fatal, '返回值应标记 fatal，供 UI 送死亡结算');
    t.ok((fr.lines || []).some(function (l) { return l.indexOf('寿元已尽') >= 0; }), '应给出寿元已尽的文案');
    t.ok(s.dead, '应标记 s.dead');
    t.eq(s.endReason, '寿元耗尽', '死亡原因应为寿元耗尽');
    // 边界：余寿恰好等于代价（扣完即为 0）同样致命
    const s2 = started();
    E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    s2.age = 30; s2.lifeMax = 31; // 余寿 1 年；下次代价 1 年
    t.ok(E.forceExploreRisk(s2).fatal, '余寿恰好等于代价时也应提示（扣完即死）');
    // 对照：余寿充足时不弹确认
    s2.lifeMax = 90;
    t.ok(!E.forceExploreRisk(s2).fatal, '余寿充足时不应判定为致命');
  });

  /* 回归守卫：enemyGen 必须绑定「玩家当前战力」。
     2026-09 曾改为套用固定基线 ENEMY_REALM_BASE（按终局成型角色标定：炼气档 hp 1100 / atk 171），
     而开荒新档只有 hp≈210 / atk≈30，导致黄级秘境第一战就秒杀玩家、直接弹出战败结算。 */
  // 守卫：强搜消耗已改为等比递增，UI 必须动态展示「下一次代价」，不得残留写死的年数
  S.case('UI 文案：折寿强搜消耗动态展示（无写死年数）', (t) => {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(ROOT, 'js', 'ui.js'), 'utf8');
    const lines = src.split('\n');
    // 只校验「按钮」文案（special 与文案同行），正文叙述句不涉及消耗年数
    const entry = lines.filter((l) => l.indexOf("'adv_force_explore'") >= 0 && l.indexOf('t: ') >= 0);
    t.gte(entry.length, 4, '应有 4 处强搜按钮入口，实际 ' + entry.length);
    const hard = entry.filter((l) => l.indexOf('forceChoiceText(') < 0);
    t.eq(hard.length, 0, '强搜按钮文案须统一走 forceChoiceText（内含实时代价与余寿判定）：' + hard.join(' | '));
    t.eq(lines.filter((l) => l.indexOf('function forceChoiceText') >= 0).length, 1, 'forceChoiceText 应唯一');
    t.ok(src.indexOf('Engine.forceExploreRisk(S)') > 0, '文案须用 Engine.forceExploreRisk 取实时代价与余寿');
    const fixedNum = lines.filter((l) => /-\d+ 年寿元，硬搜一处造化/.test(l));
    t.eq(fixedNum.length, 0, '不应残留写死年数的强搜文案');
    // 文案必须把「第几次 + 本次代价 + 后续序列」摊开（否则玩家会以为强搜永远 -1 年）
    t.ok(src.indexOf('代价序列 1/2/4/8/16 封顶') > 0, '按钮文案须明写代价序列 1/2/4/8/16 封顶');
    t.ok(src.indexOf("' 次 · -'") > 0, '按钮文案须明写「第 N 次 · -X 年」');
    t.ok(src.indexOf('强行前行') > 0, '须把「强行前行（固定 1 年）」与「折寿强搜（递增）」在文案上区分开');
    t.eq(E.FORCE_LIFE_COSTS.join(','), '1,2,4,8,16', '等比代价序列应为 1/2/4/8/16');
    // 寿元不足的确认流程：必须存在「以命相搏」选项，且耗尽后直接走死亡结算
    t.ok(src.indexOf("'force_fatal_go'") > 0, '须有「以命相搏」确认选项');
    t.ok(src.indexOf('if (fr.ok && fr.fatal) { endLifeFlow(); return null; }') > 0, '寿元耗尽须直接进入死亡结算');
  });

  /* 守卫：秘境产出必须按阶位分层。
     2026-09 实测黄级·匪徒营寨折寿强搜掉出【元婴丹】——越阶产出会直接砸穿数值曲线。
     物品分阶取「玩家最需要它的时期」：筑基丹=黄、结金丹=玄、元婴丹=地。 */
  S.case('秘境产出分层：低阶秘境不得掉落越阶丹药 / 灵物', (t) => {
    const ELIXIRS = G.get('ELIXIRS');
    const ARTIFACTS = G.get('ARTIFACTS');
    // 灵物 2026-09-13 起本质即法宝（spirit:true），阶位标注校验随之迁移
    const SPIRIT_ITEMS = {};
    Object.keys(ARTIFACTS).forEach(function (k) { if (ARTIFACTS[k].spirit) SPIRIT_ITEMS[k] = ARTIFACTS[k]; });
    t.eq(Object.keys(SPIRIT_ITEMS).length, 4, '灵物类法宝应为 4 件');
    const noGrade = Object.keys(ELIXIRS).filter((k) => !ELIXIRS[k].grade);
    t.eq(noGrade.length, 0, '丹药缺少 grade 阶位标注：' + noGrade.join(','));
    t.eq(ELIXIRS.yuanying.grade, '地', '元婴丹应属地阶（金丹期才用得上）');
    t.eq(ELIXIRS.zhuji.grade, '黄', '筑基丹应属黄阶（炼气期冲刺筑基用）');
    t.eq(ELIXIRS.jiejin.grade, '玄', '结金丹应属玄阶');
    const spiritNoGrade = Object.keys(SPIRIT_ITEMS).filter((k) => !SPIRIT_ITEMS[k].grade);
    t.eq(spiritNoGrade.length, 0, '灵物缺少 grade 阶位标注：' + spiritNoGrade.join(','));

    // 实跑：黄级秘境狂搜 400 次，不得出现玄/地/天阶货
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    s.age = 1; s.lifeMax = 999999; // 排除寿元与死亡干扰，专测产出池
    const before = { yuanying: 0, jiejin: 0, jiuzhuan: 0 };
    for (let i = 0; i < 400; i++) {
      s.adv.forceN = 0;   // 重置代价，专注产出池
      // 灵物已是法宝：清空法宝囊 + 重置「每阶位 3 件法宝」计数，让灵物分支每次都真的给东西
      s.arts = []; s.equip.treasure = []; s.flags.advArt = {};
      E.advForceExplore(s);
    }
    Object.keys(before).forEach(function (k) {
      t.eq(s.elixirs[k] || 0, 0, '黄级秘境强搜 400 次仍掉出了越阶丹药 ' + k + ' ×' + (s.elixirs[k] || 0));
    });

    // 对照：地级秘境（gi=2）应当能出元婴丹
    const s2 = started();
    s2.advType = 'di';
    s2.adv = { forceN: 0, gains: [], explore: 0, exploreMax: 100, stamina: 50, staminaMax: 50 };
    s2.age = 1; s2.lifeMax = 999999;
    const y0 = s2.elixirs.yuanying || 0;
    for (let i = 0; i < 400; i++) {
      s2.adv.forceN = 0; s2.arts = []; s2.equip.treasure = []; s2.flags.advArt = {};
      E.advForceExplore(s2);
    }
    t.gt((s2.elixirs.yuanying || 0) - y0, 0, '地级秘境应能产出元婴丹');
    // 灵物同理：黄级不得出现玄阶及以上的灵物（黄级只能出「上品灵晶」）
    const spiritHi = Object.keys(SPIRIT_ITEMS).filter((k) => '黄玄地天'.indexOf(SPIRIT_ITEMS[k].grade) >= 1);
    t.gte(spiritHi.length, 3, '应有玄/地/天阶灵物用于分层校验');
    {
      const sh = started();
      E.startAdventure(sh, 'huang', { ap: 2, items: [] });
      sh.age = 1; sh.lifeMax = 999999;
      for (let i = 0; i < 400; i++) {
        sh.adv.forceN = 0; sh.arts = []; sh.equip.treasure = []; sh.flags.advArt = {};
        E.advForceExplore(sh);
      }
      const over = Object.keys(SPIRIT_ITEMS).filter(function (k) {
        return ARTIFACTS[k].grade !== '黄' && E.ownsArt(sh, k);
      });
      t.eq(over.length, 0, '黄级秘境搜出了越阶灵物：' + over.join(','));
    }

    // 功法同理：黄级秘境不得出玄阶及以上功法。
    // 历史 bug：黄/玄共用一份池子（天罡诀/长春功/影遁术等玄阶混在黄级池里），黄级匪寨能直接搜出玄阶心法。
    const TECHNIQUES = G.get('TECHNIQUES');
    const GI = { 黄: 0, 玄: 1, 地: 2, 天: 3, 仙: 4 };
    const s3 = started();
    E.startAdventure(s3, 'huang', { ap: 2, items: [] });
    s3.age = 1; s3.lifeMax = 999999;
    for (let i = 0; i < 400; i++) { s3.adv.forceN = 0; E.advForceExplore(s3); }
    const over = s3.techs.filter(function (id) { return TECHNIQUES[id] && GI[TECHNIQUES[id].grade] > 0; });
    t.eq(over.length, 0, '黄级秘境搜出了越阶功法：'
      + over.map(function (id) { return TECHNIQUES[id].name + '(' + TECHNIQUES[id].grade + ')'; }).join(','));
    t.gte(s3.techs.length, 1, '黄级秘境 400 次强搜应至少搜到一门黄阶功法（产出池不能为空）');
    // 仙阶功法不得被当成黄阶（gradeIdxOf('仙') 曾回落为 0，会让仙级功法在黄级秘境现身）
    const K = Object.keys(TECHNIQUES).filter(function (k) { return TECHNIQUES[k].grade === '仙'; });
    t.gte(K.length, 1, '应有仙阶功法用于分层校验');
    t.eq(K.some(function (k) { return s3.techs.indexOf(k) >= 0; }), false, '黄级秘境不得搜出仙阶功法');
  });

  S.case('秘境敌人强度绑定玩家战力（不得回退为固定基线）', (t) => {
    const s = E.startLife('数值校验');
    E.commitStart(s, 'wuxing');
    const r = E.startAdventure(s, 'huang', { ap: 2 });
    t.ok(r && r.ok !== false, '新档应能进入黄级秘境: ' + ((r && r.msg) || ''));
    let spec = null;
    const map = s.adv && s.adv.map;
    t.ok(!!map, '应生成秘境地图');
    let combatNode = null;
    if (map) {
      Object.keys(map.byId).forEach(function (id) {
        const n = map.byId[id];
        if (!combatNode && (n.type === 'combat' || n.type === 'elite')) combatNode = n;
      });
    }
    t.ok(!!combatNode, '地图上应存在战斗节点');
    if (combatNode) spec = E.advResolve(s, combatNode).spec;
    t.ok(!!spec, '应能解析出敌人战斗规格');
    if (spec) {
      // 敌人单次伤害不得超过玩家半血，否则必然被秒杀
      t.lte(spec.atk, s.hpMax * 0.5, '敌人攻击超过玩家半血（会直接秒杀新档）');
      // 玩家应能在合理回合内击杀
      t.lte(spec.hp / Math.max(1, s.atk), 20, '敌人血量过高，无法在合理回合内击杀');
      t.note('敌 atk=' + spec.atk + ' hp=' + spec.hp + ' ｜ 玩家 hpMax=' + s.hpMax + ' atk=' + s.atk);
    }
  });

  // 守卫：敌人属性改为「固定基线 ENEMY_REALM_BASE × 深度系数」，不再挂钩玩家攻/血（2026-09 改）。
  //   深度系数须 clamp（封顶 10 层），否则第 50 层数值会无限膨胀。
  S.case('深层敌人数值不失控（固定基线 × 深度系数，深度封顶 20 层）', (t) => {
    const s = E.startLife('深度校验');
    E.commitStart(s, 'wuxing');
    s.actionsLeft = 6;
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    E.refreshStats(s);
    const l1 = E.enemyGen(s, 'combat', 1, 'huang');
    const l20 = E.enemyGen(s, 'combat', 20, 'huang');
    const l50 = E.enemyGen(s, 'combat', 50, 'huang');
    t.gt(l20.hp, l1.hp, '前 20 层应保留成长曲线');
    t.gt(l20.atk, l1.atk, '前 20 层攻击应递增');
    // 深度系数封顶 20 层（每层 +0.04，第 20 层系数≈1.01）：第 50 层与第 20 层同档，不再随深度膨胀
    t.eq(l50.hp, l20.hp, '第 50 层敌人血量应与第 20 层同档（深度系数封顶 20 层）');
    t.eq(l50.atk, l20.atk, '第 50 层敌人攻击应与第 20 层同档');
    // 固定基线（ENEMY_REALM_BASE[huang]=atk171/hp1100 × 深度系数）：与玩家攻/血无关，不会失控。
    //   首层系数 0.25 → atk=43、hp=275；封顶层（第 20 层）系数≈1.01 → atk≈173、hp≈1111。
    t.lte(l1.atk, 60, '首层敌人攻击应处于固定基线区间（≈43），不随玩家数值失控');
    t.gte(l1.atk, 40, '首层敌人攻击应处于固定基线区间（≈43）');
    t.lte(l50.atk, 200, '封顶层敌人攻击应封顶于固定基线（≈173），不无限膨胀');
    t.note('敌 l1 atk=' + l1.atk + ' hp=' + l1.hp + ' | l20 atk=' + l20.atk + ' hp=' + l20.hp + ' | l50==l20');
  });

  S.case('敌人立绘分层：黄级小怪 / 玄级精英 各自独立，其余回落通用 foe', (t) => {
    const s = started();
    const huangMob = E.enemyGen(s, 'combat', 1, 'huang');
    const huangElite = E.enemyGen(s, 'elite', 1, 'huang');
    const xuanMob = E.enemyGen(s, 'combat', 1, 'xuan');
    const xuanElite = E.enemyGen(s, 'elite', 1, 'xuan');
    const huangBoss = E.enemyGen(s, 'final', 3, 'huang');

    t.eq(huangMob.portrait, 'foe_bandit', '黄级小怪立绘应为 foe_bandit');
    t.eq(xuanElite.portrait, 'foe_wolf', '玄级精英立绘应为 foe_wolf');
    t.eq(huangElite.portrait, 'foe', '黄级精英未配置时应回落通用 foe');
    t.eq(xuanMob.portrait, 'foe', '玄级小怪未配置时应回落通用 foe');
    t.eq(huangBoss.portrait, 'boss_huang', 'BOSS 立绘应为 boss_<阶位>');

    const fs = require('fs');
    ['foe_bandit', 'foe_wolf'].forEach(function (k) {
      t.ok(fs.existsSync(ROOT + '/assets/img/portrait/' + k + '.png'), '缺少立绘文件 ' + k + '.png');
    });
    t.note('黄级小怪 -> foe_bandit ｜ 玄级精英 -> foe_wolf ｜ 其余回落 foe');
  });

  /* 守卫：地图「不穿方块」是靠三个数字对齐实现的 ——
   *   JS: ADV_ROW_H(88) > ADV_NODE_H(56)，CSS: .adv-canvas .adv-node height 必须 = 56px
   * 任一处单独改动而不同步，连线就会重新压到选项块上（历史反馈：线直接穿过选项块）。
   * 同时钉死「隐藏滚动条」与「节点不做 transform 过渡」（滚动虚影的来源）。 */
  S.case('秘境地图样式守卫：隐藏滚动条 / 节点高度与连线锚点同步 / 无 transform 过渡', (t) => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');

    t.ok(/scrollbar-width:\s*none/.test(css), '.adv-map 须隐藏滚动条（scrollbar-width: none）');
    t.ok(css.indexOf('.adv-map::-webkit-scrollbar') > 0, '须有 -webkit-scrollbar 隐藏规则（WebView 用）');

    // 节点不得对 transform 做过渡：位移过渡会与滚动重绘打架，表现为「滑动 + 虚影」
    let badTrans = 0;
    css.split('}').forEach(function (chunk) {
      const i = chunk.indexOf('{');
      if (i < 0) return;
      if (chunk.slice(0, i).indexOf('.adv-node') < 0) return;
      if (/transition:[^;]*transform/.test(chunk.slice(i + 1))) badTrans++;
    });
    t.eq(badTrans, 0, '存在对 transform 做过渡的 .adv-node 规则（' + badTrans + ' 条），会与滚动重绘打架产生虚影');

    const mRow = /ADV_ROW_H\s*=\s*(\d+)/.exec(ui);
    const mNode = /ADV_NODE_H\s*=\s*(\d+)/.exec(ui);
    t.ok(!!mRow && !!mNode, 'ui.js 应定义 ADV_ROW_H / ADV_NODE_H');
    const mCss = /\.adv-canvas \.adv-node\s*\{[\s\S]*?height:\s*(\d+)px/.exec(css);
    t.ok(!!mCss, 'CSS 应为 .adv-canvas .adv-node 指定固定 height（连线锚点依赖它）');
    if (mRow && mNode && mCss) {
      t.eq(Number(mCss[1]), Number(mNode[1]), 'CSS 节点高度须与 JS 的 ADV_NODE_H 一致（否则连线会压回方块上）');
      t.gt(Number(mRow[1]), Number(mNode[1]), 'ADV_ROW_H 必须大于 ADV_NODE_H，否则层与层之间没有走线的空隙');
      t.lte(Number(mRow[1]) - Number(mNode[1]), 40, '层间空隙不宜过大（连线会显得空旷脱节）');
    }

    // 视口固定「4 行道路」：旧版 .adv-map 是 flex:1 自适应高度，长屏一次露出 9 行（玩家实测反馈）。
    //   现由 ui.js 的 ADV_VISIBLE_ROWS 写入 CSS 变量，CSS 只读变量算高度 —— 行数口径单一来源。
    const mRows = /ADV_VISIBLE_ROWS\s*=\s*(\d+)/.exec(ui);
    t.ok(!!mRows, 'ui.js 应定义 ADV_VISIBLE_ROWS（地图视口可见行数）');
    if (mRows) t.eq(Number(mRows[1]), 4, '地图视口应固定为 4 行（实 ' + mRows[1] + ' 行）');
    ['--adv-row-h', '--adv-node-h', '--adv-visible-rows'].forEach(function (v) {
      t.ok(ui.indexOf(v) > 0, 'ui.js 应把 ' + v + ' 写入根节点（CSS 读它算视口高度）');
    });
    const advMapRule = /\.adv-map\s*\{[\s\S]*?\}/.exec(css);
    t.ok(!!advMapRule, 'CSS 应有 .adv-map 规则');
    if (advMapRule) {
      t.ok(/height:\s*calc\(/.test(advMapRule[0]), '.adv-map 高度应由 calc() 算出（= 可见行数 × 行高 + 节点高）');
      t.ok(advMapRule[0].indexOf('--adv-visible-rows') > 0, '.adv-map 高度须消费 --adv-visible-rows（行数口径单一来源）');
      t.ok(advMapRule[0].indexOf('--adv-row-h') > 0, '.adv-map 高度须消费 --adv-row-h（行高口径单一来源）');
      t.ok(!/flex:\s*1\s+1\s+auto/.test(advMapRule[0]), '.adv-map 不应再是 flex:1 自适应高度（长屏会露 9 行）');
    }
    // 两个入口页的秘境 HUD 必须一致（index_pc.html 有独立副本）
    // 注意：发布包 dist/DEDAO_release 按白名单打包，不含 PC 副本 index_pc.html；
    //       副本不存在时跳过该项（主版本仍强制校验），避免「发布包缺 PC 页」被误判为回归。
    const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    t.ok(idx.indexOf('adv-hp-bar') > 0, 'index.html 的秘境 HUD 应含实时气血条（替代原说明按钮）');
    const pcPath = path.join(ROOT, 'index_pc.html');
    if (fs.existsSync(pcPath)) {
      const idxPc = fs.readFileSync(pcPath, 'utf8');
      t.ok(idxPc.indexOf('adv-hp-bar') > 0, 'index_pc.html 的秘境 HUD 应含实时气血条');
    } else {
      t.note('当前目标目录无 index_pc.html（发布包白名单不含 PC 副本），已跳过 PC 一致性校验');
    }
    t.ok(idx.indexOf("整备 · 携带丹药") < 0 && ui.indexOf("整备 · 携带丹药") < 0, '「携带丹药」整备页应已彻底删除');
  });

  // P0 守卫：结算弹窗里的「劫后余生」文案只能出现一次；战败丢失资源后，撤退/通关不得再残留。
  S.case('结算扣减文案仅出现一次，撤退时清空 lostMsg 残留', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    // 给一点资源让 advEnd('lost') 能扣出文案
    s.stone = 1000;
    s.materials = { herb_huang: 200, iron_huang: 40 };
    E.advEnd(s, 'lost');
    t.ok(!!s.adv.lostMsg && s.adv.lostMsg.indexOf('劫后余生') >= 0, '战败应生成劫后余生文案');
    t.eq(s.adv.lostMsg.split('劫后余生').length - 1, 1, '单个 lostMsg 里不应重复出现「劫后余生」');
    // 撤退时必须清空旧 lostMsg，避免下次撤退弹窗里再显一次
    const msg = s.adv.lostMsg;
    E.advEnd(s, 'done');
    t.eq(s.adv.lostMsg, '', '非战败撤离应清空旧 lostMsg');
    // 额外防御：gains 里不应混入 lostMsg 字符串，否则 summarizeGains 会让它出现第二次
    t.eq((s.adv.gains || []).filter(function (g) { return g && g.indexOf && g.indexOf('劫后余生') >= 0; }).length, 0, 'adv.gains 不应包含劫后余生文案');
  });

  S.case('【强行撤离】损失 50% 灵石/草/铁，并写入「强行撤离」文案', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    s.stone = 1000;
    s.materials = { herb_huang: 200, herb_xuan: 100, iron_huang: 60, iron_tian: 40 };
    E.advEnd(s, 'forced');
    t.eq(s.stone, 500, '灵石应损失 50%（1000→500），实际 ' + s.stone);
    const herb = s.materials.herb_huang + s.materials.herb_xuan;
    t.eq(herb, 150, '灵草合计应损失 50%（300→150），实际 ' + herb);
    const iron = s.materials.iron_huang + s.materials.iron_tian;
    t.eq(iron, 50, '灵铁合计应损失 50%（100→50），实际 ' + iron);
    t.ok(/强行撤离/.test(s.adv.lostMsg || ''), '应写入「强行撤离」扣减文案，实际: ' + (s.adv.lostMsg || ''));
    t.ok(/灵石 -500/.test(s.adv.lostMsg || ''), '文案应含「灵石 -500」');
  });

  S.case('【静室撤离】完整收货：走 done 分支，不扣减灵石草铁', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    s.stone = 1000;
    s.materials = { herb_huang: 200, iron_huang: 80 };
    E.advEnd(s, 'done'); // 静室「撤离」与战胜 BOSS 同属完整收货
    t.eq(s.stone, 1000, '静室撤离不应损失灵石');
    t.eq(s.materials.herb_huang, 200, '静室撤离不应损失灵草');
    t.eq(s.adv.lostMsg, '', '静室撤离不应有扣减文案');
  });

  S.case('战败「劫后余生」与「强行撤离」扣减规则区分', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    s.stone = 900;
    s.materials = { herb_huang: 300, iron_huang: 90 };
    E.advEnd(s, 'lost');
    t.eq(s.stone, 450, '战败：灵石取半 900→450');
    t.eq(s.materials.herb_huang, 200, '战败：灵草取 2/3（300→200，floor(total/3)=100）');
    t.ok(/劫后余生/.test(s.adv.lostMsg || ''), '战败文案应为「劫后余生」');
    // 与强行撤离区分：强行撤离灵草应损失 50%（150），而非 1/3（100）
    const s2 = started();
    E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    s2.stone = 900; s2.materials = { herb_huang: 300 };
    E.advEnd(s2, 'forced');
    t.eq(s2.materials.herb_huang, 150, '强行撤离：灵草应损失 50%（300→150），与战败不同');
  });

  /* 回归守卫：初入秘境灵力必须回满。
     历史 bug：startAdventure 沿用「进入时的蓝量」，而 combatStart 战前只 +75%（封顶），
     于是玩家在俗世把蓝耗掉再入秘境，会带着残蓝开打、开局放不出法术。 */
  S.case('初入秘境：灵力回满（不再沿用俗世残蓝）', (t) => {
    const s = started();
    E.refreshStats(s);
    s.mp = Math.round(s.mpMax * 0.1);           // 模拟在俗世把灵力耗到 10%
    t.lt(s.mp, s.mpMax, '前置：灵力应低于上限');
    const r = E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.ok(r.ok, '入秘境应成功: ' + (r.msg || ''));
    t.eq(s.mp, s.mpMax, '初入秘境灵力应回满（实 ' + s.mp + '/' + s.mpMax + '）');
    // 气血仍沿用进入时状态：秘境内的气血消耗是设计内容，不在入口白送
    const s2 = started();
    E.refreshStats(s2);
    s2.hp = Math.round(s2.hpMax * 0.5);
    E.startAdventure(s2, 'huang', { ap: 2, items: [] });
    t.lt(s2.hp, s2.hpMax, '气血应仍沿用进入时状态（不由入口回满）');
  });

  /* 回归守卫：残魂考验 = 精英战难度。
     旧实现用「玩家 atk×0.8 / 玩家 hpMax×0.6」——挂玩家缩放的写法会让考验随玩家变强而水涨船高，
     且与秘境其余敌人（固定基线 × 深度 × 系数）不同源。现统一走 enemyGen('elite')。 */
  S.case('残魂考验 = 精英战难度（enemyGen elite，不挂玩家攻血缩放）', (t) => {
    const fs = require('fs');
    const path = require('path');
    const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
    t.ok(ui.indexOf("Engine.enemyGen(S, 'elite'") > 0, "残魂考验须走 Engine.enemyGen(S, 'elite', ...) 生成精英档敌人");
    t.ok(ui.indexOf('atk: Math.round(S.atk * 0.8)') < 0, '不应残留「玩家 atk × 0.8」的挂玩家缩放');
    t.ok(ui.indexOf('hp: Math.round(S.hpMax * 0.6)') < 0, '不应残留「玩家 hpMax × 0.6」的挂玩家缩放');

    // 实跑对照：同深度下精英档必须强于杂兵（enemyGen 精英系数 ×1.4）
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    E.refreshStats(s);
    const mob = E.enemyGen(s, 'combat', 1, 'huang');
    const elite = E.enemyGen(s, 'elite', 1, 'huang');
    t.gt(elite.hp, mob.hp, '精英档血量应高于同深度杂兵');
    t.gt(elite.atk, mob.atk, '精英档攻击应高于同深度杂兵');
    t.note('杂兵 atk=' + mob.atk + ' hp=' + mob.hp + ' ｜ 精英 atk=' + elite.atk + ' hp=' + elite.hp);
  });

  /* 回归守卫：敌人灵石掉落已下调（2026-09 单场掉落的旧式 (10+10·深度)×阶位 会砸穿经济曲线）。
     保留「精英 ×1.5 / Boss ×2 / 高阶秘境更肥」的层级关系，只压整体量级。 */
  S.case('敌人灵石掉落已下调（量级减半，层级关系保留）', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    E.refreshStats(s);
    const huang1 = E.enemyGen(s, 'combat', 1, 'huang');
    const tian20 = E.enemyGen(s, 'combat', 20, 'tian');
    const tianBoss = E.enemyGen(s, 'boss', 20, 'tian');
    t.lte(huang1.loot.stone, 12, '黄级首层杂兵灵石应 ≤12（实 ' + huang1.loot.stone + '）');
    t.lte(tian20.loot.stone, 300, '天级封顶杂兵灵石应 ≤300（实 ' + tian20.loot.stone + '）');
    t.gt(tianBoss.loot.stone, tian20.loot.stone, 'Boss 灵石应仍高于同层杂兵（层级关系保留）');
    t.gt(tian20.loot.stone, huang1.loot.stone, '高阶秘境单场灵石应仍高于低阶（阶位分层保留）');
    t.note('黄1 杂兵=' + huang1.loot.stone + ' ｜ 天20 杂兵=' + tian20.loot.stone + ' ｜ 天20 Boss=' + tianBoss.loot.stone);
  });

  /* 回归守卫：秘境装备掉落品质严格落在「本阶位区间」内 —— 黄级只出凡品/良品，绝不出上品。
     历史 bug：randomEquip 内有一句 18% 向上越阶（`if (rand<0.18 && range[1]<5) tier=range[1]+1`），
     黄级(bi=0，区间 [1,2]) 于是会掉出 tier3 上品（玩家实测反馈「黄级掉上品太离谱」）。 */
  S.case('秘境装备掉落：品质严格落在阶位区间内（黄级不出上品）', (t) => {
    const tiersOf = function (bi, depth, n) {
      const seen = {};
      for (let i = 0; i < (n || 400); i++) {
        const inst = E.randomEquip(bi, depth);
        if (!inst) continue;
        const it = E.findEquip(inst.id);
        if (it) seen[it.tier] = (seen[it.tier] || 0) + 1;
      }
      return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    };
    const expect = { 0: [1, 2], 1: [2, 3], 2: [3, 4], 3: [4, 5] };
    const gradeName = { 0: '黄', 1: '玄', 2: '地', 3: '天' };
    Object.keys(expect).forEach(function (k) {
      const bi = Number(k), lo = expect[k][0], hi = expect[k][1];
      const got = tiersOf(bi, 1);
      t.ok(got.length > 0, gradeName[bi] + '级秘境应能掉落装备');
      got.forEach(function (tr) {
        t.gte(tr, lo, gradeName[bi] + '级掉出了低于本阶的 tier' + tr + '（应 ≥' + lo + '）');
        t.lte(tr, hi, gradeName[bi] + '级掉出了越阶的 tier' + tr + '（应 ≤' + hi + '）');
      });
      // 深度偏置只影响区间内概率，不得越阶
      tiersOf(bi, 20).forEach(function (tr) {
        t.lte(tr, hi, gradeName[bi] + '级深层(深度20)掉出越阶 tier' + tr + '（应 ≤' + hi + '）');
      });
      t.note(gradeName[bi] + '级(bi=' + bi + ') 实测 tier: ' + got.join('/') + '，允许 [' + lo + ',' + hi + ']');
    });
  });

  /* 仙魔浩劫 BGM = bgm_battle.mp3（本项目两者是同一首；曾误指向不存在的 bgm_xianmo.mp3） */
  S.case('仙魔浩劫 BGM 指向真实存在的 bgm_battle.mp3', (t) => {
    const fs = require('fs');
    const path = require('path');
    const audio = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
    const m = /xianmo:\s*'([^']+)'/.exec(audio);
    t.ok(!!m, 'BGM_FILES 应含 xianmo 键');
    if (m) {
      t.eq(m[1], 'assets/audio/bgm/bgm_battle.mp3', '仙魔浩劫应指向 bgm_battle.mp3（实 ' + m[1] + '）');
      t.ok(fs.existsSync(path.join(ROOT, m[1])), 'BGM 文件应真实存在：' + m[1]);
    }
    t.ok(audio.indexOf("assets/audio/bgm/bgm_xianmo.mp3") < 0, '不应再引用不存在的 assets/audio/bgm/bgm_xianmo.mp3');
  });

  /* 回归守卫：秘境装备掉落率三调（2026-09-13 用户拍板公式，去基数项、封顶 0.30）
     总掉率（杂兵/精英）= min(0.30, 有效深度×0.02) → 首层 2% / 10 层 20% / 15 层起封顶 30%；Boss 固定 0.60。
     「高一品」概率 = min(0.30, 深度×0.02) → 首层 2% / 10 层 20% / 15 层起封顶 30%，本阶品 = 1 − 该值。
     旧值①：总掉率 0.06+ed×0.02（封顶 0.35）/ 品阶 0.18+深度×0.02（封顶 0.55）。
     旧值②：总掉率 0.10+ed×0.04（封顶 0.55）/ Boss 0.80；品阶 0.30+深度×0.03（封顶 0.90）。 */
  S.case('秘境装备掉落率三调：用户拍板 min(0.30, 深度×0.02)', (t) => {
    const s = started();
    E.startAdventure(s, 'huang', { ap: 2, items: [] });
    const N = 1200;
    const dropRate = function (depth, tag, adv) {
      let hit = 0;
      for (let i = 0; i < N; i++) {
        const foe = E.enemyGen(s, tag, depth, adv);
        if (foe.loot && foe.loot.equip) hit++;
      }
      return hit / N;
    };
    const r1 = dropRate(1, 'combat', 'huang');
    const r10 = dropRate(10, 'combat', 'huang');
    const r20 = dropRate(20, 'combat', 'huang');
    const rBoss = dropRate(20, 'boss', 'huang');
    t.inRange(r1, 0.005, 0.05, '杂兵首层装备总掉率应 ≈2%（实 ' + (r1 * 100).toFixed(1) + '%）');
    t.inRange(r10, 0.15, 0.25, '杂兵第10层总掉率应 ≈20%（实 ' + (r10 * 100).toFixed(1) + '%）');
    t.inRange(r20, 0.25, 0.35, '杂兵第20层总掉率应封顶 ≈30%（实 ' + (r20 * 100).toFixed(1) + '%）');
    t.inRange(rBoss, 0.53, 0.67, 'Boss 总掉率应 ≈60%（实 ' + (rBoss * 100).toFixed(1) + '%）');
    t.gt(r20, r1, '越深总掉率应越高');

    const upRate = function (bi, depth) {
      const range = E.realmTierRange(bi);
      if (range[1] <= range[0]) return 0;
      let up = 0, tot = 0;
      for (let i = 0; i < 1500; i++) {
        const inst = E.randomEquip(bi, depth);
        if (!inst) continue;
        const it = E.findEquip(inst.id);
        if (!it) continue;
        tot++;
        if (it.tier === range[1]) up++;
      }
      return tot ? up / tot : 0;
    };
    const u1 = upRate(0, 1), u10 = upRate(0, 10), u20 = upRate(0, 20);
    t.inRange(u1, 0.004, 0.05, '首层「高一品」概率应 ≈2%（实 ' + (u1 * 100).toFixed(1) + '%）');
    t.inRange(u10, 0.15, 0.25, '第10层「高一品」概率应 ≈20%（实 ' + (u10 * 100).toFixed(1) + '%）');
    t.inRange(u20, 0.25, 0.35, '第20层「高一品」概率应封顶 ≈30%（实 ' + (u20 * 100).toFixed(1) + '%）');
    t.lt(u1, u10, '越深「高一品」概率应越高');
    t.note('总掉率 首层' + (r1 * 100).toFixed(1) + '% / 10层' + (r10 * 100).toFixed(1) + '% / 20层' + (r20 * 100).toFixed(1)
      + '% / Boss ' + (rBoss * 100).toFixed(1) + '% ｜ 高一品 首层' + (u1 * 100).toFixed(1) + '% / 10层'
      + (u10 * 100).toFixed(1) + '% / 20层' + (u20 * 100).toFixed(1) + '%');
  });

  return S;
};
