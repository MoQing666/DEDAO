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
  // P1 开荒页：玩家自选灵根 / 出身后落定命数，再进入章节 → 主界面
  if (visible(doc, 'screen-create') === true) {
    const firstLg = doc.querySelector('#create-body [data-lg]');
    if (firstLg) firstLg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    const firstBg = doc.querySelector('#create-body [data-bg]');
    if (firstBg) firstBg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    // 开荒页分两步：先点「预览命数 · 下一页」进入总览页，再落定命数
    const nx = doc.getElementById('ct-next');
    if (nx && !nx.disabled) nx.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const cf = doc.getElementById('ct-confirm');
    if (cf && !cf.disabled) cf.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
  }
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
      // 允许预置 localStorage（用于「中途退出后重新开机」这类跨会话场景）
      if (opts.seed) {
        Object.keys(opts.seed).forEach(function (k) {
          if (opts.seed[k] != null) win.localStorage.setItem(k, opts.seed[k]);
        });
      }
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
      // P1 开荒页：自选灵根 / 出身后落定命数，再进入章节 → 主界面
      if (visible(doc, 'screen-create') === true) {
        const firstLg = doc.querySelector('#create-body [data-lg]');
        if (firstLg) firstLg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        const firstBg = doc.querySelector('#create-body [data-bg]');
        if (firstBg) firstBg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 150));
        const nx = doc.getElementById('ct-next');
        if (nx && !nx.disabled) nx.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 150));
        const cf = doc.getElementById('ct-confirm');
        if (cf && !cf.disabled) cf.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 200));
      }
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
    if (!bars.length) bars = ['btn-bag-bottom', 'btn-char-bottom', 'btn-sect-bottom', 'btn-travel-bottom', 'btn-npc-bottom'].filter(id => doc.getElementById(id));
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

  S.case('自定义弹窗替代原生 confirm（WebView 不阻塞）', async (t) => {
    const { win, doc, errors } = await boot();
    if (!click(win, 't-settings')) { t.fail('找不到 t-settings 入口'); return; }
    await new Promise(r => setTimeout(r, 200));
    const clearBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /清除所有存档/.test(b.textContent));
    if (!clearBtn) { t.fail('设置弹窗中未找到“清除所有存档”按钮'); return; }
    clearBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const ov = doc.getElementById('dialog-overlay');
    t.ok(!!ov, '点击清除存档后未生成自定义弹窗 dialog-overlay（说明仍依赖原生 confirm）');
    if (!ov) return;
    t.eq(ov.style.display, 'flex', '自定义弹窗未显示（display 应为 flex）');
    const card = doc.getElementById('dialog-card');
    t.ok(card && /清除所有存档/.test(card.textContent), '弹窗缺少确认文案');
    const cancel = card && [...card.querySelectorAll('button')].find(b => /取消/.test(b.textContent));
    t.ok(!!cancel, '弹窗缺少“取消”按钮');
    if (cancel) {
      cancel.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 120));
      t.eq(ov.style.display, 'none', '点击取消后弹窗未关闭');
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('弹窗交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('锻体：未解锁时仅给引导，不进页面不耗行动点', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '锻体未解锁');
    const apEl = doc.getElementById('h-actions-left');
    const apBefore = apEl ? apEl.textContent : '';
    t.ok(click(win, 'btn-arts'), 'btn-arts 不存在');
    await new Promise(r => setTimeout(r, 200));
    const bodyText = doc.body.textContent || '';
    t.ok(/未解之法|锻体诀/.test(bodyText), '未解锁应显示锻体引导文案');
    t.eq(visible(doc, 'screen-duanti'), false, '未解锁不应进入锻体页');
    t.eq(apEl ? apEl.textContent : '', apBefore, '未解锁点击不应消耗行动点');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('未解锁锻体报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('锻体：解锁后进入页面，淬炼生效且计入次数', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '锻体解锁');
    // 修改自动存档：解锁《锻体诀》并补足行动点
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!!raw, '自动存档不存在');
    if (!raw) return;
    raw.flags = Object.assign({}, raw.flags, { duanti: 1 });
    raw.actionsLeft = 6;
    // jsdom 开局流程可能未选中命格导致 talents/linggen 为空，被 validSave 判为失效档，此处补齐
    if (!raw.talents || !raw.talents.length) raw.talents = ['t_duanti_test'];
    if (!raw.linggen) raw.linggen = { id: 'lg_duanti_test' };
    win.localStorage.setItem('dedao_save', JSON.stringify(raw));
    // 读档：存档弹窗 → 第一行“读档” → 自定义确认
    click(win, 't-load');
    await new Promise(r => setTimeout(r, 150));
    const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
    t.ok(!!loadBtn, '存档弹窗中无可用“读档”按钮');
    if (!loadBtn) return;
    loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
    const card = doc.getElementById('dialog-card');
    const okBtn = card ? [...card.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
    t.ok(!!okBtn, '读档确认弹窗未出现');
    if (!okBtn) return;
    okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // 解锁态按钮文案
    t.eq((doc.getElementById('btn-arts-label') || {}).textContent, '锻体', '解锁后按钮文案应为「锻体」');
    // 进入锻体页（进入不耗行动点）
    const apEl = doc.getElementById('h-actions-left');
    const apEnter = apEl ? apEl.textContent : '';
    click(win, 'btn-arts');
    await new Promise(r => setTimeout(r, 150));
    t.eq(visible(doc, 'screen-duanti'), true, '解锁后应进入锻体页');
    t.eq(apEl ? apEl.textContent : '', apEnter, '进入锻体页不应消耗行动点');
    const rows = [...doc.querySelectorAll('#duanti-body .formula-row')];
    t.eq(rows.length, 2, '锻体页应有 2 种淬炼（体魄/遁速；神识由宗门提供，已移除）');
    if (rows.length !== 2) return;
    t.ok(/1 行动点/.test(rows[0].textContent) && /0\.5/.test(rows[0].textContent), '体魄淬炼应为 1点→+0.5');
    t.ok(/1 行动点/.test(rows[1].textContent) && /0\.5/.test(rows[1].textContent), '遁速淬炼应为 1点→+0.5');
    // 淬炼体魄：行动点 -1，计数 1/10
    const firstBtn = rows[0] && rows[0].querySelector('button');
    t.ok(firstBtn && !firstBtn.disabled, '淬炼按钮应可用');
    firstBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const rows2 = [...doc.querySelectorAll('#duanti-body .formula-row')];
    t.ok(/已淬 1\/10/.test(rows2[0].textContent), '淬炼后应显示 已淬 1/10');
    t.eq(apEl ? apEl.textContent : '', String(Number(apEnter) - 1), '淬炼体魄应消耗 1 行动点');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('锻体页交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：法宝页未持有时必须展示「空的法宝槽」（曾用一句提示顶掉整个面板，且文案误指「装备」页） ===
  S.case('法宝页：未持有时渲染空的法宝槽，文案不再指向「装备」页', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '法宝空槽');
    t.ok(click(win, 'btn-char-bottom'), 'btn-char-bottom 不存在');
    await new Promise(r => setTimeout(r, 180));
    t.eq(visible(doc, 'screen-char'), true, '应进入角色页');
    const tab = doc.querySelector('.char-tab[data-tab="treasure"]');
    t.ok(!!tab, '法宝分页按钮不存在');
    if (!tab) return;
    tab.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 80));
    const box = doc.getElementById('char-treasure-slots');
    t.ok(!!box, 'char-treasure-slots 容器不存在');
    if (!box) return;
    const text = box.textContent || '';
    t.ok(/法宝栏\s*0\s*\/\s*\d+\s*已用/.test(text), '应显示「法宝栏 0 / N 已用」（实际：' + text.slice(0, 60) + '）');
    const slots = [...box.querySelectorAll('.treasure-slot')];
    const empty = slots.filter(c => /空栏位/.test(c.textContent));
    t.gte(empty.length, 3, '炼气期至少应渲染 3 个「空栏位」（实际 ' + empty.length + '）');
    t.ok(!/「装备」页/.test(text), '法宝页不应再出现「法宝需于『装备』页穿戴」这类错误引导');
    t.ok(/尚未获得/.test(text), '应有一句「尚未获得法宝」的说明');
    const real2 = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real2.length) t.fail('法宝页渲染报错: ' + real2.slice(0, 3).join(' ;; '));
  });

  // === 回归：秘境入口不再卡死（章节层 z-index 修复 + 背景切换） ===
  S.case('秘境入口：章节层正常显示且背景切换到秘境图', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '秘境回归');
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    if (raw) {
      raw.actionsLeft = 5;
      raw.adv = null;
      win.localStorage.setItem('dedao_save', JSON.stringify(raw));
      click(win, 't-load');
      await new Promise(r => setTimeout(r, 150));
      const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
      if (loadBtn) {
        loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 200));
        const card = doc.getElementById('dialog-card');
        const okBtn = card ? [...card.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
        if (okBtn) {
          okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
    // 点秘境打开选择弹窗
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 150));
    const entryBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /入秘境|深探/.test(b.textContent) && !b.disabled);
    t.ok(!!entryBtn, '秘境选择弹窗应出现「入秘境 / 深探」按钮');
    if (!entryBtn) return;
    entryBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // 不再有整备弹窗：选完行动点直接进秘境（携带丹药机制已删除）
    const prepBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /空手进入|携带丹药/.test(b.textContent));
    t.ok(!prepBtn, '整备弹窗应已删除（不应再出现携带丹药页）');
    // 关键回归点：章节层应可见且位于主界面之上
    const chap = doc.getElementById('chapter');
    t.ok(chap && chap.style.display !== 'none', '章节层应在秘境入口后可见（修复 z-index 后不再卡死）');
    t.ok(chap && chap.classList.contains('explore-mode'), '章节层应带 explore-mode 类');
    t.ok(doc.getElementById('screen-game').classList.contains('explore-active'), '主界面应带 explore-active 类');
    // 章节层有交互按钮（继续 / 后续选择）
    t.ok(!!doc.getElementById('chapter-actions'), '章节层应提供「继续」交互按钮');
    // 章节层背景已切换为秘境图（不再是洞府）
    const chapBg = chap ? (chap.style.background || chap.getAttribute('style') || '') : '';
    t.ok(/mijing/.test(chapBg), '章节层背景应切换到秘境图（包含 mijing 关键字）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('秘境入口交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // 回归：秘境地图必须做成「杀戮尖塔式」——canvas 绝对定位节点 + SVG 连线 + 多条真实可选路线。
  // 历史 bug：每层只连 1 条相邻边，玩家经常「只有一条路可走」，选了等于没选。
  S.case('秘境地图：SVG 连线 + ≥2 条真实可选路线（杀戮尖塔式）', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '地图回归');
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 160));
    const entryBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /入秘境|深探/.test(b.textContent) && !b.disabled);
    t.ok(!!entryBtn, '未找到秘境入口按钮');
    if (!entryBtn) return;
    entryBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 300));
    // 关键回归：不再有「携带丹药」整备页，点完行动点直接进秘境
    const prepLeft = [...doc.querySelectorAll('#modal-body button')].find(b => /空手进入|携带丹药/.test(b.textContent));
    t.ok(!prepLeft, '不应再出现「携带丹药」整备页（已删除）');
    // 点掉入口引导章节，直到秘境地图层出现
    const advOv = doc.getElementById('adv-screen');
    for (let i = 0; i < 25; i++) {
      if (advOv && advOv.style.display === 'flex') break;
      const chap = doc.getElementById('chapter');
      let btn = null;
      if (chap && chap.style.display !== 'none') btn = [...chap.querySelectorAll('button')].filter(b => !b.disabled)[0];
      if (!btn) {
        const mb = doc.getElementById('modal-body');
        if (mb) btn = [...mb.querySelectorAll('button')].filter(b => !b.disabled)[0];
      }
      if (!btn) break;
      btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 180));
    }
    t.eq(advOv.style.display, 'flex', '秘境地图层应已打开');
    const mapEl = doc.getElementById('adv-map');
    t.ok(!!mapEl.querySelector('.adv-canvas'), '地图应渲染为 canvas 容器（不再是 .adv-col 竖列）');
    const paths = [...mapEl.querySelectorAll('svg.adv-links path')];
    t.gte(paths.length, 100, 'SVG 连线数量过少：' + paths.length + '（50 层地图应上百条）');
    t.gte(mapEl.querySelectorAll('.adv-node').length, 100, '地图节点数量过少：' + mapEl.querySelectorAll('.adv-node').length);
    t.eq(mapEl.querySelectorAll('.adv-node.current').length, 1, '应有且仅有 1 个当前节点');
    t.gte(mapEl.querySelectorAll('.adv-node.selectable').length, 2, '当前节点应有 ≥2 条真实可选路线（不再是独木桥）');
    t.eq(mapEl.querySelectorAll('.adv-node.boss').length, 1, '地图应始终渲染出 Boss 节点');
    t.eq(mapEl.querySelectorAll('.adv-node.boss.locked').length, 1, '探索度未满时 Boss 应处于锁定态');
    // —— 几何回归：连线必须只走「层间空隙」，不得压在选项块上 ——
    // 节点高 56px、行距 88px，故一条正常连线的纵向跨度 = 88 − 56 = 32px。
    let longLink = 0, maxSpan = 0;
    paths.forEach((p) => {
      if (/reveal/.test(p.getAttribute('class') || '')) return; // 血色虚线允许跨行
      const nums = (p.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g);
      if (!nums || nums.length < 8) return;
      const span = Math.abs(Number(nums[1]) - Number(nums[nums.length - 1]));
      maxSpan = Math.max(maxSpan, span);
      if (span > 34) longLink++;
    });
    t.eq(longLink, 0, '存在压在选项块上的连线（' + longLink + ' 条，最长跨度 ' + maxSpan + 'px；正常应 ≤32px）');
    // 每行 3 个选项：同一 top 值的节点不超过 3 个
    const tops = {};
    [...mapEl.querySelectorAll('.adv-node')].forEach((n) => {
      const m = /top:\s*(-?\d+(?:\.\d+)?)px/.exec(n.getAttribute('style') || '');
      if (m) tops[m[1]] = (tops[m[1]] || 0) + 1;
    });
    const maxPerRow = Object.keys(tops).reduce((a, k) => Math.max(a, tops[k]), 0);
    t.lte(maxPerRow, 3, '同一层出现 ' + maxPerRow + ' 个节点（应为每行 3 个）');
    // HUD：实时气血 / 灵力条已就位（替代原「说明」按钮的位置）
    t.ok(!!doc.getElementById('adv-hp-bar') && !!doc.getElementById('adv-mp-bar'), '秘境 HUD 应显示实时气血 / 灵力条');
    // 手游版 HUD：行动 / 灵石在六维右侧**竖排**（不再挤在 header 与名字同一行）
    const resCol = doc.querySelector('#screen-game .stats .stats-top-row .action-info-col');
    t.ok(!!resCol, '行动 / 灵石应位于六维右侧的 .action-info-col 竖排容器内');
    if (resCol) {
      t.eq(resCol.children.length, 2, '资源列应恰好 2 块（上=行动、下=灵石）');
      if (resCol.children.length === 2) {
        t.ok(/行动/.test(resCol.children[0].textContent), '资源列第一块应为「行动」（一上）');
        t.ok(/灵石/.test(resCol.children[1].textContent), '资源列第二块应为「灵石」（一下）');
      }
      t.ok(!!resCol.querySelector('#h-actions-left') && !!resCol.querySelector('#h-stone'), '资源列应含 h-actions-left / h-stone 两个数值节点');
    }
    t.ok(!doc.querySelector('#screen-game .hud-actions'), 'header 内不应再有 .hud-actions（已移至六维右侧竖排）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    if (real.length) t.fail('地图渲染报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('秘境右下角【强行撤离】按钮已接线（不再点击无反应）+ HUD 左右分栏', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '撤离开线');
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 160));
    const entryBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /入秘境|深探/.test(b.textContent) && !b.disabled);
    t.ok(!!entryBtn, '未找到秘境入口按钮');
    if (!entryBtn) return;
    entryBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 300));
    const advOv = doc.getElementById('adv-screen');
    for (let i = 0; i < 25; i++) {
      if (advOv && advOv.style.display === 'flex') break;
      const chap = doc.getElementById('chapter');
      let btn = null;
      if (chap && chap.style.display !== 'none') btn = [...chap.querySelectorAll('button')].filter(b => !b.disabled)[0];
      if (!btn) {
        const mb = doc.getElementById('modal-body');
        if (mb) btn = [...mb.querySelectorAll('button')].filter(b => !b.disabled)[0];
      }
      if (!btn) break;
      btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 180));
    }
    t.eq(advOv.style.display, 'flex', '秘境地图层应已打开');
    // 1) 按钮存在且有 onclick（此前无接线 → 点击无反应）
    const rt = doc.getElementById('adv-retreat');
    t.ok(!!rt, '右下角应存在 #adv-retreat 按钮');
    t.ok(typeof rt.onclick === 'function', '右下角按钮必须已接线 onclick（否则点击无反应）');
    t.ok(/强行撤离/.test(rt.textContent || ''), '按钮文案应为【强行撤离】，实际: ' + (rt.textContent || ''));
    // 2) HUD 左右分栏：气血/灵力在左(.adv-vitals)、体力/探索在右(.adv-right)
    t.ok(!!doc.querySelector('.adv-hud .adv-vitals'), 'HUD 应含左侧气血/灵力块 .adv-vitals');
    t.ok(!!doc.querySelector('.adv-hud .adv-right'), 'HUD 应含右侧体力/探索块 .adv-right');
    // 3) 点击按钮应弹出确认层（验证接线真正生效，而非仅绑定函数）
    rt.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 220));
    const chap = doc.getElementById('chapter');
    t.ok(chap && chap.style.display !== 'none' && /强行撤离/.test(chap.textContent || ''), '点击后应弹出「强行撤离」确认层');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    if (real.length) t.fail('撤离开线报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：角色属性删除（轮回加成）（天赋），灵根注明效果 ===
  S.case('角色属性：删除轮回加成与天赋；灵根与实际一致并注明效果', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '角色回归');
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    if (raw) {
      // 注入真实灵根（含 qiMul / body）以便校验"注明效果"
      raw.linggen = { id: 'mu', name: '木灵根', desc: '青木生机，生机勃勃。', qiMul: 1.25, body: { hpMax: 80 } };
      win.localStorage.setItem('dedao_save', JSON.stringify(raw));
      click(win, 't-load');
      await new Promise(r => setTimeout(r, 150));
      const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
      if (loadBtn) {
        loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 200));
        const card = doc.getElementById('dialog-card');
        const okBtn = card ? [...card.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
        if (okBtn) {
          okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
    // 打开角色页
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'screen-char'), true, '应进入角色页');
    const attrText = (doc.getElementById('char-attr-content') || {}).textContent || '';
    // 灵根：与实际一致 + 注明效果
    t.ok(/灵根/.test(attrText), '角色属性应包含「灵根」板块');
    t.ok(/木灵根/.test(attrText), '灵根应与存档一致（木灵根）');
    t.ok(/修炼速度/.test(attrText), '灵根应注明效果（修炼速度）');
    t.ok(/气血上限/.test(attrText), '灵根应注明效果（气血上限）');
    // 删除项：轮回加成、天赋不应作为独立板块出现
    const headings = [...doc.querySelectorAll('#char-attr-content h4')].map(h => h.textContent.trim());
    t.ok(!headings.includes('天赋'), '角色属性不应再展示「天赋」板块');
    t.ok(!headings.includes('轮回加成'), '角色属性不应再展示「轮回加成」板块');
    // 命格（新版）应保留
    t.ok(headings.includes('命格'), '角色属性应保留「命格」板块');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('角色面板交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：主角初始六维=1 ===
  S.case('主角初始六维=1（开局基础值）', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('初始六维');
      return JSON.stringify({wu:s.wu, ti:s.ti, dun:s.dun, shen:s.shen, dao:s.dao, ling:s.ling, linggen: s.linggen});
    })()`));
    t.eq(v.wu, 1, '悟性初始应为1');
    t.eq(v.ti, 1, '体魄初始应为1');
    t.eq(v.dun, 1, '遁速初始应为1');
    t.eq(v.shen, 1, '神识初始应为1');
    t.eq(v.dao, 1, '道心初始应为1');
    t.eq(v.ling, 1, '灵力初始应为1（六维之一，替代福源）');
    t.eq(v.linggen, null, '开局前灵根应为 null（提交后觉醒）');
  });

  // === 回归：灵根开局即觉醒（commitStart 已实装，不再显示“未觉醒”） ===
  S.case('灵根开局即觉醒（不再显示未觉醒）', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '觉醒测试');
    const save = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    t.ok(save && save.linggen, '存档中灵根应已觉醒（非 null）');
    t.ok(save && typeof save.linggen === 'object' && save.linggen.name, '灵根应带有名称');
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));
    const attrText = (doc.getElementById('char-attr-content') || {}).textContent || '';
    t.ok(!/未觉醒/.test(attrText), '角色属性不应显示「未觉醒」');
    t.ok(/灵根/.test(attrText), '角色属性应包含「灵根」板块');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('灵根觉醒流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：轮回天赋属性加成实装（慧根+3 → 悟性 1→4） ===
  S.case('轮回天赋属性加成实装（慧根+3 → 悟性=4）', async (t) => {
    const { win } = await boot();
    win.eval(`(function(){
      var m = Engine.loadMeta(); m.reinc = m.reinc || {}; m.reinc.wu = 3; Engine.saveMeta(m);
    })()`);
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('轮回测试');
      s.bg = null; s.destinies = [];
      Engine.commitStart(s, null);
      return JSON.stringify({wu:s.wu, ti:s.ti, dun:s.dun, shen:s.shen, dao:s.dao, ling:s.ling, linggen: s.linggen ? s.linggen.name : null});
    })()`));
    t.eq(v.wu, 4, '悟性应为 基础1 + 慧根3 = 4（轮回属性加成已实装）');
    t.eq(v.ti, 1, '体魄无轮回加成应为1');
    t.eq(v.dun, 1, '遁速无轮回加成应为1');
    t.eq(v.shen, 1, '神识无轮回加成应为1');
    t.eq(v.dao, 1, '道心无轮回加成应为1');
    t.eq(v.ling, 1, '灵力无轮回加成应为1（六维之一）');
    t.ok(!!v.linggen, '灵根应已觉醒');
  });

  // === 回归：属性公式优化（神识→攻击、道心→暴击、遁速→闪避/攻速、体魄→气血） ===
  S.case('属性公式优化：神识→攻击/道心→暴击/遁速→闪避攻速/体魄→气血', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('公式');
      s.talents=[]; s.sect=null; s.arts=[]; s.extraAtk=0; s.destinies=[];
      s.equip={head:null,body:null,leg:null,treasure:[]}; s.linggen=null;
      s.ti=1; Engine.refreshStats(s); var hp1=s.hpMax;
      s.ti=11; Engine.refreshStats(s); var hp2=s.hpMax;
      s.ti=1; s.shen=1; Engine.refreshStats(s); var a1=s.atk;
      s.shen=5; Engine.refreshStats(s); var a2=s.atk;
      s.shen=1; s.dao=1; var c1=Engine.getCritRate(s);
      s.dao=11; var c2=Engine.getCritRate(s);
      s.dao=1; s.dun=1; var d1=Engine.getDodgeRate(s), e1=Engine.getExtraAtkChance(s);
      s.dun=11; var d2=Engine.getDodgeRate(s), e2=Engine.getExtraAtkChance(s);
      return JSON.stringify({hp1:hp1,hp2:hp2,a1:a1,a2:a2,c1:c1,c2:c2,d1:d1,d2:d2,e1:e1,e2:e2});
    })()`));
    t.eq(v.hp2 - v.hp1, 500, '体魄每点应 +50 气血（ti 1→11 共 +500）');
    t.eq(v.a2 - v.a1, 20, '神识每点应 +5 攻击（shen 1→5 共 +20）');
    t.ok(Math.abs(v.c1 - 0.03) < 1e-9, '暴击率=神识1%×1+道心2%×1=3%');
    t.ok(Math.abs((v.c2 - v.c1) - 0.20) < 1e-9, '道心每点应 +2% 暴击（dao 1→11 共 +20%）');
    t.ok(Math.abs(v.d1 - 0.02) < 1e-9, '闪避率=遁速2%×1=2%');
    t.ok(Math.abs((v.d2 - v.d1) - 0.20) < 1e-9, '遁速每点应 +2% 闪避（dun 1→11 共 +20%）');
    t.ok(Math.abs(v.e1 - 0.01) < 1e-9, '攻速=遁速1%×1=1%（几率额外攻击一次）');
    t.ok(Math.abs((v.e2 - v.e1) - 0.10) < 1e-9, '遁速每点应 +1% 攻速（dun 1→11 共 +10%）');
  });

  // === 回归：顶栏 防御/暴击/闪避 与角色页属性面板同源（都走引擎统一口径） ===
  S.case('顶栏与角色页属性口径一致（防御/暴击/闪避同源）', async (t) => {
    const { win, doc } = await boot();
    await enterGame(win, doc, '口径一致');
    const readTop = (id) => (doc.getElementById(id) || {}).textContent;
    const topDef = (readTop('st-def') || '').trim();
    const topCrit = (readTop('st-crit') || '').trim();
    const topDodge = (readTop('st-dodge') || '').trim();
    t.ok(/^\d+$/.test(topDef), '顶栏防御应为整数，实为「' + topDef + '」');
    t.ok(/^\d+%$/.test(topCrit), '顶栏暴击应为百分比，实为「' + topCrit + '」');
    t.ok(/^\d+%$/.test(topDodge), '顶栏闪避应为百分比，实为「' + topDodge + '」');

    t.ok(click(win, 'btn-char-bottom'), '应能进入角色页');
    await new Promise(r => setTimeout(r, 200));
    const pick = (name) => {
      const cells = [...doc.querySelectorAll('#char-attr-content .attr-combat-cell')];
      const c = cells.filter(x => {
        const l = x.querySelector('.attr-combat-label');
        return l && l.textContent.trim() === name;
      })[0];
      if (!c) return null;
      const v = c.querySelector('.attr-combat-val');
      return v ? v.textContent.trim() : null;
    };
    t.eq(pick('防御'), topDef, '角色页「防御」应与顶栏一致（同走 Engine.getDefense）');
    t.eq(pick('暴击'), topCrit, '角色页「暴击」应与顶栏一致（同走 Engine.getCritRate）');
    t.eq(pick('闪避'), topDodge, '角色页「闪避」应与顶栏一致（同走 Engine.getDodgeRate）');
    t.note('顶栏 st-def/st-crit/st-dodge 与属性面板共用引擎统一口径，杜绝各自自算');
  });

  // === 回归：灵根面板必须展示真实灵根效果（旧实现只读已废弃的 linggen.body → 战斗加成全不显示） ===
  S.case('灵根面板展示 = 真实灵根数据（trait.effect 口径）', async (t) => {
    const { win, doc } = await boot();
    await enterGame(win, doc, '灵根展示');
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));

    const lg = JSON.parse(win.localStorage.getItem('dedao_save')).linggen;
    t.ok(!!lg, '存档应含灵根');
    const section = [...doc.querySelectorAll('#char-attr-content .attr-section')]
      .map(x => x.textContent).filter(x => x.indexOf(lg.name) >= 0).join(' ');
    t.ok(section.length > 0, '角色页应渲染灵根区块');

    // 独立口径（与 ui.js 的展示映射互为对照，故意重写一遍）
    const LABEL = { atk: '攻击', hpMax: '气血', mpMax: '灵力上限', def: '防御', critPct: '暴击', dodgePct: '闪避', tribPct: '渡劫' };
    const PCT = { critPct: 1, dodgePct: 1, tribPct: 1 };
    t.ok(section.indexOf('修炼速度 +' + Math.round((lg.qiMul - 1) * 100) + '%') >= 0, '应展示修炼速度加成');

    const eff = (lg.trait && lg.trait.effect) || {};
    let checked = 0;
    for (const k in eff) {
      if (!LABEL[k]) continue;
      const txt = LABEL[k] + '+' + Math.round(eff[k]) + (PCT[k] ? '%' : '');
      t.ok(section.indexOf(txt) >= 0, '灵根词条未展示：' + txt);
      checked++;
    }
    if (lg.trait && lg.trait.name) {
      t.ok(section.indexOf('特质【' + lg.trait.name + '】') >= 0, '应展示特质名【' + lg.trait.name + '】');
      checked++;
    }
    if ((lg.affinity || []).length && lg.affinityBonus) {
      const lead = lg.affinity.length >= 5 ? '全系' : lg.affinity.join('/') + '系';
      t.ok(section.indexOf(lead + '功法/法术伤害 +' + lg.affinityBonus + '%') >= 0, '应展示功法/法术亲和加成');
      checked++;
    }
    t.gt(checked, 0, '本次随机到的灵根至少应有一条可展示效果');
    t.ok(!/特质：(jin|mu|shui|huo|tu|tian|hundun|wei)/.test(section), '不应再把内部 quirk 代码（如 jin）当作特质文案暴露');
    t.note('灵根="' + lg.name + '" 词条=' + JSON.stringify(eff) + '；面板读 Engine.linggenTrait（trait.effect / body 兜底）');
  });

  // === 回归：自动存档真实可读（旧版 linggen=null 虚假存档应在读取时修复，而非“已失效”） ===
  S.case('自动存档真实可读：旧版 linggen=null 的存档读档时自动修复', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '读档测试');
    // 模拟“刷新后”从 localStorage 读到的旧版遗留自动存档（linggen 缺失）
    const raw = win.localStorage.getItem('dedao_save');
    t.ok(!!raw, '开局后应存在自动存档 dedao_save');
    const obj = JSON.parse(raw);
    obj.linggen = null; obj.talents = []; // 旧版未调用 commitStart 导致的虚假存档
    win.localStorage.setItem('dedao_save', JSON.stringify(obj));

    // 打开读档弹窗：slotInfo 现在会走 loadState 修复灵根，自动存档应显示可读
    click(win, 't-load');
    await new Promise(r => setTimeout(r, 120));
    const loadBtns = [...doc.querySelectorAll('#modal-body button')].filter(b => b.textContent.trim() === '读档');
    t.ok(loadBtns.length >= 1, '读档弹窗应出现「自动存档」的读档按钮');
    const autoLoadBtn = loadBtns[0];
    t.ok(autoLoadBtn && !autoLoadBtn.disabled, '修复后的自动存档读档按钮应可用（非虚假）');

    // 点击自动存档读档，应成功载入而非报“该存档已失效”
    if (autoLoadBtn) {
      autoLoadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win }));
      await new Promise(r => setTimeout(r, 150));
    }
    const logTxt = (doc.getElementById('log') || {}).textContent || '';
    t.ok(logTxt.indexOf('已失效') < 0, '旧版 linggen=null 存档应被修复并可读取（不应出现“已失效”）');
    t.eq(visible(doc, 'screen-game'), true, '读取后应处于游戏主界面');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('读档修复流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：进入页未选命格时“开始这一世”按钮禁用（避免产生无命格的虚假存档） ===
  S.case('进入页未选命格时「开始这一世」禁用', async (t) => {
    const { win, doc } = await boot();
    click(win, 't-new');
    await new Promise(r => setTimeout(r, 200));
    const useEnter = visible(doc, 'screen-enter') === true;
    t.ok(useEnter, '应进入新版进入页');
    if (!useEnter) return;
    const startBtn = doc.getElementById('enter-start');
    t.ok(!!startBtn, '进入页应含「开始这一世」按钮');
    t.eq(startBtn.disabled, true, '未选任何命格时按钮应禁用');
    // 选中一个命格后按钮应启用
    const pool = doc.getElementById('enter-destiny-pool');
    t.ok(pool && pool.children.length > 0, '命格候选项应存在');
    if (pool && pool.children.length) {
      pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win }));
      await new Promise(r => setTimeout(r, 80));
      t.eq(startBtn.disabled, false, '选中命格后按钮应启用');
    }
  });

  // === 回归：灵力条（统一口径 mpMax = 20 + (灵力-1)×20；战前 +75% 加法、不覆盖回满） ===
  S.case('灵力条：上限=20+(灵力-1)×20，战前 +75% 灵力且不覆盖年末回满', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('灵力条');
      s.talents=[]; s.sect=null; s.arts=[]; s.extraAtk=0; s.destinies=[];
      s.equip={head:null,body:null,leg:null,treasure:[]}; s.linggen=null;
      s.ling=1; Engine.refreshStats(s); var lowL=s.mpMax;
      s.ling=3; Engine.refreshStats(s); var highL=s.mpMax;
      s.ling=2; Engine.refreshStats(s); var cap=s.mpMax;
      s.mp=5; var before=s.mp;
      Engine.combatStart(s, { name:'测试', atk:10, hp:50, line:'' });
      var aLow = s.mp;
      s.mp=cap; // 满蓝进战（模拟年末回满后开打）
      Engine.combatStart(s, { name:'测试', atk:10, hp:50, line:'' });
      var aFull = s.mp;
      return JSON.stringify({ lowL:lowL, highL:highL, cap:cap, before:before, aLow:aLow, aFull:aFull, afterMax:s.mpMax });
    })()`));
    t.eq(v.lowL, 20, '灵力=1 时灵力上限应为 20+(1-1)×20=20');
    t.eq(v.highL, 60, '灵力=3 时灵力上限应为 20+(3-1)×20=60');
    t.eq(v.cap, 40, '灵力=2 时灵力上限应为 20+(2-1)×20=40');
    // 场景A：低蓝进战，+75% 加法封顶
    const expectLow = Math.min(v.afterMax, v.before + Math.round(v.afterMax * 0.75));
    t.eq(v.aLow, expectLow, '低蓝进战：灵力应为 进战前 + 75% 上限（加法封顶）');
    t.gt(v.aLow, v.before, '低蓝进战：灵力应净增');
    // 场景B：满蓝进战（年末回满后），应保持满蓝，不被战前恢复压回 75%
    t.eq(v.aFull, v.cap, '满蓝进战：灵力应保持满蓝（不覆盖年末回满）');
  });

  // === 回归：神识×5攻击、灵力×5攻击（原神识×10已下调） ===
  S.case('神识每点+5攻击、灵力每点+5攻击', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('攻击');
      s.talents=[]; s.sect=null; s.arts=[]; s.extraAtk=0; s.destinies=[];
      s.equip={head:null,body:null,leg:null,treasure:[]}; s.linggen=null;
      s.shen=0; s.ling=0; Engine.refreshStats(s); var a0=s.atk;
      s.shen=1; Engine.refreshStats(s); var a1=s.atk;
      s.ling=1; Engine.refreshStats(s); var a2=s.atk;
      return JSON.stringify({a0:a0, a1:a1, a2:a2});
    })()`));
    t.ok(Math.abs((v.a1 - v.a0) - 5) < 1e-9, '神识每点应 +5 攻击（原+10）');
    t.ok(Math.abs((v.a2 - v.a1) - 5) < 1e-9, '灵力每点应 +5 攻击');
  });

  // === 回归：得到装备不再自动穿上（一律入储物袋） ===
  S.case('得到装备不再自动穿上（一律入储物袋）', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('装备');
      s.bg=null; s.destinies=[]; Engine.commitStart(s, null);
      var id='tietou_kui';
      var out = Engine.gainEquip(s, id);
      var inInv = s.inventory.some(function(x){ var e=(x&&x.id)?x:{id:x}; return e.id===id; });
      return JSON.stringify({ inInv: inInv, equipped: (s.equip.head && s.equip.head.id ? s.equip.head.id===id : s.equip.head===id), msg: out.join('') });
    })()`));
    t.ok(v.inInv, '获得装备应进入储物袋（inventory）');
    t.ok(!v.equipped, '获得装备不应自动穿上（equip.head 不应被设置）');
    t.ok(/储物袋/.test(v.msg), '提示文案应说明收入储物袋');
  });

  // === 回归：寿元移出战斗属性；灵力条显示在角色战斗属性页 ===
  S.case('寿元移出战斗属性，灵力条显示在角色页', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '寿元测试');
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));
    const cells = [...doc.querySelectorAll('#char-attr-content .attr-combat-cell')].map(c => c.textContent);
    const joined = cells.join(' ');
    t.ok(!/寿元/.test(joined), '战斗属性区不应再显示「寿元」');
    t.ok(/灵力/.test(joined), '战斗属性区应显示「灵力」条');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('寿元移出战斗属性流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 宗门页门禁：未过考验仅受限应考界面（无商人/任务/晋升） ===
  S.case('宗门页门禁：未入宗/未过考验 仅受限应考界面', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '宗门门禁');
    const btn = doc.getElementById('btn-sect-bottom') || doc.getElementById('btn-sect');
    t.ok(!!btn, '宗门入口缺失');
    if (!btn) return;
    btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    t.eq(visible(doc, 'screen-sect'), true, '宗门屏未打开');
    let body = doc.getElementById('sect-body');
    t.ok(!!body, 'sect-body 缺失');
    if (!body) return;
    let txt = body.textContent;
    // 散修态A：只见择宗/应考提示，不得出现完整宗门功能
    t.ok(/散修|择一仙门/.test(txt), '未入宗应见散修择宗提示');
    t.ok(txt.indexOf('宗门商人') < 0, '未过考验不应显示宗门商人');
    t.ok(txt.indexOf('宗门任务') < 0, '未过考验不应显示宗门任务');
    t.ok(txt.indexOf('申请晋升') < 0, '未过考验不应显示申请晋升');
    t.ok(txt.indexOf('宗门大比') < 0, '未过考验不应显示宗门大比');
    // 择一仙门 → 转为「待考」，出现入宗考验入口（仍无完整功能）
    const card = body.querySelector('[data-sect]');
    t.ok(!!card, '无宗门可选卡');
    if (card) {
      card.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 150));
    }
    body = doc.getElementById('sect-body');
    txt = body ? body.textContent : '';
    t.ok(txt.indexOf('入宗考验') >= 0, '择宗后应显示「入宗考验」');
    t.ok(txt.indexOf('宗门商人') < 0, '择宗未过考验仍不应有宗门商人');
    t.ok(txt.indexOf('宗门任务') < 0, '择宗未过考验仍不应有宗门任务');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('宗门页门禁流程报错: ' + real.slice(0, 4).join(' ;; '));
  });

  // === 回归：大境界渡劫前必须弹「败则身死道消 + 建议先存档」确认，且可直达存档面板 ===
  S.case('渡劫前提示存档：败则身死道消，可先去存档再回来渡劫', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '渡劫存档提示');
    // 造一个「筑基后期 · 修为圆满」的存档，再读档载入
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!!raw, '自动存档不存在');
    if (!raw) return;
    raw.idx = 5; raw.realm = '筑基'; raw.qi = 999999;
    if (!raw.talents || !raw.talents.length) raw.talents = ['t_dao2'];
    if (!raw.linggen) raw.linggen = { id: 'lg_trib_test' };
    win.localStorage.setItem('dedao_save', JSON.stringify(raw));
    click(win, 't-load');
    await new Promise(r => setTimeout(r, 150));
    const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
    t.ok(!!loadBtn, '存档弹窗中无可用「读档」按钮');
    if (!loadBtn) return;
    loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const card0 = doc.getElementById('dialog-card');
    const okBtn = card0 ? [...card0.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
    if (okBtn) okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));

    // 突破按钮 → 突破弹窗 → 直接突破 → 渡劫确认框
    t.ok(click(win, 'btn-break'), '突破按钮不存在');
    await new Promise(r => setTimeout(r, 200));
    const direct = [...doc.querySelectorAll('#modal-body button')].find(b => /直接突破/.test(b.textContent));
    t.ok(!!direct, '突破弹窗中无「直接突破」按钮');
    if (!direct) return;
    direct.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));

    const card = doc.getElementById('dialog-card');
    const txt = card ? card.textContent : '';
    t.ok(/渡劫 · 金丹劫/.test(txt), '渡劫确认框应标明「渡劫 · 金丹劫」，实为「' + txt.slice(0, 40) + '」');
    t.ok(txt.indexOf('此劫共 1 重劫境') >= 0, '应写明劫境重数');
    t.ok(txt.indexOf('须以实战连胜') >= 0, '应写明以实战决胜负');
    t.ok(txt.indexOf('身死道消') >= 0, '必须写明败则身死道消');
    t.ok(txt.indexOf('直接结档') >= 0, '必须写明直接结档');
    t.ok(txt.indexOf('此战不可重来') >= 0, '必须写明不可重来');
    t.ok(txt.indexOf('建议道友做好准备') >= 0, '必须提示玩家做好准备（先去存档）');
    t.ok(!/渡劫成功率/.test(txt), '大境界渡劫以实战决胜负，弹窗不再展示「渡劫成功率」数字');
    const btns = card ? [...card.querySelectorAll('button')].map(b => b.textContent) : [];
    t.ok(btns.indexOf('立即渡劫') >= 0, '应有「立即渡劫」按钮');
    t.ok(btns.indexOf('先去存档') >= 0, '应有「先去存档」按钮');

    // 点「先去存档」→ 关掉确认框，打开存档面板，且不得开始渡劫
    const goSave = card ? [...card.querySelectorAll('button')].find(b => b.textContent === '先去存档') : null;
    t.ok(!!goSave, '找不到「先去存档」按钮');
    if (goSave) goSave.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'dialog-overlay'), false, '点「先去存档」后确认框应关闭');
    const modalTxt = (doc.getElementById('modal-body') || {}).textContent || '';
    t.ok(modalTxt.indexOf('存档一') >= 0 && modalTxt.indexOf('自动存档') >= 0, '应先打开存档面板（含自动存档 / 存档一）');
    t.eq(visible(doc, 'adv-screen'), false, '不得进入劫境（玩家选择先去存档）');
    t.eq(visible(doc, 'battle'), false, '不得进入战斗');

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('渡劫前提示存档流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* 注：自动续档（autoResumeSave 开机自动读档）已按需求移除；开机停在标题页，
     由玩家手动点【继续征途】读取存档。相关断言（存活自动进游戏 / 结档停标题页）随之删除。 */

  // === 回归 2026-09-13：宗门页菜单（切磋演武未开放 / 任务年上限 / 大比倒计时） ===
  S.case('宗门页菜单：切磋演武（未开放）+ 宗门任务年上限 + 大比倒计时', async (t) => {
    const a = await boot();
    await enterGame(a.win, a.doc, '宗门菜单');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) { t.fail('未取得存档'); return; }
    raw.sect = 'qingyunjian'; raw.sectRank = '内门';
    const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
    click(win, 't-continue');
    await new Promise(r => setTimeout(r, 200));
    await advanceChapters(win, doc);
    click(win, 'btn-sect');
    await new Promise(r => setTimeout(r, 220));
    const body = doc.getElementById('sect-body');
    const txt = body ? body.textContent : '';
    t.ok(/切磋演武（未开放）/.test(txt), '宗门页应标「切磋演武（未开放）」（实：' + txt.slice(0, 90) + '）');
    t.ok(/本年剩余 3\/3 件/.test(txt), '宗门任务应显示「本年剩余 3/3 件」');
    t.ok(/距离下次大比还有 \d+ 年/.test(txt), '宗门大比应显示「距离下次大比还有 X 年」');
    const fb = doc.querySelector('[data-act="sect-fight"]');
    t.ok(!!fb, '切磋演武入口应存在');
    if (fb) {
      fb.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 180));
      const dc = doc.getElementById('dialog-card');
      t.ok(dc && /尚未开放/.test(dc.textContent), '点击切磋演武应提示「尚未开放」（不再静默无效）');
      t.eq(visible(doc, 'battle'), false, '切磋演武不应进入战斗层');
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('宗门页交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归 2026-09-13：新账号开局可自由选择 0–9 劫（不再受「历史最高」封顶） ===
  S.case('进入页劫数自由选择：新账号可选 0–9 劫，所选劫数生效到本世', async (t) => {
    const a = await boot(); // 全新账号（meta.maxJie = 0）
    const { win, doc } = a;
    click(win, 't-new');
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'screen-enter'), true, '新账号应进入「天命抉择」页');
    const plus = doc.getElementById('enter-jie-plus');
    const minus = doc.getElementById('enter-jie-minus');
    t.ok(plus && !plus.disabled, '初始 0 劫时「+」应可用（旧版新账号被 maxJie=0 封死）');
    for (let i = 0; i < 9; i++) {
      plus.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 25));
    }
    const jieName = doc.getElementById('enter-jie-name');
    t.ok(/9劫/.test(jieName ? jieName.textContent : ''), '应可连点到 9 劫（实：' + (jieName && jieName.textContent) + '）');
    t.ok(plus.disabled, '到 9 劫后「+」应禁用');
    t.ok(minus && !minus.disabled, '9 劫时「-」应可用');
    // 以 9 劫开局 → 本世 jie=9（难度倍率/命格金池/隐藏线阈值均按所选劫数）
    const input = doc.getElementById('enter-name-input');
    input.value = '九劫君'; input.dispatchEvent(new win.Event('input', { bubbles: true }));
    const pool = doc.getElementById('enter-destiny-pool');
    if (pool && pool.children.length) {
      pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    }
    await new Promise(r => setTimeout(r, 60));
    // 命格未选满（9劫 3选2，此处只选了 1 个）：首次点「开始」只提醒，不真正开局
    click(win, 'enter-start');
    await new Promise(r => setTimeout(r, 120));
    const hintEl = doc.getElementById('enter-name-hint');
    t.ok(/还有\s*1\s*个命格可选/.test(hintEl ? hintEl.textContent : ''),
      '命格未选满时应给出提醒（实：' + (hintEl && hintEl.textContent) + '）');
    const titleEl = doc.getElementById('enter-destiny-title');
    t.ok(/已选\s*1\/2/.test(titleEl ? titleEl.textContent : ''),
      '天命标题应实时显示已选/可选（实：' + (titleEl && titleEl.textContent) + '）');
    let rawMid = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!(rawMid && rawMid.jie === 9), '首次点击只提醒，不应写入本世存档');
    click(win, 'enter-start');   // 再点一次：确认开始
    await new Promise(r => setTimeout(r, 250));
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!!(raw && raw.jie === 9), '所选 9 劫应写入本世存档（实：' + (raw && raw.jie) + '）');
    const real = a.errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('劫数选择交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归 2026-09-13：百艺「阵法」板块（研习改名 + 内容归位 + 不再重复追加） ===
  S.case('百艺「阵法」板块：只做阵法研习；炼丹/炼器各自带研习入口', async (t) => {
    const a = await boot();
    await enterGame(a.win, a.doc, '百艺阵法');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) { t.fail('未取得存档'); return; }
    raw.sect = 'qingyunjian'; raw.sectRank = '内门';
    raw.craft = { liandan: { lv: 2, exp: 0 }, lianqi: { lv: 2, exp: 0 }, zhenfa: { lv: 2, exp: 0 } };
    const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
    click(win, 't-continue');
    await new Promise(r => setTimeout(r, 200));
    await advanceChapters(win, doc);
    click(win, 'btn-baiyi');
    await new Promise(r => setTimeout(r, 220));
    const cb = () => doc.getElementById('crafts-body');
    if (!cb()) { t.fail('百艺页未打开（#crafts-body 缺失）'); return; }
    const tabs = [...cb().querySelectorAll('.tab')].map(x => x.textContent);
    t.eq(tabs.join('/'), '炼丹/炼器/灵田/灵矿/阵法', '第 5 个板块应叫「阵法」（旧名「研习」）');
    t.eq(cb().querySelectorAll('.crafts-body').length, 0, '不应再嵌套 .crafts-body（同名 class 嵌套会叠加间距/滚动）');
    const pickTab = (name) => {
      const b = [...cb().querySelectorAll('.tab')].find(x => x.textContent === name);
      if (b) b.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    };
    pickTab('阵法'); await new Promise(r => setTimeout(r, 140));
    let txt = cb().textContent;
    t.ok(/五行阵/.test(txt), '阵法板块应含五行阵');
    t.ok(/阵法研习/.test(txt), '阵法板块应含「阵法研习」');
    t.ok(!/百艺研习/.test(txt), '标题「百艺研习」应已改为「阵法研习」');
    t.eq([...cb().querySelectorAll('button')].filter(b => b.textContent === '研习').length, 1, '阵法板块应只有 1 个研习按钮（仅阵法）');
    const h4Before = cb().querySelectorAll('h4').length;
    pickTab('阵法'); await new Promise(r => setTimeout(r, 140));
    t.eq(cb().querySelectorAll('h4').length, h4Before, '重复点击「阵法」不得重复追加内容（用户反馈的「下拉后弹出新内容」）');
    pickTab('炼丹'); await new Promise(r => setTimeout(r, 140));
    t.ok(/炼丹研习/.test(cb().textContent), '炼丹板块应带「炼丹研习」入口（否则炼丹等级无处提升）');
    t.eq([...cb().querySelectorAll('button')].filter(b => b.textContent === '研习').length, 1, '炼丹板块应有 1 个研习按钮');
    pickTab('炼器'); await new Promise(r => setTimeout(r, 140));
    t.ok(/炼器研习/.test(cb().textContent), '炼器板块应带「炼器研习」入口');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('百艺页交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('轮回塔：加减按钮真实可点（+/− 生效·点数变动·可返还）', async (t) => {
    const meta = { points: 999, lives: 1, reinc: {}, achievements: {}, flown: false, maxJie: 0 };
    const { win, doc, errors } = await boot({ seed: { dedao_meta: JSON.stringify(meta) } });
    click(win, 't-rebirth');
    await new Promise(r => setTimeout(r, 200));
    const list = doc.getElementById('rb-list');
    if (!list) { t.fail('轮回塔列表 #rb-list 缺失'); return; }
    const cards = () => [...list.querySelectorAll('.rb-card')];
    t.ok(cards().length >= 19, '轮回塔应渲染 19 张卡（开荒 + 18 天赋），实际 ' + cards().length);

    // 结构：每张卡恰有 2 个步进按钮，且位于天赋名所在行（.rb-head）—— 手机端不再单占一行
    const noBtns = cards().filter(c => c.querySelectorAll('.rb-step').length !== 2);
    if (noBtns.length) t.fail('有卡片缺少 +/- 步进按钮：' + noBtns.length + ' 张');
    const headBad = cards().filter(c => !c.querySelector('.rb-head .rb-step'));
    if (headBad.length) t.fail('步进按钮未置于天赋名右侧（.rb-head 内找不到 .rb-step）');

    const starCount = (el) => (el.querySelector('.lvl').textContent.match(/★/g) || []).length;
    const pts = () => parseInt(doc.getElementById('rb-points').textContent, 10);
    const card = () => cards()[1];                       // 第 2 张 = 第一个普通天赋「慧根」
    const name = card().querySelector('h4').textContent;
    const p0 = pts(), s0 = starCount(card());

    // 事件必须真的绑在按钮上（历史 bug：innerHTML += 重建 DOM 会让 onclick 静默丢失）
    const add0 = card().querySelectorAll('.rb-step')[1];
    if (add0.disabled) { t.fail('轮回点 999 时「+」不应禁用'); return; }
    if (typeof add0.onclick !== 'function') { t.fail('「+」按钮未绑定 onclick（DOM 重建导致事件丢失）'); return; }
    add0.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 160));
    t.eq(starCount(card()), s0 + 1, name + ' 点「+」后星级应 +1');
    t.ok(pts() < p0, '点「+」后轮回点应减少（' + p0 + ' → ' + pts() + '）');

    // 「−」应返还并回到原星级
    const sub = card().querySelectorAll('.rb-step')[0];
    if (sub.disabled) { t.fail('已加 1 级后「−」不应禁用'); return; }
    sub.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 160));
    t.eq(starCount(card()), s0, '点「−」后应回到原星级');
    t.eq(pts(), p0, '点「−」后轮回点应全额返还（应为 ' + p0 + '）');

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('轮回塔交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  return S;
};
