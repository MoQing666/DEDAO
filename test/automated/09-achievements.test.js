/* DEDAO 自动化测试 —— 09 成就判定（境界 / 渡劫 / 里程碑文案）
 *
 * 背景（2026-09-11 玩家实测）：突破「炼气中期」时就点亮了「破境·筑基」成就。
 * 根因：achDefs() 里写成 `shou_zhuji: 突破次数 >= 1 || s.idx >= 3`，
 *       而「突破次数」是每次小阶提升都 +1 的计数。炼气前期→中期即为 1，
 *       于是第一个成就直接误判。同类问题还有：
 *         · 「三劫不陨」用 突破次数 >= 3（把突破次数当渡劫次数）
 *         · 结算 top5「一生渡劫 N 次而不陨」把突破次数当渡劫数
 *         · 结算明细「渡劫（N 次）」同样取突破次数
 * 修法：境界类一律用阶位索引 s.idx（0 炼气前期 / 3 筑基 / 6 金丹 / 9 元婴 / 15 仙），
 *       渡劫类改用新增的真实计数器 s.tribPassed（由 dujieWin 累加）。
 * 注：那个「突破次数」字段已于 2026-09-15 全量删除（AGENTS.md 变更日志 #61）——
 *     它既不能当境界判据、也不能当渡劫判据，留着只会招来第三次误用。
 * 本套件守住这两条线，防止回退。
 */
const { Suite, createGameContext } = require('./_harness');

function meta() {
  return { lives: 1, earnedTotal: 0, achievements: {}, reinc: {}, destinySeen: {} };
}

