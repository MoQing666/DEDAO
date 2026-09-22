/* DEDAO 自动化测试 —— 18 每日登录礼（7 天登录礼 / 补签）
 * 覆盖：首次领取、同日去重、连续递增、满勤 79 点、周期归零、断签重置、
 *      Δ=2 补签（成功 / 点数不足 / 已用完）、Δ≥3 不可补、时间倒流保护、
 *      meta 往返持久化、旧档无 daily 字段兼容。
 * 口径：本地自然日判定；奖励为账号级轮回点 meta.points。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('18 每日登录礼');
  const G = createGameContext({ seed: 20260922 });
  const E = G.get('Engine');
  const LS = G.localStorage;

  /* ---------- 工具 ---------- */
  function shiftStr(n) { // n 天后的本地自然日字符串（n 为负 = 过去）
    const d = new Date();
    d.setHours(12, 0, 0, 0);          // 正午，避开夏令时/跨日边界
    d.setDate(d.getDate() + n);
    const m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  function baseMeta(points) {
    return {
      points: points || 0, lives: 0, reinc: {}, achievements: {},
      flown: false, maxJie: 0, achPaid: {}
    };
  }
  /* 直接铺一份 meta 到 localStorage：ago = last 距今几天（负数为未来） */
  function setDaily(o) {
    const m = baseMeta(o.points || 0);
    if (!o.noDaily) {
      m.daily = {
        last: shiftStr(-(o.ago == null ? 1 : o.ago)),
        streak: o.streak || 0, total: o.total || 0, patch: o.patch || 0
      };
    }
    LS.setItem('dedao_meta', JSON.stringify(m));
  }
  function readMeta() { return JSON.parse(LS.getItem('dedao_meta') || 'null'); }

  /* ---------- 1. 首次打开 ---------- */
  S.case('首次打开：streak=1、轮回点 +2、last 落今天', (t) => {
    setDaily({ noDaily: true, points: 0 });
    const st = E.dailyStatus();
    t.eq(st.claimed, false, '首次不应标记已领取');
    t.eq(st.next, 1, '首次应落第 1 天');
    t.eq(st.reward, 2, '首次奖励应为 2');
    const r = E.dailyClaim(false);
    t.eq(r.ok, true, '首次领取应成功');
    t.eq(r.streak, 1, 'streak 应为 1');
    t.eq(r.reward, 2, '应发 2 点');
    const m = readMeta();
    t.eq(m.points, 2, 'meta.points 应为 2');
    t.eq(m.daily.streak, 1, 'meta.daily.streak 应为 1');
    t.eq(m.daily.last, E.todayStr(), 'last 应写为今天');
    t.eq(m.daily.total, 1, '累计领取次数应为 1');
  });

  /* ---------- 2. 同日重复调用不发放 ---------- */
  S.case('同日重复领取被拦截：点数不变、仍标记已领取', (t) => {
    setDaily({ noDaily: true, points: 0 });
    E.dailyClaim(false);
    const st = E.dailyStatus();
    t.eq(st.claimed, true, '应标记已领取');
    t.eq(st.reward, 0, '已领取时不再有可发奖励');
    const r = E.dailyClaim(false);
    t.eq(r.ok, false, '重复领取应失败');
    t.eq(r.claimed, true, '应返回 claimed 标记');
    t.eq(readMeta().points, 2, '点数不应翻倍');
  });

  /* ---------- 3. 隔日 Δ=1 递增 ---------- */
  S.case('隔一日领取：streak=2、发 10 点', (t) => {
    setDaily({ ago: 1, streak: 1, points: 2 });
    const st = E.dailyStatus();
    t.eq(st.delta, 1, 'delta 应为 1');
    t.eq(st.next, 2, '应落第 2 天');
    t.eq(st.reward, 10, '第 2 天应发 10 点');
    const r = E.dailyClaim(false);
    t.eq(r.ok, true, '应领取成功');
    t.eq(r.streak, 2, 'streak 应为 2');
    t.eq(r.reward, 10, '应发 10 点');
    t.eq(readMeta().points, 12, '累计应为 12 点');
  });

  /* ---------- 4. 连续领满 7 天累计 79 点 ---------- */
  S.case('连续领满 7 天：累计 79 点、数值表与第 2 天钩子正确', (t) => {
    const RW = E.DAILY_REWARDS;
    t.eq(RW.length, 7, '奖励表应为 7 天');
    t.eq(RW[1], 10, '第 2 天应为 10 点（次日留存钩子）');
    t.eq(RW.reduce((a, b) => a + b, 0), 79, '一轮总量应为 79 点');

    setDaily({ noDaily: true, points: 0 });
    let sum = 0;
    for (let i = 1; i <= 7; i++) {
      const r = E.dailyClaim(false);
      t.eq(r.ok, true, '第 ' + i + ' 天应领取成功');
      t.eq(r.reward, RW[i - 1], '第 ' + i + ' 天奖励应为 ' + RW[i - 1]);
      sum += r.reward;
      if (i < 7) {                       // 把 last 拨回昨天，模拟「过了一天」
        const m = readMeta();
        m.daily.last = shiftStr(-1);
        LS.setItem('dedao_meta', JSON.stringify(m));
      }
    }
    t.eq(sum, 79, '7 天累计应为 79 点');
    t.eq(readMeta().daily.streak, 7, '满勤后 streak 应为 7');
    t.eq(readMeta().points, 79, '账号轮回点应累计 79');
  });

  /* ---------- 5. 满勤后隔日开启新一轮 ---------- */
  S.case('第 7 天后再隔日：streak 归 1、patch 归 0、新一轮从 2 点起', (t) => {
    setDaily({ ago: 1, streak: 7, points: 79, patch: 1 });
    const r = E.dailyClaim(false);
    t.eq(r.ok, true, '新一轮首日应领取成功');
    t.eq(r.streak, 1, 'streak 应归 1');
    t.eq(r.reward, 2, '新一轮首日应为 2 点');
    t.eq(r.newCycle, true, '应标记新周期');
    const m = readMeta();
    t.eq(m.daily.patch, 0, 'patch 应随周期清零');
    t.eq(m.points, 81, '点数应为 79+2');
  });

  /* ---------- 6. Δ=2 不补签则重置 ---------- */
  S.case('漏 1 天且不补签：重置为第 1 天，只发 2 点', (t) => {
    setDaily({ ago: 2, streak: 3, points: 0 });
    const st = E.dailyStatus();
    t.eq(st.broke, true, '应标记断签');
    t.eq(st.canPatch, false, '点数 0 时补签应不可用');
    const r = E.dailyClaim(false);
    t.eq(r.ok, true, '应领取成功');
    t.eq(r.streak, 1, '应重置为第 1 天');
    t.eq(r.reward, 2, '只应发 2 点');
    t.eq(r.patched, false, '不应标记补签');
    t.eq(readMeta().daily.patch, 0, 'patch 应清零');
  });

  /* ---------- 7. Δ=2 补签成功 ---------- */
  S.case('漏 1 天并补签：streak 续上、扣 5 点、patch 置 1', (t) => {
    setDaily({ ago: 2, streak: 3, points: 20 });
    const st = E.dailyStatus();
    t.eq(st.canPatch, true, '点数充足时应可补签');
    t.eq(st.patchNext, 4, '补签后应落第 4 天');
    t.eq(st.patchReward, 10, '补签后应发 10 点');
    const r = E.dailyClaim(true);
    t.eq(r.ok, true, '补签应成功');
    t.eq(r.patched, true, '应标记补签');
    t.eq(r.streak, 4, 'streak 应续到 4');
    t.eq(r.reward, 10, '应发第 4 天的 10 点');
    t.eq(r.patchCost, 5, '应扣 5 点');
    const m = readMeta();
    t.eq(m.points, 25, '点数应为 20 - 5 + 10');
    t.eq(m.daily.patch, 1, 'patch 应置 1');
  });

  /* ---------- 8. 补签点数不足 ---------- */
  S.case('轮回点不足 5：补签不可用且不扣点、不推进', (t) => {
    setDaily({ ago: 2, streak: 3, points: 4 });
    const st = E.dailyStatus();
    t.eq(st.canPatch, false, '点数 4 时补签应不可用');
    const r = E.dailyClaim(true);
    t.eq(r.ok, false, '补签应失败');
    t.eq(r.poor, true, '应返回点数不足标记');
    const m = readMeta();
    t.eq(m.points, 4, '不应扣点');
    t.eq(m.daily.streak, 3, '不应推进 streak');
  });

  /* ---------- 9. Δ≥3 不可补签 ---------- */
  S.case('漏 2 天以上：补签不可用，直接重置、patch 清零', (t) => {
    setDaily({ ago: 5, streak: 6, points: 100, patch: 0 });
    const st = E.dailyStatus();
    t.eq(st.broke, true, '应标记断签');
    t.eq(st.canPatch, false, 'Δ=5 时不应允许补签');
    const r = E.dailyClaim(true);
    t.eq(r.ok, true, '应正常领取（走重置分支）');
    t.eq(r.streak, 1, '应重置为第 1 天');
    t.eq(r.reward, 2, '只应发 2 点');
    t.eq(r.patched, false, '不应生效补签');
    const m = readMeta();
    t.eq(m.points, 102, '应 100 + 2（未扣补签费）');
    t.eq(m.daily.patch, 0, 'patch 应保持 0');
  });

  /* ---------- 10. 每周期补签仅 1 次 ---------- */
  S.case('本周期已用过补签：再次补签被拒', (t) => {
    setDaily({ ago: 2, streak: 2, points: 100, patch: 1 });
    const st = E.dailyStatus();
    t.eq(st.canPatch, false, '已用过补签时不应再可用');
    const r = E.dailyClaim(true);
    t.eq(r.ok, false, '应被拒绝');
    t.eq(r.patchUsed, true, '应返回已用完标记');
    t.eq(readMeta().points, 100, '不应扣点');
  });

  /* ---------- 11. 时间倒流保护 ---------- */
  S.case('last 在未来（时间倒流）：不发放、不推进、不写 last', (t) => {
    setDaily({ ago: -3, streak: 3, points: 50 });   // last = 今天 +3 天
    const st = E.dailyStatus();
    t.eq(st.anomaly, true, '应标记时间异常');
    t.eq(st.reward, 0, '异常时不应有可发奖励');
    const r = E.dailyClaim(false);
    t.eq(r.ok, false, '不应发放');
    t.eq(r.anomaly, true, '应返回异常标记');
    const m = readMeta();
    t.eq(m.points, 50, '点数不应变化');
    t.eq(m.daily.streak, 3, 'streak 不应推进');
    t.eq(m.daily.last, shiftStr(3), 'last 不应被改写');
  });

  /* ---------- 12. meta 往返持久化 ---------- */
  S.case('saveMeta / loadMeta 往返：daily 四字段保持不变', (t) => {
    const m0 = baseMeta(7);
    m0.daily = { last: shiftStr(-1), streak: 3, total: 5, patch: 1 };
    E.saveMeta(m0);
    const m1 = E.loadMeta();
    t.ok(!!m1.daily, '读回应有 daily');
    t.eq(m1.daily.streak, 3, 'streak 应保持 3');
    t.eq(m1.daily.total, 5, 'total 应保持 5');
    t.eq(m1.daily.patch, 1, 'patch 应保持 1');
    t.eq(m1.daily.last, shiftStr(-1), 'last 应保持一致');
  });

  /* ---------- 13. 旧档兼容 ---------- */
  S.case('旧档无 daily 字段：兜底为首次，不崩溃且可正常领取', (t) => {
    setDaily({ noDaily: true, points: 11 });
    const lm = E.loadMeta();
    t.ok(!!lm.daily && typeof lm.daily === 'object', 'loadMeta 应兜底出 daily');
    t.eq(lm.daily.streak, 0, '兜底 streak 应为 0');
    t.eq(lm.daily.last, '', '兜底 last 应为空串');
    const st = E.dailyStatus();
    t.eq(st.next, 1, '应视作首次，落第 1 天');
    t.eq(st.reward, 2, '应发 2 点');
    const r = E.dailyClaim(false);
    t.eq(r.ok, true, '旧档应能正常领取');
    t.eq(r.streak, 1, 'streak 应为 1');
    t.eq(readMeta().points, 13, '点数应为 11 + 2');
  });

  return S;
};
