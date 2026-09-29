/* DEDAO 测试缝（test seam）—— 让「把游戏推进到指定进度」变成一行调用
 * ------------------------------------------------------------------
 * 背景：DEDAO 是纯 H5 原生 JS，没有 Unity/Unreal 那类现成的自动化驱动工具，
 * 但它的「进度」本质是**状态机 + 数值**，不需要碰 UI —— 直接在引擎层推进即可。
 * 本模块就是在测试沙箱里开一个稳定的驱动入口，避免每个 probe 脚本各写一份循环。
 *
 * 用法（测试里）：
 *   const G = createGameContext();           // _harness 返回
 *   const T = G.__TEST__;                    // 或 G.sandbox.__TEST__
 *   T.setSeed(20260925);                     // 固定随机种子 → 可复现
 *   const s = T.newLife('测试道友');          // 开局，拿到 state
 *   T.jumpToYear(120);                       // 直接推到第 120 年
 *   T.jumpToRealm('金丹');                    // 或推到指定境界
 *   T.snapshot();                            // 关键字段快照，便于断言
 *
 * 设计原则：
 *   1. 只读推进，不改引擎；所有能力都通过 Engine 的公开导出调用。
 *   2. 全部带循环上限（guard），引擎行为变化也不会把测试挂死。
 *   3. 引擎缺任何函数时降级而非崩溃 —— 测试缝是增强项，不是依赖。
 *
 * 注：本文件只作用于测试沙箱。若将来要接 Playwright 做真浏览器 E2E，
 * 同样的接口可以在浏览器侧由 js/ 下的一个仅测试构建加载的脚本挂到 window.__TEST__。
 */
'use strict';

const MAX_YEARS = 3000;

function createSeam(opts) {
  const get = opts.get;                  // (expr) => 沙箱内求值
  const reseed = opts.reseed || function () {};
  const Engine = get('Engine');
  if (!Engine) throw new Error('测试缝安装失败：沙箱中不存在 Engine（是否未加载 js/engine.js？）');

  const seam = {
    seed: opts.seed,
    Engine: Engine,
    _s: null,

    /* 重设随机种子 —— 可复现的前提 */
    setSeed: function (n) {
      seam.seed = (n >>> 0) || 1;
      reseed(seam.seed);
      return seam.seed;
    },

    /* 开局 —— 严格复刻 ui.js 的真实流程，否则造出来的是个练不动的废号：
     *   ui.js:3420  Engine.startLife(name)
     *   ui.js:3430  Engine.commitStart(S, null)
     *   ui.js:7446  Engine.applyInit(S, sel)   ← 开荒页：灵根 / 出身 / 点数 / 百艺 / 经历
     * 早期版本漏了 applyInit，角色只有 1 次/年的裸修炼，54 年就被寿元耗尽卡死在炼气。
     *
     * @param {string} name
     * @param {object} [o] { talentId, linggenId, bgId, points, craft, exp }
     *                     省略时自动取「最高 qiMul 灵根 + 第一个出身」，便于快速造强号。
     */
    newLife: function (name, o) {
      const opt = o || {};
      const s = Engine.startLife(name || '测试道友');
      const tid = opt.talentId || (s.talents && s.talents[0]) || null;
      if (typeof Engine.commitStart === 'function') Engine.commitStart(s, tid);

      const pool = get('LINGGEN_POOL');
      const bgs = get('BACKGROUNDS');
      if (typeof Engine.applyInit === 'function' && pool && pool.length && bgs && bgs.length) {
        const lg = opt.linggenId
          ? (pool.filter((l) => l.id === opt.linggenId)[0] || pool[pool.length - 1])
          : pool.slice().sort((a, b) => (b.qiMul || 1) - (a.qiMul || 1))[0];
        Engine.applyInit(s, {
          linggenId: lg.id,
          bgId: opt.bgId || bgs[0].id,
          points: opt.points || {},
          craft: opt.craft || {},
          exp: opt.exp || [],
          initPoints: opt.initPoints || 0,
        });
      }
      seam._s = s;
      return s;
    },

    /* 当前存档对象；没有就自动开局 */
    state: function () {
      return seam._s || seam.newLife();
    },

    /* 推进 n 年：先尽量突破，再把行动点用于修炼，然后过年 */
    step: function (n, o) {
      const opt = o || {};
      const s = seam.state();
      let done = 0;
      for (let i = 0; i < n; i++) {
        if (s.dead) break;

        /* 突破：⚠ Engine.breakthrough() 只是「请选择突破方式」的预检，
         * 永远返回 { ok:false, needChoice:true }（engine.js:4286）。
         * 真正推进境界的是 normalBreakthrough（裸突破）/ perfectBreakthrough（服丹）。
         * 早期版本调错函数，结果角色修为满 500 却 54 年卡死在炼气、寿元耗尽而亡。 */
        if (opt.breakthrough !== false && typeof Engine.canBreak === 'function') {
          let gb = 0;
          while (Engine.canBreak(s) && gb++ < 20) {
            let r = null;
            if (typeof Engine.normalBreakthrough === 'function') r = Engine.normalBreakthrough(s);
            if ((!r || r.ok === false) && typeof Engine.perfectBreakthrough === 'function') {
              r = Engine.perfectBreakthrough(s);
            }
            if (!r || r.ok === false) break;   // 突破失败（掉境界/受伤），本年不再重试
          }
        }

        if (typeof Engine.cultivate === 'function' && typeof Engine.canAction === 'function') {
          let gc = 0;
          while (Engine.canAction(s, 1) && gc++ < 200) {
            const r = Engine.cultivate(s);
            // 今年修炼次数用尽 / 修为已满：再调也不会消耗行动点，直接收手
            if (typeof r === 'string' &&
                (r.indexOf('今年已修炼过') === 0 || r.indexOf('修为已满') === 0)) break;
          }
        }

        if (typeof Engine.endYear !== 'function') break;
        Engine.endYear(s);
        done++;

        if (typeof opt.until === 'function' && opt.until(s)) break;
      }
      return { years: done, year: s.year, realm: s.realm, dead: !!s.dead };
    },

    /* 跳到第 y 年（s.year 从 1 起算） */
    jumpToYear: function (y, o) {
      const s = seam.state();
      return seam.step(Math.max(0, (y | 0) - (s.year || 1)), o);
    },

    /* 推进到指定境界；maxYears 防止打不满时无限跑 */
    jumpToRealm: function (realm, o) {
      const opt = Object.assign({}, o || {});
      const s = seam.state();
      if (s.realm === realm) return { years: 0, year: s.year, realm: s.realm, hit: true };
      opt.until = function (st) { return st.realm === realm; };
      const r = seam.step(opt.maxYears || MAX_YEARS, opt);
      r.hit = s.realm === realm;
      return r;
    },

    /* 关键字段快照 —— 断言用，避免直接比对整个 state 造成脆弱测试 */
    snapshot: function (s) {
      const st = s || seam.state();
      return {
        name: st.name, year: st.year, age: st.age,
        realm: st.realm, idx: st.idx, qi: st.qi,
        hp: st.hp, hpMax: st.hpMax, atk: st.atk, mp: st.mp, mpMax: st.mpMax,
        stone: st.stone, actionsLeft: st.actionsLeft, dead: !!st.dead,
        talents: (st.talents || []).slice(),
        destinies: (st.destinies || []).slice(),
      };
    },
  };

  return seam;
}

module.exports = { createSeam: createSeam, MAX_YEARS: MAX_YEARS };