module.exports = async function build() {
  const S = new Suite('09 成就判定（境界/渡劫）');
  const G = createGameContext({ seed: 20260911 });
  const E = G.get('Engine');
  const ACHIEVEMENTS = G.get('ACHIEVEMENTS');

  function fresh() {
    const s = E.startLife('成就验证');
    E.commitStart(s, 'wuxing');
    s.actionsLeft = 6;
    return s;
  }
  function defs(s, m) { return E.achDefs(s, m || meta()); }   // 传入自定义 meta 时用它（阈值夹逼用例需要改 lives/earnedTotal/destinySeen）

  S.case('境界成就按阶位索引判定：炼气期绝不点亮筑基成就', (t) => {
    const s = fresh();
    // 复现玩家场景：炼气前期 → 炼气中期（idx=2，tribPassed=0）
    s.idx = 2; s.realm = '炼气'; s.tribPassed = 0;
    let d = defs(s);
    t.ok(!d.shou_zhuji, '炼气中期（idx=2）不得解锁「破境·筑基」');
    t.ok(!d.shou_jiejin, '炼气期不得解锁「金丹大道」');
    t.ok(!d.shou_yuanying, '炼气期不得解锁「元婴出窍」');
    t.ok(!d.feisheng, '炼气期不得解锁「羽化登仙」');
    // 炼气后期仍然不行
    s.idx = 2;
    t.ok(!defs(s).shou_zhuji, '炼气后期不得解锁筑基成就');
    // 踏入筑基前期（idx=3）
    s.idx = 3; s.realm = '筑基'; d = defs(s);
    t.ok(d.shou_zhuji, '踏入筑基前期（idx=3）应解锁「破境·筑基」');
    t.ok(!d.shou_jiejin, '筑基期不得解锁「金丹大道」');
  });

  S.case('全阶扫描：境界成就首次点亮的阶位索引精确等于 3 / 6 / 9 / 15', (t) => {
    const first = {};
    const REALM_OF = (i) => (i >= 15 ? '仙' : ['炼气', '筑基', '金丹', '元婴'][Math.floor(i / 3)]);
    for (let idx = 0; idx <= 15; idx++) {
      const s = fresh();
      s.idx = idx; s.realm = REALM_OF(idx);
      s.tribPassed = 0;
      const dd = defs(s);
      ['shou_zhuji', 'shou_jiejin', 'shou_yuanying', 'feisheng'].forEach(function (k) {
        if (dd[k] && first[k] === undefined) first[k] = idx;
      });
    }
    t.eq(first.shou_zhuji, 3, '「破境·筑基」首次点亮应为 idx=3（筑基前期）');
    t.eq(first.shou_jiejin, 6, '「金丹大道」首次点亮应为 idx=6（金丹前期）');
    t.eq(first.shou_yuanying, 9, '「元婴出窍」首次点亮应为 idx=9（元婴前期）');
    t.eq(first.feisheng, 15, '「羽化登仙」首次点亮应为 idx=15（仙）');
  });

  S.case('「三劫不陨」按真实渡劫次数，不再拿突破次数顶替', (t) => {
    const s = fresh();
    s.idx = 11; s.realm = '元婴'; s.tribPassed = 0;
    t.ok(!defs(s).sanjie, '元婴期却一次劫都没渡（tribPassed=0），不得解锁「三劫不陨」');
    s.tribPassed = 2;
    t.ok(!defs(s).sanjie, '渡劫 2 次尚不解锁');
    s.tribPassed = 3;
    t.ok(defs(s).sanjie, '渡劫 3 次应解锁「三劫不陨」');
    // 反向：确认判定只看 tribPassed，不依赖任何别的计数
    const s2 = fresh();
    s2.idx = 15; s2.tribPassed = 3;
    t.ok(defs(s2).sanjie, '渡劫 3 次即解锁，不依赖其它计数');
  });

  S.case('渡劫成功才计数：tribPassed 由 dujieWin 累加，结算按次给点', (t) => {
    const s = fresh();
    t.eq(s.tribPassed, 0, '开局渡劫次数应为 0');
    s.idx = 5; s.realm = '筑基';
    const r = E.dujieWin(s);
    t.ok(r && r.ok, '渡金丹劫成功应返回 ok');
    t.eq(s.idx, 6, '渡劫后应进入金丹前期');
    t.eq(s.tribPassed, 1, '渡劫成功应累加 tribPassed');
    const sp = E.settlePoints(s, meta());
    t.eq(sp.breakdown.trib, 3, '渡劫 1 次应给 3 点');
    t.ok(sp.top5.some(function (e) { return e.text.indexOf('渡劫1次') >= 0; }),
      '此生大事应出现「一世渡劫1次而不陨」，实际：' + sp.top5.map(function (e) { return e.text; }).join(' / '));
    // 第二次渡劫
    s.idx = 8; s.realm = '金丹';
    E.dujieWin(s);
    t.eq(s.tribPassed, 2, '再次渡劫成功应继续累加');
    t.eq(E.settlePoints(s, meta()).breakdown.trib, 6, '渡劫 2 次应给 6 点');
  });

  S.case('「初次突破筑基」里程碑不写入炼气期结算', (t) => {
    const s = fresh();
    s.idx = 2; s.realm = '炼气';
    const sp = E.settlePoints(s, meta());
    t.ok(!sp.top5.some(function (e) { return e.text.indexOf('初次突破筑基') >= 0; }),
      '炼气中期不得在结算里显示「初次突破筑基」');
    s.idx = 4; s.realm = '筑基';
    const sp2 = E.settlePoints(s, meta());
    t.ok(sp2.top5.some(function (e) { return e.text.indexOf('初次突破筑基') >= 0; }),
      '筑基期结算应显示「初次突破筑基」（实际：' + sp2.top5.map(function (e) { return e.text; }).join(' / ') + '）');
  });

  S.case('成就表与判定表一一对应（不漏判、不多判）', (t) => {
    const d = defs(fresh());
    const ids = Object.keys(ACHIEVEMENTS);
    const missing = ids.filter(function (id) { return !(id in d); });
    t.eq(missing.length, 0, '成就表中有未实现判定的条目：' + missing.join(','));
    const extra = Object.keys(d).filter(function (id) { return !(id in ACHIEVEMENTS); });
    t.eq(extra.length, 0, '判定表中有成就表不存在的条目：' + extra.join(','));
    t.eq(Object.keys(d).length, ids.length, '判定项数应与成就表一致');
  });

  /* ============================================================
     回归 2026-09-15：成就文案里的**总数**必须与数据表一致
     实锤两处玩家可见的错文案（改了数据、忘了改文案）：
       · fabao_da「拥有全部四十四件法宝」—— ARTIFACTS 实为 47 件
       · mingbo  「集齐全部四十七个命格」—— DESTINIES  实为 46 个
     修法不是「把数字改对」就完事 —— 那样加一件法宝又会漂移。
     这里把「文案中的中文数字」与「数据表实际条目数」**动态**比对，
     以后加/删法宝、命格，文案不跟着改就必红。

     2026-09-15 下午扩行：初版只覆盖 6 条，普查发现成就表里共 9 处硬编码总数，
     漏掉的 3 处恰是**另取数据源**的（秘境之主数 / 有缘人数），已补。
     ============================================================ */
  S.case('成就文案「总数」与数据表动态一致（防加/删条目后文案漂移）', (t) => {
    const ART = G.get('ARTIFACTS');
    const DEST = G.get('DESTINIES');
    const ADV = G.get('ADVENTURE_CONFIG');
    const NPCS = G.get('NPCS');

    const artIds = Object.keys(ART);
    const xianCount = artIds.filter(id => ART[id].grade === '仙').length;
    const spiritCount = artIds.filter(id => ART[id].spirit).length;
    // 秘境：ADVENTURE_CONFIG 里的 trial 是「劫境」不是秘境，不计入
    const advKeys = Object.keys(ADV).filter(k => k !== 'trial');
    const normalAdv = advKeys.filter(k => k !== 'xian').length;   // 常规 = 黄/玄/地/天
    // 「秘境之主」不是秘境数 —— 取真正带 boss 的秘境（当前两者恰好都是 5，但来源不同，不能互当）
    const advBossCount = advKeys.filter(k => ADV[k] && ADV[k].boss).length;
    const npcKeys = Object.keys(NPCS);

    const CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    function cn2int(s) {
      if (!s) return null;
      if (s === '十') return 10;
      if (s.indexOf('十') >= 0) {
        const p = s.split('十');
        return (p[0] ? CN[p[0]] : 1) * 10 + (p[1] ? CN[p[1]] : 0);
      }
      let n = 0;
      for (const ch of s) { if (!(ch in CN)) return null; n = n * 10 + CN[ch]; }
      return n;
    }

    /* 文案里出现「全部/集齐/所有 + 中文数字 + 量词」的成就 → 期望值来源。
       第 3 项可选：该条专用的匹配正则（默认 TOT）。 */
    const EXPECT = {
      fabao_da:   [artIds.length, '件'],            // 全部法宝
      xianqi_man: [xianCount, '件'],                // 仙阶法宝
      wanmei:     [spiritCount, '件'],              // 灵物（秘藏专属法宝）
      mingbo:     [Object.keys(DEST).length, '个'],  // 命格
      quanjing:   [advKeys.length, '种'],           // 全部秘境（含遗世仙踪）
      shou_cang:  [normalAdv, '种'],                // 常规秘境（黄/玄/地/天）
      wujie:      [advBossCount, '位'],             // 秘境之主（带 boss 的秘境数）
      zhongsheng: [npcKeys.length, '位'],           // 有缘人
      // 「四位有缘人好感皆达满级」文案没写「全部」，用专用正则（注意量词也要捕获，与 TOT 对齐）
      yuanding:   [npcKeys.length, '位', /([一二三四五六七八九十]+)\s*(位)有缘人/],
    };

    t.note('数据口径：法宝 ' + artIds.length + '（仙 ' + xianCount + ' / 灵物 ' + spiritCount + '）· 命格 ' +
      Object.keys(DEST).length + ' · 秘境 ' + advKeys.length + '（常规 ' + normalAdv + ' / 带 BOSS ' + advBossCount +
      '）· 有缘人 ' + npcKeys.length);

    const TOT = /(?:全部|集齐|所有)\s*([一二三四五六七八九十]+)\s*(件|个|种|位)/;
    let checked = 0;
    Object.keys(EXPECT).forEach(function (id) {
      const a = ACHIEVEMENTS[id];
      t.ok(!!a, '成就表缺少 ' + id);
      if (!a) return;
      const m = String(a.desc).match(EXPECT[id][2] || TOT);
      t.ok(!!m, id + ' 的文案应含「全部/集齐 + 数字 + 量词」，实为「' + a.desc + '」');
      if (!m) return;
      checked++;
      t.eq(m[2], EXPECT[id][1], id + ' 量词应为「' + EXPECT[id][1] + '」，实为「' + m[2] + '」');
      t.eq(cn2int(m[1]), EXPECT[id][0],
        id + ' 文案「' + m[1] + m[2] + '」与数据表不符（实际 ' + EXPECT[id][0] + ' ' + EXPECT[id][1] +
        '）—— 改了数据就必须同步文案');
    });
    t.ok(checked >= 9, '应至少核对 9 条含总数的成就文案，实为 ' + checked);
  });

  /* ============================================================
     回归 2026-09-15（下午）：成就文案里的**阈值**必须与引擎开关点一致

     与上一条「总数」是不同的漂移源：
       · 总数漂移 → 玩家看得见数字不对（44 vs 47）；
       · **阈值漂移 → 更坏**：玩家照着文案刷到 15 部功法，引擎却要 16 部才点亮，
         成就永远差一步，且没人会怀疑是文案的错。
     文案与代码是两处独立数字：`js/data.js` 的 desc 和 `js/engine.js` 的 `achDefs` 比较常量。
     这里用**双侧夹逼**把两者钉死：
       ① 从 desc 里抽数字（中文数字与半角阿拉伯数字都要认），要求引擎实际阈值 N 在其中；
       ② 构造存档使计数器 = N-1 → 必须 false；= N → 必须 true。
     任一层不成立即红。两者同时被有意改大改小（策划调平衡）不会报错，正是我们想要的。
     ============================================================ */
  S.case('成就文案「阈值」与引擎开关点双侧夹逼（N-1 未点亮 / N 恰好点亮）', (t) => {
    const TECHNIQUES = G.get('TECHNIQUES');
    const ARTIFACTS = G.get('ARTIFACTS');
    const DESTINIES = G.get('DESTINIES');

    const techIds = Object.keys(TECHNIQUES);
    const artIds = Object.keys(ARTIFACTS);
    const destIds = Object.keys(DESTINIES);

    /* 按 cls 分组 —— sanxiu_dao 除总数外还要求「心法/术法/遁术三类各有」 */
    const techByCls = {};
    techIds.forEach(function (id) { const c = TECHNIQUES[id].cls || '?'; (techByCls[c] = techByCls[c] || []).push(id); });
    const clsOf = Object.keys(techByCls);
    function techsSpanning(n) {
      const out = [];
      clsOf.forEach(function (c) { if (out.length < n) out.push(techByCls[c][0]); });
      for (const id of techIds) { if (out.length >= n) break; if (out.indexOf(id) < 0) out.push(id); }
      return out.slice(0, n);
    }

    const CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    function cn2int(s) {
      if (!s) return null;
      if (s === '十') return 10;
      if (s.indexOf('十') >= 0) {
        const p = s.split('十');
        return (p[0] ? CN[p[0]] : 1) * 10 + (p[1] ? CN[p[1]] : 0);
      }
      let n = 0;
      for (const ch of s) { if (!(ch in CN)) return null; n = n * 10 + CN[ch]; }
      return n;
    }
    /* 抽出 desc 里所有数字。半角数字（如「等级≥5」）也算 —— 它本身是体例不统一，
       但解析器必须容忍，否则会漏判。 */
    function numsIn(desc) {
      const out = [];
      const re = /[一二三四五六七八九十]+百?[一二三四五六七八九十]*|\d+/g;
      let m;
      while ((m = re.exec(desc))) {
        const raw = m[0];
        if (/^\d+$/.test(raw)) { out.push(parseInt(raw, 10)); continue; }
        if (/百/.test(raw)) {
          const p = raw.split('百');
          out.push((p[0] ? (CN[p[0]] || 0) : 1) * 100 + (p[1] ? (cn2int(p[1]) || 0) : 0));
        } else {
          const v = cn2int(raw);
          if (v != null) out.push(v);
        }
      }
      return out;
    }

    /* [成就id, 期望阈值 N, 把计数器设成 n 的写法]
       注意阈值 N 一律「从文案里抄」——它必须同时出现在 desc 的数字集合中，否则报错。 */
    const ROWS = [
      ['daofa_3k',     15, (s, m, n) => { s.techs = techIds.slice(0, n); }],
      ['wanfa',        30, (s, m, n) => { s.techs = techIds.slice(0, n); }],
      ['sanxiu_dao',    6, (s, m, n) => { s.techs = techsSpanning(n); }],
      ['fabao_cang',   15, (s, m, n) => { s.equip.treasure = artIds.slice(0, n); }],
      ['shiming',      10, (s, m, n) => { m.destinySeen = {}; destIds.slice(0, n).forEach(i => { m.destinySeen[i] = 1; }); }],
      ['sanshiming',   30, (s, m, n) => { m.destinySeen = {}; destIds.slice(0, n).forEach(i => { m.destinySeen[i] = 1; }); }],
      ['busi',         10, (s, m, n) => { s.advNoDmgCount = n; }],
      ['pingjie',       5, (s, m, n) => { s.deathPassed = n; }],
      ['shanhe',       50, (s, m, n) => { s.travelCount = n; }],
      ['jingshi3',      3, (s, m, n) => { m.lives = n; }],
      ['wangu',        10, (s, m, n) => { m.lives = n; }],
      ['jishan',      100, (s, m, n) => { m.earnedTotal = n; }],
      ['fujia',       500, (s, m, n) => { m.earnedTotal = n; }],
      ['ai_renzi',    200, (s, m, n) => { s.age = n; }],
      ['chang_sheng', 300, (s, m, n) => { s.age = n; }],
      ['baiyi_tong',    5, (s, m, n) => { s.craft = { liandan: { lv: n } }; }],
      ['lingtian',      5, (s, m, n) => { s.mine = { depth: n }; }],
      ['sanjie',        3, (s, m, n) => { s.tribPassed = n; }],
    ];

    let checked = 0;
    ROWS.forEach(function (row) {
      const id = row[0], N = row[1], set = row[2];
      const a = ACHIEVEMENTS[id];
      t.ok(!!a, '成就表缺少 ' + id);
      if (!a) return;
      checked++;

      // ① 文案 ↔ 数字：引擎阈值 N 必须出现在文案的数字集合里
      const nums = numsIn(String(a.desc));
      t.ok(nums.indexOf(N) >= 0,
        id + ' 文案「' + a.desc + '」里找不到引擎实际阈值 ' + N + '（文案数字集 [' + nums.join(',') + ']）' +
        '—— 文案与引擎已漂移，玩家照着文案刷也点不亮');

      // ② 数字 ↔ 代码：N-1 不许点亮，N 必须恰好点亮
      const lo = (function () { const s = fresh(); const m = meta(); set(s, m, N - 1); return !!defs(s, m)[id]; })();
      const hi = (function () { const s = fresh(); const m = meta(); set(s, m, N); return !!defs(s, m)[id]; })();
      t.eq(lo, false, id + ' 在计数器 = ' + (N - 1) + ' 时不应点亮（引擎阈值应恰为 ' + N + '）');
      t.eq(hi, true, id + ' 在计数器 = ' + N + ' 时应点亮（文案承诺的阈值是 ' + N + '）');
    });

    t.ok(checked >= 18, '应至少夹逼 18 条阈值型成就，实为 ' + checked);
  });

  /* ============================================================
     回归 2026-09-16（玩家实测报障）：「触发条件诡异 + 解锁后在成就栏找不到」

     bug-A（找不到）：实时检测 checkAchievementsLive 只写 s.announcedAch，**不写 meta**。
       → 玩家看到「🏆 达成成就」横幅，打开成就栏该条仍是 🔒（成就栏只读 meta.achievements），
         必须等飞升/陨落结算才入账；中途弃档或关页面，本世成就直接蒸发。
     bug-B（诡异之①）：法宝类判据只取 s.equip.treasure（装备位）。装备槽上限仅 1~4 个，
       而「法宝收藏」要 15 件、「法宝大成」要 47 件、「仙器满堂」要 4 件仙阶 —— 永远不可能达成；
       买来放背包 s.arts 的法宝一件都不算。同文件里 wanmei 却用 ownsArt（装备位∪背包），口径分叉。
     bug-C（诡异之②）：隐藏成就「仙人遗影」判据 s.flags.ktPage 全流程**从未被赋值**，
       遗世仙踪只写了「拾得《开天篇》残页」的文案 —— 该成就（及依赖它的「天道眷顾」）恒不可达。

     修法：拆成两个标记 —— achievements=已达成（成就栏可见，实时即写）；
     achPaid=轮回点已发放（每 id 仅一次，仍在结算发）。
     ============================================================ */
  S.case('实时达成立即入账 meta（横幅弹过 → 成就栏当场可见，不必等结算）', (t) => {
    const s = fresh();
    const m = meta();
    const newly = E.checkAchievementsLive(s, m);
    t.ok(newly.length > 0, '开局应有即时达成的成就（如「初习道法」），实为 ' + newly.length);
    newly.forEach(function (id) {
      t.eq(m.achievements[id], 1, id + ' 实时达成后必须写进 meta.achievements（否则成就栏看不到）');
      t.eq(s.announcedAch[id], 1, id + ' 应标记 announcedAch，横幅只弹一次');
    });
    t.eq(E.checkAchievementsLive(s, m).length, 0, '同一成就不得重复弹横幅');
    t.eq(Object.keys(m.achPaid || {}).length, 0, '实时检测不发轮回点，achPaid 应为空');
  });

  S.case('轮回点只发一次：实时入账后结算仍发点，跨世/裸 meta 绝不重发', (t) => {
    // ① 实时达成 → 结算把点补上，且只补一次
    const s = fresh();
    const m = meta();
    E.checkAchievementsLive(s, m);
    const r1 = E.checkAchievements(s, m).filter(x => x.new).map(x => x.id);
    t.ok(r1.length > 0, '结算应给实时达成的成就发点');
    const r2 = E.checkAchievements(s, m).filter(x => x.new).map(x => x.id);
    t.eq(r2.length, 0, '同一局二次结算不得重复发点（实为 ' + r2.join(',') + '）');
    // ② 下一世再达成同一成就，不再发点
    t.eq(E.checkAchievements(fresh(), m).filter(x => x.new).length, 0, '第二世重复达成不得再发点');
    // ③ 裸 meta（无 achPaid，旧档/工具脚本形制）：已达成项一律视为已发点
    const m2 = { lives: 1, earnedTotal: 0, achievements: { chu_dao: 1, shou_zhuji: 1 }, reinc: {}, destinySeen: {} };
    const r3 = E.checkAchievements(fresh(), m2).filter(x => x.new).map(x => x.id);
    t.ok(r3.indexOf('chu_dao') < 0 && r3.indexOf('shou_zhuji') < 0,
      '裸 meta 里已存在的成就不得被当成新解锁重发（实为 ' + r3.join(',') + '）');
  });

  S.case('法宝类成就按「已拥有」判定：背包 s.arts 与装备位等价且合并计数', (t) => {
    const ART = G.get('ARTIFACTS');
    const artIds = Object.keys(ART);
    const xianIds = artIds.filter(id => ART[id].grade === '仙');
    function withBag(n) { const s = fresh(); s.arts = artIds.slice(0, n); return defs(s).fabao_cang; }
    t.eq(withBag(14), false, '背包 14 件未达「法宝收藏」15 件门槛');
    t.eq(withBag(15), true, '背包 15 件应点亮「法宝收藏」（旧口径只算装备位，永远点不亮）');
    // 装备位 + 背包合并
    const s = fresh();
    s.equip.treasure = artIds.slice(0, 3);
    s.arts = artIds.slice(3, 15);
    t.eq(defs(s).fabao_cang, true, '装备 3 + 背包 12 应合并计为 15 件');
    // 仙器满堂：4 件仙阶，装备槽上限远小于此，只有合并口径才可能达成
    const s2 = fresh();
    s2.arts = xianIds.slice();
    t.eq(defs(s2).xianqi_man, true, '背包凑齐仙阶法宝应点亮「仙器满堂」');
    t.eq(defs(s2).xianqi, true, '「仙器临世」同样按已拥有判定');
  });

  S.case('隐藏成就「仙人遗影」可达：习得《开天篇》即写 flags.ktPage', (t) => {
    const s = fresh();
    t.eq(defs(s).xianren, false, '未得《开天篇》时不应点亮');
    E.applyOps(s, { tech: 'kaitian' });
    t.eq(s.flags.ktPage, true, '习得《开天篇》应留痕 flags.ktPage');
    t.eq(defs(s).xianren, true, '「仙人遗影」应点亮（此前 ktPage 从未赋值 → 恒不可达）');
  });

  S.case('判据引用的字段必须有赋值点：不得再出现「永远解不开」的成就', (t) => {
    const fs = require('fs');
    const p = require('path');
    const root = p.resolve(__dirname, '..', '..');
    const src = ['js/engine.js', 'js/ui.js', 'js/data.js']
      .map(f => fs.readFileSync(p.join(root, f), 'utf8')).join('\n');
    // 判据里用到的「非通用」状态字段，逐个确认源码中存在赋值
    [['ktPage', '仙人遗影'], ['advDmgThisRun', '无伤探秘/不死传说'], ['weakBossWin', '以弱胜强']]
      .forEach(function (row) {
        const writes = (src.match(new RegExp('\\b' + row[0] + '\\s*=[^=]', 'g')) || []).length;
        t.ok(writes > 0, '字段 ' + row[0] + '（' + row[1] + '）在源码中应有赋值点，实为 ' + writes + ' 处');
      });
    // 无伤标记必须由引擎在开图时重置（旧版只在 UI 的 fightBoss 里置 false，判据却是严格 ===false）
    const eng = fs.readFileSync(p.join(root, 'js', 'engine.js'), 'utf8');
    t.ok(/s\.advDmgThisRun\s*=\s*false/.test(eng), 'engine.js 应在进入秘境时重置 s.advDmgThisRun');
  });

  return S;
};
