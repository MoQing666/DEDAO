/* DEDAO 自动化测试 —— 03 UI / DOM 层（jsdom 真实渲染）
 */
const fs = require('fs');
const path = require('path');
// 解析 jsdom：优先环境变量，其次隔离工作区，最后全局
let JSDOM, VirtualConsole, ResourceLoader;
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
    try { ({ JSDOM, VirtualConsole, ResourceLoader } = require(c)); return; } catch (e) { /* 继续尝试 */ }
  }
})();
const { ROOT, Suite } = require('./_harness');

/* 把 http://localhost/xxx 映射到本地文件，绕开 jsdom 无法从 http 取资源的问题 */
class LocalResourceLoader extends (ResourceLoader || Object) {
  fetch(url, options) {
    try {
      const u = new URL(url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const p = path.join(ROOT, decodeURIComponent(u.pathname).replace(/^\//, ''));
        if (fs.existsSync(p)) return Promise.resolve(fs.readFileSync(p));
        return Promise.reject(new Error('本地资源不存在: ' + p));
      }
    } catch (e) { /* 非 URL，交给默认逻辑 */ }
    return super.fetch ? super.fetch(url, options) : Promise.reject(new Error('无法加载 ' + url));
  }
}

/* 把外链资源内联进 HTML：jsdom 无法从 http:// 取本地文件，
   内联后既不依赖网络，也能保留 http:// 源以便使用 localStorage。 */
function inlineAssets(html) {
  let out = html;
  out = out.replace(/<script[^>]*\ssrc="([^"]+)"[^>]*>\s*<\/script>/gi, (m, src) => {
    const p = path.join(ROOT, src.split('?')[0].replace(/^\.?\//, ''));
    if (!fs.existsSync(p)) return `<!-- 缺失脚本 ${src} -->`;
    return '<script>' + fs.readFileSync(p, 'utf8') + '<\/script>';
  });
  out = out.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi, (m, href) => {
    const p = path.join(ROOT, href.split('?')[0].replace(/^\.?\//, ''));
    if (!fs.existsSync(p)) return `<!-- 缺失样式 ${href} -->`;
    return '<style>' + fs.readFileSync(p, 'utf8') + '</style>';
  });
  return out;
}



/* 推进章节叙事层：开局后会连续弹出剧情，需点击“继续”才会进入主界面 */
async function advanceChapters(win, doc, max = 20) {
  for (let i = 0; i < max; i++) {
    if (visible(doc, 'screen-game') === true) return i;
    click(win, 'chapter-actions');
    await new Promise(r => setTimeout(r, 150));
  }
  return -1;
}

/* 统一的进入游戏流程：标题页 →（进入页）→ 章节 → 主界面 */
async function enterGame(win, doc, name) {
  click(win, 't-new');
  await new Promise(r => setTimeout(r, 180));
  if (visible(doc, 'screen-enter') === true) {
    const input = doc.getElementById('enter-name-input');
    if (input) { input.value = name; input.dispatchEvent(new win.Event('input', { bubbles: true })); }
    const pool = doc.getElementById('enter-destiny-pool');
    if (pool && pool.children.length) {
      pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    }
    await new Promise(r => setTimeout(r, 60));
    click(win, 'enter-start');
  } else {
    const input = doc.getElementById('name-input');
    if (input && !input.value) input.value = name;
    click(win, 'name-ok');
  }
  await new Promise(r => setTimeout(r, 250));
  await advanceChapters(win, doc);
  await new Promise(r => setTimeout(r, 200));
}

async function boot(opts = {}) {
  const htmlPath = path.join(ROOT, 'index.html');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  vc.on('warn', () => {});
  vc.on('log', () => {});
  vc.on('info', () => {});

  const html = inlineAssets(fs.readFileSync(htmlPath, 'utf8'));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole: vc,
    beforeParse(win) {
      win.localStorage.clear();
      win.alert = () => {};
      win.confirm = () => true;
      win.prompt = () => '自动化测试';
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
      win.HTMLMediaElement.prototype.pause = () => {};
      win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    },
  });
  await new Promise(r => setTimeout(r, opts.wait || 350));
  return { dom, win: dom.window, doc: dom.window.document, errors };
}

function click(win, id) {
  const el = win.document.getElementById(id);
  if (!el) return false;
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
  return true;
}
const visible = (doc, id) => {
  const el = doc.getElementById(id);
  if (!el) return null;
  const st = el.getAttribute('style') || '';
  if (/display:\s*none/.test(st)) return false;
  return true;
};

