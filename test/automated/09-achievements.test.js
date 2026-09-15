/* DEDAO 自动化测试 —— 09 成就判定（境界 / 渡劫 / 里程碑文案）
 *
 * 背景（2026-09-11 玩家实测）：突破「炼气中期」时就点亮了「破境·筑基」成就。
 * 根因：achDefs() 里写成 `shou_zhuji: s.broken >= 1 || s.idx >= 3`，
 *       而 s.broken 是【突破次数】——每次小阶提升都 +1。炼气前期→中期即为 1，
 *       于是第一个成就直接误判。同类问题还有：
 *         · 「三劫不陨」用 s.broken >= 3（把突破次数当渡劫次数）
 *         · 结算 top5「一生渡劫 N 次而不陨」把 s.broken 当渡劫数
 *         · 结算明细「渡劫（N 次）」同样取 s.broken
 * 修法：境界类一律用阶位索引 s.idx（0 炼气前期 / 3 筑基 / 6 金丹 / 9 元婴 / 15 仙），
 *       渡劫类改用新增的真实计数器 s.tribPassed（由 dujieWin 累加）。
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
  function defs(s) { return E.achDefs(s, meta()); }

  S.case('境界成就按阶位索引判定：炼气期绝不点亮筑基成就', (t) => {
    const s = fresh();
    // 复现玩家场景：炼气前期 → 炼气中期（idx=2，broken=1，tribPassed=0）
    s.idx = 2; s.realm = '炼气'; s.broken = 1; s.tribPassed = 0;
    let d = defs(s);
    t.ok(!d.shou_zhuji, '炼气中期（idx=2, broken=1）不得解锁「破境·筑基」');
    t.ok(!d.shou_jiejin, '炼气期不得解锁「金丹大道」');
    t.ok(!d.shou_yuanying, '炼气期不得解锁「元婴出窍」');
    t.ok(!d.feisheng, '炼气期不得解锁「羽化登仙」');
    // 炼气后期仍然不行
    s.idx = 2; s.broken = 2;
    t.ok(!defs(s).shou_zhuji, '炼气后期不得解锁筑基成就');
    // 踏入筑基前期（idx=3）
    s.idx = 3; s.realm = '筑基'; s.broken = 3; d = defs(s);
    t.ok(d.shou_zhuji, '踏入筑基前期（idx=3）应解锁「破境·筑基」');
    t.ok(!d.shou_jiejin, '筑基期不得解锁「金丹大道」');
  });

  S.case('全阶扫描：境界成就首次点亮的阶位索引精确等于 3 / 6 / 9 / 15', (t) => {
    const first = {};
    const REALM_OF = (i) => (i >= 15 ? '仙' : ['炼气', '筑基', '金丹', '元婴'][Math.floor(i / 3)]);
    for (let idx = 0; idx <= 15; idx++) {
      const s = fresh();
      s.idx = idx; s.realm = REALM_OF(idx);
      s.broken = idx;         // 故意让突破次数与阶位同步（最容易被误用的组合）
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
    s.idx = 11; s.realm = '元婴'; s.broken = 9; s.tribPassed = 0;
    t.ok(!defs(s).sanjie, '突破 9 次却一次劫都没渡（tribPassed=0），不得解锁「三劫不陨」');
    s.tribPassed = 2;
    t.ok(!defs(s).sanjie, '渡劫 2 次尚不解锁');
    s.tribPassed = 3;
    t.ok(defs(s).sanjie, '渡劫 3 次应解锁「三劫不陨」');
    // 反向：渡劫够但突破次数少（不可能，但确保判定不依赖 broken）
    const s2 = fresh();
    s2.idx = 15; s2.broken = 3; s2.tribPassed = 3;
    t.ok(defs(s2).sanjie, '渡劫 3 次即解锁，不依赖突破次数多少');
  });

  S.case('渡劫成功才计数：tribPassed 由 dujieWin 累加，结算按次给点', (t) => {
    const s = fresh();
    t.eq(s.tribPassed, 0, '开局渡劫次数应为 0');
    s.idx = 5; s.realm = '筑基'; s.broken = 5;
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
    s.idx = 2; s.realm = '炼气'; s.broken = 1;
    const sp = E.settlePoints(s, meta());
    t.ok(!sp.top5.some(function (e) { return e.text.indexOf('初次突破筑基') >= 0; }),
      '炼气中期不得在结算里显示「初次突破筑基」');
    s.idx = 4; s.realm = '筑基'; s.broken = 4;
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
     ============================================================ */
  S.case('成就文案「总数」与数据表动态一致（防加/删条目后文案漂移）', (t) => {
    const ART = G.get('ARTIFACTS');
    const DEST = G.get('DESTINIES');
    const ADV = G.get('ADVENTURE_CONFIG');

    const artIds = Object.keys(ART);
    const xianCount = artIds.filter(id => ART[id].grade === '仙').length;
    const spiritCount = artIds.filter(id => ART[id].spirit).length;
    // 秘境：ADVENTURE_CONFIG 里的 trial 是「劫境」不是秘境，不计入
    const advKeys = Object.keys(ADV).filter(k => k !== 'trial');
    const normalAdv = advKeys.filter(k => k !== 'xian').length;   // 常规 = 黄/玄/地/天

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

    /* 文案里出现「全部/集齐/所有 + 中文数字 + 量词」的成就 → 期望值来源 */
    const EXPECT = {
      fabao_da:   [artIds.length, '件'],            // 全部法宝
      xianqi_man: [xianCount, '件'],                // 仙阶法宝
      wanmei:     [spiritCount, '件'],              // 灵物（秘藏专属法宝）
      mingbo:     [Object.keys(DEST).length, '个'],  // 命格
      quanjing:   [advKeys.length, '种'],           // 全部秘境（含遗世仙踪）
      shou_cang:  [normalAdv, '种'],                // 常规秘境（黄/玄/地/天）
    };

    t.note('数据口径：法宝 ' + artIds.length + '（仙 ' + xianCount + ' / 灵物 ' + spiritCount + '）· 命格 ' +
      Object.keys(DEST).length + ' · 秘境 ' + advKeys.length + '（常规 ' + normalAdv + '）');

    const TOT = /(?:全部|集齐|所有)\s*([一二三四五六七八九十]+)\s*(件|个|种|位)/;
    let checked = 0;
    Object.keys(EXPECT).forEach(function (id) {
      const a = ACHIEVEMENTS[id];
      t.ok(!!a, '成就表缺少 ' + id);
      if (!a) return;
      const m = String(a.desc).match(TOT);
      t.ok(!!m, id + ' 的文案应含「全部/集齐 + 数字 + 量词」，实为「' + a.desc + '」');
      if (!m) return;
      checked++;
      t.eq(m[2], EXPECT[id][1], id + ' 量词应为「' + EXPECT[id][1] + '」，实为「' + m[2] + '」');
      t.eq(cn2int(m[1]), EXPECT[id][0],
        id + ' 文案「' + m[1] + m[2] + '」与数据表不符（实际 ' + EXPECT[id][0] + ' ' + EXPECT[id][1] +
        '）—— 改了数据就必须同步文案');
    });
    t.ok(checked >= 6, '应至少核对 6 条含总数的成就文案，实为 ' + checked);
  });

  return S;
};
