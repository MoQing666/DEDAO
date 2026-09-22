/* DEDAO 自动化测试 —— 14 新手引导系统（分阶段 · 聚光灯分步高亮 / 可跳过）
 * 用 jsdom 加载 index.html 的真实 DOM（不执行内联脚本），再把 js/tutorial.js
 * eval 进 window 上下文，校验：分阶段步骤完整性、标题阶段可启动、上下步、
 * 跳过写阶段标记、首见标题 autoTitle、进入游戏 onEnterGame、年末 onYear(3/5)、重看(replay)。
 * 注：本测试不加载 ui.js——Tutorial 对 window.DedaoNav 缺失有降级，不影响逻辑校验。
 */
const fs = require('fs');
const path = require('path');

// 解析 jsdom：优先环境变量，其次隔离工作区，最后全局
let JSDOM, VirtualConsole;
(function () {
  const base = process.env.USERPROFILE || path.join('C:', 'Users', process.env.USERNAME || '');
  const candidates = [
    process.env.JSDOM_PATH,
    path.join(base, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules', 'jsdom'),
    'jsdom',
  ].filter(Boolean);
  if (fs.existsSync(path.join(base, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules'))) {
    module.paths.push(path.join(base, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules'));
  }
  for (const c of candidates) {
    try { ({ JSDOM, VirtualConsole } = require(c)); return; } catch (e) { /* 继续尝试 */ }
  }
})();

const { ROOT, Suite } = require('./_harness');

function makeDom() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  if (!w.requestAnimationFrame) w.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  const src = fs.readFileSync(path.join(ROOT, 'js', 'tutorial.js'), 'utf8');
  w.eval(src);
  return dom;
}

const tick = () => new Promise((r) => setTimeout(r, 30));

module.exports = async function build() {
  const S = new Suite('14 新手引导系统（分阶段）');

  // 收集 index.html 全部元素 id，用于校验步骤 target 存在
  const htmlRaw = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ids = new Set();
  let m;
  const re = /id="([^"]+)"/g;
  while ((m = re.exec(htmlRaw))) ids.add(m[1]);

  S.case('分阶段步骤数据完整性：target 存在、group 合法、文案非空；标题 2 步 / 游戏 6 步', (t) => {
    const dom = makeDom();
    const steps = dom.window.Tutorial._debugSteps;
    let titleN = 0, gameN = 0;
    for (const s of steps) {
      if (s.target) t.ok(ids.has(s.target), '目标元素 #' + s.target + ' 不在 index.html 中');
      t.ok(s.group === 'title' || s.group === 'game', 'group 非法: ' + s.group);
      t.ok(s.title && s.title.length > 0, 'title 为空: ' + (s.target || 'noSpot'));
      t.ok(s.body && s.body.length > 0, 'body 为空: ' + (s.target || 'noSpot'));
      if (s.group === 'title') titleN++; else gameN++;
    }
    t.eq(titleN, 2, '标题阶段步数应为 2（开始 + 轮回阁）');
    t.eq(gameN, 6, '游戏阶段步数应为 6（修炼/角色/游历 + 秘境 + 宗门/百艺）');
  });

  S.case('标题阶段可启动且步数 = 2，进度 1/2', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('title');
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'block', '遮罩应显示');
    t.eq(w.Tutorial._debugSteps.filter((s) => s.group === 'title').length, 2, '标题步数应为 2');
    await tick();
    t.ok(/（1 \/ 2）/.test(doc.querySelector('.tut-progress').textContent), '进度应为 1/2');
  });

  S.case('下一步 / 上一步可前进后退', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('title');
    await tick();
    doc.querySelector('.tut-next').click();
    await tick();
    t.ok(/（2 \/ 2）/.test(doc.querySelector('.tut-progress').textContent), '应前进到 2/2');
    doc.querySelector('.tut-prev').click();
    await tick();
    t.ok(/（1 \/ 2）/.test(doc.querySelector('.tut-progress').textContent), '应回退到 1/2');
  });

  S.case('跳过：写阶段标记并隐藏遮罩', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('title');
    await tick();
    doc.querySelector('.tut-skip').click();
    await tick();
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'none', '跳过应隐藏遮罩');
    t.eq(w.localStorage.getItem('dedao_tut_title'), '1', '应写入标题阶段标记');
  });

  S.case('autoTitle 新玩家自动播标题；onEnterGame 新玩家自动播 basics（已看不重复）', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.localStorage.removeItem('dedao_tut_title');
    w.localStorage.removeItem('dedao_tut_basics');
    // 首见标题页
    t.eq(w.Tutorial.autoTitle(), true, '新玩家应自动播标题');
    await tick();
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'block', '标题遮罩应显示');
    doc.querySelector('.tut-skip').click(); // 看完标题
    await tick();
    t.eq(w.Tutorial.autoTitle(), false, '标题已看应不再自动播');
    // 进入游戏首世
    t.eq(w.Tutorial.onEnterGame(), true, '新玩家应自动播 basics');
    await tick();
    t.ok(/（1 \/ 3）/.test(doc.querySelector('.tut-progress').textContent), 'basics 进度应为 1/3');
    doc.querySelector('.tut-skip').click();
    await tick();
    t.eq(w.Tutorial.onEnterGame(), false, 'basics 已看应不再自动播');
  });

  S.case('年末 onYear：第 2 年触发秘境、第 5 年触发宗门百艺；replay 强制复习 basics', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.localStorage.removeItem('dedao_tut_secret');
    w.localStorage.removeItem('dedao_tut_sect');
    // 第 2 年（2026-09-16：秘境解锁由第 3 年提前至第 2 年，引导随之提前）
    t.eq(w.Tutorial.onYear(2), true, '第 2 年应触发 secret');
    await tick();
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'block', '秘境遮罩应显示');
    t.ok(/秘境/.test(doc.querySelector('.tut-title').textContent), '应介绍秘境');
    doc.querySelector('.tut-skip').click();
    await tick();
    t.eq(w.Tutorial.onYear(2), false, '秘境已看不再触发');
    t.eq(w.Tutorial.onYear(3), false, '非 2/5 年不触发任何阶段');
    // 第 5 年
    t.eq(w.Tutorial.onYear(5), true, '第 5 年应触发 sect');
    await tick();
    t.ok(/宗门/.test(doc.querySelector('.tut-title').textContent), '应介绍宗门');
    doc.querySelector('.tut-skip').click();
    await tick();
    t.eq(w.Tutorial.onYear(5), false, '宗门已看不再触发');
    // replay 强制复习（即便已看过）
    w.localStorage.removeItem('dedao_tut_basics');
    t.eq(w.Tutorial.start('replay'), true, 'replay 应强制启动 basics');
  });

  return S;
};
