/* DEDAO 自动化测试 —— 14 新手引导系统（聚光灯分步高亮 / 可跳过 / 完整介绍）
 * 用 jsdom 加载 index.html 的真实 DOM（不执行内联脚本），再把 js/tutorial.js
 * eval 进 window 上下文，校验：步骤数据完整性、标题/游戏组可启动、上下步、
 * 跳过写标记、新玩家 autoIfNew、设置重看(replay)。
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
  const S = new Suite('14 新手引导系统');

  // 收集 index.html 全部元素 id，用于校验步骤 target 存在
  const htmlRaw = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ids = new Set();
  let m;
  const re = /id="([^"]+)"/g;
  while ((m = re.exec(htmlRaw))) ids.add(m[1]);

  S.case('步骤数据完整性：target 存在于 index.html、group 合法、文案非空', (t) => {
    const dom = makeDom();
    const steps = dom.window.Tutorial._debugSteps;
    t.gt(steps.length, 20, '步骤总数应充足');
    let titleN = 0, gameN = 0;
    for (const s of steps) {
      t.ok(ids.has(s.target), '目标元素 #' + s.target + ' 不在 index.html 中');
      t.ok(s.group === 'title' || s.group === 'game', 'group 非法: ' + s.group);
      t.ok(s.title && s.title.length > 0, 'title 为空: ' + s.target);
      t.ok(s.body && s.body.length > 0, 'body 为空: ' + s.target);
      if (s.group === 'title') titleN++; else gameN++;
    }
    t.eq(titleN, 5, '标题组步数应为 5');
    t.eq(gameN, steps.length - 5, '游戏组步数');
  });

  S.case('标题页引导可启动且步数 = 5', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('title');
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'block', '遮罩应显示');
    t.eq(w.Tutorial._debugSteps.filter((s) => s.group === 'title').length, 5, '标题步数应为 5');
    await tick();
    t.ok(/（1 \/ 5）/.test(doc.querySelector('.tut-progress').textContent), '进度应为 1/5');
  });

  S.case('下一步 / 上一步可前进后退', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('title');
    await tick();
    doc.querySelector('.tut-next').click();
    await tick();
    t.ok(/（2 \/ 5）/.test(doc.querySelector('.tut-progress').textContent), '应前进到 2/5');
    doc.querySelector('.tut-prev').click();
    await tick();
    t.ok(/（1 \/ 5）/.test(doc.querySelector('.tut-progress').textContent), '应回退到 1/5');
  });

  S.case('跳过：写标记并隐藏遮罩', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('title');
    await tick();
    doc.querySelector('.tut-skip').click();
    await tick();
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'none', '跳过应隐藏遮罩');
    t.eq(w.localStorage.getItem('dedao_tutorial_v1_done'), '1', '应写入已完成标记');
  });

  S.case('autoIfNew：新玩家自动启动，完成后再次调用返回 false', async (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.localStorage.removeItem('dedao_tutorial_v1_done');
    t.eq(w.Tutorial.autoIfNew(), true, '新玩家应自动启动');
    await tick();
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'block', '应显示遮罩');
    doc.querySelector('.tut-skip').click();
    await tick();
    t.eq(w.Tutorial.autoIfNew(), false, '已完成应不再自动启动');
  });

  S.case('设置重看(replay)启动游戏组引导', (t) => {
    const dom = makeDom();
    const w = dom.window, doc = w.document;
    w.Tutorial.start('replay');
    t.eq(doc.getElementById('tutorial-overlay').style.display, 'block', '应显示遮罩');
    t.eq(w.Tutorial._debugSteps.filter((s) => s.group === 'game').length, 30, '游戏组步数应为 30');
  });

  return S;
};
