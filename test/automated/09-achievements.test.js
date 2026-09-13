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

  return S;
};