module.exports = async function build() {
  const S = new Suite('03 UI / DOM 层（jsdom）');

  S.case('页面可加载且核心脚本无报错', async (t) => {
    const { win, errors } = await boot();
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    t.note(`加载期消息 ${errors.length} 条（已过滤无关项后 ${real.length} 条）`);
    if (real.length) t.fail('加载期报错: ' + real.slice(0, 4).join(' ;; '));
    // 顶层 const 声明不会成为 window 属性，需在脚本作用域内求值
    t.eq(win.eval('typeof Engine'), 'object', 'Engine 未在全局作用域中定义');
    t.ok(!!win.document.getElementById('screen-title'), '标题页缺失');
  });

  S.case('标题页可见且主按钮齐备', async (t) => {
    const { doc } = await boot();
    t.eq(visible(doc, 'screen-title'), true, '标题页应可见');
    for (const id of ['t-new', 't-continue', 't-load', 't-rebirth', 't-settings']) {
      t.ok(!!doc.getElementById(id), `标题页缺少按钮 #${id}`);
    }
  });

  S.case('走通开局流程：开始轮回 → 起名 → 进入主界面', async (t) => {
    const { win, doc, errors } = await boot();
    t.ok(click(win, 't-new'), '点击“开始轮回”失败');
    await new Promise(r => setTimeout(r, 200));
    // 新版开局走 screen-enter（进入页面）：起名 → 选命格 → 开始这一世
    const useEnter = visible(doc, 'screen-enter') === true;
    if (useEnter) {
      const input = doc.getElementById('enter-name-input');
      t.ok(!!input, '进入页缺少名字输入框');
      if (input) { input.value = '测试道人'; input.dispatchEvent(new win.Event('input', { bubbles: true })); }
      const pool = doc.getElementById('enter-destiny-pool');
      if (pool && pool.children.length) {
        pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      }
      t.note(`命格候选项 ${pool ? pool.children.length : 0} 个`);
      await new Promise(r => setTimeout(r, 80));
      t.ok(click(win, 'enter-start'), '点击“开始这一世”失败');
      const steps = await advanceChapters(win, doc);
      t.note();
    } else {
      const input = doc.getElementById('name-input');
      if (input && !input.value) input.value = '测试道人';
      click(win, 'name-ok');
    }
    await new Promise(r => setTimeout(r, 350));
    t.eq(visible(doc, 'screen-game'), true, '未进入游戏主界面');
    const nameEl = doc.getElementById('h-name');
    t.ok(!!nameEl && nameEl.textContent.length > 0, 'HUD 未显示角色名');
    t.note(`角色名: ${nameEl ? nameEl.textContent : '(空)'}，HUD 气血: ${doc.getElementById('hp-val') ? doc.getElementById('hp-val').textContent : '?'}`);
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('开局流程报错: ' + real.slice(0, 4).join(' ;; '));
  });

  S.case('主界面行动按钮可点击且不抛错', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '甲');
    // 动态发现行动按钮（不同版本 ID 可能不同）
    let acts = [...doc.querySelectorAll('.act-grid .act, .act-grid button')].map(e => e.id).filter(Boolean);
    if (!acts.length) acts = ['btn-cult', 'btn-explore', 'btn-arts', 'btn-social', 'btn-fate'].filter(id => doc.getElementById(id));
    if (doc.getElementById('btn-break')) acts.push('btn-break');
    t.gt(acts.length, 0, '未发现任何行动按钮');
    for (const id of acts) {
      try { click(win, id); await new Promise(r => setTimeout(r, 40)); }
      catch (e) { t.fail(`点击 #${id} 抛错: ${e.message}`); }
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('行动按钮报错: ' + real.slice(0, 4).join(' ;; '));
    t.note(`已点击 ${acts.length} 个行动按钮`);
  });

  S.case('底部栏与功能弹窗可正常开关', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '乙');
    let bars = [...doc.querySelectorAll('.bottom-bar .bottom-btn')].map(e => e.id).filter(Boolean);
    if (!bars.length) bars = ['btn-bag-bottom', 'btn-gear-bottom', 'btn-tech-bottom', 'btn-favor', 'btn-craft-bottom', 'btn-events'].filter(id => doc.getElementById(id));
    t.gt(bars.length, 0, '未发现任何底部按钮');
    for (const id of bars) {
      try {
        click(win, id); await new Promise(r => setTimeout(r, 60));
        click(win, 'modal-close'); await new Promise(r => setTimeout(r, 40));
      } catch (e) { t.fail(`操作 #${id} 抛错: ${e.message}`); }
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('底部栏报错: ' + real.slice(0, 4).join(' ;; '));
    t.note(`已遍历 ${bars.length} 个底部入口`);
  });

  S.case('轮回塔页面可进入并渲染天赋列表', async (t) => {
    const { win, doc, errors } = await boot();
    click(win, 't-rebirth'); await new Promise(r => setTimeout(r, 150));
    t.eq(visible(doc, 'screen-rebirth'), true, '轮回塔未显示');
    const list = doc.getElementById('rb-list');
    t.ok(!!list, '轮回塔列表容器缺失');
    if (list) t.note(`轮回塔条目数: ${list.children.length}`);
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('轮回塔报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('游戏状态可持久化到 localStorage', async (t) => {
    const { win } = await boot();
    await enterGame(win, win.document, '丙');
    const keys = Object.keys(win.localStorage).length
      ? Object.keys(win.localStorage)
      : Array.from({ length: win.localStorage.length }, (_, i) => win.localStorage.key(i));
    t.gt(keys.length, 0, '开局后未写入任何 localStorage 键');
    t.note(`存档键: ${keys.join(', ')}`);
  });

  return S;
};
